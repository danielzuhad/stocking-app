"use client";

import { cn } from "@/lib/utils";
import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  isOptional?: boolean;
}

export function Label({ className, children, isOptional = false, ...props }: LabelProps) {
  // ambil status required dari aria-required (misal dari FormField)
  const isRequired = props["aria-required"] === true || props["aria-required"] === "true";

  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-1.5 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      {isOptional && <span className="text-muted-foreground text-xs">(optional)</span>}
      {isRequired && <span className="text-destructive">*</span>}
    </LabelPrimitive.Root>
  );
}
