UPDATE "auth"."member"
SET "role" = 'member'
WHERE "is_active" = false
  AND "role" = 'admin';
--> statement-breakpoint
ALTER TABLE "auth"."member"
  ADD CONSTRAINT "auth_member_inactive_admin_forbidden"
  CHECK (NOT ("is_active" = false AND "role" = 'admin'));
