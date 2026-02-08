'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { getErrorPresentation } from '@/lib/errors/presentation';

/**
 * Dashboard error boundary.
 *
 * Use this only for unexpected errors; expected errors should be handled via UI state
 * (e.g., `ActionResult`) instead of throwing.
 */
export default function DashboardError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

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
    <Card>
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
          <Button variant="outline" asChild>
            <Link href="/dashboard">Ke dashboard</Link>
          </Button>
        </div>

        {showDeveloperDetails ? (
          <>
            <Separator />
            <details className="text-sm">
              <summary className="cursor-pointer font-medium select-none">
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
  );
}
