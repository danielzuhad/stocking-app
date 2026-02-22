'use client';

import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type ColumnDef,
  type OnChangeFn,
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
import * as React from 'react';

import { TABLE_PAGE_SIZE_OPTIONS } from '@/lib/table/constants';
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
import { Spinner } from './spinner';
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
  pageSizeOptions?: readonly number[];
  /** Page index is 0-based. */
  initialPageIndex?: number;
  /** Controlled pagination state (optional). */
  pagination?: PaginationState;
  /** Controlled pagination callback (optional). */
  onPaginationChange?: OnChangeFn<PaginationState>;

  /** Empty state copy. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Inline loading state (for URL/navigation pending state). */
  isLoading?: boolean;
  loadingText?: string;
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
  isLoading = false,
}: {
  table: TanStackTable<TData>;
  pageSizeOptions: readonly number[];
  isLoading?: boolean;
}) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = Math.max(1, table.getPageCount());
  const canPrevious = !isLoading && table.getCanPreviousPage();
  const canNext = !isLoading && table.getCanNextPage();
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
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={isLoading}
            aria-busy={isLoading || undefined}
          >
            <span className="text-foreground font-medium">{pageSize}</span>
            Baris
            <ChevronDownIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Baris per halaman</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={String(pageSize)}
            onValueChange={(value) => table.setPageSize(Number(value))}
          >
            {pageSizeOptions.map((size) => (
              <DropdownMenuRadioItem
                key={size}
                value={String(size)}
                disabled={isLoading}
              >
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
  pageSizeOptions = TABLE_PAGE_SIZE_OPTIONS,
  initialPageIndex = 0,
  pagination: controlledPagination,
  onPaginationChange,
  emptyTitle = 'Tidak ada data',
  emptyDescription = 'Coba ubah filter atau data yang ditampilkan.',
  isLoading = false,
  loadingText = 'Memuat data...',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [internalPagination, setInternalPagination] =
    React.useState<PaginationState>({
      pageIndex: initialPageIndex,
      pageSize: initialPageSize,
    });
  const pagination = controlledPagination ?? internalPagination;
  const isPaginationControlled = controlledPagination !== undefined;
  const totalCount = rowCount ?? data.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const isManualPagination = !enablePagination || typeof rowCount === 'number';

  const handlePaginationChange = React.useCallback<OnChangeFn<PaginationState>>(
    (updater) => {
      if (isPaginationControlled) {
        onPaginationChange?.(updater);
        return;
      }

      setInternalPagination(updater);
    },
    [isPaginationControlled, onPaginationChange],
  );

  React.useEffect(() => {
    if (isManualPagination || isPaginationControlled) return;
    const maxPageIndex = Math.max(0, pageCount - 1);
    if (pagination.pageIndex > maxPageIndex) {
      setInternalPagination((prev) => ({ ...prev, pageIndex: maxPageIndex }));
    }
  }, [
    isManualPagination,
    isPaginationControlled,
    pageCount,
    pagination.pageIndex,
  ]);

  React.useEffect(() => {
    if (isPaginationControlled) return;

    setInternalPagination({
      pageIndex: initialPageIndex,
      pageSize: initialPageSize,
    });
  }, [isPaginationControlled, initialPageIndex, initialPageSize]);

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
    onPaginationChange: handlePaginationChange,
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
  const showLoadingOverlay = isLoading;

  return (
    <div className="space-y-4">
      {enableToolbar ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {toolbarActions}

          {enableColumnVisibility ? (
            <DataTableViewOptions table={table} />
          ) : null}
        </div>
      ) : null}

      <div
        className="relative rounded-md border"
        aria-busy={isLoading || undefined}
      >
        {showLoadingOverlay ? (
          <div className="bg-background/45 pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-background text-foreground inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs shadow-sm">
              <Spinner className="size-3.5" />
              {loadingText}
            </div>
          </div>
        ) : null}

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

          <TableBody className={isLoading ? '[&>tr]:opacity-60' : undefined}>
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
              isLoading={isLoading}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
