-- Drop the legacy customer_name column from invoices.
-- This column was a duplicate of customer_company_name kept for historical compatibility.
-- All rows have been written with customer_name = customer_company_name since migration 0009.
ALTER TABLE "main"."invoices" DROP COLUMN "customer_name";
