import { compare } from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { z } from 'zod';

import { db } from '@/db';
import { activityLogs, memberships, users } from '@/db/schema';
import { env } from '@/env';

const credentialsSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

type AuthUser = {
  id: string;
  name: string;
  username: string;
  system_role: 'SUPERADMIN' | 'ADMIN' | 'STAFF';
  membership_role: 'ADMIN' | 'STAFF' | null;
  active_company_id: string | null;
};

/**
 * Delays a response to make brute-force / user-enumeration slightly harder.
 *
 * This is not a replacement for real rate limiting.
 */
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * NextAuth.js configuration (Credentials + JWT sessions).
 *
 * - Credentials uses `username` + `password` (bcrypt).
 * - JWT includes `system_role`, `membership_role`, and `active_company_id` for tenant scoping.
 * - Session expiry is enforced via `maxAge` + `proxy.ts` redirect.
 */
export const authOptions: NextAuthOptions = {
  secret: env.AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: env.AUTH_SESSION_MAX_AGE_SECONDS,
  },
  jwt: {
    maxAge: env.AUTH_SESSION_MAX_AGE_SECONDS,
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const { username, password } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          await sleep(350);
          return null;
        }

        const passwordOk = await compare(password, user.password_hash);
        if (!passwordOk) {
          const [membership] = await db
            .select({ company_id: memberships.company_id })
            .from(memberships)
            .where(
              and(
                eq(memberships.user_id, user.id),
                eq(memberships.status, 'ACTIVE'),
              ),
            )
            .limit(1);

          if (membership) {
            await db.insert(activityLogs).values({
              company_id: membership.company_id,
              actor_user_id: user.id,
              action: 'auth.login_failed',
              meta: { reason: 'invalid_password' },
            });
          }

          await sleep(350);
          return null;
        }

        if (user.system_role === 'SUPERADMIN') {
          return {
            id: user.id,
            name: user.username,
            username: user.username,
            system_role: 'SUPERADMIN',
            membership_role: null,
            active_company_id: null,
          } satisfies AuthUser;
        }

        const [membership] = await db
          .select({
            company_id: memberships.company_id,
            role: memberships.role,
          })
          .from(memberships)
          .where(
            and(
              eq(memberships.user_id, user.id),
              eq(memberships.status, 'ACTIVE'),
            ),
          )
          .limit(1);

        if (!membership) {
          await sleep(350);
          return null;
        }

        await db.insert(activityLogs).values({
          company_id: membership.company_id,
          actor_user_id: user.id,
          action: 'auth.login_success',
        });

        return {
          id: user.id,
          name: user.username,
          username: user.username,
          system_role: user.system_role,
          membership_role: membership.role,
          active_company_id: membership.company_id,
        } satisfies AuthUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        const authUser = user as unknown as AuthUser;
        token.system_role = authUser.system_role;
        token.membership_role = authUser.membership_role;
        token.active_company_id = authUser.active_company_id;
        token.username = authUser.username;
      }

      if (
        trigger === 'update' &&
        session?.active_company_id !== undefined &&
        token.system_role === 'SUPERADMIN'
      ) {
        token.active_company_id = session.active_company_id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.username =
          typeof token.username === 'string' ? token.username : '';
        session.user.system_role =
          token.system_role === 'SUPERADMIN' ||
          token.system_role === 'ADMIN' ||
          token.system_role === 'STAFF'
            ? token.system_role
            : 'STAFF';
        session.user.membership_role =
          token.membership_role === 'ADMIN' || token.membership_role === 'STAFF'
            ? token.membership_role
            : null;
      }

      session.active_company_id =
        typeof token.active_company_id === 'string'
          ? token.active_company_id
          : null;

      return session;
    },
  },
};
