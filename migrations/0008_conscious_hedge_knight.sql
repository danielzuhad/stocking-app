CREATE TYPE "public"."unit_enum" AS ENUM('pcs', 'box', 'kg', 'g', 'm', 'cm', 'l', 'ml');--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "unit" SET DEFAULT 'pcs'::"public"."unit_enum";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "unit" SET DATA TYPE "public"."unit_enum" USING "unit"::"public"."unit_enum";--> statement-breakpoint
ALTER TABLE "items" ALTER COLUMN "unit" SET NOT NULL;