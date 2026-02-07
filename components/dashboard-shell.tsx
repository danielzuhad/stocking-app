'use client';

import * as React from 'react';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

import { DashboardSidebar } from './dashboard-sidebar';
import { DashboardTopbar } from './dashboard-topbar';
import type { SystemRole } from './nav';

type ShellUser = {
  username: string;
  system_role: SystemRole;
};

/**
 * Client-side dashboard shell responsible for interactive layout:
 * sidebar collapse/mobile sheet + topbar controls.
 */
export function DashboardShell({
  children,
  default_sidebar_open,
  user,
  active_company_id,
}: {
  children: React.ReactNode;
  default_sidebar_open: boolean;
  user: ShellUser;
  active_company_id: string | null;
}) {
  return (
    <SidebarProvider defaultOpen={default_sidebar_open}>
      <DashboardSidebar system_role={user.system_role} />
      <SidebarInset>
        <DashboardTopbar
          username={user.username}
          system_role={user.system_role}
          active_company_id={active_company_id}
        />
        <div className="w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
