ALTER TABLE "users" RENAME COLUMN "uid" TO "id";--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

ALTER TABLE "companies" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint

ALTER TABLE "items" DROP CONSTRAINT IF EXISTS "items_created_user_uid_users_uid_fk";--> statement-breakpoint
ALTER TABLE "items" RENAME COLUMN "created_user_uid" TO "created_by_user_id";--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "item_variants" ADD COLUMN "created_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "item_variants" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "item_variants" ADD CONSTRAINT "item_variants_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_variants" ADD CONSTRAINT "item_variants_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "inventory_activities" DROP CONSTRAINT IF EXISTS "inventory_activities_created_user_uid_users_uid_fk";--> statement-breakpoint
ALTER TABLE "inventory_activities" RENAME COLUMN "created_user_uid" TO "created_by_user_id";--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD COLUMN "updated_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
