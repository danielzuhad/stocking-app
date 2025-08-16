CREATE TABLE "inventory_activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"item_variant_id" uuid,
	"action" text NOT NULL,
	"quantity_change" integer,
	"stock_before" integer,
	"stock_after" integer,
	"source_type" text,
	"source_id" uuid,
	"description" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_item_variant_id_item_variants_id_fk" FOREIGN KEY ("item_variant_id") REFERENCES "public"."item_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_created_by_users_uid_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;