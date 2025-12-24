import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Sales/Invoice module. */
export default function SalesPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Sales</EmptyTitle>
        <EmptyDescription>
          Coming soon: invoices (draft → posted) + stock out.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
