import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { companiesTable, usersTable } from "@/schema";
import { hash } from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const createAdminSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyId: z.string().uuid("Company is required"),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const companyId = searchParams.get("company_id");

  const adminsQuery = db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
      companyName: companiesTable.name,
      companyId: companiesTable.id,
    })
    .from(usersTable)
    .leftJoin(companiesTable, eq(usersTable.company_id, companiesTable.id));

  const admins = companyId
    ? await adminsQuery.where(eq(usersTable.company_id, companyId))
    : await adminsQuery;

  return NextResponse.json({
    success: true,
    data: admins,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "super_admin") {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createAdminSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { username, email, password, companyId } = parsed.data;

  const existingCompany = await db
    .select({ id: companiesTable.id })
    .from(companiesTable)
    .where(eq(companiesTable.id, companyId))
    .then((res) => res[0]);

  if (!existingCompany) {
    return NextResponse.json({ success: false, message: "Company not found." }, { status: 404 });
  }

  const duplicate = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(or(eq(usersTable.username, username), eq(usersTable.email, email)));

  if (duplicate.length > 0) {
    return NextResponse.json(
      { success: false, message: "Username or email already exists." },
      { status: 409 }
    );
  }

  const hashedPassword = await hash(password, 10);

  await db.insert(usersTable).values({
    username,
    email,
    password: hashedPassword,
    role: "admin",
    company_id: companyId,
    created_by_user_id: session.user.id,
    updated_by_user_id: session.user.id,
  });

  return NextResponse.json({
    success: true,
    message: "Admin created successfully.",
  });
}
