CREATE TYPE "public"."action_enum" AS ENUM('create_item', 'update_item', 'stock_in', 'stock_out', 'sale', 'return');--> statement-breakpoint
CREATE TYPE "public"."source_type_activity_enum" AS ENUM('purchase_order', 'sale', 'manual', 'return');--> statement-breakpoint
ALTER TABLE "inventory_activities" ALTER COLUMN "action" SET DATA TYPE "public"."action_enum" USING "action"::"public"."action_enum";--> statement-breakpoint
ALTER TABLE "inventory_activities" ALTER COLUMN "source_type" SET DATA TYPE "public"."source_type_activity_enum" USING "source_type"::"public"."source_type_activity_enum";--> statement-breakpoint
ALTER TABLE "inventory_activities" ALTER COLUMN "source_type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "item_variants" ADD COLUMN "price" numeric(12, 2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE "item_variants" ADD COLUMN "created_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "item_variants" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "created_user_uid" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_created_user_uid_users_uid_fk" FOREIGN KEY ("created_user_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "price";