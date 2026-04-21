CREATE TABLE "auth"."dev_operator_access" (
  "user_id" text PRIMARY KEY NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth"."dev_operator_access"
  ADD CONSTRAINT "dev_operator_access_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;