"use client";

import { LogOut, User2 } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const NavProfile = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="ml-3 rounded-full border p-1 hover:bg-gray-100">
          <User2 className="h-6 w-6 text-gray-600" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="bg-destructive !hover:bg-destructive/80 text-white"
        >
          <LogOut className="mr-2 h-4 w-4 text-white" /> Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NavProfile;
