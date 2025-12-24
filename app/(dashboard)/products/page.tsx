import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Products module. */
export default function ProductsPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Products</EmptyTitle>
        <EmptyDescription>Coming soon: CRUD product + variant.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
