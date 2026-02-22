'use client';

import {
  LogOutIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UserIcon,
} from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { auditClearSuperadminImpersonation } from '../app/(dashboard)/actions/impersonation';
import type { SystemRole } from './nav';

const SYSTEM_ROLE_LABELS: Record<SystemRole, string> = {
  SUPERADMIN: 'Superadmin',
  ADMIN: 'Admin',
  STAFF: 'Staf',
};

/**
 * User dropdown menu (sign out, settings, superadmin impersonation controls).
 */
export function UserMenu({
  username,
  system_role,
  active_company_id,
}: {
  username: string;
  system_role: SystemRole;
  active_company_id: string | null;
}) {
  const router = useRouter();
  const { update } = useSession();
  const [isPending, startTransition] = React.useTransition();

  const initials = username.trim().slice(0, 2).toUpperCase();
  const isSuperadmin = system_role === 'SUPERADMIN';
  const isImpersonating = isSuperadmin && Boolean(active_company_id);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-2">
          <Avatar className="size-7">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[12rem] truncate text-sm font-medium md:block">
            {username}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{username}</span>
            {isSuperadmin ? (
              <Badge variant="secondary">
                <ShieldCheckIcon className="size-3" />
                {SYSTEM_ROLE_LABELS.SUPERADMIN}
              </Badge>
            ) : (
              <Badge variant="secondary">{SYSTEM_ROLE_LABELS[system_role]}</Badge>
            )}
          </div>
          {isImpersonating ? (
            <div className="text-muted-foreground text-xs">
              Mode penyamaran: {active_company_id}
            </div>
          ) : null}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isImpersonating ? (
          <>
            <DropdownMenuItem
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  const result = await auditClearSuperadminImpersonation();
                  if (!result.ok) {
                    toast.error(result.error.message);
                    return;
                  }

                  await update({ active_company_id: null });
                  router.refresh();
                  toast.success('Mode penyamaran dimatikan.');
                });
              }}
            >
              <UserIcon className="size-4" />
              Keluar mode penyamaran
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}

        <DropdownMenuItem asChild>
          <Link href="/settings">
            <SettingsIcon className="size-4" />
            Pengaturan
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          <LogOutIcon className="size-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
