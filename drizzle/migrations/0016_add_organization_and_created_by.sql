-- Add organization_id and created_by to the three core business tables.
-- Both columns are nullable: existing rows have no tenant/actor assignment,
-- which is intentional (they remain visible only via SYSTEM context).
-- FK constraints are cross-schema (main → auth) so they are declared in raw SQL
-- only — not in schema.ts .references() which does not support cross-schema refs.

ALTER TABLE "main"."customers"
  ADD COLUMN "organization_id" text,
  ADD COLUMN "created_by" text;

ALTER TABLE "main"."invoices"
  ADD COLUMN "organization_id" text,
  ADD COLUMN "created_by" text;

ALTER TABLE "main"."expenses"
  ADD COLUMN "organization_id" text,
  ADD COLUMN "created_by" text;

-- Foreign keys
ALTER TABLE "main"."customers"
  ADD CONSTRAINT "customers_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE set null;

ALTER TABLE "main"."invoices"
  ADD CONSTRAINT "invoices_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE set null;

ALTER TABLE "main"."expenses"
  ADD CONSTRAINT "expenses_organization_id_organization_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id") ON DELETE set null;

-- Indexes for tenant-scoped queries
CREATE INDEX "customers_organization_id_idx" ON "main"."customers" ("organization_id");
CREATE INDEX "invoices_organization_id_idx" ON "main"."invoices" ("organization_id");
CREATE INDEX "expenses_organization_id_idx" ON "main"."expenses" ("organization_id");
