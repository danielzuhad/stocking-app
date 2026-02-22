import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';

import {
  fetchInventoryVariantOptions,
  fetchRecentStockAdjustments,
} from '../fetcher';
import { AdjustmentsPanel } from './adjustments-panel';

/** Inventory stock adjustments page. */
export default async function InventoryAdjustmentsPage() {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) {
    return (
      <EmptyState
        title="Penyesuaian Stok"
        description={sessionResult.error.message}
      />
    );
  }

  const session = sessionResult.data;
  const can_write = session.user.system_role !== SYSTEM_ROLE_STAFF;

  const [variantOptionsResult, adjustmentsResult] = await Promise.all([
    fetchInventoryVariantOptions(session),
    fetchRecentStockAdjustments({ limit: 30 }, session),
  ]);

  if (!variantOptionsResult.ok) {
    return (
      <EmptyState
        title="Penyesuaian Stok"
        description={variantOptionsResult.error.message}
      />
    );
  }

  if (!adjustmentsResult.ok) {
    return (
      <EmptyState
        title="Penyesuaian Stok"
        description={adjustmentsResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Penyesuaian Stok
        </h1>
        <p className="text-muted-foreground text-sm">
          Catat penyesuaian stok sebagai event ADJUST dengan alasan yang jelas.
        </p>
      </div>

      <AdjustmentsPanel
        can_write={can_write}
        variant_options={variantOptionsResult.data}
        stock_adjustments={adjustmentsResult.data}
      />
    </div>
  );
}
