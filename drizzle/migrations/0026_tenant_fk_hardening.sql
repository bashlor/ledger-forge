-- Enforce tenant-aware integrity between related accounting tables.
-- This prevents cross-tenant links that could bypass application-level scoping.

ALTER TABLE "main"."customers"
  ADD CONSTRAINT "customers_org_id_unique" UNIQUE ("organization_id", "id");

ALTER TABLE "main"."invoices"
  ADD CONSTRAINT "invoices_org_id_unique" UNIQUE ("organization_id", "id");

ALTER TABLE "main"."expenses"
  ADD CONSTRAINT "expenses_org_id_unique" UNIQUE ("organization_id", "id");

ALTER TABLE "main"."invoices"
  DROP CONSTRAINT IF EXISTS "invoices_customer_id_customers_id_fk";
ALTER TABLE "main"."invoices"
  ADD CONSTRAINT "invoices_org_customer_fk"
  FOREIGN KEY ("organization_id", "customer_id")
  REFERENCES "main"."customers"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "main"."journal_entries"
  DROP CONSTRAINT IF EXISTS "journal_entries_invoice_id_invoices_id_fk";
ALTER TABLE "main"."journal_entries"
  ADD CONSTRAINT "journal_entries_org_invoice_fk"
  FOREIGN KEY ("organization_id", "invoice_id")
  REFERENCES "main"."invoices"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "main"."journal_entries"
  DROP CONSTRAINT IF EXISTS "journal_entries_expense_id_expenses_id_fk";
ALTER TABLE "main"."journal_entries"
  ADD CONSTRAINT "journal_entries_org_expense_fk"
  FOREIGN KEY ("organization_id", "expense_id")
  REFERENCES "main"."expenses"("organization_id", "id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
