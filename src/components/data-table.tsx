"use client";

import {
  flexRender,
  Table as TanstackTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Loader2 } from "lucide-react";

type DataTableProps<TData> = {
  table: TanstackTable<TData>;
  isLoading?: boolean;
  emptyMessage?: string;
};

export function DataTable<TData>({
  table,
  isLoading = false,
  emptyMessage = "No results.",
}: DataTableProps<TData>) {
  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleLeafColumns().length || 1;

  return (
    <div className="rounded-xl border">
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
                        header.getContext()
                      )}
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
                  {flexRender(
                    cell.column.columnDef.cell,
                    cell.getContext()
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}

          {isLoading && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading data...
                </div>
              </TableCell>
            </TableRow>
          )}

          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={colSpan} className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
