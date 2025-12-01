import { db } from "@/db";
import { companiesTable } from "@/schema";
import { CompanyList, CompanyListParams, CompanyListRecord } from "@/types/company";
import { count, desc, ilike } from "drizzle-orm";
import { unstable_cache } from "next/cache";

export const COMPANIES_CACHE_TAG = "companies";
const CACHE_KEY = "companies-list";

const fetchCompanies = async (params: CompanyListParams): Promise<CompanyList> => {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  const search = params.search?.trim() ?? "";
  const offset = (page - 1) * pageSize;
  const whereClause = search ? ilike(companiesTable.name, `%${search}%`) : undefined;

  const [totalRow, items] = await Promise.all([
    db.select({ count: count() }).from(companiesTable).where(whereClause),
    db
      .select({
        id: companiesTable.id,
        name: companiesTable.name,
        slug: companiesTable.slug,
        created_at: companiesTable.created_at,
        updated_at: companiesTable.updated_at,
      })
      .from(companiesTable)
      .where(whereClause)
      .orderBy(desc(companiesTable.created_at))
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = Number(totalRow[0]?.count ?? 0);
  const meta = {
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };

  return {
    items: items as CompanyListRecord[],
    meta,
  };
};

const cachedCompanies = unstable_cache(
  async (serialized: string) => {
    const params = JSON.parse(serialized) as CompanyListParams;
    return fetchCompanies(params);
  },
  [CACHE_KEY],
  { tags: [COMPANIES_CACHE_TAG] }
);

export async function getCompanies(params: CompanyListParams): Promise<CompanyList> {
  return cachedCompanies(JSON.stringify(params));
}
