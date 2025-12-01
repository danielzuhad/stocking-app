// File: app/api/upload-auth/route.ts
import { env } from "@/lib/env";
import { getUploadAuthParams } from "@imagekit/next/server";

export async function GET() {
  // Your application logic to authenticate the user
  // For example, you can check if the user is logged in or has the necessary permissions
  // If the user is not authenticated, you can return an error response

  const { token, expire, signature } = getUploadAuthParams({
    privateKey: env.data?.IMAGEKIT_PRIVATE_KEY as string,
    publicKey: env.data?.IMAGEKIT_PUBLIC_KEY as string,
  });

  return Response.json({ token, expire, signature, publicKey: env.data?.IMAGEKIT_PUBLIC_KEY });
}
