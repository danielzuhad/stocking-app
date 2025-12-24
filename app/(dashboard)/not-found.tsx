import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

/**
 * Dashboard-scoped 404 UI.
 *
 * Rendered inside the dashboard shell (sidebar + topbar stay visible).
 */
export default function DashboardNotFound() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Halaman tidak ditemukan</EmptyTitle>
        <EmptyDescription>
          URL yang kamu buka tidak ada atau sudah dipindahkan.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link href="/dashboard">Kembali ke dashboard</Link>
        </Button>
      </EmptyContent>
    </Empty>
  );
}
