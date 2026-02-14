import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  text,
  uuid,
} from 'drizzle-orm/pg-core';

import {
  PRODUCT_DEFAULT_CATEGORY,
  PRODUCT_DEFAULT_STATUS,
  PRODUCT_DEFAULT_UNIT,
  PRODUCT_ENUM_VALUES,
} from '@/lib/products/enums';

import { companies } from './companies';
import { users } from './users';

type ProductImageMetaType = {
  file_id: string;
  url: string;
  thumbnail_url?: string;
  width?: number;
  height?: number;
};

export const productStatusEnum = pgEnum(
  'product_status',
  PRODUCT_ENUM_VALUES.status,
);
export const productCategoryEnum = pgEnum(
  'product_category',
  PRODUCT_ENUM_VALUES.category,
);
export const productUnitEnum = pgEnum('product_unit', PRODUCT_ENUM_VALUES.unit);

export const products = pgTable(
  'products',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    company_id: uuid('company_id')
      .references(() => companies.id)
      .notNull(),
    name: text('name').notNull(),
    category: productCategoryEnum('category')
      .default(PRODUCT_DEFAULT_CATEGORY)
      .notNull(),
    image: jsonb('image').$type<ProductImageMetaType | null>(),
    unit: productUnitEnum('unit').default(PRODUCT_DEFAULT_UNIT).notNull(),
    status: productStatusEnum('status').default(PRODUCT_DEFAULT_STATUS).notNull(),
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
