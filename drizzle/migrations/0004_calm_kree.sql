CREATE TABLE "main"."customers" (
	"company" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"email" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"phone" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "main"."invoice_lines" (
	"description" text NOT NULL,
	"id" text PRIMARY KEY NOT NULL,
	"invoice_id" text NOT NULL,
	"line_number" integer NOT NULL,
	"line_total_excl_tax_cents" integer NOT NULL,
	"line_total_incl_tax_cents" integer NOT NULL,
	"line_total_vat_cents" integer NOT NULL,
	"quantity_cents" integer NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"vat_rate_cents" integer NOT NULL,
	CONSTRAINT "invoice_lines_invoice_line_unique" UNIQUE("invoice_id","line_number")
);
--> statement-breakpoint
CREATE TABLE "main"."invoices" (
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"customer_id" text NOT NULL,
	"customer_name" text NOT NULL,
	"due_date" date,
	"id" text PRIMARY KEY NOT NULL,
	"invoice_number" text NOT NULL,
	"issue_date" date,
	"status" text DEFAULT 'draft' NOT NULL,
	"subtotal_excl_tax_cents" integer DEFAULT 0 NOT NULL,
	"total_incl_tax_cents" integer DEFAULT 0 NOT NULL,
	"total_vat_cents" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number"),
	CONSTRAINT "invoices_status_check" CHECK ("main"."invoices"."status" IN ('draft', 'issued', 'paid'))
);
--> statement-breakpoint
ALTER TABLE "main"."journal_entries" DROP CONSTRAINT "journal_entries_type_check";--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ALTER COLUMN "expense_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ALTER COLUMN "type" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ADD COLUMN "invoice_id" text;--> statement-breakpoint
ALTER TABLE "main"."invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "main"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "main"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ADD CONSTRAINT "journal_entries_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "main"."invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ADD CONSTRAINT "journal_entries_source_xor" CHECK (("main"."journal_entries"."expense_id" IS NOT NULL)::int + ("main"."journal_entries"."invoice_id" IS NOT NULL)::int = 1);--> statement-breakpoint
ALTER TABLE "main"."journal_entries" ADD CONSTRAINT "journal_entries_type_check" CHECK ("main"."journal_entries"."type" IN ('expense', 'invoice'));