import { EmptyState } from '@/components/ui/empty-state';

import { fetchInventoryProductOptions } from '../../fetcher';
import { requireInventoryWriteContext } from '../../guards';
import { CreateReceivingForm } from '../create-receiving-form';

/** Create receiving page (multi-item, status `DRAFT` or direct `POSTED`). */
export default async function NewReceivingPage() {
  const writeContext = await requireInventoryWriteContext();
  if (!writeContext.ok) {
    return (
      <EmptyState
        title="Buat Barang Masuk"
        description={writeContext.error.message}
      />
    );
  }

  const productOptionsResult = await fetchInventoryProductOptions(
    writeContext.data.session,
  );
  if (!productOptionsResult.ok) {
    return (
      <EmptyState
        title="Buat Barang Masuk"
        description={productOptionsResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Buat Barang Masuk
        </h1>
        <p className="text-muted-foreground text-sm">
          Buat dokumen penerimaan dengan banyak item, lalu simpan sebagai draf
          atau langsung posting.
        </p>
      </div>

      <CreateReceivingForm product_options={productOptionsResult.data} />
    </div>
  );
}
