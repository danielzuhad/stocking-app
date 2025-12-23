import { getToken } from 'next-auth/jwt';
import { NextResponse, type NextRequest } from 'next/server';

import { env } from '@/env';

const publicFile = /\.(.*)$/;

/**
 * Request guard (Next.js `proxy.ts`, previously `middleware.ts`).
 *
 * - Redirects unauthenticated users to `/login`.
 * - If JWT is expired, treats the session as logged out.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/assets') ||
    pathname === '/favicon.ico' ||
    pathname === '/default-favicon.ico' ||
    publicFile.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = await getToken({ req: request, secret: env.AUTH_SECRET });
  const isExpired =
    typeof token?.exp === 'number' ? Date.now() / 1000 >= token.exp : false;
  const isLoggedIn = Boolean(token && !isExpired);

  if (pathname === '/login') {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};
