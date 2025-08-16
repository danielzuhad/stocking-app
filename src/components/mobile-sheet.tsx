"use client";

import { LogOut, Menu } from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import NavLink from "./link";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface MobileSheetProps {
  session: Session;
  links: { href: string; name: string }[];
}

const MobileSheet = ({ links, session }: MobileSheetProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Menu className="h-6 w-6 cursor-pointer" />
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col justify-between px-4 py-6">
        {/* <SheetTitle></SheetTitle> */}

        <div className="space-y-6">
          <div>
            <h2 className="mb-2 text-xl font-semibold">Menu</h2>
            <nav className="mt-5 flex flex-col space-y-2 text-lg">
              {links.map((link, i) => (
                <NavLink href={link.href} key={i}>
                  {link.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>

        {/* Footer section: Profile + Logout */}
        <div className="border-t pt-4">
          <div className="mb-3 text-sm text-gray-600">
            <div className="truncate font-medium">{session?.user?.username}</div>
            <div className="truncate text-xs text-gray-500">{session?.user?.email}</div>
          </div>
          <Button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="bg-destructive hover:bg-destructive/80 w-full cursor-pointer justify-start text-white"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileSheet;
