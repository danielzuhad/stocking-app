'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type InputSearchProps = {
  className?: string;
  placeholder?: string;
  queryKey?: string;
  urlStateKey?: string;
  debounceMs?: number;
  maxLength?: number;
  /** Emits pending navigation state while URL update is in-flight. */
  onPendingChange?: (pending: boolean) => void;
};

/**
 * URL-driven search input with debounce.
 *
 * Notes:
 * - Keeps URL explicit (no-clean mode): empty value remains `queryKey=`.
 * - Resets table page to `1` when search changes.
 */
export default function InputSearch({
  className,
  placeholder = 'Cari...',
  queryKey = 'q',
  urlStateKey,
  debounceMs = 400,
  maxLength = 100,
  onPendingChange,
}: InputSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();
  const searchParamsString = searchParams.toString();
  const valueFromUrl = searchParams.get(queryKey) ?? '';
  const pendingQueryRef = React.useRef<string | null>(null);
  const previousValueFromUrlRef = React.useRef(valueFromUrl);
  const [value, setValue] = React.useState(valueFromUrl);
  const latestValueRef = React.useRef(valueFromUrl);

  React.useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  React.useEffect(() => {
    const isOwnAck = pendingQueryRef.current === searchParamsString;
    if (isOwnAck) {
      pendingQueryRef.current = null;
    }

    const didQueryValueChange = previousValueFromUrlRef.current !== valueFromUrl;
    previousValueFromUrlRef.current = valueFromUrl;

    // Ignore unrelated URL param changes (page/pageSize/etc) while user is typing.
    if (!didQueryValueChange) {
      return;
    }

    // Ignore stale URL acknowledgement if user has already typed a newer value.
    if (isOwnAck && latestValueRef.current !== valueFromUrl) {
      return;
    }

    setValue((prev) => (prev === valueFromUrl ? prev : valueFromUrl));
  }, [searchParamsString, valueFromUrl]);

  React.useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  React.useEffect(() => {
    return () => {
      onPendingChange?.(false);
    };
  }, [onPendingChange]);

  React.useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (value === valueFromUrl) return;

      const params = new URLSearchParams(searchParamsString);
      params.set(queryKey, value);

      if (urlStateKey) {
        params.set(`${urlStateKey}_page`, '1');
      }

      const nextQuery = params.toString();
      if (
        nextQuery === searchParamsString ||
        pendingQueryRef.current === nextQuery
      ) {
        return;
      }

      pendingQueryRef.current = nextQuery;
      startTransition(() => {
        router.replace(`${pathname}?${nextQuery}`, { scroll: false });
      });
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    debounceMs,
    pathname,
    queryKey,
    router,
    searchParamsString,
    startTransition,
    urlStateKey,
    value,
    valueFromUrl,
  ]);

  return (
    <div className={cn('relative w-full sm:max-w-sm', className)}>
      <Search
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={value}
        maxLength={maxLength}
        onChange={(event) => setValue(event.currentTarget.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
