import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { companiesTable } from "@/schema";
import { COMPANIES_CACHE_TAG, getCompanies } from "@/server/companies";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const createCompanySchema = z.object({
  name: z.string().min(3, "Company name must be at least 3 characters"),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const params = {
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    search: searchParams.get("search"),
  };

  const data = await getCompanies(params);

  return NextResponse.json({
    success: true,
    message: "Companies retrieved successfully",
    data,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createCompanySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const name = parsed.data.name.trim();
  const slug = slugify(name);

  if (!slug) {
    return NextResponse.json({ success: false, message: "Invalid company name" }, { status: 400 });
  }

  const existing = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.slug, slug));

  if (existing.length > 0) {
    return NextResponse.json(
      { success: false, message: "Company already exists." },
      { status: 409 }
    );
  }

  await db.insert(companiesTable).values({
    id: uuidv4(),
    name,
    slug,
    created_by_user_id: session.user.id,
    updated_by_user_id: session.user.id,
  });

  revalidateTag(COMPANIES_CACHE_TAG);

  return NextResponse.json({
    success: true,
    message: "Company created successfully.",
  });
}
