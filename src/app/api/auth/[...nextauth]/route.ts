import { db } from "@/db";
import { usersTable } from "@/schema";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
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
            throw new Error("Username dan password wajib diisi.");
          }

          const user = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.username, credentials.username))
            .then((res) => res[0]);

          if (!user) throw new Error("User tidak ditemukan.");

          const valid = await compare(credentials.password, user.password);
          if (!valid) throw new Error("Password salah.");

          return {
            id: user.uid,
            uid: user.uid,
            name: user.username,
            email: user.email,
          };
        } catch (err: any) {
          console.error("Auth Error:", err);
          throw new Error(err.message || "Terjadi kesalahan otentikasi.");
        }
      },
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24, // 1 hari
  },
  jwt: {
    maxAge: 60 * 60 * 24, // 1 hari
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.uid = user.uid;
        token.name = user.name;
        token.email = user.email;
        token.exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24; // 1 hari
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id;
        session.user.uid = token.uid;
        session.user.name = token.name;
        session.user.email = token.email;
        session.expires = new Date(token.exp * 1000).toISOString();
      }
      return session;
    },
  },
  pages: {
    signIn: "/login", // optional: custom login page
    error: "/login?error=auth", // redirect on error
  },
});

export { handler as GET, handler as POST };
