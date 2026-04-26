-- Store tenant ownership directly on invoice lines and enforce it structurally.
-- This mirrors the tenant-aware guarantees already present on invoices and journal entries.

ALTER TABLE "main"."invoice_lines"
  ADD COLUMN "organization_id" text;
--> statement-breakpoint

UPDATE "main"."invoice_lines"
SET "organization_id" = "main"."invoices"."organization_id"
FROM "main"."invoices"
WHERE "main"."invoice_lines"."invoice_id" = "main"."invoices"."id";
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  DROP CONSTRAINT IF EXISTS "invoice_lines_invoice_line_unique";
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  DROP CONSTRAINT IF EXISTS "invoice_lines_invoice_id_invoices_id_fk";
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  ADD CONSTRAINT "invoice_lines_org_invoice_line_unique"
  UNIQUE ("organization_id", "invoice_id", "line_number");
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  ADD CONSTRAINT "invoice_lines_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id")
  REFERENCES "auth"."organization"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;
--> statement-breakpoint

ALTER TABLE "main"."invoice_lines"
  ADD CONSTRAINT "invoice_lines_org_invoice_fk"
  FOREIGN KEY ("organization_id", "invoice_id")
  REFERENCES "main"."invoices"("organization_id", "id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
