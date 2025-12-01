import { CompanyType } from "@/schema";
import { ColumnDef } from "@tanstack/react-table";
import { format } from "date-fns";

export type CompanyRow = Pick<CompanyType, "id" | "name" | "slug" | "created_at" | "updated_at">;

const formatDate = (value: Date | string | null) => {
  if (!value) return "-";
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return format(parsed, "dd MMM yyyy");
};

export const columns: ColumnDef<CompanyRow>[] = [
  {
    accessorKey: "name",
    header: "Company",
    cell: ({ getValue }) => <p className="font-medium text-gray-900">{getValue<string>()}</p>,
  },
  {
    accessorKey: "slug",
    header: "Slug",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue<Date | string | null>())}</span>
    ),
  },
  {
    accessorKey: "updated_at",
    header: "Updated",
    cell: ({ getValue }) => (
      <span className="text-muted-foreground">{formatDate(getValue<Date | string | null>())}</span>
    ),
  },
];
