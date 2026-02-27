import { EmptyState } from '@/components/ui/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';

import { InfoIcon } from 'lucide-react';
import {
  fetchInventoryVariantOptions,
  fetchRecentStockAdjustments,
} from '../fetcher';
import { AdjustmentsPanel } from './adjustments-panel';
import { CreateAdjustmentDialog } from './create-adjustment-dialog';

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Penyesuaian Stok
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Lihat use case penyesuaian stok"
                  className="text-muted-foreground inline-flex items-center"
                >
                  <InfoIcon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs">
                Gunakan fitur ini untuk koreksi stok (selisih opname, barang
                rusak/hilang, atau koreksi input). Untuk barang masuk/keluar
                normal, gunakan modul Barang Masuk atau Penjualan.
              </TooltipContent>
            </Tooltip>
          </h1>
          <p className="text-muted-foreground text-sm">
            Catat penyesuaian stok sebagai event ADJUST dengan alasan yang
            jelas.
          </p>
        </div>

        {can_write ? (
          <CreateAdjustmentDialog variant_options={variantOptionsResult.data} />
        ) : null}
      </div>

      <AdjustmentsPanel
        can_write={can_write}
        stock_adjustments={adjustmentsResult.data}
      />
    </div>
  );
}
