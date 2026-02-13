'use server';

import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { products, productVariants } from '@/db/schema';
import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { logActivity } from '@/lib/audit';
import { getErrorPresentation } from '@/lib/errors/presentation';
import { toFixedScaleNumberText, toNullableTrimmedText } from '@/lib/utils';
import {
  createProductSchema,
  deleteProductSchema,
  updateProductSchema,
  type ProductFormValuesType,
} from '@/lib/validation/products';

import { requireProductsWriteContext } from './guards';

const PRODUCTS_PATH = '/products';
const DEFAULT_VARIANT_FALLBACK_NAME = 'Default';

type NormalizedVariantInputType = {
  id?: string;
  name: string;
  selling_price: number;
  sku: string | null;
  barcode: string | null;
  is_default: boolean;
};

/**
 * Normalizes submitted variants into a consistent DB payload.
 *
 * If `has_variants=false`, a single implicit default variant is generated.
 */
function normalizeVariantsInput(
  input: ProductFormValuesType,
  options?: { fallback_existing_default_variant_id?: string },
): NormalizedVariantInputType[] {
  if (!input.has_variants || input.variants.length === 0) {
    return [
      {
        id: options?.fallback_existing_default_variant_id,
        name: DEFAULT_VARIANT_FALLBACK_NAME,
        selling_price: 0,
        sku: null,
        barcode: null,
        is_default: true,
      },
    ];
  }

  const normalized = input.variants.map((variant, index) => ({
    id: variant.id,
    name: toNullableTrimmedText(variant.name) ?? `Variant ${index + 1}`,
    selling_price: variant.selling_price,
    sku: toNullableTrimmedText(variant.sku),
    barcode: toNullableTrimmedText(variant.barcode),
    is_default: Boolean(variant.is_default),
  }));

  const requestedDefaultIndex = normalized.findIndex((variant) => variant.is_default);
  const defaultIndex = requestedDefaultIndex >= 0 ? requestedDefaultIndex : 0;

  return normalized.map((variant, index) => ({
    ...variant,
    is_default: index === defaultIndex,
  }));
}

/**
 * Checks duplicate SKU/barcode within submitted variants before DB call.
 */
function ensureNoDuplicateVariantCodesInPayload(
  variants: NormalizedVariantInputType[],
): ActionResult<{ ok: true }> {
  const seenSku = new Set<string>();
  const seenBarcode = new Set<string>();

  for (const variant of variants) {
    const skuKey = variant.sku?.toLowerCase();
    if (skuKey) {
      if (seenSku.has(skuKey)) {
        return err('INVALID_INPUT', 'SKU duplikat di daftar varian.');
      }
      seenSku.add(skuKey);
    }

    const barcodeKey = variant.barcode?.toLowerCase();
    if (barcodeKey) {
      if (seenBarcode.has(barcodeKey)) {
        return err('INVALID_INPUT', 'Barcode duplikat di daftar varian.');
      }
      seenBarcode.add(barcodeKey);
    }
  }

  return ok({ ok: true });
}

/**
 * Maps known DB unique-constraint errors into safe `ActionResult` messages.
 */
function mapKnownMutationError(error: unknown): ActionResult<never> | null {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('product_variants_company_sku_unique')) {
    return err('CONFLICT', 'SKU varian sudah dipakai product lain.');
  }

  if (message.includes('product_variants_company_barcode_unique')) {
    return err('CONFLICT', 'Barcode varian sudah dipakai product lain.');
  }

  return null;
}

/**
 * Ensures SKU and barcode are unique per company (excluding soft-deleted variants).
 */
async function ensureVariantCodeUniqueness(input: {
  company_id: string;
  variants: NormalizedVariantInputType[];
}): Promise<ActionResult<{ ok: true }>> {
  for (const variant of input.variants) {
    if (variant.sku) {
      const [existingSku] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.company_id, input.company_id),
            eq(productVariants.sku, variant.sku),
            isNull(productVariants.deleted_at),
            variant.id ? ne(productVariants.id, variant.id) : undefined,
          ),
        )
        .limit(1);

      if (existingSku) {
        return err('CONFLICT', 'SKU varian sudah dipakai product lain.');
      }
    }

    if (variant.barcode) {
      const [existingBarcode] = await db
        .select({ id: productVariants.id })
        .from(productVariants)
        .where(
          and(
            eq(productVariants.company_id, input.company_id),
            eq(productVariants.barcode, variant.barcode),
            isNull(productVariants.deleted_at),
            variant.id ? ne(productVariants.id, variant.id) : undefined,
          ),
        )
        .limit(1);

      if (existingBarcode) {
        return err('CONFLICT', 'Barcode varian sudah dipakai product lain.');
      }
    }
  }

  return ok({ ok: true });
}

/**
 * Creates a product and variants transactionally.
 */
export async function createProductAction(
  input: unknown,
): Promise<ActionResult<{ product_id: string }>> {
  const contextResult = await requireProductsWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = createProductSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const variants = normalizeVariantsInput(parsed.data);
  const noDuplicateResult = ensureNoDuplicateVariantCodesInPayload(variants);
  if (!noDuplicateResult.ok) return noDuplicateResult;

  const uniquenessResult = await ensureVariantCodeUniqueness({
    company_id,
    variants,
  });
  if (!uniquenessResult.ok) return uniquenessResult;

  try {
    const created = await db.transaction(async (tx) => {
      const now = new Date();

      const [createdProduct] = await tx
        .insert(products)
        .values({
          company_id,
          name: parsed.data.name,
          category: parsed.data.category,
          image: parsed.data.image,
          unit: parsed.data.unit,
          status: parsed.data.status,
          created_at: now,
          updated_at: now,
        })
        .returning({ id: products.id });

      await tx.insert(productVariants).values(
        variants.map((variant) => ({
          company_id,
          product_id: createdProduct!.id,
          name: variant.name,
          sku: variant.sku,
          barcode: variant.barcode,
          selling_price: toFixedScaleNumberText(variant.selling_price),
          is_default: variant.is_default,
          created_at: now,
          updated_at: now,
        })),
      );

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'products.create',
        target_type: 'product',
        target_id: createdProduct!.id,
        meta: {
          variant_count: variants.length,
          has_variants: parsed.data.has_variants,
          has_image: Boolean(parsed.data.image),
        },
      });

      return createdProduct!;
    });

    revalidatePath(PRODUCTS_PATH);
    return ok({ product_id: created.id });
  } catch (error) {
    const mapped = mapKnownMutationError(error);
    if (mapped) return mapped;

    const presentation = getErrorPresentation({ error });
    console.error('PRODUCTS_CREATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Updates product fields and variants transactionally.
 */
export async function updateProductAction(
  input: unknown,
): Promise<ActionResult<{ product_id: string }>> {
  const contextResult = await requireProductsWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = updateProductSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const [existingProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.company_id, company_id),
        eq(products.id, parsed.data.product_id),
        isNull(products.deleted_at),
      ),
    )
    .limit(1);
  if (!existingProduct) return err('NOT_FOUND', 'Produk tidak ditemukan.');

  const existingVariants = await db
    .select({
      id: productVariants.id,
      is_default: productVariants.is_default,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.company_id, company_id),
        eq(productVariants.product_id, parsed.data.product_id),
        isNull(productVariants.deleted_at),
      ),
    );

  const fallbackDefaultVariantId = existingVariants.find(
    (variant) => variant.is_default,
  )?.id;
  const variants = normalizeVariantsInput(parsed.data, {
    fallback_existing_default_variant_id: fallbackDefaultVariantId,
  });

  const noDuplicateResult = ensureNoDuplicateVariantCodesInPayload(variants);
  if (!noDuplicateResult.ok) return noDuplicateResult;

  const existingVariantIds = new Set(existingVariants.map((variant) => variant.id));
  for (const variant of variants) {
    if (variant.id && !existingVariantIds.has(variant.id)) {
      return err('INVALID_INPUT', 'Ada varian yang tidak valid untuk produk ini.');
    }
  }

  const uniquenessResult = await ensureVariantCodeUniqueness({
    company_id,
    variants,
  });
  if (!uniquenessResult.ok) return uniquenessResult;

  try {
    const now = new Date();

    await db.transaction(async (tx) => {
      await tx
        .update(products)
        .set({
          name: parsed.data.name,
          category: parsed.data.category,
          image: parsed.data.image,
          unit: parsed.data.unit,
          status: parsed.data.status,
          updated_at: now,
        })
        .where(
          and(
            eq(products.id, parsed.data.product_id),
            eq(products.company_id, company_id),
            isNull(products.deleted_at),
          ),
        );

      const keptVariantIds: string[] = [];

      for (const variant of variants) {
        if (variant.id) {
          await tx
            .update(productVariants)
            .set({
              name: variant.name,
              sku: variant.sku,
              barcode: variant.barcode,
              selling_price: toFixedScaleNumberText(variant.selling_price),
              is_default: variant.is_default,
              updated_at: now,
              deleted_at: null,
              deleted_by: null,
            })
            .where(
              and(
                eq(productVariants.id, variant.id),
                eq(productVariants.company_id, company_id),
              ),
            );

          keptVariantIds.push(variant.id);
          continue;
        }

        const [createdVariant] = await tx
          .insert(productVariants)
          .values({
            company_id,
            product_id: parsed.data.product_id,
            name: variant.name,
            sku: variant.sku,
            barcode: variant.barcode,
            selling_price: toFixedScaleNumberText(variant.selling_price),
            is_default: variant.is_default,
            created_at: now,
            updated_at: now,
          })
          .returning({ id: productVariants.id });

        keptVariantIds.push(createdVariant!.id);
      }

      const variantsToDelete = existingVariants
        .filter((variant) => !keptVariantIds.includes(variant.id))
        .map((variant) => variant.id);

      if (variantsToDelete.length > 0) {
        await tx
          .update(productVariants)
          .set({
            deleted_at: now,
            deleted_by: session.user.id,
            updated_at: now,
          })
          .where(
            and(
              eq(productVariants.company_id, company_id),
              eq(productVariants.product_id, parsed.data.product_id),
              inArray(productVariants.id, variantsToDelete),
              isNull(productVariants.deleted_at),
            ),
          );
      }

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'products.update',
        target_type: 'product',
        target_id: parsed.data.product_id,
        meta: {
          variant_count: variants.length,
          has_variants: parsed.data.has_variants,
          has_image: Boolean(parsed.data.image),
        },
      });
    });

    revalidatePath(PRODUCTS_PATH);
    revalidatePath(`/products/${parsed.data.product_id}/edit`);
    return ok({ product_id: parsed.data.product_id });
  } catch (error) {
    const mapped = mapKnownMutationError(error);
    if (mapped) return mapped;

    const presentation = getErrorPresentation({ error });
    console.error('PRODUCTS_UPDATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Soft-deletes a product and all variants transactionally.
 */
export async function deleteProductAction(
  input: unknown,
): Promise<ActionResult<{ product_id: string }>> {
  const contextResult = await requireProductsWriteContext();
  if (!contextResult.ok) return contextResult;
  const { session, company_id } = contextResult.data;

  const parsed = deleteProductSchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  const [existingProduct] = await db
    .select({ id: products.id })
    .from(products)
    .where(
      and(
        eq(products.id, parsed.data.product_id),
        eq(products.company_id, company_id),
        isNull(products.deleted_at),
      ),
    )
    .limit(1);

  if (!existingProduct) return err('NOT_FOUND', 'Produk tidak ditemukan.');

  try {
    await db.transaction(async (tx) => {
      const now = new Date();

      await tx
        .update(productVariants)
        .set({
          deleted_at: now,
          deleted_by: session.user.id,
          updated_at: now,
        })
        .where(
          and(
            eq(productVariants.product_id, parsed.data.product_id),
            eq(productVariants.company_id, company_id),
            isNull(productVariants.deleted_at),
          ),
        );

      await tx
        .update(products)
        .set({
          deleted_at: now,
          deleted_by: session.user.id,
          updated_at: now,
        })
        .where(
          and(
            eq(products.id, parsed.data.product_id),
            eq(products.company_id, company_id),
            isNull(products.deleted_at),
          ),
        );

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'products.delete',
        target_type: 'product',
        target_id: parsed.data.product_id,
      });
    });

    revalidatePath(PRODUCTS_PATH);
    revalidatePath(`/products/${parsed.data.product_id}/edit`);
    return ok({ product_id: parsed.data.product_id });
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error('PRODUCTS_DELETE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}
