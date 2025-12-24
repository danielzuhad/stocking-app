'use client';

import { usePathname } from 'next/navigation';

import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';

import { getPageTitle, type SystemRole } from './nav';
import { ThemeToggle } from './theme-toggle';
import { UserMenu } from './user-menu';

/**
 * Topbar for dashboard pages (title, sidebar trigger, theme + user menu).
 */
export function DashboardTopbar({
  username,
  system_role,
  active_company_id,
}: {
  username: string;
  system_role: SystemRole;
  active_company_id: string | null;
}) {
  const pathname = usePathname();
  const title = getPageTitle(pathname, system_role);

  return (
    <header className="bg-background/80 supports-backdrop-filter:bg-background/60 sticky top-0 z-20 w-full border-b backdrop-blur">
      <div className="flex h-14 w-full max-w-screen-2xl items-center gap-3 px-4 sm:px-6">
        <SidebarTrigger />
        <Separator orientation="vertical" className="h-6" />

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{title}</div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu
            username={username}
            system_role={system_role}
            active_company_id={active_company_id}
          />
        </div>
      </div>
    </header>
  );
}
