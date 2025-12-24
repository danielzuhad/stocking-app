import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Returns/Refund module. */
export default function ReturnsPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Returns</EmptyTitle>
        <EmptyDescription>Coming soon: partial return + restock/write-off.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
