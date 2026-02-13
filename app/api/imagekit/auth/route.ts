import { createHmac, randomUUID } from 'node:crypto';

import { NextResponse } from 'next/server';

import { env } from '@/env';
import { ok } from '@/lib/actions/result';
import {
  requireAuthSession,
  resolveActiveCompanyScopeFromSession,
} from '@/lib/auth/guards';

/**
 * Maps ActionResult error code into HTTP status code.
 */
function getStatusCodeByErrorCode(code: string): number {
  if (code === 'UNAUTHENTICATED') return 401;
  if (code === 'FORBIDDEN') return 403;
  if (code === 'INVALID_INPUT') return 400;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'CONFLICT') return 409;
  return 500;
}

/**
 * Returns ImageKit upload authentication for client direct upload.
 *
 * Permission:
 * - `ADMIN` and `SUPERADMIN` only.
 * - tenant-scoped by `active_company_id`.
 */
export async function POST() {
  const sessionResult = await requireAuthSession();
  if (!sessionResult.ok) {
    return NextResponse.json(sessionResult, {
      status: getStatusCodeByErrorCode(sessionResult.error.code),
    });
  }

  if (sessionResult.data.user.system_role === 'STAFF') {
    const forbidden = {
      ok: false as const,
      error: {
        code: 'FORBIDDEN' as const,
        message: 'Akses ditolak.',
      },
    };
    return NextResponse.json(forbidden, {
      status: getStatusCodeByErrorCode(forbidden.error.code),
    });
  }

  const scopeResult = resolveActiveCompanyScopeFromSession(sessionResult.data, {
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk mengelola products.',
  });
  if (!scopeResult.ok) {
    return NextResponse.json(scopeResult, {
      status: getStatusCodeByErrorCode(scopeResult.error.code),
    });
  }

  if (
    !env.IMAGEKIT_PRIVATE_KEY ||
    !env.IMAGEKIT_PUBLIC_KEY ||
    !env.IMAGEKIT_URL_ENDPOINT
  ) {
    const unavailable = {
      ok: false as const,
      error: {
        code: 'INTERNAL' as const,
        message: 'Konfigurasi image upload belum lengkap di server.',
      },
    };
    return NextResponse.json(unavailable, {
      status: getStatusCodeByErrorCode(unavailable.error.code),
    });
  }

  const token = randomUUID().replaceAll('-', '');
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;
  const signature = createHmac('sha1', env.IMAGEKIT_PRIVATE_KEY)
    .update(token + String(expire))
    .digest('hex');

  const response = ok({
    token,
    expire,
    signature,
    public_key: env.IMAGEKIT_PUBLIC_KEY,
    url_endpoint: env.IMAGEKIT_URL_ENDPOINT,
    folder: `/products/${scopeResult.data.company_id}`,
  });

  return NextResponse.json(response);
}
