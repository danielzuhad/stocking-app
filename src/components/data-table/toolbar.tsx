"use client";

import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchConfig {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  placeholder?: string;
}

interface DataTableToolbarProps {
  search?: SearchConfig;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  isLoading?: boolean;
}

const DataTableToolbar = ({
  search,
  actions,
  children,
  isLoading = false,
}: DataTableToolbarProps) => {
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (!search) return;
    event.preventDefault();
    search.onSubmit();
  };

  if (!search && !actions && !children) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      {search && (
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder={search.placeholder ?? "Search..."}
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              className="pl-8"
              disabled={isLoading}
            />
            {search.value && (
              <button
                type="button"
                onClick={search.onReset}
                className="text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isLoading}>
              Search
            </Button>
            <Button type="button" variant="outline" onClick={search.onReset} disabled={isLoading}>
              Clear
            </Button>
          </div>
        </form>
      )}

      {(children || actions) && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {children && <div className="flex-1">{children}</div>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
};

export default DataTableToolbar;
