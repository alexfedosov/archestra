CREATE TABLE "webhook_policy_extension_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" text NOT NULL,
	"agent_id" uuid,
	"user_id" text,
	"tool_name" varchar(255) NOT NULL,
	"endpoint_url" text NOT NULL,
	"decision" varchar(16) NOT NULL,
	"http_status" integer,
	"reason" text,
	"error_code" varchar(128),
	"duration_ms" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_endpoint_url" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_signing_secret_id" uuid;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_timeout_ms" integer DEFAULT 2500 NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_policy_extension_events" ADD CONSTRAINT "webhook_policy_extension_events_organization_id_organization_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_policy_extension_events" ADD CONSTRAINT "webhook_policy_extension_events_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_policy_extension_events" ADD CONSTRAINT "webhook_policy_extension_events_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "webhook_policy_extension_events_organization_id_idx" ON "webhook_policy_extension_events" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "webhook_policy_extension_events_created_at_idx" ON "webhook_policy_extension_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "webhook_policy_extension_events_tool_name_idx" ON "webhook_policy_extension_events" USING btree ("tool_name");--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_webhook_policy_extension_signing_secret_id_secret_id_fk" FOREIGN KEY ("webhook_policy_extension_signing_secret_id") REFERENCES "public"."secret"("id") ON DELETE set null ON UPDATE no action;