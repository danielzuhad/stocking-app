import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/db';
import { products, productVariants, stockMovements } from '@/db/schema';
import { STOCK_MOVEMENT_IN, STOCK_MOVEMENT_OUT } from '@/lib/inventory/enums';
import {
  createEmptyProductVariant,
  inferProductHasVariants,
  PRODUCT_LOCKED_CATEGORY,
  productImageSchema,
  type ProductFormValuesType,
} from '@/lib/validation/products';

import { ProductForm } from '../../components/product-form';
import { requireProductsWriteContext } from '../../guards';

const paramsSchema = z.object({
  product_id: z.string().uuid(),
});

/** Edit product page. */
export default async function EditProductPage({
  params,
}: {
  params: Promise<{ product_id: string }>;
}) {
  const writeContext = await requireProductsWriteContext();
  if (!writeContext.ok) {
    return (
      <EmptyState
        title="Ubah Produk"
        description={writeContext.error.message}
      />
    );
  }

  const resolvedParams = await Promise.resolve(params);
  const parsedParams = paramsSchema.safeParse(resolvedParams);
  if (!parsedParams.success) notFound();

  const [product] = await db
    .select({
      product_id: products.id,
      name: products.name,
      image: products.image,
      unit: products.unit,
      status: products.status,
    })
    .from(products)
    .where(
      and(
        eq(products.id, parsedParams.data.product_id),
        eq(products.company_id, writeContext.data.company_id),
        isNull(products.deleted_at),
      ),
    )
    .limit(1);

  if (!product) notFound();

  const variants = await db
    .select({
      id: productVariants.id,
      name: productVariants.name,
      selling_price: productVariants.selling_price,
      sku: productVariants.sku,
      barcode: productVariants.barcode,
      is_default: productVariants.is_default,
    })
    .from(productVariants)
    .where(
      and(
        eq(productVariants.product_id, product.product_id),
        eq(productVariants.company_id, writeContext.data.company_id),
        isNull(productVariants.deleted_at),
      ),
    )
    .orderBy(desc(productVariants.is_default), productVariants.created_at);

  const parsedImage = productImageSchema.nullable().safeParse(product.image ?? null);
  const variantStockRows =
    variants.length > 0
      ? await db
          .select({
            product_variant_id: stockMovements.product_variant_id,
            stock_qty: sql<string>`coalesce(
              sum(
                case
                  when ${stockMovements.type} = ${STOCK_MOVEMENT_IN} then ${stockMovements.qty}
                  when ${stockMovements.type} = ${STOCK_MOVEMENT_OUT} then ${stockMovements.qty} * -1
                  else ${stockMovements.qty}
                end
              ),
              0
            )`,
          })
          .from(stockMovements)
          .where(
            and(
              eq(stockMovements.company_id, writeContext.data.company_id),
              inArray(
                stockMovements.product_variant_id,
                variants.map((variant) => variant.id),
              ),
            ),
          )
          .groupBy(stockMovements.product_variant_id)
      : [];

  const stockByVariantId = new Map<string, number>(
    variantStockRows.map((row) => [
      row.product_variant_id,
      Number(row.stock_qty ?? 0),
    ]),
  );

  const has_variants = inferProductHasVariants(variants);
  const fallbackVariant = variants.find((variant) => variant.is_default) ?? variants[0];

  const initial_values: ProductFormValuesType = {
    name: product.name,
    category: PRODUCT_LOCKED_CATEGORY,
    unit: product.unit,
    status: product.status,
    image: parsedImage.success ? parsedImage.data : null,
    has_variants,
    variants: has_variants
      ? variants.length > 0
        ? variants.map((variant) => ({
            id: variant.id,
            name: variant.name,
            selling_price: Number(variant.selling_price),
            sku: variant.sku ?? '',
            barcode: variant.barcode ?? '',
            opening_stock: stockByVariantId.get(variant.id) ?? 0,
            is_default: variant.is_default,
          }))
        : [createEmptyProductVariant({ is_default: true })]
      : [
          {
            ...createEmptyProductVariant({ is_default: true }),
            id: fallbackVariant?.id,
            opening_stock: fallbackVariant
              ? (stockByVariantId.get(fallbackVariant.id) ?? 0)
              : 0,
          },
        ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Ubah Produk</h1>
        <p className="text-muted-foreground text-sm">
          Perbarui informasi produk, foto utama, dan daftar varian.
        </p>
      </div>

      <ProductForm
        mode="edit"
        product_id={product.product_id}
        initial_values={initial_values}
      />
    </div>
  );
}
