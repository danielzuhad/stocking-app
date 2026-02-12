import type { DataTableQuery } from './types';
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
} from './constants';

/**
 * Shared Next.js `searchParams` type for pages.
 *
 * Matches the App Router `searchParams` shape (string, array, or undefined).
 */
export type PageSearchParams = Record<string, string | string[] | undefined>;

/**
 * Reads a search param value, normalizing array values to the first item.
 */
function getSearchParam(
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
function parsePageSize(
  value: string | null,
  fallback: number,
  options: readonly number[] = TABLE_PAGE_SIZE_OPTIONS,
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
function parsePageIndex(value: string | null): number {
  if (!value) return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed) - 1;
}

type DataTableQueryFromSearchParamsOptions = {
  pageSizeOptions?: readonly number[];
  defaultPageSize?: number;
};

/**
 * Builds a serializable `DataTableQuery` from standard URL search params.
 */
export function getDataTableQueryFromSearchParams(
  searchParams: PageSearchParams,
  urlStateKey: string,
  options?: DataTableQueryFromSearchParamsOptions,
): DataTableQuery {
  const prefix = urlStateKey ? `${urlStateKey}_` : '';
  const pageParam = getSearchParam(searchParams, `${prefix}page`);
  const pageSizeParam = getSearchParam(searchParams, `${prefix}pageSize`);
  const pageSizeOptions = options?.pageSizeOptions ?? TABLE_PAGE_SIZE_OPTIONS;
  const defaultPageSize =
    options?.defaultPageSize ?? pageSizeOptions[0] ?? DEFAULT_TABLE_PAGE_SIZE;

  return {
    pageIndex: parsePageIndex(pageParam),
    pageSize: parsePageSize(pageSizeParam, defaultPageSize, pageSizeOptions),
  };
}

type TextQueryFromSearchParamsOptions = {
  maxLength?: number;
};

/**
 * Reads an optional text query from URL params and returns a trimmed value.
 *
 * Empty values are normalized to `undefined`.
 */
export function getTextQueryFromSearchParams(
  searchParams: PageSearchParams,
  key: string,
  options?: TextQueryFromSearchParamsOptions,
): string | undefined {
  const rawValue = getSearchParam(searchParams, key);
  const value = rawValue?.trim();
  if (!value) return undefined;

  const maxLength = options?.maxLength ?? 100;
  if (maxLength <= 0) return value;
  return value.slice(0, maxLength);
}
