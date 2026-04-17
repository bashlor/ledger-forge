-- Enforce referential integrity at the DB level: deleting an expense or invoice
-- that already has a journal entry is explicitly forbidden (RESTRICT).
--
-- The service prevents this via business rules (only drafts — which never have
-- journal entries — can be deleted), but the constraint adds a second line of
-- defence against direct DB access or future code paths that bypass the service.

ALTER TABLE "main"."journal_entries"
  DROP CONSTRAINT IF EXISTS "journal_entries_expense_id_expenses_id_fk";

ALTER TABLE "main"."journal_entries"
  ADD CONSTRAINT "journal_entries_expense_id_expenses_id_fk"
    FOREIGN KEY ("expense_id")
    REFERENCES "main"."expenses"("id")
    ON DELETE RESTRICT;

ALTER TABLE "main"."journal_entries"
  DROP CONSTRAINT IF EXISTS "journal_entries_invoice_id_invoices_id_fk";

ALTER TABLE "main"."journal_entries"
  ADD CONSTRAINT "journal_entries_invoice_id_invoices_id_fk"
    FOREIGN KEY ("invoice_id")
    REFERENCES "main"."invoices"("id")
    ON DELETE RESTRICT;
