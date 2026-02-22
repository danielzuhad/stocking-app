import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { companies } from './companies';
import { productVariants } from './product-variants';
import { users } from './users';

export const stockAdjustments = pgTable(
  'stock_adjustments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    reason: text('reason').notNull(),
    note: text('note'),
    created_by: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_created_at_idx: index('stock_adjustments_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
  }),
);

export const stockAdjustmentItems = pgTable(
  'stock_adjustment_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    stock_adjustment_id: uuid('stock_adjustment_id')
      .references(() => stockAdjustments.id)
      .notNull(),
    product_variant_id: uuid('product_variant_id')
      .references(() => productVariants.id)
      .notNull(),
    /** Quantity diff (can be positive/negative). */
    qty_diff: numeric('qty_diff', { precision: 14, scale: 2 }).notNull(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_adjustment_idx: index('stock_adjustment_items_company_adjustment_idx').on(
      t.company_id,
      t.stock_adjustment_id,
    ),
    company_variant_idx: index('stock_adjustment_items_company_variant_idx').on(
      t.company_id,
      t.product_variant_id,
    ),
    adjustment_variant_unique: uniqueIndex(
      'stock_adjustment_items_adjustment_variant_unique',
    ).on(t.stock_adjustment_id, t.product_variant_id),
  }),
);
