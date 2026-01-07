'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  type Table as TanStackTable,
  type VisibilityState,
} from '@tanstack/react-table';
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Settings2Icon,
  XIcon,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { Button } from './button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table';

type ColumnMeta = {
  /** Human-friendly column label for view options. */
  label?: string;
};

function getColumnLabel<TData>(column: Column<TData, unknown>): string {
  const meta = column.columnDef.meta as ColumnMeta | undefined;
  if (meta?.label) return meta.label;

  const header = column.columnDef.header;
  if (typeof header === 'string') return header;

  return column.id;
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getUrlKey(prefix: string, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

function normalizeSearchValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();

  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') {
    return String(value);
  }

  if (type === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return '';
    }
  }

  return String(value);
}

function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  if (!path.includes('.')) {
    return (obj as Record<string, unknown>)[path];
  }

  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) =>
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : undefined,
      obj,
    );
}

function getColumnValue<TData, TValue>(
  row: TData,
  rowIndex: number,
  column: ColumnDef<TData, TValue>,
): unknown {
  if ('accessorFn' in column && typeof column.accessorFn === 'function') {
    return column.accessorFn(row, rowIndex);
  }

  if ('accessorKey' in column) {
    const key = column.accessorKey;
    if (typeof key === 'string') return getValueByPath(row, key);
    if (typeof key === 'number' && Array.isArray(row)) return row[key];
  }

  return undefined;
}

function flattenColumns<TData, TValue>(
  columns: ColumnDef<TData, TValue>[],
): ColumnDef<TData, TValue>[] {
  const result: ColumnDef<TData, TValue>[] = [];

  for (const column of columns) {
    if ('columns' in column && Array.isArray(column.columns)) {
      result.push(
        ...flattenColumns(column.columns as ColumnDef<TData, TValue>[]),
      );
    } else {
      result.push(column);
    }
  }

  return result;
}

export type DataTableProps<TData, TValue> = {
  /** TanStack column definitions. */
  columns: ColumnDef<TData, TValue>[];
  /** Rows to render (page data when server-paginated). */
  data: TData[];
  /** Total rows for the dataset (optional, for server-paged data). */
  rowCount?: number;

  /** Toolbar (search + view options). */
  enableToolbar?: boolean;
  /** Enables search input (client-side filter). */
  enableSearch?: boolean;
  searchPlaceholder?: string;
  searchDebounceMs?: number;
  /** Extra content on the right side of the toolbar (e.g. "Create" button). */
  toolbarActions?: React.ReactNode;
  /** Enables column visibility dropdown. */
  enableColumnVisibility?: boolean;

  /** Pagination UI (client-side). */
  enablePagination?: boolean;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  /** Page index is 0-based. */
  initialPageIndex?: number;

  /** Empty state copy. */
  emptyTitle?: string;
  emptyDescription?: string;

  /** Sync pagination/search state into plain URL params. */
  enableUrlState?: boolean;
  /** URL query param key used as prefix when `enableUrlState` is enabled. */
  urlStateKey?: string;
};

export type DataTableColumnHeaderProps<TData> = {
  column: Column<TData, unknown>;
  title: string;
  className?: string;
};

/**
 * Sortable column header button for TanStack tables.
 *
 * Use in `ColumnDef.header`:
 * `header: ({ column }) => <DataTableColumnHeader column={column} title="..." />`
 */
export function DataTableColumnHeader<TData>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <div className={cn('px-2', className)}>{title}</div>;
  }

  const sort = column.getIsSorted();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn('-ml-2 h-8 gap-2 px-2', className)}
      onClick={() => {
        if (sort === false) {
          column.toggleSorting(false);
          return;
        }

        if (sort === 'asc') {
          column.toggleSorting(true);
          return;
        }

        column.clearSorting();
      }}
    >
      <span className="truncate">{title}</span>
      {sort === 'desc' ? (
        <ArrowDownIcon className="size-4" />
      ) : sort === 'asc' ? (
        <ArrowUpIcon className="size-4" />
      ) : (
        <ArrowUpDownIcon className="size-4" />
      )}
    </Button>
  );
}

function DataTableViewOptions<TData>({
  table,
  className,
}: {
  table: TanStackTable<TData>;
  className?: string;
}) {
  const hideableColumns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide());

  if (hideableColumns.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <Settings2Icon className="size-4" />
          Kolom
          <ChevronDownIcon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Kolom</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onSelect={(event) => event.preventDefault()}
            onCheckedChange={(value) => column.toggleVisibility(Boolean(value))}
          >
            {getColumnLabel(column)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DataTablePagination<TData>({
  table,
  pageSizeOptions,
}: {
  table: TanStackTable<TData>;
  pageSizeOptions: number[];
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const canPrevious = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 lg:inline-flex"
          onClick={() => table.setPageIndex(0)}
          disabled={!canPrevious}
          aria-label="First page"
        >
          <ChevronsLeftIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          aria-label="Previous page"
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => table.nextPage()}
          disabled={!canNext}
          aria-label="Next page"
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 lg:inline-flex"
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!canNext}
          aria-label="Last page"
        >
          <ChevronsRightIcon className="size-4" />
        </Button>
      </div>

      <div className="text-muted-foreground text-sm tabular-nums">
        Hal {pageIndex + 1} / {pageCount}
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            Baris
            <span className="text-foreground font-medium">{pageSize}</span>
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Rows per page</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            {pageSizeOptions.map((size) => (
              <DropdownMenuRadioItem key={size} value={String(size)}>
                {size}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/**
 * Reusable DataTable (client-side sorting + URL-driven search/pagination).
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  rowCount,
  enableToolbar = true,
  enableSearch = true,
  searchPlaceholder = 'Cari…',
  searchDebounceMs = 300,
  toolbarActions,
  enableColumnVisibility = true,
  enablePagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  initialPageIndex = 0,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Coba ubah filter atau kata kunci pencarian.',
  enableUrlState = false,
  urlStateKey = 'dt',
}: DataTableProps<TData, TValue>) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: initialPageIndex,
    pageSize: initialPageSize,
  });
  const [searchInput, setSearchInput] = React.useState('');

  const debouncedSearchValue = useDebouncedValue(searchInput, searchDebounceMs);
  const effectiveSearchValue = enableSearch ? debouncedSearchValue : '';
  const shouldClientFilter = !enableUrlState;

  const searchableColumns = React.useMemo(
    () =>
      flattenColumns(columns).filter(
        (column) => 'accessorFn' in column || 'accessorKey' in column,
      ),
    [columns],
  );

  const clientFilteredData = React.useMemo(() => {
    if (!shouldClientFilter) return data;

    const term = effectiveSearchValue.trim().toLowerCase();
    if (!term) return data;

    return data.filter((row, rowIndex) =>
      searchableColumns.some((column) => {
        const value = getColumnValue(row, rowIndex, column);
        if (value === null || value === undefined) return false;
        const text = normalizeSearchValue(value).toLowerCase();
        return text.includes(term);
      }),
    );
  }, [data, effectiveSearchValue, searchableColumns, shouldClientFilter]);

  const totalCount = rowCount ?? clientFilteredData.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const isManualPagination =
    !enablePagination ||
    (typeof rowCount === 'number' && rowCount > data.length);

  React.useEffect(() => {
    if (!enableSearch) return;
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [enableSearch, effectiveSearchValue]);

  React.useEffect(() => {
    const maxPageIndex = Math.max(0, pageCount - 1);
    if (pagination.pageIndex > maxPageIndex) {
      setPagination((prev) => ({ ...prev, pageIndex: maxPageIndex }));
    }
  }, [pageCount, pagination.pageIndex]);

  const urlKeys = React.useMemo(
    () => ({
      page: getUrlKey(urlStateKey, 'page'),
      pageSize: getUrlKey(urlStateKey, 'pageSize'),
      search: getUrlKey(urlStateKey, 'q'),
    }),
    [urlStateKey],
  );

  const lastUrlStateRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!enableUrlState) return;

    const nextPage = parsePositiveInt(
      searchParams.get(urlKeys.page),
      initialPageIndex + 1,
    );
    const nextPageSize = parsePositiveInt(
      searchParams.get(urlKeys.pageSize),
      initialPageSize,
    );
    const nextSearch = enableSearch
      ? (searchParams.get(urlKeys.search) ?? '')
      : '';

    const urlState = `${nextPage}|${nextPageSize}|${nextSearch}`;
    if (lastUrlStateRef.current === urlState) return;
    lastUrlStateRef.current = urlState;

    setPagination((prev) => {
      const nextIndex = Math.max(0, nextPage - 1);
      if (prev.pageIndex === nextIndex && prev.pageSize === nextPageSize) {
        return prev;
      }
      return {
        pageIndex: nextIndex,
        pageSize: nextPageSize,
      };
    });

    setSearchInput((prev) => (prev === nextSearch ? prev : nextSearch));
  }, [
    enableSearch,
    enableUrlState,
    initialPageIndex,
    initialPageSize,
    searchParams,
    urlKeys.page,
    urlKeys.pageSize,
    urlKeys.search,
  ]);

  React.useEffect(() => {
    if (!enableUrlState) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(urlKeys.page, String(pagination.pageIndex + 1));
    params.set(urlKeys.pageSize, String(pagination.pageSize));

    if (enableSearch && effectiveSearchValue.trim()) {
      params.set(urlKeys.search, effectiveSearchValue.trim());
    } else {
      params.delete(urlKeys.search);
    }

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;

    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    enableSearch,
    enableUrlState,
    effectiveSearchValue,
    pagination.pageIndex,
    pagination.pageSize,
    pathname,
    router,
    searchParams,
    urlKeys.page,
    urlKeys.pageSize,
    urlKeys.search,
  ]);

  // TanStack Table hook is safe here; we accept React Compiler skipping memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: clientFilteredData,
    columns,
    state: {
      sorting,
      columnVisibility,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    manualPagination: isManualPagination,
    pageCount: isManualPagination ? pageCount : undefined,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: isManualPagination
      ? undefined
      : getPaginationRowModel(),
  });

  const currentCount = table.getRowModel().rows.length;
  const hasAnyRows = totalCount > 0 && currentCount > 0;
  const pageIndex = enablePagination ? pagination.pageIndex : 0;
  const pageSize = enablePagination ? pagination.pageSize : totalCount || 1;
  const startIndex = hasAnyRows ? pageIndex * pageSize + 1 : 0;
  const endIndex = hasAnyRows ? startIndex + currentCount - 1 : 0;
  const showEmpty = currentCount === 0;

  return (
    <div className="space-y-4">
      {enableToolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            {enableSearch ? (
              <div className="relative w-full max-w-sm">
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pr-9"
                />
                {searchInput ? (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="text-muted-foreground hover:text-foreground absolute inset-y-0 right-0 inline-flex items-center px-3"
                    aria-label="Clear search"
                  >
                    <XIcon className="size-4" />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2">
            {toolbarActions}

            {enableColumnVisibility ? (
              <DataTableViewOptions table={table} />
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {showEmpty ? (
              <TableRow>
                <TableCell
                  colSpan={table.getVisibleLeafColumns().length}
                  className="py-10"
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div className="text-sm font-medium">{emptyTitle}</div>
                    <div className="text-muted-foreground text-sm">
                      {emptyDescription}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {enablePagination ? (
          <div className="flex flex-col gap-2 border-t px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-muted-foreground text-sm tabular-nums">
              {hasAnyRows ? (
                <>
                  Menampilkan{' '}
                  <span className="text-foreground font-medium">
                    {startIndex.toLocaleString('id-ID')}
                  </span>
                  {'–'}
                  <span className="text-foreground font-medium">
                    {endIndex.toLocaleString('id-ID')}
                  </span>{' '}
                  dari{' '}
                  <span className="text-foreground font-medium">
                    {totalCount.toLocaleString('id-ID')}
                  </span>
                </>
              ) : (
                <>
                  Menampilkan{' '}
                  <span className="text-foreground font-medium">0</span> dari{' '}
                  <span className="text-foreground font-medium">
                    {totalCount.toLocaleString('id-ID')}
                  </span>
                </>
              )}
            </div>
            <DataTablePagination
              table={table}
              pageSizeOptions={pageSizeOptions}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
