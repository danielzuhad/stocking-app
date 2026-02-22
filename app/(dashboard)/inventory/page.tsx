import { redirect } from 'next/navigation';

/** Backward-compatible inventory root route. */
export default function InventoryPage() {
  redirect('/inventory/stock');
}
