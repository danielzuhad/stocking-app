import { index, numeric, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import {
  stockMovementReferenceEnum,
  stockMovementTypeEnum,
} from './inventory-enums';

import { companies } from './companies';
import { productVariants } from './product-variants';
import { users } from './users';

export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    product_variant_id: uuid('product_variant_id')
      .references(() => productVariants.id)
      .notNull(),
    type: stockMovementTypeEnum('type').notNull(),
    /**
     * Quantity delta for stock movement.
     *
     * Rules:
     * - `IN` / `OUT` use positive numbers.
     * - `ADJUST` can be positive or negative.
     */
    qty: numeric('qty', { precision: 14, scale: 2 }).notNull(),
    reference_type: stockMovementReferenceEnum('reference_type').notNull(),
    reference_id: uuid('reference_id').notNull(),
    note: text('note'),
    created_by: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    effective_at: timestamp('effective_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_created_at_idx: index('stock_movements_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
    company_variant_idx: index('stock_movements_company_variant_idx').on(
      t.company_id,
      t.product_variant_id,
    ),
    company_reference_idx: index('stock_movements_company_reference_idx').on(
      t.company_id,
      t.reference_type,
      t.reference_id,
    ),
  }),
);
