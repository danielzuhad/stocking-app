import * as React from 'react';
import { NumericFormat } from 'react-number-format';

import { cn } from '@/lib/utils';

type NumberInputValueType = number | null | undefined;

export type NumberInputProps = {
  id?: string;
  name?: string;
  value?: NumberInputValueType;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  allowNegative?: boolean;
  decimalScale?: number;
  fixedDecimalScale?: boolean;
  thousandSeparator?: boolean | string;
  decimalSeparator?: string;
  leftAttachment?: React.ReactNode;
  rightAttachment?: React.ReactNode;
  className?: string;
  inputClassName?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
  onValueChange?: (value: number) => void;
  'aria-invalid'?: boolean | 'true' | 'false';
};

/**
 * Numeric input with optional left/right attachments (currency/unit chips).
 */
export const NumberInput = React.forwardRef<HTMLInputElement, NumberInputProps>(
  (
    {
      id,
      name,
      value,
      placeholder,
      disabled,
      required,
      autoComplete,
      allowNegative = false,
      decimalScale,
      fixedDecimalScale,
      thousandSeparator = '.',
      decimalSeparator = ',',
      leftAttachment,
      rightAttachment,
      className,
      inputClassName,
      onBlur,
      onValueChange,
      'aria-invalid': ariaInvalid,
    },
    ref,
  ) => {
    const isInvalid = ariaInvalid === true || ariaInvalid === 'true';

    return (
      <div
        data-slot="number-input"
        className={cn(
          'border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 shadow-xs transition-[color,box-shadow] outline-none',
          'focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]',
          disabled ? 'cursor-not-allowed opacity-50' : null,
          isInvalid
            ? 'border-destructive ring-destructive/20 dark:ring-destructive/40'
            : null,
          className,
        )}
        aria-invalid={isInvalid || undefined}
      >
        <div className="flex h-full items-center gap-2">
          {leftAttachment ? (
            <span className="text-muted-foreground shrink-0 text-sm">
              {leftAttachment}
            </span>
          ) : null}

          <NumericFormat
            id={id}
            name={name}
            getInputRef={ref}
            value={value ?? 0}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            autoComplete={autoComplete}
            allowNegative={allowNegative}
            decimalScale={decimalScale}
            fixedDecimalScale={fixedDecimalScale}
            thousandSeparator={thousandSeparator}
            decimalSeparator={decimalSeparator}
            aria-invalid={isInvalid || undefined}
            onBlur={onBlur}
            onValueChange={(nextValue) => {
              onValueChange?.(nextValue.floatValue ?? 0);
            }}
            className={cn(
              'placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground h-full flex-1 bg-transparent text-base outline-none md:text-sm',
              'disabled:pointer-events-none disabled:cursor-not-allowed',
              inputClassName,
            )}
          />

          {rightAttachment ? (
            <span className="text-muted-foreground shrink-0 text-sm">
              {rightAttachment}
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);
NumberInput.displayName = 'NumberInput';
