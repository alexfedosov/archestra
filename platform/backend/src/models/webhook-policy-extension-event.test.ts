import { describe, expect, test } from "@/test";
import WebhookPolicyExtensionEventModel from "./webhook-policy-extension-event";

describe("WebhookPolicyExtensionEventModel", () => {
  test("creates a webhook policy extension event", async ({
    makeAgent,
    makeOrganization,
    makeUser,
  }) => {
    const organization = await makeOrganization();
    const agent = await makeAgent();
    const user = await makeUser();

    const event = await WebhookPolicyExtensionEventModel.create({
      organizationId: organization.id,
      agentId: agent.id,
      userId: user.id,
      toolName: "github__create_issue",
      endpointUrl: "https://policy.example.test/decide",
      decision: "allow",
      httpStatus: 200,
      reason: "approved",
      durationMs: 42,
    });

    expect(event.id).toBeDefined();
    expect(event.organizationId).toBe(organization.id);
    expect(event.agentId).toBe(agent.id);
    expect(event.userId).toBe(user.id);
    expect(event.toolName).toBe("github__create_issue");
    expect(event.endpointUrl).toBe("https://policy.example.test/decide");
    expect(event.decision).toBe("allow");
    expect(event.httpStatus).toBe(200);
    expect(event.reason).toBe("approved");
    expect(event.durationMs).toBe(42);
  });
});
