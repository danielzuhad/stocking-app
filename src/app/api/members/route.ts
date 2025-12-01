import { db } from "@/db";
import { authOptions } from "@/lib/auth";
import { usersTable } from "@/schema";
import { hash } from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

const createMemberSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  companyId: z.string().uuid().optional(),
});

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isSuperAdmin = session.user.role === "super_admin";
  const companyId = isSuperAdmin ? searchParams.get("company_id") : session.user.companyId;

  if (!companyId) {
    return NextResponse.json(
      { success: false, message: "Company context is required." },
      { status: 400 }
    );
  }

  const members = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.company_id, companyId));

  return NextResponse.json({
    success: true,
    data: members,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = createMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "Invalid payload", errors: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const isSuperAdmin = session.user.role === "super_admin";
  const companyId = isSuperAdmin ? parsed.data.companyId ?? session.user.companyId : session.user.companyId;

  if (!companyId) {
    return NextResponse.json(
      { success: false, message: "Company context is required to add members." },
      { status: 400 }
    );
  }

  const { username, email, password } = parsed.data;

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
    message: "Member invited successfully.",
  });
}
