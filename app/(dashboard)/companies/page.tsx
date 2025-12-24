import { authOptions } from '@/auth';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

/** Placeholder page for superadmin Companies management. */
export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.system_role !== 'SUPERADMIN') redirect('/dashboard');

  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Companies</EmptyTitle>
        <EmptyDescription>
          Coming soon (superadmin): create company, set limits, manage status.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
