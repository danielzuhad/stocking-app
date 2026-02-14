import { createHmac, randomUUID } from 'node:crypto';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { companies } from '@/db/schema';
import { env } from '@/env';
import { err, getHttpStatusByActionErrorCode, ok } from '@/lib/actions/result';
import {
  requireNonStaffActiveCompanyScope,
} from '@/lib/auth/guards';
import { buildCompanyAssetFolderSegment } from '@/lib/utils';

/**
 * Returns ImageKit upload authentication for client direct upload.
 *
 * Permission:
 * - `ADMIN` and `SUPERADMIN` only.
 * - tenant-scoped by `active_company_id`.
 */
export async function POST() {
  const scopeResult = await requireNonStaffActiveCompanyScope({
    staff_forbidden: 'Akses ditolak.',
    superadmin_missing_company:
      'Pilih company impersonation dulu untuk mengelola products.',
  });
  if (!scopeResult.ok) {
    return NextResponse.json(scopeResult, {
      status: getHttpStatusByActionErrorCode(scopeResult.error.code),
    });
  }

  if (
    !env.IMAGEKIT_PRIVATE_KEY ||
    !env.IMAGEKIT_PUBLIC_KEY ||
    !env.IMAGEKIT_URL_ENDPOINT
  ) {
    const unavailable = err(
      'INTERNAL',
      'Konfigurasi image upload belum lengkap di server.',
    );
    return NextResponse.json(unavailable, {
      status: getHttpStatusByActionErrorCode('INTERNAL'),
    });
  }

  const token = randomUUID().replaceAll('-', '');
  const expire = Math.floor(Date.now() / 1000) + 60 * 10;
  const signature = createHmac('sha1', env.IMAGEKIT_PRIVATE_KEY)
    .update(token + String(expire))
    .digest('hex');

  const [company] = await db
    .select({ name: companies.name })
    .from(companies)
    .where(eq(companies.id, scopeResult.data.company_id))
    .limit(1);

  const companyFolder = buildCompanyAssetFolderSegment(
    company?.name,
    scopeResult.data.company_id,
  );

  const response = ok({
    token,
    expire,
    signature,
    public_key: env.IMAGEKIT_PUBLIC_KEY,
    url_endpoint: env.IMAGEKIT_URL_ENDPOINT,
    folder: `/products/${companyFolder}`,
    company_tag: companyFolder,
  });

  return NextResponse.json(response);
}
