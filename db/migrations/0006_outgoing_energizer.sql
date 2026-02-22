CREATE TYPE "public"."receiving_status" AS ENUM('DRAFT', 'POSTED', 'VOID');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_reference" AS ENUM('RECEIVING', 'ADJUSTMENT', 'OPNAME', 'SALE', 'RETURN');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('IN', 'OUT', 'ADJUST');--> statement-breakpoint
CREATE TYPE "public"."stock_opname_status" AS ENUM('IN_PROGRESS', 'FINALIZED', 'VOID');--> statement-breakpoint
CREATE TABLE "receiving_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"receiving_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"qty" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receivings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "receiving_status" DEFAULT 'DRAFT' NOT NULL,
	"note" text,
	"posted_at" timestamp with time zone,
	"voided_at" timestamp with time zone,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"stock_adjustment_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"qty_diff" numeric(14, 2) NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"type" "stock_movement_type" NOT NULL,
	"qty" numeric(14, 2) NOT NULL,
	"reference_type" "stock_movement_reference" NOT NULL,
	"reference_id" uuid NOT NULL,
	"note" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opname_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"stock_opname_id" uuid NOT NULL,
	"product_variant_id" uuid NOT NULL,
	"system_qty" numeric(14, 2) NOT NULL,
	"counted_qty" numeric(14, 2) NOT NULL,
	"diff_qty" numeric(14, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_opnames" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"status" "stock_opname_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"note" text,
	"started_by" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finalized_by" uuid,
	"finalized_at" timestamp with time zone,
	"voided_by" uuid,
	"voided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_receiving_id_receivings_id_fk" FOREIGN KEY ("receiving_id") REFERENCES "public"."receivings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receiving_items" ADD CONSTRAINT "receiving_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receivings" ADD CONSTRAINT "receivings_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_stock_adjustment_id_stock_adjustments_id_fk" FOREIGN KEY ("stock_adjustment_id") REFERENCES "public"."stock_adjustments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustment_items" ADD CONSTRAINT "stock_adjustment_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "stock_adjustments_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_stock_opname_id_stock_opnames_id_fk" FOREIGN KEY ("stock_opname_id") REFERENCES "public"."stock_opnames"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opname_items" ADD CONSTRAINT "stock_opname_items_product_variant_id_product_variants_id_fk" FOREIGN KEY ("product_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_started_by_users_id_fk" FOREIGN KEY ("started_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_finalized_by_users_id_fk" FOREIGN KEY ("finalized_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_opnames" ADD CONSTRAINT "stock_opnames_voided_by_users_id_fk" FOREIGN KEY ("voided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "receiving_items_company_receiving_idx" ON "receiving_items" USING btree ("company_id","receiving_id");--> statement-breakpoint
CREATE INDEX "receiving_items_company_variant_idx" ON "receiving_items" USING btree ("company_id","product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "receiving_items_receiving_variant_unique" ON "receiving_items" USING btree ("receiving_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "receivings_company_created_at_idx" ON "receivings" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "receivings_company_status_idx" ON "receivings" USING btree ("company_id","status");--> statement-breakpoint
CREATE INDEX "stock_adjustment_items_company_adjustment_idx" ON "stock_adjustment_items" USING btree ("company_id","stock_adjustment_id");--> statement-breakpoint
CREATE INDEX "stock_adjustment_items_company_variant_idx" ON "stock_adjustment_items" USING btree ("company_id","product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_adjustment_items_adjustment_variant_unique" ON "stock_adjustment_items" USING btree ("stock_adjustment_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "stock_adjustments_company_created_at_idx" ON "stock_adjustments" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_company_created_at_idx" ON "stock_movements" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_movements_company_variant_idx" ON "stock_movements" USING btree ("company_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "stock_movements_company_reference_idx" ON "stock_movements" USING btree ("company_id","reference_type","reference_id");--> statement-breakpoint
CREATE INDEX "stock_opname_items_company_opname_idx" ON "stock_opname_items" USING btree ("company_id","stock_opname_id");--> statement-breakpoint
CREATE INDEX "stock_opname_items_company_variant_idx" ON "stock_opname_items" USING btree ("company_id","product_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_opname_items_opname_variant_unique" ON "stock_opname_items" USING btree ("stock_opname_id","product_variant_id");--> statement-breakpoint
CREATE INDEX "stock_opnames_company_created_at_idx" ON "stock_opnames" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE INDEX "stock_opnames_company_status_idx" ON "stock_opnames" USING btree ("company_id","status");