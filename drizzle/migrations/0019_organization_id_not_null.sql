-- Phase 3: Schema hardening — make organization_id NOT NULL everywhere
-- and add organization_id to journal_entries.

-- 1. Create a fallback organization for orphan rows (if not already present).
INSERT INTO "auth"."organization" ("id", "name", "slug", "created_at")
VALUES ('legacy-backfill-org', 'Legacy (backfill)', 'legacy-backfill', now())
ON CONFLICT ("id") DO NOTHING;

-- 2. Backfill NULL organization_id on business tables.
UPDATE "main"."customers"   SET "organization_id" = 'legacy-backfill-org' WHERE "organization_id" IS NULL;
UPDATE "main"."invoices"    SET "organization_id" = 'legacy-backfill-org' WHERE "organization_id" IS NULL;
UPDATE "main"."expenses"    SET "organization_id" = 'legacy-backfill-org' WHERE "organization_id" IS NULL;

-- 3. Set NOT NULL.
ALTER TABLE "main"."customers" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "main"."invoices"  ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "main"."expenses"  ALTER COLUMN "organization_id" SET NOT NULL;

-- 4. Add organization_id to journal_entries.
ALTER TABLE "main"."journal_entries" ADD COLUMN "organization_id" text;

-- 5. Backfill journal_entries from parent invoice or expense.
UPDATE "main"."journal_entries" je
SET "organization_id" = COALESCE(
  (SELECT i."organization_id" FROM "main"."invoices" i WHERE i."id" = je."invoice_id"),
  (SELECT e."organization_id" FROM "main"."expenses" e WHERE e."id" = je."expense_id"),
  'legacy-backfill-org'
);

-- 6. Set NOT NULL on journal_entries.organization_id.
ALTER TABLE "main"."journal_entries" ALTER COLUMN "organization_id" SET NOT NULL;

-- 7. FK constraint (cross-schema: main → auth).
ALTER TABLE "main"."journal_entries"
  ADD CONSTRAINT "journal_entries_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE restrict;
