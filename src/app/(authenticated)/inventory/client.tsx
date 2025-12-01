"use client";

import { TypographyH3 } from "@/components/typhography";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { apiGet } from "@/lib/axios-client";
import { handleErrorToast } from "@/lib/utils";
import type { CompanyType, ItemType, ItemVariantType } from "@/schema";
import type { EUserRole } from "@/types";
import {
  DownloadIcon,
  PlusSquareIcon,
  RefreshCw,
  UploadCloud,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type ItemWithRelations = ItemType & {
  variants: ItemVariantType[];
  company?: CompanyType | null;
};

interface InventoryClientProps {
  userRole: EUserRole;
  companyId: string | null;
  companies: CompanyType[];
}

const InventoryClient = ({ userRole, companyId, companies }: InventoryClientProps) => {
  const [items, setItems] = useState<ItemWithRelations[]>([]);
  const [isFetching, setIsFetching] = useState<boolean>(true);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    userRole === "super_admin" ? "" : companyId ?? ""
  );

  const fetchItems = useCallback(async () => {
    setIsFetching(true);
    try {
      const params =
        userRole === "super_admin" && selectedCompanyId
          ? { company_id: selectedCompanyId }
          : undefined;
      const { data } = await apiGet<ItemWithRelations[]>("/items", params);
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      handleErrorToast(error);
    } finally {
      setIsFetching(false);
    }
  }, [selectedCompanyId, userRole]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalStock = useMemo(
    () =>
      items.reduce((sum, item) => {
        const stockForItem = item.variants?.reduce((variantSum, variant) => {
          const quantity =
            typeof variant.quantity === "number" ? variant.quantity : Number(variant.quantity ?? 0);
          return variantSum + (Number.isNaN(quantity) ? 0 : quantity);
        }, 0);
        return sum + stockForItem;
      }, 0),
    [items]
  );

  const formatDate = (value: Date | string | null) => {
    if (!value) return "-";
    const parsed = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const showCompanyColumn = userRole === "super_admin";

  const renderContent = () => {
    if (isFetching) {
      return (
        <div className="text-muted-foreground flex min-h-[200px] items-center justify-center rounded-lg border border-dashed">
          Loading inventory...
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="border-border flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed bg-white/60 p-6 text-center">
          <p className="text-lg font-semibold">No products yet</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Start tracking your stock by adding your first product.
          </p>
          <Link
            href="/inventory/mutation"
            className={buttonVariants({ className: "mt-4 cursor-pointer" })}
          >
            <PlusSquareIcon className="mr-2 h-4 w-4" />
            Create Item
          </Link>
        </div>
      );
    }

    const gridTemplate = showCompanyColumn
      ? "md:grid-cols-[2fr_repeat(4,minmax(0,1fr))_1fr]"
      : "md:grid-cols-[2fr_repeat(3,minmax(0,1fr))_1fr]";

    return (
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div
          className={`hidden bg-muted px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid ${gridTemplate}`}
        >
          <span>Product</span>
          {showCompanyColumn && <span>Company</span>}
          <span>Category</span>
          <span className="text-center">Variants</span>
          <span className="text-center">Stock</span>
          <span className="text-right">Created</span>
        </div>
        <div className="divide-y">
          {items.map((item) => {
            const variantCount = item.variants?.length ?? 0;
            const itemStock = item.variants?.reduce((sum, variant) => {
              const quantity =
                typeof variant.quantity === "number"
                  ? variant.quantity
                  : Number(variant.quantity ?? 0);
              return sum + (Number.isNaN(quantity) ? 0 : quantity);
            }, 0);

            return (
              <div
                key={item.id}
                className={`grid grid-cols-1 gap-2 px-4 py-4 text-sm md:items-center ${gridTemplate}`}
              >
                <div>
                  <p className="font-semibold text-gray-900">{item.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {item.brand || "No brand"} • SKU {item.sku || "-"}
                  </p>
                </div>
                {showCompanyColumn && (
                  <span className="text-muted-foreground">{item.company?.name ?? "—"}</span>
                )}
                <span className="text-muted-foreground capitalize">{item.category}</span>
                <span className="text-center font-medium">{variantCount}</span>
                <span className="text-center font-semibold">{itemStock}</span>
                <span className="text-muted-foreground text-right text-xs">
                  {formatDate(item.created_at as Date | string | null)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TypographyH3>Inventory</TypographyH3>

        <div className="flex flex-wrap items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"outline"} className="cursor-pointer" disabled>
                <DownloadIcon className="mr-2 h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>Import data from Excel</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant={"outline"} className="cursor-pointer" disabled>
                <UploadCloud className="mr-2 h-4 w-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export data to Excel</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={"/inventory/mutation"}
                className={buttonVariants({ className: "cursor-pointer" })}
              >
                <PlusSquareIcon className="mr-2 h-4 w-4" />
                Item
              </Link>
            </TooltipTrigger>
            <TooltipContent>Add new item</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow">
        <div className="flex flex-col gap-4 border-b pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total stock across all items</p>
              <p className="text-3xl font-bold text-gray-900">{totalStock}</p>
            </div>

            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={fetchItems}
              isLoading={isFetching}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {userRole === "super_admin" && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">
                Company scope
              </label>
              <select
                className="border-input rounded-lg border px-3 py-2 text-sm"
                value={selectedCompanyId}
                onChange={(event) => setSelectedCompanyId(event.target.value)}
                disabled={isFetching}
              >
                <option value="">All companies</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="pt-4">{renderContent()}</div>
      </div>
    </div>
  );
};

export default InventoryClient;
