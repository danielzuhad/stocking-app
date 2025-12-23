'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import {
  auditClearSuperadminImpersonation,
  auditSuperadminImpersonation,
} from './actions';

/** Minimal company shape for the impersonation list. */
type CompanyRow = {
  id: string;
  name: string;
  slug: string;
};

export function CompanySwitcher({
  companies,
  active_company_id,
}: {
  companies: CompanyRow[];
  active_company_id: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = React.useTransition();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>Impersonation</CardTitle>
        <Button
          variant="outline"
          size="sm"
          isLoading={isPending}
          onClick={() => {
            startTransition(async () => {
              const result = await auditClearSuperadminImpersonation();
              if (!result.ok) {
                toast.error(result.error.message);
                return;
              }

              await update({ active_company_id: null });
              router.refresh();
            });
          }}
        >
          Keluar
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {companies.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada company. Buat company dulu (sementara bisa lewat DB/seed).
          </p>
        ) : (
          <div className="grid gap-2">
            {companies.map((c) => (
              <button
                key={c.id}
                type="button"
                className="hover:bg-accent flex items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await auditSuperadminImpersonation({
                      company_id: c.id,
                    });

                    if (!result.ok) {
                      toast.error(result.error.message);
                      return;
                    }

                    await update({ active_company_id: result.data.company_id });
                    router.refresh();
                  });
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{c.name}</span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {c.slug}
                  </span>
                </span>
                {active_company_id === c.id ? (
                  <span className="text-primary text-xs font-semibold">
                    ACTIVE
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
