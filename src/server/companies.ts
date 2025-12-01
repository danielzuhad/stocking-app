"use server";

import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { HttpError } from "@/lib/axios";
import { parseNumber, slugify } from "@/lib/utils";
import { companiesTable } from "@/schema";
import { TableType } from "@/types";
import { count, desc, eq, ilike } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { revalidateTag, unstable_cache } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const COMPANIES_CACHE_TAG = "companies";
const CACHE_KEY = "companies-list";

type CompanyListParams = {
  page?: number | null;
  pageSize?: number | null;
  search?: string | null;
};

type CompanyRow = Pick<
  typeof companiesTable.$inferSelect,
  "id" | "name" | "slug" | "created_at" | "updated_at"
>;

const ensureSuperAdmin = async () => {
  const session = await getServerSession(authOptions);
  if (!session) throw new HttpError(401, "Unauthorized");
  if (session.user.role !== "super_admin") throw new HttpError(403, "Forbidden");
  return session;
};

const normalizeParams = (params: CompanyListParams) => ({
  page: Math.max(1, parseNumber(params.page) ?? 1),
  pageSize: Math.min(100, Math.max(1, parseNumber(params.pageSize) ?? 10)),
  search: params.search?.trim() ?? "",
});

const fetchCompanies = async (params: CompanyListParams): Promise<TableType<CompanyRow>> => {
  const { page, pageSize, search } = normalizeParams(params);
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

  return {
    items: items as CompanyRow[],
    meta: {
      page,
      pageSize,
      total,
      pageCount: Math.max(1, Math.ceil(total / pageSize)),
    },
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

export async function getCompanies(params: CompanyListParams): Promise<TableType<CompanyRow>> {
  await ensureSuperAdmin();
  return cachedCompanies(JSON.stringify(params));
}

const companyPayloadSchema = z.object({
  name: z.string().min(3, "Company name must be at least 3 characters"),
});

export async function createCompany(payload: z.infer<typeof companyPayloadSchema>) {
  const session = await ensureSuperAdmin();
  const parsed = companyPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    throw new HttpError(400, "Invalid payload");
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);
  if (!slug) {
    throw new HttpError(400, "Invalid company name");
  }

  const existing = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.slug, slug));

  if (existing.length > 0) {
    throw new HttpError(409, "Company already exists.");
  }

  const [created] = await db
    .insert(companiesTable)
    .values({
      id: uuidv4(),
      name,
      slug,
      created_by_user_id: session.user.id,
      updated_by_user_id: session.user.id,
    })
    .returning({
      id: companiesTable.id,
      name: companiesTable.name,
      slug: companiesTable.slug,
      created_at: companiesTable.created_at,
      updated_at: companiesTable.updated_at,
    });

  revalidateTag(COMPANIES_CACHE_TAG);

  return created as CompanyRow;
}
