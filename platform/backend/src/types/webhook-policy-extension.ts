import { z } from "zod";

export const WebhookPolicyExtensionToolSchema = z.object({
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});

export const WebhookPolicyExtensionContextSchema = z.object({
  trusted: z.boolean(),
  teamIds: z.array(z.string()),
  externalAgentId: z.string().optional(),
});

export const WebhookPolicyExtensionRequestSchema = z.object({
  organizationId: z.string(),
  agentId: z.string(),
  userId: z.string().nullable().optional(),
  tool: WebhookPolicyExtensionToolSchema,
  context: WebhookPolicyExtensionContextSchema,
});

export const WebhookPolicyExtensionResponseSchema = z.object({
  allow: z.boolean(),
  reason: z.string().max(1000).optional(),
});

export type WebhookPolicyExtensionRequest = z.infer<
  typeof WebhookPolicyExtensionRequestSchema
>;
export type WebhookPolicyExtensionResponse = z.infer<
  typeof WebhookPolicyExtensionResponseSchema
>;
