import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';

import { fetchRecentReceivings } from '../fetcher';
import { ReceivingsPanel } from './receivings-panel';

/** Receivings module page (draft -> posted/void). */
export default async function InventoryReceivingsPage() {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) {
    return (
      <EmptyState
        title="Barang Masuk"
        description={sessionResult.error.message}
      />
    );
  }

  const session = sessionResult.data;
  const can_write = session.user.system_role !== SYSTEM_ROLE_STAFF;

  const receivingsResult = await fetchRecentReceivings({ limit: 30 }, session);

  if (!receivingsResult.ok) {
    return (
      <EmptyState
        title="Barang Masuk"
        description={receivingsResult.error.message}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Barang Masuk</h1>
          <p className="text-muted-foreground text-sm">
            Catat barang masuk sebagai draf atau langsung posting untuk menambah
            stok.
          </p>
        </div>

        {can_write ? (
          <Button asChild>
            <Link href="/inventory/receivings/new">Buat Barang Masuk</Link>
          </Button>
        ) : null}
      </div>

      <ReceivingsPanel
        can_write={can_write}
        receivings={receivingsResult.data}
      />
    </div>
  );
}
