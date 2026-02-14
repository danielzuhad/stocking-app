import { pgEnum } from 'drizzle-orm/pg-core';

/**
 * Drizzle enum declarations for authentication and membership domain.
 *
 * This module is the single source of truth for:
 * - system roles (`users.system_role`)
 * - company membership role/status (`memberships.role`, `memberships.status`)
 */
export const systemRoleEnum = pgEnum('system_role', [
  'SUPERADMIN',
  'ADMIN',
  'STAFF',
]);

export const membershipRoleEnum = pgEnum('membership_role', ['ADMIN', 'STAFF']);

export const membershipStatusEnum = pgEnum('membership_status', [
  'ACTIVE',
  'INACTIVE',
]);

/** System role options derived directly from Drizzle enum declaration. */
export const SYSTEM_ROLE_OPTIONS = systemRoleEnum.enumValues;
/** Membership role options derived directly from Drizzle enum declaration. */
export const MEMBERSHIP_ROLE_OPTIONS = membershipRoleEnum.enumValues;
/** Membership status options derived directly from Drizzle enum declaration. */
export const MEMBERSHIP_STATUS_OPTIONS = membershipStatusEnum.enumValues;

export type SystemRoleType = (typeof SYSTEM_ROLE_OPTIONS)[number];
export type MembershipRoleType = (typeof MEMBERSHIP_ROLE_OPTIONS)[number];
export type MembershipStatusType = (typeof MEMBERSHIP_STATUS_OPTIONS)[number];

/** Stable role constants used across guards/session checks. */
export const SYSTEM_ROLE_SUPERADMIN: SystemRoleType = 'SUPERADMIN';
export const SYSTEM_ROLE_ADMIN: SystemRoleType = 'ADMIN';
export const SYSTEM_ROLE_STAFF: SystemRoleType = 'STAFF';

/** Stable membership status constants. */
export const MEMBERSHIP_STATUS_ACTIVE: MembershipStatusType = 'ACTIVE';
export const MEMBERSHIP_STATUS_INACTIVE: MembershipStatusType = 'INACTIVE';

/** Runtime type guard for system role values. */
export function isSystemRole(value: unknown): value is SystemRoleType {
  return (
    typeof value === 'string' &&
    SYSTEM_ROLE_OPTIONS.includes(value as SystemRoleType)
  );
}

/** Runtime type guard for membership role values. */
export function isMembershipRole(value: unknown): value is MembershipRoleType {
  return (
    typeof value === 'string' &&
    MEMBERSHIP_ROLE_OPTIONS.includes(value as MembershipRoleType)
  );
}

/** Runtime type guard for membership status values. */
export function isMembershipStatus(
  value: unknown,
): value is MembershipStatusType {
  return (
    typeof value === 'string' &&
    MEMBERSHIP_STATUS_OPTIONS.includes(value as MembershipStatusType)
  );
}
