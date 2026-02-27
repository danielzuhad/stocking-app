import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SYSTEM_ROLE_STAFF } from '@/lib/auth/enums';
import { requireAuthSession } from '@/lib/auth/guards';
import { InfoIcon } from 'lucide-react';

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

  const hasActiveOpname = activeOpnameResult.data !== null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            Stok Opname
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Lihat use case stok opname"
                  className="inline-flex items-center text-muted-foreground"
                >
                  <InfoIcon size={14} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start" className="max-w-xs">
                Gunakan fitur ini untuk menghitung stok fisik dan menyesuaikan
                selisih secara massal saat finalisasi. Untuk koreksi cepat per
                item, gunakan Penyesuaian Stok.
              </TooltipContent>
            </Tooltip>
          </h1>
          <p className="text-muted-foreground text-sm">
            Catat stok fisik dan finalisasi selisih sebagai event ADJUST yang
            teraudit.
          </p>
        </div>

        {can_write ? (
          <Button asChild>
            <Link href="/inventory/opnames/active">
              {hasActiveOpname ? 'Lanjutkan Opname Aktif' : 'Mulai Stok Opname'}
            </Link>
          </Button>
        ) : null}
      </div>

      <OpnamesPanel can_write={can_write} stock_opnames={opnamesResult.data} />
    </div>
  );
}
