// src/app/api/items/route.ts
import { db } from "@/db";
import { logActivity } from "@/lib/log-activity";
import { getValidEnumValue } from "@/lib/utils";
import { categoryEnum, itemsTable, itemVariantsTable, ItemVariantType } from "@/schema";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const page = Number(searchParams.get("page") || 1);
  const limit = Number(searchParams.get("limit") || 10);
  const offset = (page - 1) * limit;

  const search = searchParams.get("search") || "";
  // Ambil category dari URL, validasi berdasarkan enum
  const created_user_uid = searchParams.get("created_user_uid");
  const sort = searchParams.get("sort") || "created_at";
  const order = searchParams.get("order") || "desc";

  const validCategory = getValidEnumValue(searchParams.get("category"), categoryEnum);

  const whereClause = and(
    search
      ? or(ilike(itemsTable.name, `%${search}%`), ilike(itemsTable.brand, `%${search}%`))
      : undefined,
    validCategory ? eq(itemsTable.category, validCategory) : undefined,
    created_user_uid ? eq(itemsTable.created_user_uid, created_user_uid) : undefined
  );

  const sortableColumns = {
    created_at: itemsTable.created_at,
  } as const;

  type SortKey = keyof typeof sortableColumns;
  const sortKey = sort as SortKey;

  const orderBy = order === "asc" ? asc(sortableColumns[sortKey]) : desc(sortableColumns[sortKey]);

  const [items, total] = await Promise.all([
    db.query.itemsTable.findMany({
      where: whereClause,
      with: { variants: true, created_by: true },
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
  try {
    const body = await req.json();
    const { name, description, category, unit, brand, sku, created_user_uid, variants = [] } = body;

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
          created_user_uid,
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
              (v: { color: never; size: never; sku: never; price: never; quantity: never }) => ({
                item_id: newItem.id,
                color: v.color,
                size: v.size,
                sku: v.sku,
                price: v.price ?? 0,
                quantity: v.quantity ?? 0,
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
        created_user_uid,
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
