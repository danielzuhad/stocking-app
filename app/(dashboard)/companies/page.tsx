import { authOptions } from '@/auth';
import { EmptyState } from '@/components/ui/empty-state';
import { SYSTEM_ROLE_SUPERADMIN } from '@/lib/auth/enums';
import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';

/** Placeholder page for superadmin Companies management. */
export default async function CompaniesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (session.user.system_role !== SYSTEM_ROLE_SUPERADMIN) redirect('/dashboard');

  return (
    <EmptyState
      title="Perusahaan"
      description="Segera hadir (superadmin): buat perusahaan, atur limit, dan kelola status."
    />
  );
}
