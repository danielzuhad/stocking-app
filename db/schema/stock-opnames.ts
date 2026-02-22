import { sql } from 'drizzle-orm';
import {
  index,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  STOCK_OPNAME_STATUS_IN_PROGRESS,
  stockOpnameStatusEnum,
} from './inventory-enums';

import { companies } from './companies';
import { productVariants } from './product-variants';
import { users } from './users';

export const stockOpnames = pgTable(
  'stock_opnames',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    status: stockOpnameStatusEnum('status')
      .default(STOCK_OPNAME_STATUS_IN_PROGRESS)
      .notNull(),
    note: text('note'),
    started_by: uuid('started_by')
      .references(() => users.id)
      .notNull(),
    started_at: timestamp('started_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    finalized_by: uuid('finalized_by').references(() => users.id),
    finalized_at: timestamp('finalized_at', { withTimezone: true }),
    voided_by: uuid('voided_by').references(() => users.id),
    voided_at: timestamp('voided_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_created_at_idx: index('stock_opnames_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
    company_status_idx: index('stock_opnames_company_status_idx').on(
      t.company_id,
      t.status,
    ),
    active_company_unique: uniqueIndex('stock_opnames_active_company_unique')
      .on(t.company_id)
      .where(sql`${t.status} = 'IN_PROGRESS'`),
  }),
);

export const stockOpnameItems = pgTable(
  'stock_opname_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    stock_opname_id: uuid('stock_opname_id')
      .references(() => stockOpnames.id)
      .notNull(),
    product_variant_id: uuid('product_variant_id')
      .references(() => productVariants.id)
      .notNull(),
    system_qty: numeric('system_qty', { precision: 14, scale: 2 }).notNull(),
    counted_qty: numeric('counted_qty', { precision: 14, scale: 2 }).notNull(),
    diff_qty: numeric('diff_qty', { precision: 14, scale: 2 }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_opname_idx: index('stock_opname_items_company_opname_idx').on(
      t.company_id,
      t.stock_opname_id,
    ),
    company_variant_idx: index('stock_opname_items_company_variant_idx').on(
      t.company_id,
      t.product_variant_id,
    ),
    opname_variant_unique: uniqueIndex('stock_opname_items_opname_variant_unique').on(
      t.stock_opname_id,
      t.product_variant_id,
    ),
  }),
);
