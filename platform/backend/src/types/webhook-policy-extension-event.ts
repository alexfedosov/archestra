import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { schema } from "@/database";

export const WebhookPolicyExtensionDecisionSchema = z.enum([
  "allow",
  "deny",
  "error",
]);

export const SelectWebhookPolicyExtensionEventSchema = createSelectSchema(
  schema.webhookPolicyExtensionEventsTable,
  {
    decision: WebhookPolicyExtensionDecisionSchema,
  },
);

export const InsertWebhookPolicyExtensionEventSchema = createInsertSchema(
  schema.webhookPolicyExtensionEventsTable,
  {
    decision: WebhookPolicyExtensionDecisionSchema,
  },
).omit({
  id: true,
  createdAt: true,
});

export type WebhookPolicyExtensionDecision = z.infer<
  typeof WebhookPolicyExtensionDecisionSchema
>;
export type WebhookPolicyExtensionEvent = z.infer<
  typeof SelectWebhookPolicyExtensionEventSchema
>;
export type InsertWebhookPolicyExtensionEvent = z.infer<
  typeof InsertWebhookPolicyExtensionEventSchema
>;
