import "next-auth";
import { EUserRole } from ".";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      role: EUserRole;
      companyId: string | null;
      companyName: string | null;
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    role: EUserRole;
    companyId: string | null;
    companyName: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    username: string;
    email: string;
    role: EUserRole;
    companyId: string | null;
    companyName: string | null;
    lastActive?: number;
  }
}
