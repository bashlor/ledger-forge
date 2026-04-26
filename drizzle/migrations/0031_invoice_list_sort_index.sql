CREATE INDEX "invoices_org_issue_date_number_idx"
  ON "main"."invoices" ("organization_id", "issue_date" DESC, "invoice_number" DESC);
