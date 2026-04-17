-- Add a CHECK constraint to enforce the allowed expense categories.
-- The list mirrors EXPENSE_CATEGORIES in expense_service.ts.
ALTER TABLE "main"."expenses"
  ADD CONSTRAINT "expenses_category_check"
  CHECK (category IN ('Software', 'Infrastructure', 'Office', 'Travel', 'Services', 'Other'));
