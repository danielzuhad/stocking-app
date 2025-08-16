import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import { NumericFormat, NumericFormatProps } from "react-number-format";
import { inputBaseClass } from "./ui/input";

interface Props extends NumericFormatProps {
  leftAttachment?: string | ReactNode;
  rightAttachment?: string | ReactNode;
  maxValue?: number;
  withBorder?: boolean;
}

const InputNumericFormat = ({
  leftAttachment,
  rightAttachment,
  maxValue,
  withBorder = true,
  ...props
}: Props) => {
  return (
    <div
      className={cn(
        "flex w-full items-center overflow-hidden rounded-lg",
        props["aria-invalid"] && "border-destructive ring-destructive/20 dark:ring-destructive/40",
        props?.disabled && "bg-neutral-100",
        withBorder && "border"
      )}
    >
      {leftAttachment && (
        <span
          className={cn("ml-2 flex items-center border-r pr-2 text-xs font-bold text-[#4F4F4F]")}
        >
          {leftAttachment}
        </span>
      )}

      <NumericFormat
        {...props}
        thousandSeparator
        decimalSeparator="."
        decimalScale={0}
        className={cn(
          inputBaseClass,
          props.className,
          "disabled:border-neutral-100 disabled:bg-neutral-100",
          props["aria-invalid"] && (leftAttachment || rightAttachment) ? "border-none" : ""
        )}
        isAllowed={({ floatValue }) =>
          floatValue === undefined ||
          floatValue === null ||
          (maxValue !== undefined ? floatValue <= maxValue : true)
        }
      />

      {rightAttachment && (
        <span className="mr-2 flex items-center border-l pl-2 text-xs font-bold text-[#4F4F4F]">
          {rightAttachment}
        </span>
      )}
    </div>
  );
};

export default InputNumericFormat;
