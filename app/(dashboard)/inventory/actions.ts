'use server';

import {
  and,
  eq,
  inArray,
  isNull,
  sql,
} from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import {
  products,
  productVariants,
  receivingItems,
  receivings,
  stockAdjustmentItems,
  stockAdjustments,
  stockMovements,
  stockOpnameItems,
  stockOpnames,
} from '@/db/schema';
import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { logActivity } from '@/lib/audit';
import {
  RECEIVING_STATUS_DRAFT,
  RECEIVING_STATUS_POSTED,
  RECEIVING_STATUS_VOID,
  STOCK_MOVEMENT_ADJUST,
  STOCK_MOVEMENT_IN,
  STOCK_MOVEMENT_OUT,
  STOCK_MOVEMENT_REFERENCE_ADJUSTMENT,
  STOCK_MOVEMENT_REFERENCE_OPNAME,
  STOCK_MOVEMENT_REFERENCE_RECEIVING,
  STOCK_OPNAME_STATUS_FINALIZED,
  STOCK_OPNAME_STATUS_IN_PROGRESS,
  STOCK_OPNAME_STATUS_VOID,
  type ReceivingStatusType,
} from '@/lib/inventory/enums';
import {
  findNegativeStockVariant,
  mergeVariantDiffs,
} from '@/lib/inventory/stock';
import { getErrorPresentation } from '@/lib/errors/presentation';
import { toFixedScaleNumberText, toNullableTrimmedText } from '@/lib/utils';
import {
  createReceivingDraftSchema,
  createStockAdjustmentSchema,
  finalizeStockOpnameSchema,
  receivingLifecycleSchema,
  startStockOpnameSchema,
  updateStockOpnameItemSchema,
  voidStockOpnameSchema,
} from '@/lib/validation/inventory';

import { requireInventoryWriteContext } from './guards';

const INVENTORY_PATH = '/inventory';

type DbSelectClientType = Pick<typeof db, 'select'>;

/**
 * Converts SQL numeric value into JavaScript number safely.
 */
function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

/**
 * Merges receiving items with duplicate variant ids.
 */
function normalizeReceivingItems(
  items: Array<{ product_variant_id: string; qty: number; note?: string }>,
): Array<{ product_variant_id: string; qty: number; note: string | null }> {
  const merged = new Map<string, { qty: number; note: string | null }>();

  for (const item of items) {
    const note = toNullableTrimmedText(item.note);
    const existing = merged.get(item.product_variant_id);

    if (!existing) {
      merged.set(item.product_variant_id, {
        qty: item.qty,
        note,
      });
      continue;
    }

    merged.set(item.product_variant_id, {
      qty: existing.qty + item.qty,
      note: existing.note ?? note,
    });
  }

  return Array.from(merged.entries()).map(([product_variant_id, payload]) => ({
    product_variant_id,
    qty: payload.qty,
    note: payload.note,
  }));
}

/**
 * Merges stock adjustment items with duplicate variant ids.
 */
function normalizeStockAdjustmentItems(
  items: Array<{ product_variant_id: string; qty_diff: number; note?: string }>,
): Array<{ product_variant_id: string; qty_diff: number; note: string | null }> {
  const merged = new Map<string, { qty_diff: number; note: string | null }>();

  for (const item of items) {
    const note = toNullableTrimmedText(item.note);
    const existing = merged.get(item.product_variant_id);

    if (!existing) {
      merged.set(item.product_variant_id, {
        qty_diff: item.qty_diff,
        note,
      });
      continue;
    }

    merged.set(item.product_variant_id, {
      qty_diff: existing.qty_diff + item.qty_diff,
      note: existing.note ?? note,
    });
  }

  return Array.from(merged.entries())
    .map(([product_variant_id, payload]) => ({
      product_variant_id,
      qty_diff: payload.qty_diff,
      note: payload.note,
    }))
    .filter((item) => item.qty_diff !== 0);
}

/**
 * Loads current stock balances per variant from append-only stock movement ledger.
 */
async function getCurrentStockByVariantIds(
  client: DbSelectClientType,
  input: { company_id: string; product_variant_ids: string[] },
): Promise<Map<string, number>> {
  if (input.product_variant_ids.length === 0) return new Map<string, number>();

  const qtyDeltaSql = sql<string>`coalesce(
    sum(
      case
        when ${stockMovements.type} = ${STOCK_MOVEMENT_IN} then ${stockMovements.qty}
        when ${stockMovements.type} = ${STOCK_MOVEMENT_OUT} then ${stockMovements.qty} * -1
        else ${stockMovements.qty}
      end
    ),
    0
  )`;

  const rows = await client
    .select({
      product_variant_id: stockMovements.product_variant_id,
      stock_qty: qtyDeltaSql,
    })
    .from(stockMovements)
    .where(
      and(
        eq(stockMovements.company_id, input.company_id),
        inArray(stockMovements.product_variant_id, input.product_variant_ids),
      ),
    )
    .groupBy(stockMovements.product_variant_id);

  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.product_variant_id, toNumber(row.stock_qty));
  }

  return map;
}

/**
 * Ensures all referenced variants belong to active company and are not soft-deleted.
 */
async function ensureVariantsBelongToCompany(input: {
  company_id: string;
  product_variant_ids: string[];
}): Promise<ActionResult<{ ok: true }>> {
  if (input.product_variant_ids.length === 0) {
    return err('INVALID_INPUT', 'Minimal satu varian wajib dipilih.');
  }

  const existingVariantRows = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .where(
      and(
        eq(productVariants.company_id, input.company_id),
        eq(products.company_id, input.company_id),
        inArray(productVariants.id, input.product_variant_ids),
        isNull(productVariants.deleted_at),
        isNull(products.deleted_at),
      ),
    );

  const existingIds = new Set(existingVariantRows.map((row) => row.id));
  const invalid = input.product_variant_ids.find((id) => !existingIds.has(id));
  if (invalid) {
    return err('INVALID_INPUT', 'Ada varian produk yang tidak valid.');
  }

  return ok({ ok: true });
}

/**
 * Returns active stock opname id when inventory is currently locked.
 */
async function getActiveStockOpnameId(
  client: DbSelectClientType,
  company_id: string,
): Promise<string | null> {
  const [activeOpname] = await client
    .select({ id: stockOpnames.id })
    .from(stockOpnames)
    .where(
      and(
        eq(stockOpnames.company_id, company_id),
        eq(stockOpnames.status, STOCK_OPNAME_STATUS_IN_PROGRESS),
      ),
    )
    .limit(1);

  return activeOpname?.id ?? null;
}

/**
 * Blocks stock-mutating actions while stock opname is still `IN_PROGRESS`.
 */
async function ensureNoActiveStockOpname(input: {
  company_id: string;
}): Promise<ActionResult<{ ok: true }>> {
  const activeStockOpnameId = await getActiveStockOpnameId(db, input.company_id);
  if (activeStockOpnameId) {
    return err(
      'CONFLICT',
      'Stok opname sedang berjalan. Posting mutasi stok diblokir sampai opname selesai.',
    );
  }

  return ok({ ok: true });
}

/**
 * Enforces no-minus-stock rule against current ledger balance + incoming diffs.
 */
async function ensureNoNegativeStockAfterDiffs(input: {
  company_id: string;
  qtyDiffsByVariant: Map<string, number>;
}): Promise<ActionResult<{ ok: true }>> {
  if (input.qtyDiffsByVariant.size === 0) return ok({ ok: true });

  const productVariantIds = Array.from(input.qtyDiffsByVariant.keys());
  const currentBalances = await getCurrentStockByVariantIds(db, {
    company_id: input.company_id,
    product_variant_ids: productVariantIds,
  });

  const negative = findNegativeStockVariant(
    currentBalances,
    input.qtyDiffsByVariant,
  );

  if (negative) {
    return err('CONFLICT', 'Stok tidak mencukupi. Minus stok tidak diizinkan.');
  }

  return ok({ ok: true });
}

/**
 * Creates receiving with detail items as `DRAFT` or direct `POSTED`.
 *
 * Permission:
 * - `ADMIN` and `SUPERADMIN` only.
 *
 * Invariants:
 * - direct `POSTED` creation is blocked while stock opname `IN_PROGRESS`.
 *
 * Side effects:
 * - writes `receivings`, `receiving_items`, `activity_logs`
 * - appends `stock_movements` when status is `POSTED`
 */
export async function createReceivingDraftAction(
  input: unknown,
): Promise<
  ActionResult<{ receiving_id: string; status: ReceivingStatusType }>
> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = createReceivingDraftSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const normalizedItems = normalizeReceivingItems(parsed.data.items);
  if (normalizedItems.length === 0) {
    return err('INVALID_INPUT', 'Minimal satu item penerimaan wajib diisi.');
  }

  const variantValidation = await ensureVariantsBelongToCompany({
    company_id,
    product_variant_ids: normalizedItems.map((item) => item.product_variant_id),
  });
  if (!variantValidation.ok) return variantValidation;

  const targetStatus = parsed.data.status;
  if (targetStatus === RECEIVING_STATUS_POSTED) {
    const activeOpnameResult = await ensureNoActiveStockOpname({ company_id });
    if (!activeOpnameResult.ok) return activeOpnameResult;
  }

  try {
    const created = await db.transaction(async (tx) => {
      const now = new Date();
      const totalQty = normalizedItems.reduce((total, item) => total + item.qty, 0);

      const [createdReceiving] = await tx
        .insert(receivings)
        .values({
          company_id,
          status: targetStatus,
          note: toNullableTrimmedText(parsed.data.note),
          posted_at: targetStatus === RECEIVING_STATUS_POSTED ? now : null,
          created_by: session.user.id,
          created_at: now,
          updated_at: now,
        })
        .returning({ id: receivings.id, status: receivings.status });

      await tx.insert(receivingItems).values(
        normalizedItems.map((item) => ({
          company_id,
          receiving_id: createdReceiving!.id,
          product_variant_id: item.product_variant_id,
          qty: toFixedScaleNumberText(item.qty),
          note: item.note,
          created_at: now,
        })),
      );

      if (targetStatus === RECEIVING_STATUS_POSTED) {
        await tx.insert(stockMovements).values(
          normalizedItems.map((item) => ({
            company_id,
            product_variant_id: item.product_variant_id,
            type: STOCK_MOVEMENT_IN,
            qty: toFixedScaleNumberText(item.qty),
            reference_type: STOCK_MOVEMENT_REFERENCE_RECEIVING,
            reference_id: createdReceiving!.id,
            note: item.note,
            created_by: session.user.id,
            created_at: now,
            effective_at: now,
          })),
        );
      }

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.receiving.created',
        target_type: 'receiving',
        target_id: createdReceiving!.id,
        meta: {
          status: targetStatus,
          item_count: normalizedItems.length,
          total_qty: totalQty,
        },
      });

      if (targetStatus === RECEIVING_STATUS_POSTED) {
        await logActivity(tx, {
          company_id,
          actor_user_id: session.user.id,
          action: 'inventory.receiving.posted',
          target_type: 'receiving',
          target_id: createdReceiving!.id,
          meta: {
            item_count: normalizedItems.length,
            total_qty: totalQty,
          },
        });
      }

      return createdReceiving!;
    });

    revalidatePath(INVENTORY_PATH);
    return ok({ receiving_id: created.id, status: created.status });
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_RECEIVING_CREATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Posts receiving draft and writes stock movement `IN` ledger entries.
 *
 * Invariants:
 * - receiving must still be `DRAFT`
 * - blocked while stock opname `IN_PROGRESS`
 *
 * Side effects:
 * - updates `receivings`
 * - appends `stock_movements`
 * - writes `activity_logs`
 */
export async function postReceivingAction(
  input: unknown,
): Promise<ActionResult<{ receiving_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = receivingLifecycleSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const activeOpnameResult = await ensureNoActiveStockOpname({ company_id });
  if (!activeOpnameResult.ok) return activeOpnameResult;

  try {
    const posted = await db.transaction(async (tx) => {
      const now = new Date();

      const [postedReceiving] = await tx
        .update(receivings)
        .set({
          status: RECEIVING_STATUS_POSTED,
          posted_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(receivings.id, parsed.data.receiving_id),
            eq(receivings.company_id, company_id),
            eq(receivings.status, RECEIVING_STATUS_DRAFT),
          ),
        )
        .returning({ id: receivings.id });

      if (!postedReceiving) {
        const [existingReceiving] = await tx
          .select({ status: receivings.status })
          .from(receivings)
          .where(
            and(
              eq(receivings.id, parsed.data.receiving_id),
              eq(receivings.company_id, company_id),
            ),
          )
          .limit(1);

        if (!existingReceiving) return null;
        if (existingReceiving.status === RECEIVING_STATUS_POSTED) {
          throw new Error('RECEIVING_ALREADY_POSTED');
        }
        if (existingReceiving.status === RECEIVING_STATUS_VOID) {
          throw new Error('RECEIVING_ALREADY_VOID');
        }

        throw new Error('RECEIVING_NOT_DRAFT');
      }

      const items = await tx
        .select({
          product_variant_id: receivingItems.product_variant_id,
          qty: receivingItems.qty,
          note: receivingItems.note,
        })
        .from(receivingItems)
        .where(
          and(
            eq(receivingItems.company_id, company_id),
            eq(receivingItems.receiving_id, postedReceiving.id),
          ),
        );

      if (items.length === 0) {
        throw new Error('RECEIVING_ITEMS_EMPTY');
      }

      await tx.insert(stockMovements).values(
        items.map((item) => ({
          company_id,
          product_variant_id: item.product_variant_id,
          type: STOCK_MOVEMENT_IN,
          qty: toFixedScaleNumberText(toNumber(item.qty)),
          reference_type: STOCK_MOVEMENT_REFERENCE_RECEIVING,
          reference_id: postedReceiving.id,
          note: item.note,
          created_by: session.user.id,
          created_at: now,
          effective_at: now,
        })),
      );

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.receiving.posted',
        target_type: 'receiving',
        target_id: postedReceiving.id,
        meta: {
          item_count: items.length,
          total_qty: items.reduce((total, item) => total + toNumber(item.qty), 0),
        },
      });

      return postedReceiving;
    });

    if (!posted) return err('NOT_FOUND', 'Penerimaan tidak ditemukan.');

    revalidatePath(INVENTORY_PATH);
    return ok({ receiving_id: posted.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'RECEIVING_ALREADY_POSTED') {
      return err('CONFLICT', 'Penerimaan sudah diposting sebelumnya.');
    }
    if (message === 'RECEIVING_ALREADY_VOID') {
      return err('CONFLICT', 'Penerimaan sudah dibatalkan.');
    }
    if (message === 'RECEIVING_NOT_DRAFT') {
      return err('CONFLICT', 'Hanya penerimaan draf yang bisa diposting.');
    }
    if (message === 'RECEIVING_ITEMS_EMPTY') {
      return err('INVALID_INPUT', 'Penerimaan tidak punya item.');
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_RECEIVING_POST_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Voids receiving draft without writing stock movements.
 */
export async function voidReceivingAction(
  input: unknown,
): Promise<ActionResult<{ receiving_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = receivingLifecycleSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  try {
    const voided = await db.transaction(async (tx) => {
      const now = new Date();

      const [voidedReceiving] = await tx
        .update(receivings)
        .set({
          status: RECEIVING_STATUS_VOID,
          voided_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(receivings.id, parsed.data.receiving_id),
            eq(receivings.company_id, company_id),
            eq(receivings.status, RECEIVING_STATUS_DRAFT),
          ),
        )
        .returning({ id: receivings.id });

      if (!voidedReceiving) {
        const [existingReceiving] = await tx
          .select({ status: receivings.status })
          .from(receivings)
          .where(
            and(
              eq(receivings.id, parsed.data.receiving_id),
              eq(receivings.company_id, company_id),
            ),
          )
          .limit(1);

        if (!existingReceiving) return null;
        if (existingReceiving.status === RECEIVING_STATUS_POSTED) {
          throw new Error('RECEIVING_ALREADY_POSTED');
        }
        if (existingReceiving.status === RECEIVING_STATUS_VOID) {
          throw new Error('RECEIVING_ALREADY_VOID');
        }

        throw new Error('RECEIVING_NOT_DRAFT');
      }

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.receiving.voided',
        target_type: 'receiving',
        target_id: voidedReceiving.id,
      });

      return voidedReceiving;
    });

    if (!voided) return err('NOT_FOUND', 'Penerimaan tidak ditemukan.');

    revalidatePath(INVENTORY_PATH);
    return ok({ receiving_id: voided.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'RECEIVING_ALREADY_POSTED') {
      return err('CONFLICT', 'Penerimaan sudah diposting dan tidak bisa dibatalkan.');
    }
    if (message === 'RECEIVING_ALREADY_VOID') {
      return err('CONFLICT', 'Penerimaan sudah dibatalkan sebelumnya.');
    }
    if (message === 'RECEIVING_NOT_DRAFT') {
      return err('CONFLICT', 'Hanya penerimaan draf yang bisa dibatalkan.');
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_RECEIVING_VOID_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Posts stock adjustment (header + items) and writes ledger `ADJUST` events.
 *
 * Invariants:
 * - no minus stock
 * - blocked while stock opname `IN_PROGRESS`
 */
export async function createStockAdjustmentAction(
  input: unknown,
): Promise<ActionResult<{ stock_adjustment_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = createStockAdjustmentSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const activeOpnameResult = await ensureNoActiveStockOpname({ company_id });
  if (!activeOpnameResult.ok) return activeOpnameResult;

  const normalizedItems = normalizeStockAdjustmentItems(parsed.data.items);
  if (normalizedItems.length === 0) {
    return err('INVALID_INPUT', 'Minimal satu item penyesuaian wajib diisi.');
  }

  const variantValidation = await ensureVariantsBelongToCompany({
    company_id,
    product_variant_ids: normalizedItems.map((item) => item.product_variant_id),
  });
  if (!variantValidation.ok) return variantValidation;

  const qtyDiffsByVariant = mergeVariantDiffs(
    normalizedItems.map((item) => ({
      product_variant_id: item.product_variant_id,
      qty_diff: item.qty_diff,
    })),
  );

  const noNegativeStockResult = await ensureNoNegativeStockAfterDiffs({
    company_id,
    qtyDiffsByVariant,
  });
  if (!noNegativeStockResult.ok) return noNegativeStockResult;

  try {
    const created = await db.transaction(async (tx) => {
      const now = new Date();

      const [createdAdjustment] = await tx
        .insert(stockAdjustments)
        .values({
          company_id,
          reason: parsed.data.reason.trim(),
          note: toNullableTrimmedText(parsed.data.note),
          created_by: session.user.id,
          created_at: now,
        })
        .returning({ id: stockAdjustments.id });

      await tx.insert(stockAdjustmentItems).values(
        normalizedItems.map((item) => ({
          company_id,
          stock_adjustment_id: createdAdjustment!.id,
          product_variant_id: item.product_variant_id,
          qty_diff: toFixedScaleNumberText(item.qty_diff),
          note: item.note,
          created_at: now,
        })),
      );

      await tx.insert(stockMovements).values(
        normalizedItems.map((item) => ({
          company_id,
          product_variant_id: item.product_variant_id,
          type: STOCK_MOVEMENT_ADJUST,
          qty: toFixedScaleNumberText(item.qty_diff),
          reference_type: STOCK_MOVEMENT_REFERENCE_ADJUSTMENT,
          reference_id: createdAdjustment!.id,
          note: item.note ?? parsed.data.reason.trim(),
          created_by: session.user.id,
          created_at: now,
          effective_at: now,
        })),
      );

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.adjustment.posted',
        target_type: 'stock_adjustment',
        target_id: createdAdjustment!.id,
        meta: {
          reason: parsed.data.reason.trim(),
          item_count: normalizedItems.length,
          total_qty_diff: normalizedItems.reduce(
            (total, item) => total + item.qty_diff,
            0,
          ),
        },
      });

      return createdAdjustment!;
    });

    revalidatePath(INVENTORY_PATH);
    return ok({ stock_adjustment_id: created.id });
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_ADJUSTMENT_CREATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

type VariantSnapshotRowType = {
  product_variant_id: string;
  product_name: string;
  variant_name: string;
};

/**
 * Returns active product variants for opname snapshot.
 */
async function getActiveVariantSnapshotRows(input: {
  client: DbSelectClientType;
  company_id: string;
}): Promise<VariantSnapshotRowType[]> {
  return input.client
    .select({
      product_variant_id: productVariants.id,
      product_name: products.name,
      variant_name: productVariants.name,
    })
    .from(productVariants)
    .innerJoin(products, eq(products.id, productVariants.product_id))
    .where(
      and(
        eq(productVariants.company_id, input.company_id),
        eq(products.company_id, input.company_id),
        isNull(productVariants.deleted_at),
        isNull(products.deleted_at),
      ),
    )
    .orderBy(products.name, productVariants.name);
}

/**
 * Starts stock opname and snapshots system quantity per active variant.
 *
 * Side effects:
 * - writes `stock_opnames`, `stock_opname_items`, `activity_logs`.
 */
export async function startStockOpnameAction(
  input: unknown,
): Promise<ActionResult<{ stock_opname_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = startStockOpnameSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const activeOpnameResult = await ensureNoActiveStockOpname({ company_id });
  if (!activeOpnameResult.ok) return activeOpnameResult;

  try {
    const created = await db.transaction(async (tx) => {
      const now = new Date();

      const [createdOpname] = await tx
        .insert(stockOpnames)
        .values({
          company_id,
          status: STOCK_OPNAME_STATUS_IN_PROGRESS,
          note: toNullableTrimmedText(parsed.data.note),
          started_by: session.user.id,
          started_at: now,
          created_at: now,
          updated_at: now,
        })
        .returning({ id: stockOpnames.id });

      const variants = await getActiveVariantSnapshotRows({
        client: tx,
        company_id,
      });
      const balances = await getCurrentStockByVariantIds(tx, {
        company_id,
        product_variant_ids: variants.map((variant) => variant.product_variant_id),
      });

      if (variants.length > 0) {
        await tx.insert(stockOpnameItems).values(
          variants.map((variant) => {
            const systemQty = balances.get(variant.product_variant_id) ?? 0;

            return {
              company_id,
              stock_opname_id: createdOpname!.id,
              product_variant_id: variant.product_variant_id,
              system_qty: toFixedScaleNumberText(systemQty),
              counted_qty: toFixedScaleNumberText(systemQty),
              diff_qty: toFixedScaleNumberText(0),
              created_at: now,
              updated_at: now,
            };
          }),
        );
      }

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.opname.started',
        target_type: 'stock_opname',
        target_id: createdOpname!.id,
        meta: {
          item_count: variants.length,
        },
      });

      return createdOpname!;
    });

    revalidatePath(INVENTORY_PATH);
    return ok({ stock_opname_id: created.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('stock_opnames_active_company_unique')) {
      return err(
        'CONFLICT',
        'Masih ada stok opname aktif. Selesaikan atau batalkan terlebih dulu.',
      );
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_OPNAME_START_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Updates counted quantity for one stock opname item.
 *
 * Invariants:
 * - stock opname must still be `IN_PROGRESS`
 */
export async function updateStockOpnameItemCountedQtyAction(
  input: unknown,
): Promise<ActionResult<{ stock_opname_item_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = updateStockOpnameItemSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  try {
    const updated = await db.transaction(async (tx) => {
      const [opname] = await tx
        .select({ status: stockOpnames.status })
        .from(stockOpnames)
        .where(
          and(
            eq(stockOpnames.id, parsed.data.stock_opname_id),
            eq(stockOpnames.company_id, company_id),
          ),
        )
        .limit(1);

      if (!opname) throw new Error('STOCK_OPNAME_NOT_FOUND');
      if (opname.status !== STOCK_OPNAME_STATUS_IN_PROGRESS) {
        throw new Error('STOCK_OPNAME_NOT_IN_PROGRESS');
      }

      const [updatedItem] = await tx
        .update(stockOpnameItems)
        .set({
          counted_qty: toFixedScaleNumberText(parsed.data.counted_qty),
          diff_qty: sql`${toFixedScaleNumberText(parsed.data.counted_qty)} - ${stockOpnameItems.system_qty}`,
          updated_at: new Date(),
        })
        .where(
          and(
            eq(stockOpnameItems.id, parsed.data.stock_opname_item_id),
            eq(stockOpnameItems.stock_opname_id, parsed.data.stock_opname_id),
            eq(stockOpnameItems.company_id, company_id),
          ),
        )
        .returning({ id: stockOpnameItems.id });

      if (!updatedItem) throw new Error('STOCK_OPNAME_ITEM_NOT_FOUND');

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.opname.item_counted_qty_updated',
        target_type: 'stock_opname',
        target_id: parsed.data.stock_opname_id,
        meta: {
          stock_opname_item_id: updatedItem.id,
          counted_qty: parsed.data.counted_qty,
        },
      });

      return updatedItem;
    });

    revalidatePath(INVENTORY_PATH);
    return ok({ stock_opname_item_id: updated.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'STOCK_OPNAME_NOT_FOUND') {
      return err('NOT_FOUND', 'Stok opname tidak ditemukan.');
    }
    if (message === 'STOCK_OPNAME_NOT_IN_PROGRESS') {
      return err('CONFLICT', 'Stok opname sudah tidak aktif.');
    }
    if (message === 'STOCK_OPNAME_ITEM_NOT_FOUND') {
      return err('NOT_FOUND', 'Item stok opname tidak ditemukan.');
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_OPNAME_ITEM_UPDATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Finalizes stock opname and writes adjustment ledger events for non-zero diffs.
 */
export async function finalizeStockOpnameAction(
  input: unknown,
): Promise<ActionResult<{ stock_opname_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = finalizeStockOpnameSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  try {
    const finalized = await db.transaction(async (tx) => {
      const [existingOpname] = await tx
        .select({
          id: stockOpnames.id,
          status: stockOpnames.status,
        })
        .from(stockOpnames)
        .where(
          and(
            eq(stockOpnames.id, parsed.data.stock_opname_id),
            eq(stockOpnames.company_id, company_id),
          ),
        )
        .limit(1);

      if (!existingOpname) throw new Error('STOCK_OPNAME_NOT_FOUND');
      if (existingOpname.status !== STOCK_OPNAME_STATUS_IN_PROGRESS) {
        throw new Error('STOCK_OPNAME_NOT_IN_PROGRESS');
      }

      const items = await tx
        .select({
          product_variant_id: stockOpnameItems.product_variant_id,
          system_qty: stockOpnameItems.system_qty,
          counted_qty: stockOpnameItems.counted_qty,
        })
        .from(stockOpnameItems)
        .where(
          and(
            eq(stockOpnameItems.stock_opname_id, existingOpname.id),
            eq(stockOpnameItems.company_id, company_id),
          ),
        );

      const normalizedDiffItems = items
        .map((item) => {
          const systemQty = toNumber(item.system_qty);
          const countedQty = toNumber(item.counted_qty);

          return {
            product_variant_id: item.product_variant_id,
            system_qty: systemQty,
            counted_qty: countedQty,
            qty_diff: countedQty - systemQty,
          };
        })
        .filter((item) => item.qty_diff !== 0);

      const qtyDiffsByVariant = mergeVariantDiffs(
        normalizedDiffItems.map((item) => ({
          product_variant_id: item.product_variant_id,
          qty_diff: item.qty_diff,
        })),
      );

      const noNegativeStockResult = await ensureNoNegativeStockAfterDiffs({
        company_id,
        qtyDiffsByVariant,
      });
      if (!noNegativeStockResult.ok) {
        throw new Error(`NEGATIVE_STOCK:${noNegativeStockResult.error.message}`);
      }

      const now = new Date();

      if (normalizedDiffItems.length > 0) {
        await tx.insert(stockMovements).values(
          normalizedDiffItems.map((item) => ({
            company_id,
            product_variant_id: item.product_variant_id,
            type: STOCK_MOVEMENT_ADJUST,
            qty: toFixedScaleNumberText(item.qty_diff),
            reference_type: STOCK_MOVEMENT_REFERENCE_OPNAME,
            reference_id: existingOpname.id,
            note: 'Penyesuaian stok opname',
            created_by: session.user.id,
            created_at: now,
            effective_at: now,
          })),
        );
      }

      await tx
        .update(stockOpnameItems)
        .set({
          diff_qty: sql`${stockOpnameItems.counted_qty} - ${stockOpnameItems.system_qty}`,
          updated_at: now,
        })
        .where(
          and(
            eq(stockOpnameItems.stock_opname_id, existingOpname.id),
            eq(stockOpnameItems.company_id, company_id),
          ),
        );

      const [updatedOpname] = await tx
        .update(stockOpnames)
        .set({
          status: STOCK_OPNAME_STATUS_FINALIZED,
          finalized_by: session.user.id,
          finalized_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(stockOpnames.id, existingOpname.id),
            eq(stockOpnames.company_id, company_id),
            eq(stockOpnames.status, STOCK_OPNAME_STATUS_IN_PROGRESS),
          ),
        )
        .returning({ id: stockOpnames.id });

      if (!updatedOpname) throw new Error('STOCK_OPNAME_NOT_IN_PROGRESS');

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.opname.finalized',
        target_type: 'stock_opname',
        target_id: existingOpname.id,
        meta: {
          diff_item_count: normalizedDiffItems.length,
          total_qty_diff: normalizedDiffItems.reduce(
            (total, item) => total + item.qty_diff,
            0,
          ),
        },
      });

      return updatedOpname;
    });

    revalidatePath(INVENTORY_PATH);
    return ok({ stock_opname_id: finalized.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'STOCK_OPNAME_NOT_FOUND') {
      return err('NOT_FOUND', 'Stok opname tidak ditemukan.');
    }
    if (message === 'STOCK_OPNAME_NOT_IN_PROGRESS') {
      return err('CONFLICT', 'Stok opname sudah tidak aktif.');
    }
    if (message.startsWith('NEGATIVE_STOCK:')) {
      return err('CONFLICT', message.replace('NEGATIVE_STOCK:', '').trim());
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_OPNAME_FINALIZE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Voids active stock opname.
 */
export async function voidStockOpnameAction(
  input: unknown,
): Promise<ActionResult<{ stock_opname_id: string }>> {
  const contextResult = await requireInventoryWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = voidStockOpnameSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  try {
    const voided = await db.transaction(async (tx) => {
      const now = new Date();

      const [voidedOpname] = await tx
        .update(stockOpnames)
        .set({
          status: STOCK_OPNAME_STATUS_VOID,
          voided_by: session.user.id,
          voided_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(stockOpnames.id, parsed.data.stock_opname_id),
            eq(stockOpnames.company_id, company_id),
            eq(stockOpnames.status, STOCK_OPNAME_STATUS_IN_PROGRESS),
          ),
        )
        .returning({ id: stockOpnames.id });

      if (!voidedOpname) {
        const [existingOpname] = await tx
          .select({ status: stockOpnames.status })
          .from(stockOpnames)
          .where(
            and(
              eq(stockOpnames.id, parsed.data.stock_opname_id),
              eq(stockOpnames.company_id, company_id),
            ),
          )
          .limit(1);

        if (!existingOpname) return null;
        if (existingOpname.status === STOCK_OPNAME_STATUS_FINALIZED) {
          throw new Error('STOCK_OPNAME_ALREADY_FINALIZED');
        }
        if (existingOpname.status === STOCK_OPNAME_STATUS_VOID) {
          throw new Error('STOCK_OPNAME_ALREADY_VOID');
        }
        throw new Error('STOCK_OPNAME_NOT_IN_PROGRESS');
      }

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'inventory.opname.voided',
        target_type: 'stock_opname',
        target_id: voidedOpname.id,
      });

      return voidedOpname;
    });

    if (!voided) return err('NOT_FOUND', 'Stok opname tidak ditemukan.');

    revalidatePath(INVENTORY_PATH);
    return ok({ stock_opname_id: voided.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message === 'STOCK_OPNAME_ALREADY_FINALIZED') {
      return err('CONFLICT', 'Stok opname sudah difinalisasi.');
    }
    if (message === 'STOCK_OPNAME_ALREADY_VOID') {
      return err('CONFLICT', 'Stok opname sudah dibatalkan sebelumnya.');
    }
    if (message === 'STOCK_OPNAME_NOT_IN_PROGRESS') {
      return err('CONFLICT', 'Hanya stok opname aktif yang bisa dibatalkan.');
    }

    const presentation = getErrorPresentation({ error });
    console.error('INVENTORY_OPNAME_VOID_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}
