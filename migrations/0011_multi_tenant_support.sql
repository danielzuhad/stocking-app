CREATE TABLE IF NOT EXISTS "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(120) NOT NULL,
	"slug" varchar(120) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "companies_name_unique" UNIQUE("name"),
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
INSERT INTO "companies" ("id", "name", "slug") VALUES ('00000000-0000-4000-8000-000000000001', 'Default Company', 'default-company') ON CONFLICT ("id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;--> statement-breakpoint
UPDATE "users" SET "company_id" = '00000000-0000-4000-8000-000000000001' WHERE "company_id" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "company_id" uuid;--> statement-breakpoint
UPDATE "items" SET "company_id" = '00000000-0000-4000-8000-000000000001' WHERE "company_id" IS NULL;--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD COLUMN "company_id" uuid;--> statement-breakpoint
UPDATE "inventory_activities" SET "company_id" = '00000000-0000-4000-8000-000000000001' WHERE "company_id" IS NULL;--> statement-breakpoint
ALTER TABLE "inventory_activities" ALTER COLUMN "company_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory_activities" ADD CONSTRAINT "inventory_activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
