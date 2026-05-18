import { createHmac } from "node:crypto";
import {
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_DENIED_REASON,
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
  TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_UNAVAILABLE_REASON,
} from "@shared";
import { vi } from "vitest";
import OrganizationModel from "@/models/organization";
import { describe, expect, test } from "@/test";
import { evaluateWebhookPolicyExtensionChecks } from "./webhook-policy-extension";

describe("evaluateWebhookPolicyExtensionChecks", () => {
  test("allows when the webhook returns allow true", async ({
    makeAgent,
    makeOrganization,
    makeSecret,
    makeUser,
  }) => {
    const organization = await makeOrganization();
    const agent = await makeAgent({ organizationId: organization.id });
    const user = await makeUser();
    const secret = await makeSecret({
      secret: { signingSecret: "webhook-secret" },
    });
    await OrganizationModel.patch(organization.id, {
      webhookPolicyExtensionEndpointUrl: "https://policy.example.test/decide",
      webhookPolicyExtensionSigningSecretId: secret.id,
    });

    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ allow: true, reason: "approved" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const result = await evaluateWebhookPolicyExtensionChecks({
      organizationId: organization.id,
      agentId: agent.id,
      userId: user.id,
      context: { teamIds: ["team-a"], externalAgentId: "ext-agent" },
      contextIsTrusted: false,
      checks: [
        {
          toolCallName: "github__create_issue",
          toolInput: { title: "Bug" },
        },
      ],
    });

    expect(result).toEqual({ allowed: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://policy.example.test/decide",
      expect.objectContaining({
        method: "POST",
        redirect: "manual",
      }),
    );

    const [, init] = fetchMock.mock.calls[0] as [
      string,
      RequestInit & { headers: Headers; body: string },
    ];
    expect(JSON.parse(init.body)).toEqual({
      version: 1,
      organizationId: organization.id,
      agentId: agent.id,
      userId: user.id,
      tool: {
        name: "github__create_issue",
        arguments: { title: "Bug" },
      },
      context: {
        trusted: false,
        teamIds: ["team-a"],
        externalAgentId: "ext-agent",
      },
    });
    expect(init.headers.get("X-Archestra-Signature")).toBe(
      `sha256=${createHmac("sha256", "webhook-secret").update(init.body).digest("hex")}`,
    );

    fetchMock.mockRestore();
  });

  test("denies when the webhook returns allow false", async ({
    makeAgent,
    makeOrganization,
    makeUser,
  }) => {
    const organization = await makeOrganization();
    const agent = await makeAgent({ organizationId: organization.id });
    const user = await makeUser();
    await OrganizationModel.patch(organization.id, {
      webhookPolicyExtensionEndpointUrl: "https://policy.example.test/decide",
    });

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ allow: false }), { status: 200 }),
      );

    const result = await evaluateWebhookPolicyExtensionChecks({
      organizationId: organization.id,
      agentId: agent.id,
      userId: user.id,
      context: { teamIds: [] },
      contextIsTrusted: true,
      checks: [{ toolCallName: "email__send", toolInput: { to: "a@b.test" } }],
    });

    expect(result).toEqual({
      allowed: false,
      toolCallName: "email__send",
      toolInput: { to: "a@b.test" },
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_DENIED_REASON,
      httpStatus: 200,
    });

    fetchMock.mockRestore();
  });

  test("fails closed when the organization has no webhook configured", async ({
    makeAgent,
    makeOrganization,
  }) => {
    const organization = await makeOrganization();
    const agent = await makeAgent({ organizationId: organization.id });
    const fetchMock = vi.spyOn(globalThis, "fetch");

    const result = await evaluateWebhookPolicyExtensionChecks({
      organizationId: organization.id,
      agentId: agent.id,
      context: { teamIds: [] },
      contextIsTrusted: true,
      checks: [{ toolCallName: "github__merge_pr", toolInput: { pr: 123 } }],
    });

    expect(result).toEqual({
      allowed: false,
      toolCallName: "github__merge_pr",
      toolInput: { pr: 123 },
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_UNAVAILABLE_REASON,
      errorCode: "not_configured",
    });
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockRestore();
  });

  test("fails closed when the webhook returns a non-success status", async ({
    makeAgent,
    makeOrganization,
  }) => {
    const organization = await makeOrganization();
    const agent = await makeAgent({ organizationId: organization.id });
    await OrganizationModel.patch(organization.id, {
      webhookPolicyExtensionEndpointUrl: "https://policy.example.test/decide",
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("unavailable", { status: 503 }));

    const result = await evaluateWebhookPolicyExtensionChecks({
      organizationId: organization.id,
      agentId: agent.id,
      context: { teamIds: [] },
      contextIsTrusted: true,
      checks: [{ toolCallName: "github__merge_pr", toolInput: { pr: 123 } }],
    });

    expect(result).toEqual({
      allowed: false,
      toolCallName: "github__merge_pr",
      toolInput: { pr: 123 },
      reason: TOOL_INVOCATION_WEBHOOK_POLICY_EXTENSION_ERROR_REASON,
      errorCode: "http_status",
      httpStatus: 503,
    });

    fetchMock.mockRestore();
  });
});
