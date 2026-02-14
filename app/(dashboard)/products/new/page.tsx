import { EmptyState } from '@/components/ui/empty-state';

import { ProductForm } from '../components/product-form';
import { requireProductsWriteContext } from '../guards';

/** Create product page. */
export default async function NewProductPage() {
  const writeContext = await requireProductsWriteContext();
  if (!writeContext.ok) {
    return (
      <EmptyState
        title="Create Product"
        description={writeContext.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Tambah Produk</h1>
        <p className="text-muted-foreground text-sm">
          Lengkapi data dasar, foto produk, dan varian bila diperlukan.
          Pengelolaan stok dilakukan di modul inventory.
        </p>
      </div>
      <ProductForm mode="create" />
    </div>
  );
}
