ALTER TABLE "auth"."user"
ADD COLUMN "is_anonymous" boolean DEFAULT false NOT NULL;
