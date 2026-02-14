import { index, pgTable, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

import {
  MEMBERSHIP_STATUS_ACTIVE,
  membershipRoleEnum,
  membershipStatusEnum,
} from './auth-enums';

import { companies } from './companies';
import { users } from './users';

export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    user_id: uuid('user_id')
      .references(() => users.id)
      .notNull(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    role: membershipRoleEnum('role').notNull(),
    status: membershipStatusEnum('status').default(MEMBERSHIP_STATUS_ACTIVE).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    user_unique: uniqueIndex('memberships_user_unique').on(t.user_id),
    company_idx: index('memberships_company_idx').on(t.company_id),
  }),
);
