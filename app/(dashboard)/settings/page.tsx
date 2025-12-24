import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty';

/** Placeholder page for Settings. */
export default function SettingsPage() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>Settings</EmptyTitle>
        <EmptyDescription>
          Coming soon: users & roles, company settings, integrations.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
