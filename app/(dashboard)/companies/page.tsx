import { authOptions } from '@/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

/** Placeholder page for superadmin Companies management. */
export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.system_role !== 'SUPERADMIN') redirect('/dashboard');

  return (
    <EmptyState
      title="Companies"
      description="Coming soon (superadmin): create company, set limits, manage status."
    />
  );
}
