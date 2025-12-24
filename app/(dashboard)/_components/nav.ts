import {
  ActivityIcon,
  BarChart3Icon,
  Building2Icon,
  LayoutDashboardIcon,
  PackageIcon,
  ReceiptTextIcon,
  SettingsIcon,
  ShieldIcon,
  WarehouseIcon,
} from 'lucide-react';

export type SystemRole = 'SUPERADMIN' | 'ADMIN' | 'STAFF';

export type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

type NavConfig = {
  common: NavGroup[];
  superadmin: NavGroup[];
};

const navConfig: NavConfig = {
  common: [
    {
      label: 'Main',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboardIcon,
        },
      ],
    },
    {
      label: 'Master',
      items: [
        {
          title: 'Products',
          href: '/products',
          icon: PackageIcon,
        },
      ],
    },
    {
      label: 'Operations',
      items: [
        {
          title: 'Inventory',
          href: '/inventory',
          icon: WarehouseIcon,
        },
        {
          title: 'Sales',
          href: '/sales',
          icon: ReceiptTextIcon,
        },
      ],
    },
    {
      label: 'Insights',
      items: [
        {
          title: 'Reports',
          href: '/reports',
          icon: BarChart3Icon,
        },
        {
          title: 'Activity Logs',
          href: '/activity-logs',
          icon: ActivityIcon,
        },
      ],
    },
    {
      label: 'Settings',
      items: [
        {
          title: 'Settings',
          href: '/settings',
          icon: SettingsIcon,
        },
      ],
    },
  ],
  superadmin: [
    {
      label: 'Platform (Superadmin)',
      items: [
        {
          title: 'Companies',
          href: '/companies',
          icon: Building2Icon,
        },
        {
          title: 'System Logs',
          href: '/system-logs',
          icon: ShieldIcon,
        },
      ],
    },
  ],
};

/**
 * Returns sidebar nav groups for the current user role.
 *
 * Superadmin sees both platform + company modules.
 */
export function getSidebarNavGroups(system_role: SystemRole): NavGroup[] {
  if (system_role === 'SUPERADMIN') {
    return [...navConfig.superadmin, ...navConfig.common];
  }

  return navConfig.common;
}

/**
 * Returns a best-effort page title for the current pathname using sidebar nav config.
 */
export function getPageTitle(
  pathname: string,
  system_role: SystemRole,
): string {
  const groups = getSidebarNavGroups(system_role);
  const allItems = groups.flatMap((g) => g.items);

  const best =
    allItems
      .filter(
        (item) =>
          pathname === item.href || pathname.startsWith(`${item.href}/`),
      )
      .sort((a, b) => b.href.length - a.href.length)[0] ?? null;

  return best?.title ?? 'Dashboard';
}
