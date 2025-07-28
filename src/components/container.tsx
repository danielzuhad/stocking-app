import { cn } from "@/lib/utils"; // gunakan util cn jika kamu pakai tailwind-merge atau classnames
import React from "react";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
}

const Container = ({ children, className }: ContainerProps) => {
  return (
    <section
      className={cn(
        "mx-auto w-full px-4", // padding kiri-kanan
        "max-w-full", // mobile default
        "sm:max-w-[640px]", // tablet breakpoint
        "lg:max-w-[1280px]", // desktop breakpoint
        className
      )}
    >
      {children}
    </section>
  );
};

export default Container;
