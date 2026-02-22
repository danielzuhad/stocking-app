import {
  ActivityIcon,
  ClipboardCheckIcon,
  ClipboardMinusIcon,
  ClipboardPlusIcon,
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
      label: 'Utama',
      items: [
        {
          title: 'Dashboard',
          href: '/dashboard',
          icon: LayoutDashboardIcon,
        },
      ],
    },
    {
      label: 'Master Data',
      items: [
        {
          title: 'Produk',
          href: '/products',
          icon: PackageIcon,
        },
      ],
    },
    {
      label: 'Operasional',
      items: [
        {
          title: 'Stok Barang',
          href: '/inventory/stock',
          icon: WarehouseIcon,
        },
        {
          title: 'Barang Masuk',
          href: '/inventory/receivings',
          icon: ClipboardPlusIcon,
        },
        {
          title: 'Penyesuaian Stok',
          href: '/inventory/adjustments',
          icon: ClipboardMinusIcon,
        },
        {
          title: 'Stok Opname',
          href: '/inventory/opnames',
          icon: ClipboardCheckIcon,
        },
        {
          title: 'Penjualan',
          href: '/sales',
          icon: ReceiptTextIcon,
        },
      ],
    },
    {
      label: 'Monitoring',
      items: [
        {
          title: 'Laporan',
          href: '/reports',
          icon: BarChart3Icon,
        },
        {
          title: 'Log Aktivitas',
          href: '/activity-logs',
          icon: ActivityIcon,
        },
      ],
    },
    {
      label: 'Pengaturan',
      items: [
        {
          title: 'Pengaturan',
          href: '/settings',
          icon: SettingsIcon,
        },
      ],
    },
  ],
  superadmin: [
    {
      label: 'Platform Superadmin',
      items: [
        {
          title: 'Perusahaan',
          href: '/companies',
          icon: Building2Icon,
        },
        {
          title: 'Log Sistem',
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
