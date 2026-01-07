import { err, ok, type ActionResult } from '@/lib/actions/result';

function isActionResult(value: unknown): value is ActionResult<unknown> {
  if (!value || typeof value !== 'object') return false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = value as any;
  if (v.ok === true && 'data' in v) return true;
  if (v.ok === false && v.error && typeof v.error === 'object') return true;
  return false;
}

async function tryParseJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Fetch helper that normalizes responses into `ActionResult<T>`.
 *
 * Best practice for internal APIs:
 * - Route handlers should return `ActionResult` JSON (see `lib/http/response.ts`).
 * - The client should consume via this function, not manual `fetch()` checks.
 *
 * Security:
 * - For 5xx responses, this function intentionally returns a generic message
 *   (ignores body) to avoid accidentally surfacing internal details.
 */
export async function fetchActionResult<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<ActionResult<T>> {
  let response: Response;

  try {
    response = await fetch(input, init);
  } catch {
    return err(
      'INTERNAL',
      'Koneksi bermasalah. Coba lagi beberapa saat atau refresh halaman.',
    );
  }

  // Pass through if server already speaks ActionResult.
  const parsed = await tryParseJson(response);
  if (isActionResult(parsed)) {
    return parsed as ActionResult<T>;
  }

  if (response.ok) {
    // For non-ActionResult JSON endpoints.
    return ok(parsed as T);
  }

  // Never leak details from 5xx responses.
  if (response.status >= 500) {
    return err('INTERNAL', 'Sedang ada gangguan sistem. Coba lagi beberapa saat.');
  }

  switch (response.status) {
    case 400:
    case 422:
      return err('INVALID_INPUT', 'Input tidak valid.');
    case 401:
      return err('UNAUTHENTICATED', 'Kamu harus login.');
    case 403:
      return err('FORBIDDEN', 'Akses ditolak.');
    case 404:
      return err('NOT_FOUND', 'Data tidak ditemukan.');
    case 409:
      return err('CONFLICT', 'Terjadi konflik data. Coba ulangi.');
    default:
      return err('INTERNAL', 'Terjadi kesalahan. Coba lagi.');
  }
}

