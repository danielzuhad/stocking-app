import { roleEnum } from "@/schema";

export type EUserRole = (typeof roleEnum.enumValues)[number];

export type TableType<T> = {
  items: T[];
  meta: { page: number; pageSize: number; total: number; pageCount: number };
};

export type ParamsType = {
  page?: number | null;
  pageSize?: number | null;
};
