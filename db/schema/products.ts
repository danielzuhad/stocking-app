import {
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

import { companies } from './companies';
import { users } from './users';

export const productStatusEnum = pgEnum('product_status', ['ACTIVE', 'INACTIVE']);
export const productCategoryEnum = pgEnum('product_category', [
  'FASHION',
  'COSMETIC',
  'GENERAL',
]);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    name: text('name').notNull(),
    category: productCategoryEnum('category').default('GENERAL').notNull(),
    unit: text('unit').notNull(),
    status: productStatusEnum('status').default('ACTIVE').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
    deleted_by: uuid('deleted_by').references(() => users.id),
  },
  (t) => ({
    company_created_at_idx: index('products_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
    company_name_idx: index('products_company_name_idx').on(t.company_id, t.name),
  }),
);
