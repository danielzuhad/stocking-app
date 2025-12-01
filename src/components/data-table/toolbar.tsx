"use client";

import { Filter, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDataTableQuery } from "./use-query-params";

interface DataTableToolbarProps {
  filters?: ReactNode;
  actions?: ReactNode;
  isLoading?: boolean; // external loading state
  filterTitle?: string;
  filterDescription?: string;
  searchPlaceholder?: string;
  debounceMs?: number;
}

const useDebounce = <T,>(value: T, delay: number) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

const DataTableToolbar = ({
  filters,
  actions,
  isLoading = false,
  filterTitle = "Filters",
  filterDescription = "Refine the result set.",
  searchPlaceholder = "Search...",
  debounceMs = 400,
}: DataTableToolbarProps) => {
  const { updateQuery, isPending, params } = useDataTableQuery();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(params.search ?? "");
  const debouncedSearch = useDebounce(searchValue, debounceMs);

  useEffect(() => {
    setSearchValue(params.search ?? "");
  }, [params.search]);

  useEffect(() => {
    // Skip redundant updates
    if ((params.search ?? "") === (debouncedSearch ?? "")) return;
    updateQuery({ search: debouncedSearch ?? "" });
  }, [debouncedSearch, params.search, updateQuery]);

  const busy = isLoading || isPending;
  const showFilters = Boolean(filters);

  const handleReset = () => {
    setSearchValue("");
    updateQuery({ search: "" });
  };

  const filterActions = useMemo(
    () => (
      <Button variant="outline" onClick={() => setOpen(false)}>
        Close
      </Button>
    ),
    []
  );

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            className="pl-8"
            disabled={busy}
          />
          {searchValue && (
            <button
              type="button"
              onClick={handleReset}
              className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showFilters && (
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={busy}>
                <Filter className="mr-2 h-4 w-4" />
                Filters
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>{filterTitle}</SheetTitle>
                <SheetDescription>{filterDescription}</SheetDescription>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-4">{filters}</div>
              <SheetFooter className="flex-row justify-end gap-2 p-4">{filterActions}</SheetFooter>
            </SheetContent>
          </Sheet>
        )}

        {actions}
      </div>
    </div>
  );
};

export default DataTableToolbar;
