/**
 * User types derived from Drizzle schema.
 */

export type UserType = typeof import('@/db/schema').users.$inferSelect;
export type UserInsertType = typeof import('@/db/schema').users.$inferInsert;
