// src/app/api/items/route.ts
import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { logActivity } from "@/lib/log-activity";
import { getValidEnumValue } from "@/lib/utils";
import {
  categoryEnum,
  itemsTable,
  itemVariantsTable,
  ItemVariantType,
  unitEnum,
} from "@/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const variantSchema = z.object({
  color: z.string().min(1, "Variant is required."),
  size: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  price: z.number().min(0, "Price is required."),
  quantity: z.number().int().min(0, "Quantity is required."),
});

const createItemSchema = z.object({
  name: z.string().min(1, "Product name is required."),
  description: z.string().optional().nullable(),
  brand: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  category: z.literal("fashion"),
  unit: z.enum(unitEnum.enumValues as [string, ...string[]]),
  image: z
    .object({
      url: z.string().url(),
      fileId: z.string().optional().nullable(),
    })
    .optional()
    .nullable(),
  variants: z.array(variantSchema).min(1, "At least one variant is required."),
});

const sortableColumns = {
  created_at: itemsTable.created_at,
} as const;

type SortKey = keyof typeof sortableColumns;

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isSuperAdmin = session.user.role === "super_admin";
  const sessionCompanyId = session.user.companyId;
  const companyParam = searchParams.get("company_id");

  if (!isSuperAdmin && !sessionCompanyId) {
    return NextResponse.json(
      { success: false, message: "Company context missing for this account." },
      { status: 400 }
    );
  }

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  // Ambil category dari URL, validasi berdasarkan enum
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";

  const validCategory = getValidEnumValue(searchParams.get("category"), categoryEnum);

  const companyFilter = isSuperAdmin ? companyParam : sessionCompanyId;

  const whereClause = and(
    search
      ? or(ilike(itemsTable.name, `%${search}%`), ilike(itemsTable.brand, `%${search}%`))
      : undefined,
    validCategory ? eq(itemsTable.category, validCategory) : undefined,
    companyFilter ? eq(itemsTable.company_id, companyFilter) : undefined
  );

  const sortColumn = sortableColumns[sort as SortKey] ?? sortableColumns.created_at;
  const orderBy = order === "asc" ? asc(sortColumn) : desc(sortColumn);

  const [items, total] = await Promise.all([
    db.query.itemsTable.findMany({
      where: whereClause,
      with: { variants: true, created_by: true, company: true },
      orderBy,
      limit,
      offset,
    }),
    db
      .select({ count: sql<number>`count(*)` })
      .from(itemsTable)
      .where(whereClause),
  ]);

  return NextResponse.json({
    success: true,
    status: 200,
    message: "Items retrieved successfully",
    data: items,
    meta: {
      total: Number(total[0]?.count || 0),
      page,
      limit,
      total_pages: Math.ceil(Number(total[0]?.count || 0) / limit),
    },
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const companyId = session.user.companyId;

  if (!companyId) {
    return NextResponse.json(
      { success: false, message: "You must be assigned to a company to create items." },
      { status: 400 }
    );
  }

  try {
    const body = await req.json();
    const parsed = createItemSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid payload", errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, description, category, unit, brand, sku, variants, image } = parsed.data;

    const item = await db.transaction(async (tx) => {
      // 1️⃣ Create item
      const [newItem] = await tx
        .insert(itemsTable)
        .values({
          name,
          description,
          category,
          unit,
          brand,
          sku,
          created_by_user_id: session.user.id,
          updated_by_user_id: session.user.id,
          company_id: companyId,
          image: image
            ? {
                url: image.url,
                fileId: image.fileId,
              }
            : null,
        })
        .returning();

      // 2️⃣ Create variants (if any)
      let newVariants: ItemVariantType[] = [];
      let totalStock = 0;

      if (variants.length > 0) {
        newVariants = await tx
          .insert(itemVariantsTable)
          .values(
            variants.map(
              (v) => ({
                item_id: newItem.id,
                color: v.color,
                size: v.size,
                sku: v.sku,
                price: v.price ?? 0,
                quantity: v.quantity ?? 0,
                created_by_user_id: session.user.id,
                updated_by_user_id: session.user.id,
              })
            )
          )
          .returning();

        totalStock = newVariants.reduce((sum, v) => sum + (v.quantity ?? 0), 0);
      }

      await logActivity(tx, {
        item_id: newItem.id,
        action: "create_item",
        source_type: "manual",
        description:
          variants.length > 0
            ? `Created new item with ${variants.length} variants (total stock: ${totalStock})`
            : "Created new item without variants",
        created_by_user_id: session.user.id,
        updated_by_user_id: session.user.id,
        company_id: companyId,
        stock_before: 0,
        stock_after: totalStock,
        quantity_change: totalStock,
      });

      return { newItem, newVariants };
    });

    return NextResponse.json({
      success: true,
      status: 201,
      message: "Item and variants created successfully",
      data: item,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
}
