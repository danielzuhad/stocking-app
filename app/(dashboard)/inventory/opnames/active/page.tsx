import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';

import { fetchActiveStockOpname } from '../../fetcher';
import { OpnameActivePanel } from '../opname-active-panel';

/** Stock opname action page (start/update/finalize/void active opname). */
export default async function InventoryOpnameActivePage() {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) {
    return (
      <EmptyState title="Aksi Stok Opname" description={sessionResult.error.message} />
    );
  }

  const session = sessionResult.data;
  const can_write = session.user.system_role !== SYSTEM_ROLE_STAFF;

  const activeOpnameResult = await fetchActiveStockOpname(session);
  if (!activeOpnameResult.ok) {
    return (
      <EmptyState
        title="Aksi Stok Opname"
        description={activeOpnameResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Aksi Stok Opname</h1>
          <p className="text-muted-foreground text-sm">
            Mulai opname baru atau lanjutkan pembaruan data hitung fisik untuk
            opname aktif.
          </p>
        </div>

        <Button variant="outline" asChild>
          <Link href="/inventory/opnames">Kembali ke Riwayat</Link>
        </Button>
      </div>

      <OpnameActivePanel
        can_write={can_write}
        active_stock_opname={activeOpnameResult.data}
      />
    </div>
  );
}
