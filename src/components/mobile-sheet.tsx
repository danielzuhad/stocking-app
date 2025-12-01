"use client";

import { NavItem } from "@/types/navigation";
import { LogOut, Menu } from "lucide-react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import NavLink from "./link";
import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";

interface MobileSheetProps {
  session: Session | null;
  links: NavItem[];
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
            <nav className="mt-5 flex flex-col space-y-2 text-base">
              {links.map((link, index) => {
                const hasChildren = !!link.children && link.children.length > 0;
                const fallbackHref = link.href ?? link.children?.[0]?.href ?? "/";

                if (hasChildren) {
                  return (
                    <div key={`${link.name}-${index}`} className="space-y-1">
                      <span className="text-muted-foreground hover:text-primary/80 px-3 py-2 text-sm font-medium transition-colors duration-200">
                        {link.name}
                      </span>

                      <div className="border-border ml-3 flex flex-col space-y-1 border-l pl-3 text-sm">
                        {link.children!.map((child) => (
                          <NavLink key={child.href} href={child.href} className="px-0">
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    </div>
                  );
                }

                return (
                  <NavLink key={`${link.name}-${index}`} href={fallbackHref} className="px-0">
                    {link.name}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer section: Profile + Logout */}
        <div className="border-t pt-4">
          <div className="mb-3 text-sm text-gray-600">
            <div className="truncate font-medium">{session?.user?.username}</div>
            {session?.user?.companyName && (
              <div className="truncate text-[11px] text-gray-500">{session.user.companyName}</div>
            )}
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
