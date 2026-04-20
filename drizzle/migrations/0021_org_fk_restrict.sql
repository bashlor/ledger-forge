-- Change FK on accounting organization_id columns from SET NULL to RESTRICT.
-- Prevents deleting an organization that still has business data.
-- journal_entries already has ON DELETE RESTRICT from migration 0019.

ALTER TABLE "main"."customers"
  DROP CONSTRAINT IF EXISTS "customers_organization_id_organization_id_fk";
ALTER TABLE "main"."customers"
  ADD CONSTRAINT "customers_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "main"."invoices"
  DROP CONSTRAINT IF EXISTS "invoices_organization_id_organization_id_fk";
ALTER TABLE "main"."invoices"
  ADD CONSTRAINT "invoices_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

ALTER TABLE "main"."expenses"
  DROP CONSTRAINT IF EXISTS "expenses_organization_id_organization_id_fk";
ALTER TABLE "main"."expenses"
  ADD CONSTRAINT "expenses_organization_id_organization_id_fk"
  FOREIGN KEY ("organization_id") REFERENCES "auth"."organization"("id")
  ON DELETE RESTRICT ON UPDATE NO ACTION;

-- Fix session.userId and account.userId FK to CASCADE (matches Better Auth default).
-- Current constraint is NO ACTION which blocks user deletion.

ALTER TABLE "auth"."session"
  DROP CONSTRAINT IF EXISTS "session_user_id_user_id_fk";
ALTER TABLE "auth"."session"
  ADD CONSTRAINT "session_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "auth"."account"
  DROP CONSTRAINT IF EXISTS "account_user_id_user_id_fk";
ALTER TABLE "auth"."account"
  ADD CONSTRAINT "account_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
