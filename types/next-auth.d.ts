import type { DefaultSession } from 'next-auth';
import 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    active_company_id: string | null;
    user: {
      id: string;
      username: string;
      system_role: 'SUPERADMIN' | 'ADMIN' | 'STAFF';
      membership_role: 'ADMIN' | 'STAFF' | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    system_role?: 'SUPERADMIN' | 'ADMIN' | 'STAFF';
    membership_role?: 'ADMIN' | 'STAFF' | null;
    active_company_id?: string | null;
  }
}
