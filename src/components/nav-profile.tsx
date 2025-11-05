"use client";

import { LogOut } from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface Props {
  session: Session | null;
}

const NavProfile = ({ session }: Props) => {
  return (
    <div className="flex items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex cursor-pointer flex-col items-end text-sm leading-tight text-gray-700">
            <span
              className="block max-w-[120px] truncate text-[17px] font-medium lg:max-w-[250px]"
              title={session?.user?.username ?? ""}
            >
              {session?.user?.username}
            </span>
            <span
              className="block max-w-[120px] truncate text-xs text-gray-500 lg:max-w-[250px]"
              title={session?.user?.email ?? ""}
            >
              {session?.user?.email}
            </span>
          </div>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700"
          >
            <LogOut className="mr-2 h-4 w-4 text-red-600" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NavProfile;
