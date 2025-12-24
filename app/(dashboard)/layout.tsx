import { authOptions } from '@/auth';
import { getServerSession } from 'next-auth/next';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { DashboardShell } from './_components/dashboard-shell';

const SIDEBAR_STATE_COOKIE = 'sidebar_state';

/**
 * Authenticated app layout (Sidebar + Topbar).
 *
 * Notes:
 * - Folder `(dashboard)` is a route group, so URLs stay the same.
 * - Sidebar open/closed state is persisted via `sidebar_state` cookie (shadcn Sidebar).
 */
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const cookieStore = await cookies();
  const default_sidebar_open =
    cookieStore.get(SIDEBAR_STATE_COOKIE)?.value !== 'false';

  return (
    <DashboardShell
      default_sidebar_open={default_sidebar_open}
      user={{
        username: session.user.username,
        system_role: session.user.system_role,
      }}
      active_company_id={session.active_company_id}
    >
      {children}
    </DashboardShell>
  );
}
