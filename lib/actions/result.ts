import { z } from 'zod';

/**
 * Standard return shape for server actions.
 *
 * Always return serializable objects (no thrown Errors) so the client can handle
 * failures in a consistent, typesafe way.
 */

/** Canonical error codes for server actions (stable contract for UI handling). */
export type ActionErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'INVALID_INPUT'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL';

/** Normalized error payload for server actions. */
export type ActionError = {
  /** Stable error identifier for branching on the client. */
  code: ActionErrorCode;
  /** Safe, user-facing message (no stack/DB details). */
  message: string;
  /** Optional field-level errors (Zod `flatten().fieldErrors`). */
  field_errors?: Record<string, string[]>;
};

/** Standard union for server action results. */
export type ActionResult<T> =
  | {
      /** Success flag (discriminant). */
      ok: true;
      /** Data payload on success. */
      data: T;
    }
  | {
      /** Failure flag (discriminant). */
      ok: false;
      /** Error payload on failure. */
      error: ActionError;
    };

/** Builds a successful `ActionResult`. */
export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Builds a failed `ActionResult` with a known error code. */
export function err(code: ActionErrorCode, message: string): ActionResult<never> {
  return { ok: false, error: { code, message } };
}

/** Converts a Zod error into a typed `INVALID_INPUT` result for forms. */
export function errFromZod(
  error: z.ZodError,
  message = 'Input tidak valid.',
): ActionResult<never> {
  return {
    ok: false,
    error: {
      code: 'INVALID_INPUT',
      message,
      field_errors: error.flatten().fieldErrors,
    },
  };
}
