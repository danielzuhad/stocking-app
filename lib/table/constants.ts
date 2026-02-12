/**
 * Shared page-size options for DataTable pagination across the application.
 */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

/**
 * Default page size for DataTable pagination.
 */
export const DEFAULT_TABLE_PAGE_SIZE = TABLE_PAGE_SIZE_OPTIONS[0];
