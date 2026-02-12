CREATE TYPE "public"."product_category" AS ENUM('FASHION', 'COSMETIC', 'GENERAL');--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET DATA TYPE "public"."product_category" USING (
  CASE
    WHEN "category" IS NULL OR btrim("category") = '' THEN 'GENERAL'
    WHEN upper("category") = 'FASHION' THEN 'FASHION'
    WHEN upper("category") = 'COSMETIC' THEN 'COSMETIC'
    WHEN upper("category") = 'GENERAL' THEN 'GENERAL'
    ELSE 'GENERAL'
  END
)::"public"."product_category";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET DEFAULT 'GENERAL'::"public"."product_category";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "category" SET NOT NULL;
