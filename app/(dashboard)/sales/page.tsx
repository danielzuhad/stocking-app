import { EmptyState } from '@/components/ui/empty-state';

/** Placeholder page for Sales/Invoice module. */
export default function SalesPage() {
  return (
    <EmptyState
      title="Penjualan"
      description="Segera hadir: invoice (draf → posted) + pengurangan stok."
    />
  );
}
