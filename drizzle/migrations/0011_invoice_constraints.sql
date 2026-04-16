-- Make issue_date and due_date NOT NULL on invoices
-- Existing rows already have values set (enforced by application layer since creation).
ALTER TABLE "main"."invoices"
  ALTER COLUMN "issue_date" SET NOT NULL,
  ALTER COLUMN "due_date" SET NOT NULL;

--> statement-breakpoint

-- Prevent duplicate journal entries for the same invoice (mirrors the existing expense unique).
CREATE UNIQUE INDEX "journal_entries_invoice_unique" ON "main"."journal_entries" ("invoice_id");
