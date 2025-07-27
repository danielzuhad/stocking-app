// /app/api/auth/register/route.ts
import { db } from "@/db";
import { usersTable } from "@/schema";
import { hash } from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: Request) {
  try {
    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    // Cek user/email
    const existingUser = await db
      .select()
      .from(usersTable)
      .where(and(eq(usersTable.username, username), eq(usersTable.email, email)))
      .then((res) => res[0]);

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Username or email already exists." },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await hash(password, 10);
    const newUserId = uuidv4();

    // Simpan user
    await db.insert(usersTable).values({
      uid: uuidv4(),
      username,
      email,
      password: hashedPassword,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        data: {
          uid: newUserId,
          username,
          email,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Register Error:", err);
    return NextResponse.json({ message: "Something went wrong." }, { status: 500 });
  }
}
