import { authOptions } from '@/auth';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

/** Placeholder page for superadmin system logs/audit. */
export default async function SystemLogsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.system_role !== 'SUPERADMIN') redirect('/dashboard');

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>System Logs</EmptyTitle>
        <EmptyDescription>Coming soon (superadmin): global logs/audit.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
