import type { SQL, SQLWrapper } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

type SearchFieldMapType = Record<string, SQLWrapper>;

/**
 * Valid field key type derived from a search field map.
 */
export type SearchFieldType<TFields extends SearchFieldMapType> = Extract<
  keyof TFields,
  string
>;

/**
 * Standard options shape for table fetchers that support text search.
 */
export type SearchOptionsType<TFields extends SearchFieldMapType> = {
  search_fields?: readonly SearchFieldType<TFields>[];
};

type CreateIlikeSearchOptionsType<TFields extends SearchFieldMapType> = {
  fields: TFields;
  defaultFields: readonly SearchFieldType<TFields>[];
};

/**
 * Builds typed helpers for text search using PostgreSQL `ILIKE`.
 *
 * This keeps per-service fetchers small: only define `fields` + `defaultFields`,
 * then call `buildWhere(query, selectedFields)`.
 */
export function createIlikeSearch<TFields extends SearchFieldMapType>(
  options: CreateIlikeSearchOptionsType<TFields>,
) {
  const { fields, defaultFields } = options;

  /**
   * Resolves selected fields with fallback to defaults.
   */
  function resolveFields(
    selectedFields?: readonly SearchFieldType<TFields>[],
  ): readonly SearchFieldType<TFields>[] {
    if (!selectedFields?.length) {
      return defaultFields;
    }
    return selectedFields;
  }

  /**
   * Returns tenant-safe SQL `WHERE` fragment for a text query, or `undefined`
   * when query is empty / blank.
   */
  function buildWhere(
    query: string | undefined,
    selectedFields?: readonly SearchFieldType<TFields>[],
  ): SQL | undefined {
    const normalizedQuery = query?.trim();
    if (!normalizedQuery) return undefined;

    const resolvedFields = resolveFields(selectedFields);
    if (!resolvedFields.length) return undefined;

    const searchValue = `%${normalizedQuery}%`;
    const conditions = resolvedFields.map(
      (field) => sql`${fields[field]} ILIKE ${searchValue}`,
    );

    if (conditions.length === 1) {
      return conditions[0];
    }

    return sql`(${sql.join(conditions, sql` OR `)})`;
  }

  return {
    fields,
    defaultFields,
    resolveFields,
    buildWhere,
  } as const;
}
