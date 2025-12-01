"use client";

import { DataTable } from "@/components/data-table";
import DataTableToolbar from "@/components/data-table/toolbar";
import { useDataTableQuery } from "@/components/data-table/use-query-params";
import { Button } from "@/components/ui/button";
import { TableType } from "@/types";
import { RefreshCw } from "lucide-react";
import { CompanyRow, columns } from "./columns";

interface CompanyClientProps {
  data: TableType<CompanyRow>;
}

const CompanyClient = ({ data }: CompanyClientProps) => {
  const { updateQuery, refresh, isPending } = useDataTableQuery();

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Companies</h1>
          </div>
          <Button variant="outline" onClick={refresh} disabled={isPending}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-4">
          <DataTableToolbar isLoading={isPending} searchPlaceholder="Search company name" />

          <DataTable
            columns={columns}
            items={data?.items}
            isLoading={isPending}
            emptyMessage="No companies found."
            pagination={{
              meta: data.meta,
              onPageChange: (page) => updateQuery({ page }),
              onPageSizeChange: (size) => updateQuery({ pageSize: size, page: 1 }),
              isLoading: isPending,
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default CompanyClient;
