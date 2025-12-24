import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Reports module. */
export default function ReportsPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Reports</EmptyTitle>
        <EmptyDescription>Coming soon: dashboard reports + export CSV/PDF.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
