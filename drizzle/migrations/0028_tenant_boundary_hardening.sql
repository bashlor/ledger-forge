ALTER TABLE "auth"."member"
  ADD CONSTRAINT "auth_member_role_check"
  CHECK ("role" IN ('owner', 'admin', 'member'));
--> statement-breakpoint
CREATE INDEX "audit_events_tenant_entity_history_idx"
  ON "main"."audit_events" ("organization_id", "entity_type", "entity_id", "created_at" DESC);
