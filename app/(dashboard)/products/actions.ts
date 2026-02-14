'use server';

import { Buffer } from 'node:buffer';

import { and, eq, inArray, isNull } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

import { db } from '@/db';
import { companies, products, productVariants } from '@/db/schema';
import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { logActivity } from '@/lib/audit';
import { env } from '@/env';
import { getErrorPresentation } from '@/lib/errors/presentation';
import { PRODUCT_DEFAULT_CATEGORY } from '@/lib/products/enums';
import {
  buildCompanyAssetFolderSegment,
  toFixedScaleNumberText,
  toNullableTrimmedText,
} from '@/lib/utils';
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
 * Detects PostgreSQL FK constraint violation.
 */
function isForeignKeyConstraintError(error: unknown): boolean {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23503'
  ) {
    return true;
  }

  const message = error instanceof Error ? error.message : String(error);
  return message.toLowerCase().includes('violates foreign key constraint');
}

/**
 * Builds ImageKit basic auth header from private key.
 */
function buildImageKitAuthHeader(privateKey: string): string {
  return `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;
}

/**
 * Resolves company folder segment used for ImageKit ownership checks.
 */
async function resolveCompanyImageFolder(companyId: string): Promise<string> {
  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  return buildCompanyAssetFolderSegment(company?.name, companyId);
}

type ImageKitFileDetailsType = {
  filePath?: string;
};

/**
 * Reads ImageKit file details (`/files/:id/details`) with server private key.
 */
async function getImageKitFileDetailsById(
  fileId: string,
): Promise<ImageKitFileDetailsType | null> {
  if (!env.IMAGEKIT_PRIVATE_KEY) return null;

  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}/details`,
    {
      method: 'GET',
      headers: {
        Authorization: buildImageKitAuthHeader(env.IMAGEKIT_PRIVATE_KEY),
      },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`ImageKit details failed with status ${response.status}`);
  }

  return (await response.json()) as ImageKitFileDetailsType;
}

/**
 * Extracts ImageKit `file_id` from JSON image payload.
 */
function getImageFileId(image: unknown): string | null {
  if (!image || typeof image !== 'object') return null;
  const fileId = (image as { file_id?: unknown }).file_id;
  if (typeof fileId !== 'string' || fileId.trim().length === 0) return null;
  return fileId;
}

/**
 * Deletes image file from ImageKit storage by `file_id`.
 *
 * This is best-effort cleanup; DB mutations should stay successful even if
 * external storage cleanup fails.
 */
async function deleteImageKitFileById(
  fileId: string,
  company_folder: string,
): Promise<void> {
  if (!env.IMAGEKIT_PRIVATE_KEY) return;

  const details = await getImageKitFileDetailsById(fileId);
  if (!details?.filePath) return;

  if (!details.filePath.startsWith(`/products/${company_folder}/`)) {
    throw new Error('ImageKit file is outside current company folder.');
  }

  const response = await fetch(
    `https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: buildImageKitAuthHeader(env.IMAGEKIT_PRIVATE_KEY),
      },
    },
  );

  if (response.status === 404) return;
  if (response.ok) return;

  throw new Error(`ImageKit delete failed with status ${response.status}`);
}

/**
 * Validates that uploaded image file belongs to active company folder.
 */
async function ensureProductImageOwnership(input: {
  file_id: string;
  company_folder: string;
}): Promise<ActionResult<{ ok: true }>> {
  if (!env.IMAGEKIT_PRIVATE_KEY) {
    return err('INTERNAL', 'Konfigurasi image upload belum lengkap di server.');
  }

  try {
    const details = await getImageKitFileDetailsById(input.file_id);
    if (!details?.filePath) {
      return err('INVALID_INPUT', 'Foto produk tidak ditemukan di storage.');
    }

    if (!details.filePath.startsWith(`/products/${input.company_folder}/`)) {
      return err(
        'FORBIDDEN',
        'Foto produk tidak valid untuk company yang sedang aktif.',
      );
    }
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error('IMAGEKIT_VALIDATE_OWNERSHIP_ERROR', presentation.developer);
    return err('INTERNAL', 'Gagal memverifikasi foto produk di storage.');
  }

  return ok({ ok: true });
}

/**
 * Ensures SKU and barcode are unique per company (excluding soft-deleted variants).
 */
async function ensureVariantCodeUniqueness(input: {
  company_id: string;
  variants: NormalizedVariantInputType[];
}): Promise<ActionResult<{ ok: true }>> {
  const requestedSkus: Array<{
    value: string;
    variant_id: string | undefined;
  }> = [];
  for (const variant of input.variants) {
    if (!variant.sku) continue;
    requestedSkus.push({
      value: variant.sku,
      variant_id: variant.id,
    });
  }

  if (requestedSkus.length > 0) {
    const uniqueSkuValues = Array.from(new Set(requestedSkus.map((v) => v.value)));
    const allowedIdsBySku = new Map<string, Set<string>>();

    requestedSkus.forEach(({ value, variant_id }) => {
      if (!allowedIdsBySku.has(value)) {
        allowedIdsBySku.set(value, new Set<string>());
      }
      if (variant_id) {
        allowedIdsBySku.get(value)?.add(variant_id);
      }
    });

    const existingSkus = await db
      .select({
        id: productVariants.id,
        sku: productVariants.sku,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.company_id, input.company_id),
          isNull(productVariants.deleted_at),
          inArray(productVariants.sku, uniqueSkuValues),
        ),
      );

    for (const existingSku of existingSkus) {
      if (!existingSku.sku) continue;
      const allowedIds = allowedIdsBySku.get(existingSku.sku);
      if (!allowedIds?.has(existingSku.id)) {
        return err('CONFLICT', 'SKU varian sudah dipakai product lain.');
      }
    }
  }

  const requestedBarcodes: Array<{
    value: string;
    variant_id: string | undefined;
  }> = [];
  for (const variant of input.variants) {
    if (!variant.barcode) continue;
    requestedBarcodes.push({
      value: variant.barcode,
      variant_id: variant.id,
    });
  }

  if (requestedBarcodes.length > 0) {
    const uniqueBarcodeValues = Array.from(
      new Set(requestedBarcodes.map((v) => v.value)),
    );
    const allowedIdsByBarcode = new Map<string, Set<string>>();

    requestedBarcodes.forEach(({ value, variant_id }) => {
      if (!allowedIdsByBarcode.has(value)) {
        allowedIdsByBarcode.set(value, new Set<string>());
      }
      if (variant_id) {
        allowedIdsByBarcode.get(value)?.add(variant_id);
      }
    });

    const existingBarcodes = await db
      .select({
        id: productVariants.id,
        barcode: productVariants.barcode,
      })
      .from(productVariants)
      .where(
        and(
          eq(productVariants.company_id, input.company_id),
          isNull(productVariants.deleted_at),
          inArray(productVariants.barcode, uniqueBarcodeValues),
        ),
      );

    for (const existingBarcode of existingBarcodes) {
      if (!existingBarcode.barcode) continue;
      const allowedIds = allowedIdsByBarcode.get(existingBarcode.barcode);
      if (!allowedIds?.has(existingBarcode.id)) {
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

  const uploadedImageFileId = getImageFileId(parsed.data.image);
  if (uploadedImageFileId) {
    const companyFolder = await resolveCompanyImageFolder(company_id);
    const ownershipResult = await ensureProductImageOwnership({
      file_id: uploadedImageFileId,
      company_folder: companyFolder,
    });
    if (!ownershipResult.ok) return ownershipResult;
  }

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
          category: PRODUCT_DEFAULT_CATEGORY,
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
    .select({
      id: products.id,
      image: products.image,
    })
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
  const previousImageFileId = getImageFileId(existingProduct.image);
  const nextImageFileId = getImageFileId(parsed.data.image);
  let companyFolder: string | null = null;

  if (nextImageFileId) {
    companyFolder = await resolveCompanyImageFolder(company_id);
    const ownershipResult = await ensureProductImageOwnership({
      file_id: nextImageFileId,
      company_folder: companyFolder,
    });
    if (!ownershipResult.ok) return ownershipResult;
  }

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
          category: PRODUCT_DEFAULT_CATEGORY,
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
          .delete(productVariants)
          .where(
            and(
              eq(productVariants.company_id, company_id),
              eq(productVariants.product_id, parsed.data.product_id),
              inArray(productVariants.id, variantsToDelete),
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

    if (previousImageFileId && previousImageFileId !== nextImageFileId) {
      try {
        if (!companyFolder) {
          companyFolder = await resolveCompanyImageFolder(company_id);
        }
        await deleteImageKitFileById(previousImageFileId, companyFolder);
      } catch (error) {
        console.error('IMAGEKIT_DELETE_OLD_PRODUCT_IMAGE_ERROR', error);
      }
    }

    revalidatePath(PRODUCTS_PATH);
    revalidatePath(`/products/${parsed.data.product_id}/edit`);
    return ok({ product_id: parsed.data.product_id });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return err(
        'CONFLICT',
        'Ada varian yang sudah dipakai transaksi dan tidak bisa dihapus.',
      );
    }

    const mapped = mapKnownMutationError(error);
    if (mapped) return mapped;

    const presentation = getErrorPresentation({ error });
    console.error('PRODUCTS_UPDATE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}

/**
 * Hard-deletes a product and all variants transactionally.
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
    .select({
      id: products.id,
      image: products.image,
    })
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
  const imageFileId = getImageFileId(existingProduct.image);
  const companyFolder = await resolveCompanyImageFolder(company_id);

  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(productVariants)
        .where(
          and(
            eq(productVariants.product_id, parsed.data.product_id),
            eq(productVariants.company_id, company_id),
          ),
        );

      await tx
        .delete(products)
        .where(
          and(
            eq(products.id, parsed.data.product_id),
            eq(products.company_id, company_id),
          ),
        );

      await logActivity(tx, {
        company_id,
        actor_user_id: session.user.id,
        action: 'products.delete',
        target_type: 'product',
        target_id: parsed.data.product_id,
        meta: {
          hard_deleted: true,
          had_image: Boolean(imageFileId),
        },
      });
    });

    if (imageFileId) {
      try {
        await deleteImageKitFileById(imageFileId, companyFolder);
      } catch (error) {
        console.error('IMAGEKIT_DELETE_PRODUCT_IMAGE_ERROR', error);
      }
    }

    revalidatePath(PRODUCTS_PATH);
    revalidatePath(`/products/${parsed.data.product_id}/edit`);
    return ok({ product_id: parsed.data.product_id });
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      return err(
        'CONFLICT',
        'Produk tidak bisa dihapus karena sudah dipakai transaksi.',
      );
    }

    const presentation = getErrorPresentation({ error });
    console.error('PRODUCTS_DELETE_ERROR', presentation.developer);
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }
}
