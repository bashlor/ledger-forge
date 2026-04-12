CREATE TABLE "main"."journal_entries" (
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"date" date NOT NULL,
	"expense_id" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"type" text DEFAULT 'expense' NOT NULL,
	CONSTRAINT "journal_entries_amount_positive" CHECK ("main"."journal_entries"."amount_cents" > 0),
	CONSTRAINT "journal_entries_type_check" CHECK ("main"."journal_entries"."type" IN ('expense'))
);
--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ADD CONSTRAINT "journal_entries_expense_id_expenses_id_fk" FOREIGN KEY ("expense_id") REFERENCES "main"."expenses"("id") ON DELETE no action ON UPDATE no action;