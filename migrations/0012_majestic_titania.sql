CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name"),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "inventory_activities" DROP CONSTRAINT "inventory_activities_created_by_users_uid_fk";
--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD COLUMN "created_user_uid" uuid;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "company_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_created_user_uid_users_uid_fk" FOREIGN KEY ("created_user_uid") REFERENCES "public"."users"("uid") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" DROP COLUMN "created_by";