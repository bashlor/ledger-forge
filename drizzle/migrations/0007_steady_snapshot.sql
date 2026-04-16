ALTER TABLE "main"."invoices"
ADD COLUMN "customer_company_snapshot" text,
ADD COLUMN "customer_primary_contact_snapshot" text,
ADD COLUMN "customer_email_snapshot" text,
ADD COLUMN "customer_phone_snapshot" text;

UPDATE "main"."invoices" AS i
SET
  "customer_company_snapshot" = c."company",
  "customer_primary_contact_snapshot" = c."name",
  "customer_email_snapshot" = c."email",
  "customer_phone_snapshot" = c."phone"
FROM "main"."customers" AS c
WHERE i."customer_id" = c."id"
  AND i."status" = 'draft';

UPDATE "main"."invoices"
SET
  "customer_company_snapshot" = coalesce("customer_company_snapshot", "customer_name"),
  "customer_primary_contact_snapshot" = coalesce("customer_primary_contact_snapshot", ''),
  "customer_email_snapshot" = coalesce("customer_email_snapshot", ''),
  "customer_phone_snapshot" = coalesce("customer_phone_snapshot", '');

ALTER TABLE "main"."invoices"
ALTER COLUMN "customer_company_snapshot" SET NOT NULL,
ALTER COLUMN "customer_primary_contact_snapshot" SET NOT NULL,
ALTER COLUMN "customer_email_snapshot" SET NOT NULL,
ALTER COLUMN "customer_phone_snapshot" SET NOT NULL;
