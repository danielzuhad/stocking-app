import { roleEnum } from "@/schema";

export type EUserRole = (typeof roleEnum.enumValues)[number];

export type Table<T> = {
  items: T[];
  meta: CompanyMeta;
};

type CompanyMeta = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
};
