import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { companies } from './companies';
import { users } from './users';

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    actor_user_id: uuid('actor_user_id')
      .references(() => users.id)
      .notNull(),
    action: text('action').notNull(),
    target_type: text('target_type'),
    target_id: text('target_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_created_at_idx: index('activity_logs_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
  }),
);
