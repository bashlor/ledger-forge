ALTER TABLE "main"."invoices"
ADD COLUMN "customer_company_name" text;

UPDATE "main"."invoices"
SET "customer_company_name" = coalesce("customer_company_snapshot", "customer_name");

ALTER TABLE "main"."invoices"
ALTER COLUMN "customer_company_name" SET NOT NULL;
