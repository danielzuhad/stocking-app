"use client";

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { Loader2 } from "lucide-react";
import DataTablePagination, { PaginationMeta } from "./data-table/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

type DataTablePaginationConfig = {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  summary?: string;
};

type DataTableProps<TData> = {
  items: TData[];
  columns: ColumnDef<TData>[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: DataTablePaginationConfig;
};

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function DataTable<TData>({
  isLoading = false,
  emptyMessage = "No results.",
  pagination,
  columns,
  items,
}: DataTableProps<TData>) {
  const pageIndex = Math.max(0, (pagination?.meta.page ?? 1) - 1);
  const pageSize = pagination?.meta.pageSize ?? PAGE_SIZE_OPTIONS[1];
  const pageCount = pagination?.meta.pageCount;

  const table = useReactTable({
    data: items,
    columns: columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: Boolean(pagination),
    pageCount,
    state: {
      pagination: {
        pageIndex,
        pageSize,
      },
    },
  });

  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleLeafColumns().length || 1;

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {isLoading && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center">
                <div className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading data...
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={colSpan}
                className="text-muted-foreground py-6 text-center text-sm"
              >
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {pagination ? (
        <div className="border-t bg-white/50 p-3">
          <DataTablePagination
            meta={pagination.meta}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={pagination.onPageChange}
            onPageSizeChange={pagination.onPageSizeChange}
            isLoading={pagination.isLoading ?? isLoading}
            summary={pagination.summary}
          />
        </div>
      ) : null}
    </div>
  );
}
