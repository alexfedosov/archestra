import { createHmac } from "node:crypto";
import {
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_DENIED_REASON,
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_UNAVAILABLE_REASON,
} from "@shared";
import OrganizationModel from "@/models/organization";
import SecretModel from "@/models/secret";
import type {
  PolicyEvaluationContext,
  WebhookPolicyExtensionCheck,
} from "@/models/tool-invocation-policy";
import {
  type SecretValue,
  WebhookPolicyExtensionResponseSchema,
} from "@/types";

const MAX_WEBHOOK_POLICY_EXTENSION_REQUEST_BYTES = 256 * 1024;
const MAX_WEBHOOK_POLICY_EXTENSION_RESPONSE_BYTES = 64 * 1024;

type WebhookPolicyExtensionEvaluationResult =
  | { allowed: true }
  | {
      allowed: false;
      reason: string;
      toolCallName: string;
      toolInput: Record<string, unknown>;
      errorCode?: string;
      httpStatus?: number;
    };

type WebhookPolicyExtensionRuntimeContext = {
  organizationId: string;
  agentId: string;
  userId?: string | null;
  context: PolicyEvaluationContext;
  contextIsTrusted: boolean;
};

export async function evaluateWebhookPolicyExtensionChecks({
  organizationId,
  agentId,
  userId,
  context,
  contextIsTrusted,
  checks,
}: WebhookPolicyExtensionRuntimeContext & {
  checks: WebhookPolicyExtensionCheck[];
}): Promise<WebhookPolicyExtensionEvaluationResult> {
  if (checks.length === 0) {
    return { allowed: true };
  }

  const organization = await OrganizationModel.getById(organizationId);

  if (!organization || !organization.webhookPolicyExtensionEndpointUrl) {
    const firstCheck = checks[0];
    return {
      allowed: false,
      toolCallName: firstCheck.toolCallName,
      toolInput: firstCheck.toolInput,
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_UNAVAILABLE_REASON,
      errorCode: "not_configured",
    };
  }

  const endpointUrl = organization.webhookPolicyExtensionEndpointUrl;
  const signingSecret = organization.webhookPolicyExtensionSigningSecretId
    ? await getSigningSecret(organization.webhookPolicyExtensionSigningSecretId)
    : null;

  for (const check of checks) {
    const result = await evaluateOneWebhookPolicyExtensionCheck({
      endpointUrl,
      timeoutMs: organization.webhookPolicyExtensionTimeoutMs,
      signingSecret,
      runtime: { organizationId, agentId, userId, context, contextIsTrusted },
      check,
    });

    if (!result.allowed) {
      return result;
    }
  }

  return { allowed: true };
}

async function evaluateOneWebhookPolicyExtensionCheck({
  endpointUrl,
  timeoutMs,
  signingSecret,
  runtime,
  check,
}: {
  endpointUrl: string;
  timeoutMs: number;
  signingSecret: string | null;
  runtime: WebhookPolicyExtensionRuntimeContext;
  check: WebhookPolicyExtensionCheck;
}): Promise<WebhookPolicyExtensionEvaluationResult> {
  const requestBody = JSON.stringify(
    buildWebhookPolicyExtensionRequest(runtime, check),
  );

  if (
    Buffer.byteLength(requestBody, "utf8") >
    MAX_WEBHOOK_POLICY_EXTENSION_REQUEST_BYTES
  ) {
    return {
      allowed: false,
      toolCallName: check.toolCallName,
      toolInput: check.toolInput,
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
      errorCode: "request_too_large",
    };
  }

  try {
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: buildWebhookPolicyExtensionHeaders(requestBody, signingSecret),
      body: requestBody,
      redirect: "manual",
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      return {
        allowed: false,
        toolCallName: check.toolCallName,
        toolInput: check.toolInput,
        reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
        errorCode: "http_status",
        httpStatus: response.status,
      };
    }

    const responseText = await readWebhookPolicyExtensionResponse(response);
    const parsedResponse = WebhookPolicyExtensionResponseSchema.safeParse(
      JSON.parse(responseText),
    );

    if (!parsedResponse.success) {
      return {
        allowed: false,
        toolCallName: check.toolCallName,
        toolInput: check.toolInput,
        reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
        errorCode: "invalid_response",
        httpStatus: response.status,
      };
    }

    if (!parsedResponse.data.allow) {
      const reason =
        parsedResponse.data.reason ||
        TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_DENIED_REASON;
      return {
        allowed: false,
        toolCallName: check.toolCallName,
        toolInput: check.toolInput,
        reason,
        httpStatus: response.status,
      };
    }

    return { allowed: true };
  } catch (error) {
    const errorCode =
      error instanceof Error && error.name === "TimeoutError"
        ? "timeout"
        : "request_failed";
    return {
      allowed: false,
      toolCallName: check.toolCallName,
      toolInput: check.toolInput,
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
      errorCode,
    };
  }
}

function buildWebhookPolicyExtensionRequest(
  runtime: WebhookPolicyExtensionRuntimeContext,
  check: WebhookPolicyExtensionCheck,
) {
  return {
    organizationId: runtime.organizationId,
    agentId: runtime.agentId,
    userId: runtime.userId ?? null,
    tool: {
      name: check.toolCallName,
      arguments: check.toolInput,
    },
    context: {
      trusted: runtime.contextIsTrusted,
      teamIds: runtime.context.teamIds,
      externalAgentId: runtime.context.externalAgentId,
    },
  };
}

function buildWebhookPolicyExtensionHeaders(
  body: string,
  signingSecret: string | null,
): Headers {
  const headers = new Headers({
    "Content-Type": "application/json",
    Accept: "application/json",
  });

  if (signingSecret) {
    headers.set(
      "X-Archestra-Signature",
      `sha256=${createHmac("sha256", signingSecret).update(body).digest("hex")}`,
    );
  }

  return headers;
}

async function readWebhookPolicyExtensionResponse(
  response: Response,
): Promise<string> {
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_WEBHOOK_POLICY_EXTENSION_RESPONSE_BYTES) {
    throw new Error("webhook policy extension response too large");
  }

  const responseText = await response.text();
  if (
    Buffer.byteLength(responseText, "utf8") >
    MAX_WEBHOOK_POLICY_EXTENSION_RESPONSE_BYTES
  ) {
    throw new Error("webhook policy extension response too large");
  }
  return responseText;
}

async function getSigningSecret(secretId: string): Promise<string | null> {
  const secret = await SecretModel.findById(secretId);
  return readSigningSecret(secret?.secret ?? {});
}

function readSigningSecret(secret: SecretValue): string | null {
  const value = secret.signingSecret;
  return typeof value === "string" && value.length > 0 ? value : null;
}
