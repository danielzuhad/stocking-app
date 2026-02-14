import type { DefaultSession } from 'next-auth';
import 'next-auth/jwt';
import type {
  MembershipRoleType,
  SystemRoleType,
} from '@/db/schema/auth-enums';

declare module 'next-auth' {
  interface Session {
    active_company_id: string | null;
    user: {
      id: string;
      username: string;
      system_role: SystemRoleType;
      membership_role: MembershipRoleType | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    username?: string;
    system_role?: SystemRoleType;
    membership_role?: MembershipRoleType | null;
    active_company_id?: string | null;
  }
}
