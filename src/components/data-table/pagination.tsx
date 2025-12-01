"use client";

import { Button } from "@/components/ui/button";

interface DataTablePaginationProps {
  page: number;
  pageCount: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  summary?: string;
}

const DataTablePagination = ({
  page,
  pageCount,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  summary,
}: DataTablePaginationProps) => {
  const canGoPrev = page > 1;
  const canGoNext = page < pageCount;

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
        {summary && <span>{summary}</span>}
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
