'use server';

import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { decryptUrlState, encryptUrlState } from '@/lib/data-table/url-state';
import { dataTableQuerySchema, type DataTableQuery } from '@/lib/data-table/types';

/**
 * Encrypts a `DataTableQuery` into an opaque URL-safe token.
 */
export async function encryptDataTableQueryToken(
  input: DataTableQuery,
): Promise<ActionResult<{ token: string }>> {
  const parsed = dataTableQuerySchema.safeParse(input);
  if (!parsed.success) return errFromZod(parsed.error);

  return ok({ token: encryptUrlState(parsed.data) });
}

/**
 * Decrypts a URL token back into a validated `DataTableQuery`.
 */
export async function decryptDataTableQueryToken(
  token: string,
): Promise<ActionResult<DataTableQuery>> {
  try {
    const decoded = decryptUrlState<unknown>(token);
    const parsed = dataTableQuerySchema.safeParse(decoded);
    if (!parsed.success) return errFromZod(parsed.error);
    return ok(parsed.data);
  } catch {
    return err('INVALID_INPUT', 'URL state tidak valid.');
  }
}

