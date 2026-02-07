import 'server-only';

import type { ZodSchema } from 'zod';

import { err, errFromZod, ok, type ActionResult } from '@/lib/actions/result';
import { getErrorPresentation } from '@/lib/errors/presentation';

export type SimpleFetcherOptions<TInput, TContext, TData> = {
  input: unknown;
  schema: ZodSchema<TInput>;
  authorize?: () => Promise<ActionResult<TContext>>;
  handler: (input: TInput, ctx: TContext) => Promise<TData>;
  errorTag: string;
  userErrorMessage?: string;
};

/**
 * Fetches non-table data using a standard flow (Zod -> auth -> handler).
 *
 * Returns `ActionResult<T>` for consistent error handling.
 */
export async function fetchSimple<TInput, TContext, TData>(
  options: SimpleFetcherOptions<TInput, TContext, TData>,
): Promise<ActionResult<TData>> {
  const parsed = options.schema.safeParse(options.input);
  if (!parsed.success) return errFromZod(parsed.error);

  const authResult = options.authorize
    ? await options.authorize()
    : ok({} as TContext);
  if (!authResult.ok) return authResult;

  try {
    const data = await options.handler(parsed.data, authResult.data);
    return ok(data);
  } catch (error) {
    const presentation = getErrorPresentation({ error });
    console.error(options.errorTag, presentation.developer);
    return err(
      'INTERNAL',
      options.userErrorMessage ??
        'Sedang ada gangguan sistem. Coba lagi beberapa saat.',
    );
  }
}
