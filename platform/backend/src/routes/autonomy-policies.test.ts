import OrganizationModel from "@/models/organization";
import type { FastifyInstanceWithZod } from "@/server";
import { createFastifyInstance } from "@/server";
import { afterEach, beforeEach, describe, expect, test } from "@/test";
import type { ToolInvocation } from "@/types";

const ASK_WEBHOOK_ACTION = "require_webhook_policy_extension_decision";
const ASK_WEBHOOK_REQUIRES_URL_MESSAGE =
  "Configure a webhook URL in Settings > Agents to enable this option.";

describe("autonomy policy routes", () => {
  let app: FastifyInstanceWithZod;
  let organizationId: string;

  beforeEach(async ({ makeOrganization }) => {
    const organization = await makeOrganization();
    organizationId = organization.id;

    app = createFastifyInstance();
    app.addHook("onRequest", async (request) => {
      (
        request as typeof request & {
          organizationId: string;
        }
      ).organizationId = organizationId;
    });

    const { default: autonomyPolicyRoutes } = await import(
      "./autonomy-policies"
    );
    await app.register(autonomyPolicyRoutes);
  });

  afterEach(async () => {
    await app.close();
  });

  test("rejects webhook extension action on create without endpoint", async ({
    makeTool,
  }) => {
    const tool = await makeTool();

    const response = await app.inject({
      method: "POST",
      url: "/api/autonomy-policies/tool-invocation",
      payload: {
        toolId: tool.id,
        conditions: [],
        action: ASK_WEBHOOK_ACTION,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe(
      ASK_WEBHOOK_REQUIRES_URL_MESSAGE,
    );
  });

  test("allows webhook extension action on create with endpoint", async ({
    makeTool,
  }) => {
    await OrganizationModel.patch(organizationId, {
      webhookPolicyExtensionEndpointUrl: "https://policy.example.test/auth",
    });
    const tool = await makeTool();

    const response = await app.inject({
      method: "POST",
      url: "/api/autonomy-policies/tool-invocation",
      payload: {
        toolId: tool.id,
        conditions: [],
        action: ASK_WEBHOOK_ACTION,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().action).toBe(ASK_WEBHOOK_ACTION);
  });

  test("rejects webhook extension action on update without endpoint", async ({
    makeToolPolicy,
    makeTool,
  }) => {
    const tool = await makeTool();
    const policy = await makeToolPolicy(tool.id, { conditions: [] });

    const response = await app.inject({
      method: "PUT",
      url: `/api/autonomy-policies/tool-invocation/${policy.id}`,
      payload: {
        action: ASK_WEBHOOK_ACTION,
      } satisfies Partial<ToolInvocation.ToolInvocationPolicy>,
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe(
      ASK_WEBHOOK_REQUIRES_URL_MESSAGE,
    );
  });

  test("rejects webhook extension action on bulk default without endpoint", async ({
    makeTool,
  }) => {
    const tool = await makeTool();

    const response = await app.inject({
      method: "POST",
      url: "/api/tool-invocation/bulk-default",
      payload: {
        toolIds: [tool.id],
        action: ASK_WEBHOOK_ACTION,
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.message).toBe(
      ASK_WEBHOOK_REQUIRES_URL_MESSAGE,
    );
  });
});
