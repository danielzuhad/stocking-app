"use client";

import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export type PaginationMeta = {
  page: number;
  pageCount: number;
  pageSize: number;
  total?: number;
};

type DataTablePaginationProps = {
  meta: PaginationMeta;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  summary?: string;
};

const DataTablePagination = ({
  meta,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  summary,
}: DataTablePaginationProps) => {
  const { page, pageCount, pageSize, total } = meta;
  const canGoPrev = page > 1;
  const canGoNext = page < pageCount;

  const resolvedSummary = useMemo(() => {
    if (summary) return summary;
    if (typeof total === "number") {
      if (total === 0) return "Showing 0 results";
      const start = (page - 1) * pageSize + 1;
      const end = Math.min(total, page * pageSize);
      return `Showing ${start}-${end} of ${total}`;
    }
    return `Page ${page} of ${Math.max(pageCount, 1)}`;
  }, [summary, total, page, pageSize, pageCount]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={isLoading || !canGoPrev}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={isLoading || !canGoNext}
        >
          Next
        </Button>
      </div>

      <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center">
        {resolvedSummary && <span>{resolvedSummary}</span>}
        <div className="flex items-center gap-2">
          <span>Rows</span>
          <select
            className="rounded-md border px-2 py-1"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            disabled={isLoading}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
        <span>
          Page {page} of {Math.max(pageCount, 1)}
        </span>
      </div>
    </div>
  );
};

export default DataTablePagination;
