import {
  isMembershipRole,
  isMembershipStatus,
  isSystemRole,
  MEMBERSHIP_ROLE_OPTIONS,
  MEMBERSHIP_STATUS_ACTIVE,
  MEMBERSHIP_STATUS_INACTIVE,
  MEMBERSHIP_STATUS_OPTIONS,
  SYSTEM_ROLE_ADMIN,
  SYSTEM_ROLE_OPTIONS,
  SYSTEM_ROLE_STAFF,
  SYSTEM_ROLE_SUPERADMIN,
  type MembershipRoleType,
  type MembershipStatusType,
  type SystemRoleType,
} from '@/db/schema/auth-enums';

/**
 * Shared auth enum values sourced from Drizzle enum declarations.
 */
export {
  isMembershipRole,
  isMembershipStatus,
  isSystemRole,
  MEMBERSHIP_ROLE_OPTIONS,
  MEMBERSHIP_STATUS_ACTIVE,
  MEMBERSHIP_STATUS_INACTIVE,
  MEMBERSHIP_STATUS_OPTIONS,
  SYSTEM_ROLE_ADMIN,
  SYSTEM_ROLE_OPTIONS,
  SYSTEM_ROLE_STAFF,
  SYSTEM_ROLE_SUPERADMIN,
};

export type { MembershipRoleType, MembershipStatusType, SystemRoleType };
