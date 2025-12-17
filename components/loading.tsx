import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import Image from 'next/image';

type LoadingProps = {
  title?: string;
  description?: string;
  className?: string;
};

export default function LoadingPage({
  title = 'Memuat halaman',
  description = 'Mohon tunggu sebentar. Kami sedang menyiapkan konten.',
  className,
}: LoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(
        'bg-background text-foreground relative isolate min-h-screen w-full',
        className,
      )}
    >
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="from-primary/10 via-background to-background dark:from-primary/15 dark:via-background dark:to-background absolute inset-0 bg-linear-to-b" />
        <div className="bg-primary/15 absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl" />
        <div className="bg-primary/10 absolute right-0 -bottom-32 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6">
        <Card className="relative w-full max-w-md overflow-hidden border-white/15 bg-white/10 shadow-[0_22px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          {/* subtle ring + glow */}
          <div className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-white/10 ring-inset dark:ring-white/8" />
          <div className="bg-primary/20 pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full blur-3xl" />

          <CardContent className="relative p-6 sm:p-7">
            {/* glossy highlight */}
            <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/18 via-white/6 to-transparent dark:from-white/10" />

            {/* Header */}
            <div className="relative flex items-center gap-3">
              <div className="relative inline-flex size-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/20 via-transparent to-transparent dark:from-white/10" />
                <Image
                  src="/assets/logo.svg"
                  alt="Stockly"
                  width={30}
                  height={30}
                  priority
                  className="relative"
                />
              </div>

              <div className="min-w-0">
                <p className="text-sm leading-tight font-semibold tracking-tight">
                  Stockly
                </p>
                <p className="text-muted-foreground text-xs">
                  Inventory &amp; invoice untuk operasional harian
                </p>
              </div>
            </div>

            {/* divider */}
            <div className="relative my-5 h-px w-full bg-white/10 dark:bg-white/8" />

            {/* Loading panel */}
            <div className="relative rounded-2xl border border-white/15 bg-white/10 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.10)] backdrop-blur-xl sm:p-5 dark:border-white/10 dark:bg-white/5">
              <div className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-white/16 via-white/6 to-transparent dark:from-white/10" />

              <div className="relative flex items-start gap-3">
                <div
                  className="relative mt-0.5 inline-flex size-9 items-center justify-center rounded-xl border border-white/15 bg-white/10 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                  aria-hidden="true"
                >
                  <Spinner aria-hidden="true" />
                </div>

                <div className="min-w-0">
                  <p className="text-sm leading-tight font-semibold">
                    {title}
                    <span className="inline-flex w-6 justify-start">
                      <span className="animate-pulse">.</span>
                      <span className="animate-pulse [animation-delay:150ms]">
                        .
                      </span>
                      <span className="animate-pulse [animation-delay:300ms]">
                        .
                      </span>
                    </span>
                  </p>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {description}
                  </p>
                </div>
              </div>
            </div>

            <span className="sr-only">{title}</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
