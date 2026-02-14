import { and, desc, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { EmptyState } from '@/components/ui/empty-state';
import { db } from '@/db';
import { products, productVariants } from '@/db/schema';
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
        title="Edit Product"
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

  const has_variants = inferProductHasVariants(variants);

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
            is_default: variant.is_default,
          }))
        : [createEmptyProductVariant({ is_default: true })]
      : [createEmptyProductVariant({ is_default: true })],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Edit Produk</h1>
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
