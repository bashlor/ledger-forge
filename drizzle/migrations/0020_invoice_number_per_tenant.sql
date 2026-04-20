-- Scope invoice_number uniqueness to the organization (tenant).
-- Previously invoice_number was globally unique, which prevented
-- independent numbering sequences per tenant.

ALTER TABLE "main"."invoices" DROP CONSTRAINT "invoices_invoice_number_unique";
ALTER TABLE "main"."invoices" ADD CONSTRAINT "invoices_org_invoice_number_unique" UNIQUE ("organization_id", "invoice_number");
