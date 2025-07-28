import { db } from "@/db";
import { usersTable } from "@/schema";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import NextAuth, { NextAuthOptions } from "next-auth";
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

          const user = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.username, credentials.username))
            .then((res) => res[0]);

          if (!user) throw new Error("User is not found.");

          const valid = await compare(credentials.password, user.password);
          if (!valid) throw new Error("Password is wrong.");

          return {
            id: user.uid,
            uid: user.uid,
            username: user.username,
            email: user.email,
          };
        } catch (err) {
          console.error("Auth Error:", err);

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
        token.uid = user.id;
        token.username = user.username;
        token.lastActive = now;
        token.id = user.id;
        token.uid = user.uid;
        token.username = user.username;
        token.email = user.email;
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
      session.user.id = token.uid;
      session.user.username = token.username;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
