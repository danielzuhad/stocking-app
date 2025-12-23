import { authOptions } from '@/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { db } from '@/db';
import { companies } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

import { CompanySwitcher } from './company-switcher';
import { SignOutButton } from './sign-out-button';

/** Dashboard landing page (superadmin can set impersonation). */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const companyRows =
    session.user.system_role === 'SUPERADMIN'
      ? await db
          .select({
            id: companies.id,
            name: companies.name,
            slug: companies.slug,
          })
          .from(companies)
          .orderBy(desc(companies.created_at))
      : [];

  return (
    <div className="space-y-6">
      {session.user.system_role === 'SUPERADMIN' ? (
        <CompanySwitcher
          companies={companyRows}
          active_company_id={session.active_company_id}
        />
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Dashboard</CardTitle>
          <SignOutButton />
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">User: </span>
            <span className="font-medium">{session.user.username}</span>
          </div>
          <div>
            <span className="text-muted-foreground">System role: </span>
            <span className="font-medium">{session.user.system_role}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Active company: </span>
            <span className="font-medium">
              {session.active_company_id ?? '—'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
