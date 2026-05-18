import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import type { WebhookPolicyExtensionDecision } from "@/types";
import agentsTable from "./agent";
import organizationsTable from "./organization";
import usersTable from "./user";

const webhookPolicyExtensionEventsTable = pgTable(
  "webhook_policy_extension_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizationsTable.id, { onDelete: "cascade" }),
    agentId: uuid("agent_id").references(() => agentsTable.id, {
      onDelete: "set null",
    }),
    userId: text("user_id").references(() => usersTable.id, {
      onDelete: "set null",
    }),
    toolName: varchar("tool_name", { length: 255 }).notNull(),
    endpointUrl: text("endpoint_url"),
    decision: varchar("decision", { length: 16 })
      .$type<WebhookPolicyExtensionDecision>()
      .notNull(),
    httpStatus: integer("http_status"),
    reason: text("reason"),
    errorCode: varchar("error_code", { length: 128 }),
    durationMs: integer("duration_ms").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => ({
    organizationIdIdx: index(
      "webhook_policy_extension_events_organization_id_idx",
    ).on(table.organizationId),
    createdAtIdx: index("webhook_policy_extension_events_created_at_idx").on(
      table.createdAt,
    ),
    toolNameIdx: index("webhook_policy_extension_events_tool_name_idx").on(
      table.toolName,
    ),
  }),
);

export default webhookPolicyExtensionEventsTable;
