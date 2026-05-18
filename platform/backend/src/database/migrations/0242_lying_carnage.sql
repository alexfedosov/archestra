ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_endpoint_url" text;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_signing_secret_id" uuid;--> statement-breakpoint
ALTER TABLE "organization" ADD COLUMN "webhook_policy_extension_timeout_ms" integer DEFAULT 2500 NOT NULL;--> statement-breakpoint
ALTER TABLE "organization" ADD CONSTRAINT "organization_webhook_policy_extension_signing_secret_id_secret_id_fk" FOREIGN KEY ("webhook_policy_extension_signing_secret_id") REFERENCES "public"."secret"("id") ON DELETE set null ON UPDATE no action;
