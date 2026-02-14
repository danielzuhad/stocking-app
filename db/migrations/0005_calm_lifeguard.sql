CREATE TYPE "public"."product_unit" AS ENUM('PCS', 'BOTTLE', 'PACK', 'BOX', 'SET', 'OTHER');--> statement-breakpoint
ALTER TABLE "products"
ALTER COLUMN "unit" SET DATA TYPE "public"."product_unit"
USING (
  CASE
    WHEN lower(trim("unit")) IN ('pcs', 'pc', 'piece', 'pieces') THEN 'PCS'::"public"."product_unit"
    WHEN lower(trim("unit")) IN ('bottle', 'botol') THEN 'BOTTLE'::"public"."product_unit"
    WHEN lower(trim("unit")) IN ('pack', 'pak') THEN 'PACK'::"public"."product_unit"
    WHEN lower(trim("unit")) IN ('box', 'dus', 'kardus') THEN 'BOX'::"public"."product_unit"
    WHEN lower(trim("unit")) = 'set' THEN 'SET'::"public"."product_unit"
    ELSE 'OTHER'::"public"."product_unit"
  END
);--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "unit" SET DEFAULT 'PCS'::"public"."product_unit";
