'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getErrorPresentation } from '@/lib/errors/presentation';

/**
 * Global error boundary.
 *
 * Handles unexpected errors across the app. Keep messages safe (no DB/stack leaks).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isPending, startTransition] = React.useTransition();

  const isSuperadmin = session?.user.system_role === 'SUPERADMIN';
  const showDeveloperDetails =
    isSuperadmin || process.env.NODE_ENV !== 'production';

  const presentation = React.useMemo(
    () =>
      getErrorPresentation({
        error,
        digest: error.digest,
        pathname,
      }),
    [error, pathname],
  );

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-xl items-center justify-center px-4 py-10 sm:px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{presentation.user.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            {presentation.user.message}
          </p>

          <div className="text-muted-foreground text-xs">
            Kode: {presentation.developer.digest ?? '—'}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              isLoading={isPending}
              loadingText="Mencoba lagi..."
              onClick={() => {
                startTransition(() => {
                  reset();
                  router.refresh();
                });
              }}
            >
              Coba lagi
            </Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Ke dashboard</Link>
            </Button>
          </div>

          {showDeveloperDetails ? (
            <>
              <Separator />
              <details className="text-sm">
                <summary className="cursor-pointer select-none font-medium">
                  Developer details
                </summary>
                <div className="mt-3 space-y-3 text-xs">
                  <div className="grid gap-1">
                    <div>
                      <span className="text-muted-foreground">Kind: </span>
                      <span className="font-medium">
                        {presentation.developer.kind}
                      </span>
                    </div>
                    {presentation.developer.pathname ? (
                      <div>
                        <span className="text-muted-foreground">Path: </span>
                        <span className="font-medium">
                          {presentation.developer.pathname}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {presentation.developer.hint ? (
                    <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
                      {presentation.developer.hint}
                    </pre>
                  ) : null}

                  <div className="grid gap-2">
                    <div>
                      <div className="text-muted-foreground mb-1">Message</div>
                      <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
                        {presentation.developer.message}
                      </pre>
                    </div>
                    {presentation.developer.cause ? (
                      <div>
                        <div className="text-muted-foreground mb-1">Cause</div>
                        <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
                          {presentation.developer.cause}
                        </pre>
                      </div>
                    ) : null}
                    {presentation.developer.stack ? (
                      <div>
                        <div className="text-muted-foreground mb-1">Stack</div>
                        <pre className="bg-muted text-foreground overflow-x-auto rounded-md p-3 text-xs leading-relaxed">
                          {presentation.developer.stack}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </div>
              </details>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
