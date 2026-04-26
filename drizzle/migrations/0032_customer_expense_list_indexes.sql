CREATE INDEX "customers_org_company_id_idx"
  ON "main"."customers" ("organization_id", "company", "id");
--> statement-breakpoint
CREATE INDEX "expenses_org_date_label_idx"
  ON "main"."expenses" ("organization_id", "date" DESC, "label");
--> statement-breakpoint
CREATE INDEX "invoices_org_customer_idx"
  ON "main"."invoices" ("organization_id", "customer_id");
