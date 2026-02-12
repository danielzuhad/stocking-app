import {
  boolean,
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import { companies } from './companies';
import { products } from './products';
import { users } from './users';

export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    product_id: uuid('product_id')
      .references(() => products.id)
      .notNull(),
    name: text('name').notNull(),
    sku: text('sku'),
    barcode: text('barcode'),
    selling_price: numeric('selling_price', { precision: 14, scale: 2 })
      .default('0')
      .notNull(),
    is_default: boolean('is_default').default(false).notNull(),
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
    company_product_idx: index('product_variants_company_product_idx').on(
      t.company_id,
      t.product_id,
    ),
    company_created_at_idx: index('product_variants_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
    company_sku_unique: uniqueIndex('product_variants_company_sku_unique').on(
      t.company_id,
      t.sku,
    ),
    company_barcode_unique: uniqueIndex(
      'product_variants_company_barcode_unique',
    ).on(t.company_id, t.barcode),
  }),
);
