"use client";

import { cn } from "@/lib/utils";
import { NavItem } from "@/types/navigation";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import NavLink from "./link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

interface DesktopNavLinksProps {
  items: NavItem[];
}

const DesktopNavLinks = ({ items }: DesktopNavLinksProps) => {
  const pathname = usePathname();

  const isHrefActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="gap-10 space-x-5 max-lg:hidden lg:flex">
      {items.map((item) => {
        if (item.children && item.children.length > 0) {
          const parentActive =
            isHrefActive(item.href) || item.children.some((child) => isHrefActive(child.href));

          return (
            <DropdownMenu key={item.name}>
              <DropdownMenuTrigger
                className={cn(
                  "flex cursor-pointer items-center gap-1 border-none px-3 py-2 text-sm font-medium transition-colors duration-200",
                  parentActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
                )}
              >
                {item.name}
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {item.children.map((child) => (
                  <DropdownMenuItem key={child.href} asChild>
                    <Link className="cursor-pointer" href={child.href}>
                      {child.name}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        }

        return (
          <NavLink href={item.href ?? "/"} key={item.name}>
            {item.name}
          </NavLink>
        );
      })}
    </div>
  );
};

export default DesktopNavLinks;
