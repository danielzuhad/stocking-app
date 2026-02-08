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

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function getUrlKey(prefix: string, key: string): string {
  return prefix ? `${prefix}_${key}` : key;
}

export type DataTableProps<TData, TValue> = {
  /** TanStack column definitions. */
  columns: ColumnDef<TData, TValue>[];
  /** Rows to render (page data when server-paginated). */
  data: TData[];
  /** Total rows for the dataset (optional, for server-paged data). */
  rowCount?: number;

  /** Toolbar (actions + view options). */
  enableToolbar?: boolean;
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

  /** Sync pagination state into plain URL params. */
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
  const navButtonClass =
    'size-8 rounded-md border border-transparent transition-colors enabled:cursor-pointer enabled:hover:border-border enabled:hover:bg-accent enabled:hover:text-accent-foreground disabled:cursor-not-allowed disabled:border-border/60 disabled:bg-muted/40 disabled:text-muted-foreground/70';

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn('hidden lg:inline-flex', navButtonClass)}
          onClick={() => table.setPageIndex(0)}
          disabled={!canPrevious}
          aria-label="Halaman pertama"
          title={
            canPrevious ? 'Ke halaman pertama' : 'Sudah di halaman pertama'
          }
        >
          <ChevronsLeftIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={navButtonClass}
          onClick={() => table.previousPage()}
          disabled={!canPrevious}
          aria-label="Halaman sebelumnya"
          title={
            canPrevious ? 'Ke halaman sebelumnya' : 'Sudah di halaman pertama'
          }
        >
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={navButtonClass}
          onClick={() => table.nextPage()}
          disabled={!canNext}
          aria-label="Halaman berikutnya"
          title={
            canNext ? 'Ke halaman berikutnya' : 'Sudah di halaman terakhir'
          }
        >
          <ChevronRightIcon className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn('hidden lg:inline-flex', navButtonClass)}
          onClick={() => table.setPageIndex(pageCount - 1)}
          disabled={!canNext}
          aria-label="Halaman terakhir"
          title={canNext ? 'Ke halaman terakhir' : 'Sudah di halaman terakhir'}
        >
          <ChevronsRightIcon className="size-4" />
        </Button>
      </div>

      <div className="bg-muted text-foreground rounded-md border px-2.5 py-1 text-sm tabular-nums">
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
 * Reusable DataTable (client-side sorting + URL-driven pagination).
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  rowCount,
  enableToolbar = true,
  toolbarActions,
  enableColumnVisibility = true,
  enablePagination = true,
  initialPageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  initialPageIndex = 0,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Coba ubah filter atau data yang ditampilkan.',
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
  const totalCount = rowCount ?? data.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const isManualPagination =
    !enablePagination ||
    (typeof rowCount === 'number' && rowCount > data.length);

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

    const urlState = `${nextPage}|${nextPageSize}`;
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
  }, [
    enableUrlState,
    initialPageIndex,
    initialPageSize,
    searchParams,
    urlKeys.page,
    urlKeys.pageSize,
  ]);

  React.useEffect(() => {
    if (!enableUrlState) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(urlKeys.page, String(pagination.pageIndex + 1));
    params.set(urlKeys.pageSize, String(pagination.pageSize));

    const next = params.toString();
    const current = searchParams.toString();
    if (next === current) return;

    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  }, [
    enableUrlState,
    pagination.pageIndex,
    pagination.pageSize,
    pathname,
    router,
    searchParams,
    urlKeys.page,
    urlKeys.pageSize,
  ]);

  // TanStack Table hook is safe here; we accept React Compiler skipping memoization.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
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
          <div className="flex-1" />

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
