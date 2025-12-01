"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getCoreRowModel, useReactTable } from "@tanstack/react-table";

import { columns } from "./columns";
import { CompanyList } from "@/types/company";
import DataTableToolbar from "@/components/data-table/toolbar";
import { DataTable } from "@/components/data-table";
import DataTablePagination from "@/components/data-table/pagination";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface CompanyClientProps {
  data: CompanyList;
  searchParams: {
    page?: number;
    pageSize?: number;
    search?: string;
  };
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

const CompanyClient = ({ data, searchParams: params }: CompanyClientProps) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchValue, setSearchValue] = useState(params.search ?? "");

  useEffect(() => {
    setSearchValue(params.search ?? "");
  }, [params.search]);

  const table = useReactTable({
    data: data.items,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: data.meta.pageCount,
    state: {
      pagination: {
        pageIndex: data.meta.page - 1,
        pageSize: data.meta.pageSize,
      },
    },
  });

  const updateQuery = (updates: Partial<{ page: number; pageSize: number; search: string }>) => {
    const next = new URLSearchParams(searchParams);

    if (typeof updates.page === "number") {
      next.set("page", updates.page.toString());
    }
    if (typeof updates.pageSize === "number") {
      next.set("pageSize", updates.pageSize.toString());
    }
    if (typeof updates.search === "string") {
      if (updates.search) next.set("search", updates.search);
      else next.delete("search");
      next.set("page", "1");
    }

    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  };

  const rangeLabel = useMemo(() => {
    if (data.meta.total === 0) return "Showing 0 results";
    const start = (data.meta.page - 1) * data.meta.pageSize + 1;
    const end = Math.min(data.meta.total, data.meta.page * data.meta.pageSize);
    return `Showing ${start}-${end} of ${data.meta.total}`;
  }, [data.meta]);

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Companies</h1>
            <p className="text-sm text-muted-foreground">
              Manage every tenant registered by the super admin.
            </p>
          </div>
          <Button variant="outline" onClick={() => updateQuery({})} disabled={isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <DataTableToolbar
            search={{
              value: searchValue,
              onChange: setSearchValue,
              onSubmit: () => updateQuery({ search: searchValue.trim() }),
              onReset: () => {
                setSearchValue("");
                updateQuery({ search: "" });
              },
              placeholder: "Search company name",
            }}
            isLoading={isPending}
          />

          <DataTable table={table} isLoading={isPending} emptyMessage="No companies found." />

          <DataTablePagination
            page={data.meta.page}
            pageCount={data.meta.pageCount}
            pageSize={data.meta.pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            summary={rangeLabel}
            onPageChange={(page) => updateQuery({ page })}
            onPageSizeChange={(size) => updateQuery({ pageSize: size, page: 1 })}
            isLoading={isPending}
          />
        </div>
      </div>
    </section>
  );
};

export default CompanyClient;
