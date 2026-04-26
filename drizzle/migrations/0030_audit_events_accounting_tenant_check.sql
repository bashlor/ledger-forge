ALTER TABLE "main"."audit_events"
  ADD CONSTRAINT "audit_events_accounting_tenant_check"
  CHECK ("entity_type" NOT IN ('invoice', 'expense', 'customer') OR "organization_id" IS NOT NULL);
