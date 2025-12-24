export type ErrorKind = 'DATABASE' | 'NETWORK' | 'UNKNOWN';

export type ErrorPresentation = {
  user: {
    /** Safe title to display to end users (no internal details). */
    title: string;
    /** Safe description to display to end users (no internal details). */
    message: string;
  };
  developer: {
    /** Rough category to help troubleshooting. */
    kind: ErrorKind;
    /** Optional troubleshooting hint for developers. */
    hint?: string;
    /** Route pathname (if available). */
    pathname?: string;
    /** Next.js error digest (if available). */
    digest?: string;
    /** Sanitized error message. */
    message: string;
    /** Sanitized cause summary (best-effort). */
    cause?: string;
    /** Sanitized stack trace (best-effort, truncated). */
    stack?: string;
  };
};

type ErrorWithCause = Error & { cause?: unknown };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function getErrorStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

function getErrorCause(error: unknown): string | undefined {
  const cause = (error as ErrorWithCause | null | undefined)?.cause;
  if (!cause) return undefined;
  if (cause instanceof Error) return cause.message;
  if (typeof cause === 'string') return cause;

  try {
    return JSON.stringify(cause);
  } catch {
    return String(cause);
  }
}

function sanitizeErrorText(text: string): string {
  return (
    text
      // Mask credentials in URLs: scheme://user:pass@host -> scheme://user:***@host
      .replace(/([a-z][a-z0-9+.-]*:\/\/)([^:\s/@]+):([^@\s/]+)@/gi, '$1$2:***@')
      // Mask password query param (best-effort)
      .replace(/password=([^&\s]+)/gi, 'password=***')
  );
}

function truncateLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return text;
  return [
    ...lines.slice(0, maxLines),
    `… (${lines.length - maxLines} lines truncated)`,
  ].join('\n');
}

function classifyError(combinedText: string): ErrorKind {
  const text = combinedText.toLowerCase();

  const hasNetworkSignals =
    text.includes('econnrefused') ||
    text.includes('econnreset') ||
    text.includes('etimedout') ||
    text.includes('enotfound') ||
    text.includes('eai_again') ||
    text.includes('socket hang up') ||
    text.includes('fetch failed') ||
    text.includes('networkerror') ||
    text.includes('connection terminated');

  const hasDatabaseSignals =
    text.includes('postgres') ||
    text.includes('postgresql') ||
    text.includes('drizzle') ||
    text.includes('database_url') ||
    text.includes('password authentication failed') ||
    // Common local docker port for Postgres.
    text.includes(':5432') ||
    text.includes(' 5432');

  if (hasNetworkSignals && hasDatabaseSignals) return 'DATABASE';
  if (hasDatabaseSignals) return 'DATABASE';
  if (hasNetworkSignals) return 'NETWORK';

  return 'UNKNOWN';
}

function getDeveloperHint(kind: ErrorKind): string | undefined {
  switch (kind) {
    case 'DATABASE':
      return [
        'Kemungkinan besar koneksi database bermasalah (mis. container Postgres mati atau `DATABASE_URL` salah).',
        'Checklist cepat:',
        '- `docker compose ps` (pastikan service DB running)',
        '- `docker compose up -d` (nyalakan lagi jika mati)',
        '- cek `DATABASE_URL` di `.env.local`',
      ].join('\n');
    case 'NETWORK':
      return [
        'Kemungkinan ada masalah jaringan atau service downstream (fetch).',
        'Cek koneksi internet / endpoint yang diakses, lalu coba ulangi.',
      ].join('\n');
    default:
      return [
        'Tidak bisa memastikan penyebab dari error ini hanya dari UI (kadang pesan asli disanitasi oleh Next.js).',
        'Checklist cepat:',
        '- cek log server untuk root cause',
        '- pastikan DB running (`docker compose ps`)',
        '- pastikan `DATABASE_URL` benar di `.env.local`',
      ].join('\n');
  }
}

/**
 * Creates a standardized error presentation:
 * - safe message for end users
 * - richer (but sanitized) diagnostics for developers
 */
export function getErrorPresentation({
  error,
  digest,
  pathname,
}: {
  error: unknown;
  digest?: string;
  pathname?: string;
}): ErrorPresentation {
  const rawMessage = getErrorMessage(error);
  const rawStack = getErrorStack(error);
  const rawCause = getErrorCause(error);

  const combinedText = [rawMessage, rawCause, rawStack]
    .filter(Boolean)
    .join('\n');
  const kind = classifyError(combinedText);

  const user =
    kind === 'DATABASE'
      ? {
          title: 'Gagal memuat data',
          message:
            'Sedang ada gangguan koneksi data. Coba lagi beberapa saat atau refresh halaman.',
        }
      : kind === 'NETWORK'
        ? {
            title: 'Koneksi bermasalah',
            message:
              'Sedang ada gangguan koneksi. Coba lagi beberapa saat atau refresh halaman.',
          }
        : {
            title: 'Terjadi kesalahan',
            message:
              'Ada error yang tidak terduga. Coba lagi beberapa saat atau refresh halaman.',
          };

  return {
    user,
    developer: {
      kind,
      hint: getDeveloperHint(kind),
      pathname,
      digest,
      message: sanitizeErrorText(rawMessage),
      cause: rawCause ? sanitizeErrorText(rawCause) : undefined,
      stack: rawStack
        ? truncateLines(sanitizeErrorText(rawStack), 16)
        : undefined,
    },
  };
}
