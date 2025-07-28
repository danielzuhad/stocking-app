"use client";

import { cn } from "@/lib/utils"; // kalau kamu pakai class-merge util
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
}

const NavLink = ({ href, children, className }: NavLinkProps) => {
  const pathname = usePathname();

  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={cn(
        "px-3 py-2 text-sm transition-colors duration-200",
        isActive
          ? "text-primary font-semibold"
          : "text-muted-foreground hover:text-primary/80 font-medium",
        className
      )}
    >
      {children}
    </Link>
  );
};

export default NavLink;
