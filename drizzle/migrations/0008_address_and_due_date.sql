ALTER TABLE "main"."customers"
ADD COLUMN "address" text DEFAULT '';

ALTER TABLE "main"."invoices"
ADD COLUMN "customer_address_snapshot" text DEFAULT '';

UPDATE "main"."customers"
SET "address" = coalesce("address", '');

UPDATE "main"."invoices" AS i
SET "customer_address_snapshot" = c."address"
FROM "main"."customers" AS c
WHERE i."customer_id" = c."id"
  AND i."status" = 'draft';

UPDATE "main"."invoices"
SET "customer_address_snapshot" = coalesce("customer_address_snapshot", '');

ALTER TABLE "main"."customers"
ALTER COLUMN "address" SET NOT NULL;

ALTER TABLE "main"."invoices"
ALTER COLUMN "customer_address_snapshot" SET NOT NULL;
