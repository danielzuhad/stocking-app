'use client';

import { type OnChangeFn, type PaginationState } from '@tanstack/react-table';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import {
  DEFAULT_TABLE_PAGE_SIZE,
  TABLE_PAGE_SIZE_OPTIONS,
} from '@/lib/table/constants';

/** Options for URL pagination parser/builder and hook behavior. */
export type UrlPaginationOptionsType = {
  urlStateKey: string;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  pageSizeOptions?: readonly number[];
};

/** Return shape for URL-driven DataTable pagination state. */
export type UrlPaginationStateType = {
  pagination: PaginationState;
  onPaginationChange: OnChangeFn<PaginationState>;
};

function getUrlKey(prefix: string, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function resolveOptions(options: UrlPaginationOptionsType) {
  const pageSizeOptions = options.pageSizeOptions ?? TABLE_PAGE_SIZE_OPTIONS;
  const defaultPageSize =
    options.defaultPageSize ?? pageSizeOptions[0] ?? DEFAULT_TABLE_PAGE_SIZE;

  return {
    defaultPageIndex: options.defaultPageIndex ?? 0,
    defaultPageSize,
    pageSizeOptions,
  };
}

function normalizePageSize(
  value: number,
  pageSizeOptions: readonly number[],
  fallback: number,
): number {
  if (!pageSizeOptions.includes(value)) return fallback;
  return value;
}

function normalizePagination(
  pagination: PaginationState,
  options: UrlPaginationOptionsType,
): PaginationState {
  const { defaultPageSize, pageSizeOptions } = resolveOptions(options);
  const pageIndex = Number.isFinite(pagination.pageIndex)
    ? Math.max(0, Math.floor(pagination.pageIndex))
    : 0;
  const pageSize = Number.isFinite(pagination.pageSize)
    ? normalizePageSize(
        Math.max(1, Math.floor(pagination.pageSize)),
        pageSizeOptions,
        defaultPageSize,
      )
    : defaultPageSize;

  return { pageIndex, pageSize };
}

/**
 * Parses URL query params into a safe `PaginationState`.
 *
 * Invalid values are normalized using defaults and allowed page size options.
 */
export function parseUrlPagination(
  searchParams: URLSearchParams,
  options: UrlPaginationOptionsType,
): PaginationState {
  const { defaultPageIndex, defaultPageSize, pageSizeOptions } =
    resolveOptions(options);
  const pageKey = getUrlKey(options.urlStateKey, 'page');
  const pageSizeKey = getUrlKey(options.urlStateKey, 'pageSize');
  const parsedPage = parsePositiveInt(searchParams.get(pageKey), defaultPageIndex + 1);
  const parsedPageSize = parsePositiveInt(
    searchParams.get(pageSizeKey),
    defaultPageSize,
  );

  return {
    pageIndex: Math.max(0, parsedPage - 1),
    pageSize: normalizePageSize(parsedPageSize, pageSizeOptions, defaultPageSize),
  };
}

/**
 * Builds a normalized query string for URL-driven DataTable pagination.
 *
 * Default values are omitted to keep URLs clean.
 */
export function buildUrlPaginationQuery({
  currentQuery,
  pagination,
  options,
}: {
  currentQuery: string;
  pagination: PaginationState;
  options: UrlPaginationOptionsType;
}): string {
  const params = new URLSearchParams(currentQuery);
  const { defaultPageIndex, defaultPageSize } = resolveOptions(options);
  const normalized = normalizePagination(pagination, options);
  const pageKey = getUrlKey(options.urlStateKey, 'page');
  const pageSizeKey = getUrlKey(options.urlStateKey, 'pageSize');
  const page = normalized.pageIndex + 1;
  const defaultPage = defaultPageIndex + 1;

  if (page === defaultPage) {
    params.delete(pageKey);
  } else {
    params.set(pageKey, String(page));
  }

  if (normalized.pageSize === defaultPageSize) {
    params.delete(pageSizeKey);
  } else {
    params.set(pageSizeKey, String(normalized.pageSize));
  }

  return params.toString();
}

/**
 * Provides controlled DataTable pagination state backed by URL query params.
 *
 * Keeps state in sync with URL and avoids repeated `router.replace` loops.
 */
export function useDataTableUrlPagination(
  options: UrlPaginationOptionsType,
): UrlPaginationStateType {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const pendingQueryRef = React.useRef<string | null>(null);

  const parsedPagination = parseUrlPagination(
    new URLSearchParams(searchParamsString),
    options,
  );
  const parsedPageIndex = parsedPagination.pageIndex;
  const parsedPageSize = parsedPagination.pageSize;

  const [pagination, setPagination] =
    React.useState<PaginationState>(parsedPagination);

  React.useEffect(() => {
    if (pendingQueryRef.current === searchParamsString) {
      pendingQueryRef.current = null;
    }

    setPagination((prev) => {
      if (prev.pageIndex === parsedPageIndex && prev.pageSize === parsedPageSize) {
        return prev;
      }
      return {
        pageIndex: parsedPageIndex,
        pageSize: parsedPageSize,
      };
    });
  }, [
    parsedPageIndex,
    parsedPageSize,
    searchParamsString,
  ]);

  const onPaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      setPagination((prev) => {
        const nextRaw = typeof updater === 'function' ? updater(prev) : updater;
        const next = normalizePagination(nextRaw, options);
        const nextQuery = buildUrlPaginationQuery({
          currentQuery: searchParamsString,
          pagination: next,
          options,
        });

        if (
          nextQuery !== searchParamsString &&
          pendingQueryRef.current !== nextQuery
        ) {
          pendingQueryRef.current = nextQuery;
          router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, {
            scroll: false,
          });
        }

        return next;
      });
    },
    [options, pathname, router, searchParamsString],
  );

  return {
    pagination,
    onPaginationChange,
  };
}
