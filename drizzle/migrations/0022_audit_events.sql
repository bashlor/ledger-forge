-- Audit trail: persistent audit events for accounting operations.
-- Written in the same transaction as the business mutation.

CREATE TABLE "main"."audit_events" (
  "id" text PRIMARY KEY NOT NULL,
  "organization_id" text NOT NULL,
  "actor_id" text,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "action" text NOT NULL,
  "changes" jsonb,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "audit_events_entity_type_check"
    CHECK ("entity_type" IN ('invoice', 'expense', 'customer'))
);
--> statement-breakpoint
ALTER TABLE "main"."audit_events"
  ADD CONSTRAINT "audit_events_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint
CREATE INDEX "audit_events_entity_history_idx"
  ON "main"."audit_events" ("entity_type", "entity_id", "created_at" DESC);
