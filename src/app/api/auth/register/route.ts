// /app/api/auth/register/route.ts
import { db } from "@/db";
import { companiesTable, usersTable } from "@/schema";
import { slugify } from "@/lib/utils";
import { hash } from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { username, email, password, companyName } = await req.json();

    if (!username || !email || !password || !companyName) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    // Cek user/email
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.username, username), eq(usersTable.email, email)))
      .then((res) => res[0]);

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username or email already exists." },
        { status: 409 }
      );
    }

    const companySlug = slugify(companyName);
    const companyNameValue = companyName.trim();

    if (!companySlug) {
      return NextResponse.json(
        { success: false, message: "Company name is invalid." },
        { status: 400 }
      );
    }

    const existingCompany = await db
      .select()
      .from(companiesTable)
      .where(eq(companiesTable.slug, companySlug))
      .then((res) => res[0]);

    let companyId = existingCompany?.id;

    if (!companyId) {
      const [newCompany] = await db
        .insert(companiesTable)
        .values({
          id: uuidv4(),
          name: companyNameValue,
          slug: companySlug,
        })
        .returning();

      companyId = newCompany.id;
    }

    // Hash password
    const hashedPassword = await hash(password, 10);
    const newUserId = uuidv4();

    // Simpan user
    await db.insert(usersTable).values({
      id: newUserId,
      username,
      email,
      password: hashedPassword,
      role: "admin",
      company_id: companyId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        data: {
          id: newUserId,
          username,
          email,
          company_id: companyId,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register Error:", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
