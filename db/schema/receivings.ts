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
  RECEIVING_STATUS_DRAFT,
  receivingStatusEnum,
} from './inventory-enums';

import { companies } from './companies';
import { productVariants } from './product-variants';
import { users } from './users';

export const receivings = pgTable(
  'receivings',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    status: receivingStatusEnum('status').default(RECEIVING_STATUS_DRAFT).notNull(),
    note: text('note'),
    posted_at: timestamp('posted_at', { withTimezone: true }),
    voided_at: timestamp('voided_at', { withTimezone: true }),
    created_by: uuid('created_by')
      .references(() => users.id)
      .notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_created_at_idx: index('receivings_company_created_at_idx').on(
      t.company_id,
      t.created_at,
    ),
    company_status_idx: index('receivings_company_status_idx').on(
      t.company_id,
      t.status,
    ),
  }),
);

export const receivingItems = pgTable(
  'receiving_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    receiving_id: uuid('receiving_id')
      .references(() => receivings.id)
      .notNull(),
    product_variant_id: uuid('product_variant_id')
      .references(() => productVariants.id)
      .notNull(),
    qty: numeric('qty', { precision: 14, scale: 2 }).notNull(),
    note: text('note'),
    created_at: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    company_receiving_idx: index('receiving_items_company_receiving_idx').on(
      t.company_id,
      t.receiving_id,
    ),
    company_variant_idx: index('receiving_items_company_variant_idx').on(
      t.company_id,
      t.product_variant_id,
    ),
    receiving_variant_unique: uniqueIndex(
      'receiving_items_receiving_variant_unique',
    ).on(t.receiving_id, t.product_variant_id),
  }),
);
