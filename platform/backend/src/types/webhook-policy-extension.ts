import { z } from "zod";

export const WebhookPolicyExtensionResponseSchema = z.object({
  allow: z.boolean(),
  reason: z.string().max(1000).optional(),
});
