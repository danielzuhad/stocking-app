import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Activity Logs. */
export default function ActivityLogsPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Activity Logs</EmptyTitle>
        <EmptyDescription>Coming soon: audit trail per company.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
