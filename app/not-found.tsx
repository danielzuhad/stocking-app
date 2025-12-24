import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty';

/** Global 404 UI (fallback for the whole app). */
export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-10 sm:px-6">
      <Empty>
        <EmptyHeader>
          <EmptyTitle>Halaman tidak ditemukan</EmptyTitle>
          <EmptyDescription>
            URL yang kamu buka tidak ada atau sudah dipindahkan.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild>
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </EmptyContent>
      </Empty>
    </div>
  );
}
