import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { systemRoleEnum } from './auth-enums';

export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    username: text('username').notNull(),
    email: text('email'),
    password_hash: text('password_hash').notNull(),
    system_role: systemRoleEnum('system_role').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    username_unique: uniqueIndex('users_username_unique').on(t.username),
  }),
);
