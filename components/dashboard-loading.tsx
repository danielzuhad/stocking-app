import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const SUMMARY_CARDS = [0, 1] as const;
const ACTIVITY_ROWS = [0, 1, 2] as const;

type DashboardLoadingProps = {
  className?: string;
};

/** Universal loading skeleton for dashboard pages rendered inside the dashboard shell. */
export default function DashboardLoading({ className }: DashboardLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn('space-y-6', className)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-md" />
        </div>
        <Skeleton className="h-9 w-28 shrink-0" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SUMMARY_CARDS.map((slot) => (
          <Card key={slot}>
            <CardContent className="space-y-3 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-4">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-44 w-full rounded-lg" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardContent className="space-y-4 p-4">
            <Skeleton className="h-5 w-28" />
            <div className="space-y-3">
              {ACTIVITY_ROWS.map((row) => (
                <div key={row} className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-full" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-4/5" />
                    <Skeleton className="h-3 w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <span className="sr-only">Memuat konten halaman dashboard...</span>
    </div>
  );
}
