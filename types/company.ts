/**
 * Company types derived from Drizzle schema.
 */

export type CompanyType = typeof import('@/db/schema').companies.$inferSelect;
export type CompanyInsertType =
  typeof import('@/db/schema').companies.$inferInsert;
