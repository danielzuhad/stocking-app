import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uid: string;
      username: string;
      email: string;
    };
  }

  interface User {
    id: string;
    uid: string;
    username: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    uid: string;
    username: string;
    email: string;
    lastActive?: number;
  }
}
