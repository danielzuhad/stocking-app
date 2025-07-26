import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uid: string;
      name: string;
      email: string;
    };
    expires: string;
  }

  interface User {
    id: string;
    uid: string;
    name: string;
    email: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    uid: string;
    name: string;
    email: string;
    exp: number;
  }
}
