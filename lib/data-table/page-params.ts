/**
 * Shared Next.js `searchParams` type for pages.
 *
 * Matches the App Router `searchParams` shape (string, array, or undefined).
 */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/** Default options used by DataTable page size selectors. */
export const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Reads a search param value, normalizing array values to the first item.
 */
export function getSearchParam(
  searchParams: PageSearchParams,
  key: string,
): string | null {
  const value = searchParams[key];
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

/**
 * Parses a page size value with a safe fallback and allowed list.
 */
export function parsePageSize(
  value: string | null,
  fallback: number,
  options: readonly number[] = DEFAULT_PAGE_SIZE_OPTIONS,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  if (!options.includes(parsed)) return fallback;
  return parsed;
}

/**
 * Parses a 1-based page index and returns a 0-based index for the UI.
 */
export function parsePageIndex(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed) - 1;
}

export type DataTableSearchParams = {
  pageParam: string | null;
  pageSizeParam: string | null;
  searchParam: string;
};

/**
 * Reads the standard DataTable URL search params for a given URL state key.
 */
export function getDataTableSearchParams(
  searchParams: PageSearchParams,
  urlStateKey: string,
): DataTableSearchParams {
  const prefix = urlStateKey ? `${urlStateKey}_` : '';

  return {
    pageParam: getSearchParam(searchParams, `${prefix}page`),
    pageSizeParam: getSearchParam(searchParams, `${prefix}pageSize`),
    searchParam: getSearchParam(searchParams, `${prefix}q`) ?? '',
  };
}
