import { db } from "@/db";
import { companiesTable, usersTable } from "@/schema";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "username" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.username || !credentials?.password) {
            throw new Error("Username and password are required.");
          }

          const result = await db
            .select({
              user: usersTable,
              companyName: companiesTable.name,
            })
            .from(usersTable)
            .leftJoin(companiesTable, eq(usersTable.company_id, companiesTable.id))
            .where(eq(usersTable.username, credentials.username))
            .limit(1)
            .then((res) => res[0]);

          if (!result?.user) throw new Error("User is not found.");

          const user = result.user;

          const valid = await compare(credentials.password, user.password);
          if (!valid) throw new Error("Password is wrong.");

          return {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            companyId: user.company_id ?? null,
            companyName: result.companyName ?? null,
          };
        } catch (err) {
          if (err instanceof Error) {
            throw new Error(err.message);
          }

          throw new Error("There is Authentication Problem.");
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 1 hari
    // maxAge: 60,
  },
  jwt: {
    maxAge: 60 * 60 * 24, // 1 hari
    // maxAge: 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();
      const oneDay = 1000 * 60 * 60 * 24;
      const oneMinute = 1000 * 60;

      if (user) {
        // Saat login pertama
        token.userId = user.id;
        token.username = user.username;
        token.email = user.email;
        token.role = user.role;
        token.companyId = "companyId" in user ? user.companyId ?? null : null;
        token.companyName = "companyName" in user ? user.companyName ?? null : null;
        token.lastActive = now;
      } else {
        // Saat aktivitas berikutnya
        const lastActive = typeof token.lastActive === "number" ? token.lastActive : 0;
        const diff = now - lastActive;

        if (diff > oneDay) {
          // if (diff > oneMinute) {
          // Lebih dari 1 hari tidak aktif → logout paksa
          throw new Error("Session expired");
        }

        // Masih aktif → update lastActive
        token.lastActive = now;
      }

      return token;
    },

    async session({ session, token }) {
      session.user.id = token.userId as string;
      session.user.username = token.username;
      session.user.email = token.email;
      session.user.role = token.role;
      session.user.companyId = token.companyId ?? null;
      session.user.companyName = token.companyName ?? null;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};
