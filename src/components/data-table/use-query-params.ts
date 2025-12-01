"use client";

import { EncryptedQueryParams, QUERY_PARAM_KEY, decryptQueryParams, encryptQueryParams } from "@/lib/query-crypto";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

type QueryUpdates = Partial<{
  page: number;
  pageSize: number;
  search: string;
}>;

/**
 * Shared helper to update pagination/search query params without repeating logic.
 */
export const useDataTableQuery = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [params, setParams] = useState<EncryptedQueryParams>({});

  const parseNumber = (value: string | null): number | undefined => {
    if (value === null) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const readParams = useCallback(async (): Promise<EncryptedQueryParams> => {
    const currentToken = searchParams.get(QUERY_PARAM_KEY);
    const current = await decryptQueryParams(currentToken);

    const merged: EncryptedQueryParams = { ...current };

    // Fallback to any existing plain params (for compatibility) if not present in encrypted blob
    const fallbackPage = parseNumber(searchParams.get("page"));
    const fallbackPageSize = parseNumber(searchParams.get("pageSize"));
    const fallbackSearch = searchParams.get("search") ?? undefined;

    if (merged.page === undefined && fallbackPage !== undefined) merged.page = fallbackPage;
    if (merged.pageSize === undefined && fallbackPageSize !== undefined)
      merged.pageSize = fallbackPageSize;
    if (merged.search === undefined && fallbackSearch) merged.search = fallbackSearch;

    return merged;
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const merged = await readParams();
      if (active) setParams(merged);
    })();
    return () => {
      active = false;
    };
  }, [readParams]);

  const updateQuery = useCallback(
    (updates: QueryUpdates = {}) => {
      const run = async () => {
        const next = new URLSearchParams(searchParams);
        const merged = await readParams();

        if (typeof updates.page === "number") {
          merged.page = updates.page;
        }
        if (typeof updates.pageSize === "number") {
          merged.pageSize = updates.pageSize;
        }
        if (typeof updates.search === "string") {
          const trimmed = updates.search.trim();
          merged.search = trimmed || undefined;
          merged.page = 1;
        }

        setParams(merged);

        const token = await encryptQueryParams(merged);
        next.set(QUERY_PARAM_KEY, token);

        // remove plain params to avoid leaking raw values
        next.delete("page");
        next.delete("pageSize");
        next.delete("search");

        startTransition(() => {
          router.replace(`${pathname}?${next.toString()}`, { scroll: false });
        });
      };

      void run();
    },
    [pathname, readParams, router, searchParams, startTransition]
  );

  const refresh = useCallback(() => updateQuery({}), [updateQuery]);

  return { updateQuery, refresh, isPending, params };
};
