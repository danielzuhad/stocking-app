import { Buffer } from 'node:buffer';

import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { companies } from '@/db/schema';
import { env } from '@/env';
import { err, getHttpStatusByActionErrorCode, ok } from '@/lib/actions/result';
import {
  requireNonStaffActiveCompanyScope,
} from '@/lib/auth/guards';
import { getErrorPresentation } from '@/lib/errors/presentation';
import { buildCompanyAssetFolderSegment } from '@/lib/utils';

const deleteUploadedImageSchema = z.object({
  file_id: z.string().trim().min(1).max(255),
});

/**
 * Builds ImageKit basic auth header from private key.
 */
function buildImageKitAuthHeader(privateKey: string): string {
  const encoded = Buffer.from(`${privateKey}:`).toString('base64');
  return `Basic ${encoded}`;
}

/**
 * Deletes an uploaded ImageKit file (rollback helper).
 *
 * Permission:
 * - `ADMIN` and `SUPERADMIN` only.
 * - tenant-scoped by `active_company_id`.
 * - only allows deletion for files under active company folder path.
 */
export async function POST(request: Request) {
  const scopeResult = await requireNonStaffActiveCompanyScope({
    staff_forbidden: 'Akses ditolak.',
    superadmin_missing_company:
      'Pilih perusahaan dulu untuk mode penyamaran sebelum mengelola produk.',
  });
  if (!scopeResult.ok) {
    return NextResponse.json(scopeResult, {
      status: getHttpStatusByActionErrorCode(scopeResult.error.code),
    });
  }

  if (!env.IMAGEKIT_PRIVATE_KEY) {
    const unavailable = err(
      'INTERNAL',
      'Konfigurasi image upload belum lengkap di server.',
    );
    return NextResponse.json(unavailable, {
      status: getHttpStatusByActionErrorCode('INTERNAL'),
    });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    const invalid = err('INVALID_INPUT', 'Payload tidak valid.');
    return NextResponse.json(invalid, {
      status: getHttpStatusByActionErrorCode('INVALID_INPUT'),
    });
  }

  const parsedPayload = deleteUploadedImageSchema.safeParse(payload);
  if (!parsedPayload.success) {
    const invalid = err('INVALID_INPUT', 'Payload tidak valid.');
    return NextResponse.json(invalid, {
      status: getHttpStatusByActionErrorCode('INVALID_INPUT'),
    });
  }

  try {
    const [company] = await db
      .select({ name: companies.name })
      .from(companies)
      .where(eq(companies.id, scopeResult.data.company_id))
      .limit(1);

    const companyFolder = buildCompanyAssetFolderSegment(
      company?.name,
      scopeResult.data.company_id,
    );

    const imageKitAuthHeader = buildImageKitAuthHeader(env.IMAGEKIT_PRIVATE_KEY);

    const detailsResponse = await fetch(
      `https://api.imagekit.io/v1/files/${encodeURIComponent(
        parsedPayload.data.file_id,
      )}/details`,
      {
        method: 'GET',
        headers: {
          Authorization: imageKitAuthHeader,
        },
      },
    );

    if (detailsResponse.status === 404) {
      const notFound = err('NOT_FOUND', 'File image tidak ditemukan.');
      return NextResponse.json(notFound, {
        status: getHttpStatusByActionErrorCode('NOT_FOUND'),
      });
    }

    if (!detailsResponse.ok) {
      const unavailable = err('INTERNAL', 'Gagal memverifikasi file image.');
      return NextResponse.json(unavailable, {
        status: getHttpStatusByActionErrorCode('INTERNAL'),
      });
    }

    const details = (await detailsResponse.json()) as {
      filePath?: string;
    };

    if (
      !details.filePath ||
      !details.filePath.startsWith(`/products/${companyFolder}/`)
    ) {
      const forbidden = err(
        'FORBIDDEN',
        'Tidak bisa menghapus file gambar di luar perusahaan aktif.',
      );
      return NextResponse.json(forbidden, {
        status: getHttpStatusByActionErrorCode('FORBIDDEN'),
      });
    }

    const deleteResponse = await fetch(
      `https://api.imagekit.io/v1/files/${encodeURIComponent(
        parsedPayload.data.file_id,
      )}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: imageKitAuthHeader,
        },
      },
    );

    if (deleteResponse.status === 404) {
      const notFound = err('NOT_FOUND', 'File image tidak ditemukan.');
      return NextResponse.json(notFound, {
        status: getHttpStatusByActionErrorCode('NOT_FOUND'),
      });
    }

    if (!deleteResponse.ok) {
      const unavailable = err('INTERNAL', 'Gagal menghapus file image.');
      return NextResponse.json(unavailable, {
        status: getHttpStatusByActionErrorCode('INTERNAL'),
      });
    }

    return NextResponse.json(ok({ file_id: parsedPayload.data.file_id }));
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error('IMAGEKIT_DELETE_FILE_ERROR', presentation.developer);

    const unavailable = err(
      'INTERNAL',
      'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
    );
    return NextResponse.json(unavailable, {
      status: getHttpStatusByActionErrorCode('INTERNAL'),
    });
  }
}
