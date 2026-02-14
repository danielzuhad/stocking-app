import { clsx, type ClassValue } from 'clsx';
import { Session } from 'next-auth';
import { twMerge } from 'tailwind-merge';

/** Merges Tailwind class names safely (shadcn pattern). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns `true` when the current user is a `SUPERADMIN`. */
export function handleIsSuperAdmin(session: Session | null) {
  return session?.user?.system_role === 'SUPERADMIN';
}

/**
 * Formats a DateTime for UI display.
 *
 * Default: `id-ID` + `Asia/Jakarta` with `medium` date + `short` time.
 */
export function formatDateTime(
  value: Date,
  options?: {
    locale?: string;
    timeZone?: string;
    dateStyle?: Intl.DateTimeFormatOptions['dateStyle'];
    timeStyle?: Intl.DateTimeFormatOptions['timeStyle'];
  },
): string {
  try {
    return new Intl.DateTimeFormat(options?.locale ?? 'id-ID', {
      dateStyle: options?.dateStyle ?? 'medium',
      timeStyle: options?.timeStyle ?? 'short',
      timeZone: options?.timeZone ?? 'Asia/Jakarta',
    }).format(value);
  } catch {
    return value.toISOString();
  }
}

/**
 * Converts optional text input into nullable trimmed value.
 *
 * - `undefined` or blank (`''`) become `null`
 * - non-empty string is trimmed
 */
export function toNullableTrimmedText(value: string | undefined): string | null {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Converts number input to fixed-scale decimal text for SQL `numeric`.
 */
export function toFixedScaleNumberText(value: number, scale = 2): string {
  return value.toFixed(scale);
}

/**
 * Converts arbitrary text into safe lowercase slug segment.
 */
export function toSafeSlugSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Appends ImageKit transform directives to URL using `tr` query param.
 *
 * Returns input URL unchanged for non-HTTP URLs or malformed values.
 */
export function buildImageKitTransformUrl(
  url: string,
  transforms: string[],
): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) return url;

  try {
    const parsedUrl = new URL(url);
    if (!parsedUrl.hostname.includes('imagekit.io')) return url;

    parsedUrl.searchParams.set('tr', transforms.join(','));
    return parsedUrl.toString();
  } catch {
    return url;
  }
}
