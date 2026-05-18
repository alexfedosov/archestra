import db, { schema } from "@/database";
import type {
  InsertWebhookPolicyExtensionEvent,
  WebhookPolicyExtensionEvent,
} from "@/types";

class WebhookPolicyExtensionEventModel {
  static async create(
    data: InsertWebhookPolicyExtensionEvent,
  ): Promise<WebhookPolicyExtensionEvent> {
    const [event] = await db
      .insert(schema.webhookPolicyExtensionEventsTable)
      .values(data)
      .returning();

    return event;
  }
}

export default WebhookPolicyExtensionEventModel;
