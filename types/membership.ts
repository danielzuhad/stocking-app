/**
 * Membership types derived from Drizzle schema.
 */

export type MembershipType =
  typeof import('@/db/schema').memberships.$inferSelect;
export type MembershipInsertType =
  typeof import('@/db/schema').memberships.$inferInsert;
