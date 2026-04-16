ALTER TABLE "main"."invoices"
RENAME COLUMN "customer_address_snapshot" TO "customer_company_address_snapshot";

ALTER TABLE "main"."invoices"
ADD COLUMN "issued_company_name" text,
ADD COLUMN "issued_company_address" text;

UPDATE "main"."invoices"
SET
  "issued_company_name" = coalesce("customer_company_snapshot", "customer_company_name", "customer_name", ''),
  "issued_company_address" = coalesce("customer_company_address_snapshot", '');

ALTER TABLE "main"."invoices"
ALTER COLUMN "issued_company_name" SET NOT NULL,
ALTER COLUMN "issued_company_address" SET NOT NULL;

ALTER TABLE "main"."invoices"
ALTER COLUMN "issued_company_name" SET DEFAULT '',
ALTER COLUMN "issued_company_address" SET DEFAULT '';
