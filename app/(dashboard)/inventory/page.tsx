import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Inventory module. */
export default function InventoryPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Inventory</EmptyTitle>
        <EmptyDescription>
          Coming soon: stock ledger, receiving, opname, adjustments.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
