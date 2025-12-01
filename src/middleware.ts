// middleware.ts
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const publicPaths = ["/login", "/api/auth", "/api/upload"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Lewati middleware untuk assets statis dan font
  const isStaticAsset =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/fonts") ||
    pathname.startsWith("/images") ||
    pathname.match(/\.(css|js|ts|tsx|woff2?|eot|ttf|otf|png|jpg|jpeg|svg|ico)$/);

  if (isStaticAsset) return NextResponse.next();

  // ✅ Lewati middleware jika path publik
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  if (isPublic) return NextResponse.next();

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}
