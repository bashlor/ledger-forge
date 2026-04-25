ALTER TABLE "main"."audit_events" ALTER COLUMN "organization_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "main"."audit_events" DROP CONSTRAINT IF EXISTS "audit_events_entity_type_check";
--> statement-breakpoint
ALTER TABLE "main"."audit_events" ADD CONSTRAINT "audit_events_entity_type_check" CHECK ("entity_type" IN ('invoice', 'expense', 'customer', 'member', 'session', 'user'));