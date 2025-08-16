import "next-auth";
import { EUserRole } from ".";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uid: string;
      username: string;
      email: string;
      role: EUserRole;
    };
  }

  interface User {
    id: string;
    uid: string;
    username: string;
    email: string;
    role: EUserRole;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    uid: string;
    username: string;
    email: string;
    role: EUserRole;
    lastActive?: number;
  }
}
