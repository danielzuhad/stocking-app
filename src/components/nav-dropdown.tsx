"use client";

import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavChild = {
  name: string;
  href: string;
};

interface NavDropdownProps {
  name: string;
  href: string;
  childrenLinks: NavChild[];
}

const NavDropdown = ({ name, href, childrenLinks }: NavDropdownProps) => {
  const pathname = usePathname();

  const isParentActive =
    pathname === href ||
    pathname.startsWith(href + "/") ||
    childrenLinks.some((c) => pathname.startsWith(c.href));

  return (
    <div className="group relative">
      {/* Trigger dropdown */}
      <button
        type="button"
        className={cn(
          "flex items-center gap-1 px-3 py-2 text-sm transition-colors duration-200",
          isParentActive
            ? "text-primary font-semibold"
            : "text-muted-foreground hover:text-primary/80 font-medium"
        )}
        aria-haspopup="menu"
        aria-expanded={isParentActive}
      >
        <span>{name}</span>
        <ChevronDown className="h-3 w-3" />
      </button>

      {/* Menu */}
      <div
        className={cn(
          "invisible absolute top-full left-0 z-50 mt-2 min-w-[180px] rounded-md border bg-white py-2 opacity-0 shadow-md",
          "transition-opacity duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
        )}
      >
        {childrenLinks.map((child) => {
          const isActive = pathname === child.href;
          return (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                "block px-4 py-2 text-sm transition-colors",
                isActive
                  ? "bg-primary/5 text-primary font-semibold"
                  : "text-muted-foreground hover:text-primary hover:bg-slate-50"
              )}
            >
              {child.name}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default NavDropdown;
