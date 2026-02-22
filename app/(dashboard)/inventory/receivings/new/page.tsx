import { EmptyState } from '@/components/ui/empty-state';

import { fetchInventoryVariantOptions } from '../../fetcher';
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

  const variantOptionsResult = await fetchInventoryVariantOptions(
    writeContext.data.session,
  );
  if (!variantOptionsResult.ok) {
    return (
      <EmptyState
        title="Buat Barang Masuk"
        description={variantOptionsResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Buat Barang Masuk</h1>
        <p className="text-muted-foreground text-sm">
          Buat dokumen penerimaan dengan banyak item, lalu simpan sebagai draf
          atau langsung posting.
        </p>
      </div>

      <CreateReceivingForm variant_options={variantOptionsResult.data} />
    </div>
  );
}
