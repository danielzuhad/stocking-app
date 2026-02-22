import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';

import { fetchActiveStockOpname, fetchRecentStockOpnames } from '../fetcher';
import { OpnamesPanel } from './opnames-panel';

/** Inventory stock opname page. */
export default async function InventoryOpnamesPage() {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) {
    return <EmptyState title="Stok Opname" description={sessionResult.error.message} />;
  }

  const session = sessionResult.data;
  const can_write = session.user.system_role !== SYSTEM_ROLE_STAFF;

  const [activeOpnameResult, opnamesResult] = await Promise.all([
    fetchActiveStockOpname(session),
    fetchRecentStockOpnames({ limit: 30 }, session),
  ]);

  if (!activeOpnameResult.ok) {
    return <EmptyState title="Stok Opname" description={activeOpnameResult.error.message} />;
  }

  if (!opnamesResult.ok) {
    return <EmptyState title="Stok Opname" description={opnamesResult.error.message} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Stok Opname</h1>
        <p className="text-muted-foreground text-sm">
          Catat stok fisik dan finalisasi selisih sebagai event ADJUST yang teraudit.
        </p>
      </div>

      <OpnamesPanel
        can_write={can_write}
        active_stock_opname={activeOpnameResult.data}
        stock_opnames={opnamesResult.data}
      />
    </div>
  );
}
