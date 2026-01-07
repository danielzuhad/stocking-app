import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/**
 * Dashboard-scoped 404 UI.
 *
 * Rendered inside the dashboard shell (sidebar + topbar stay visible).
 */
export default function DashboardNotFound() {
  return (
    <EmptyState
      title="Halaman tidak ditemukan"
      description="URL yang kamu buka tidak ada atau sudah dipindahkan."
    >
      <Button asChild>
        <Link href="/dashboard">Kembali ke dashboard</Link>
      </Button>
    </EmptyState>
  );
}
