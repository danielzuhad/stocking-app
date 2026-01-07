import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

/** Global 404 UI (fallback for the whole app). */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-10 sm:px-6">
      <EmptyState
        title="Halaman tidak ditemukan"
        description="URL yang kamu buka tidak ada atau sudah dipindahkan."
      >
        <Button asChild>
          <Link href="/dashboard">Ke dashboard</Link>
        </Button>
      </EmptyState>
    </div>
  );
}
