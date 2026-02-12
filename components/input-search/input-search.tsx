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
}: InputSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const valueFromUrl = searchParams.get(queryKey) ?? '';
  const pendingQueryRef = React.useRef<string | null>(null);
  const [value, setValue] = React.useState(valueFromUrl);

  React.useEffect(() => {
    if (pendingQueryRef.current === searchParamsString) {
      pendingQueryRef.current = null;
    }
    setValue(valueFromUrl);
  }, [searchParamsString, valueFromUrl]);

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
      router.replace(`${pathname}?${nextQuery}`, { scroll: false });
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
