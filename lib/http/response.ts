import 'server-only';

import { NextResponse } from 'next/server';

import { err, ok, type ActionErrorCode, type ActionResult } from '@/lib/actions/result';

const defaultStatusByCode: Record<ActionErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL: 500,
};

/**
 * Returns a JSON response with `{ ok: true, data }`.
 *
 * Prefer this helper in route handlers so clients can consume via
 * `fetchActionResult()` consistently.
 */
export function jsonOk<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(ok(data), init);
}

/**
 * Returns a JSON response with `{ ok: false, error }` and a matching HTTP status.
 *
 * Security note: never pass raw DB/stack messages as `message`.
 */
export function jsonErr(
  code: ActionErrorCode,
  message: string,
  init?: ResponseInit,
): NextResponse<ActionResult<never>> {
  return NextResponse.json(err(code, message), {
    ...init,
    status: init?.status ?? defaultStatusByCode[code],
  });
}
