"use client";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { ControllerFieldState } from "react-hook-form";
import Select, { GroupBase, Props } from "react-select";

type SelectProps<
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
> = Props<Option, IsMulti, Group> & {
  label?: string;
  name: string;
  className?: string;
  onChange?: (value: unknown) => void;
  fieldState?: ControllerFieldState;
  isLoading?: boolean;
};

export const SelectInput = <
  Option,
  IsMulti extends boolean = false,
  Group extends GroupBase<Option> = GroupBase<Option>,
>({
  label,
  className,
  fieldState,
  isLoading,
  ...props
}: SelectProps<Option, IsMulti, Group>) => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? (
    <div className="flex w-full flex-col gap-y-1">
      {label && <Label className="text-xs font-medium text-gray-700">{label}</Label>}
      <Select
        {...props}
        className={cn(
          "border-input flex h-9 w-full min-w-0 rounded-md border bg-white shadow-xs transition-[color,box-shadow] outline-none",
          "focus-within:border-primary/50 focus-within:ring-primary/50 focus-within:ring-[1px]",
          fieldState?.error && "border-destructive ring-destructive/20 ring-[1px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-200 disabled:opacity-50",
          props.isDisabled
            ? "pointer-events-none cursor-not-allowed border-neutral-300 bg-neutral-200 opacity-50"
            : "bg-white",
          className
        )}
        styles={{
          control: () => ({
            display: "flex",
            alignItems: "center",
            minHeight: "100%",
            width: "100%",
            padding: "0 12px",
          }),
          valueContainer: (base) => ({
            ...base,
            padding: "0",
            fontSize: "14px",
          }),
          input: (base) => ({
            ...base,
            margin: "0",
            paddingBottom: "0",
            paddingTop: "0",
            fontSize: "14px",
            color: "black",
          }),
          placeholder: (base) => ({
            ...base,
            fontSize: "14px",
            margin: "0",
          }),
          singleValue: (base) => ({
            ...base,
            fontSize: "14px",
            color: "black",
            margin: "0",
          }),
          multiValue: (base) => ({
            ...base,
            fontSize: "14px",
          }),
          indicatorsContainer: (base) => ({
            ...base,
            padding: "0",
          }),
          dropdownIndicator: (base) => ({
            ...base,
            padding: "0 4px",
          }),
          menu: (provided) => ({
            ...provided,
            zIndex: 999,
            fontSize: "14px",
            marginTop: "4px",
            border: "1px solid hsl(var(--input))",
            borderRadius: "6px",
            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          }),
          option: (base, state) => ({
            ...base,
            fontSize: "14px",
            padding: "8px 12px",
            cursor: "pointer",
            backgroundColor: state.isSelected
              ? "#dcefe2"
              : state.isFocused
                ? "#ebf4ec"
                : "transparent",
            color: state.isSelected ? "hsl(var(--primary-foreground))" : "inherit",
            ":active": {
              backgroundColor: state.isSelected ? "#dcefe2" : "#dcefe2",
            },
          }),
        }}
      />

      {isLoading && (
        <span className="text-[0.65rem] text-gray-600 italic">
          <Loader2Icon className="mr-2 inline-flex h-3 w-3 animate-spin" />
          Sedang Memuat Data...
        </span>
      )}
    </div>
  ) : null;
};
