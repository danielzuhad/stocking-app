import { relations } from "drizzle-orm";
import {
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ========== ENUMS ==========
export const roleEnum = pgEnum("role_enum", ["admin", "super_admin"]);
export const categoryEnum = pgEnum("category_enum", [
  "fashion",
  "electronics",
  "beauty",
  "home",
  "sports",
  "toys",
]);
export const unitEnum = pgEnum("unit_enum", ["pcs", "box", "kg", "g", "m", "cm", "l", "ml"]);
export const sourceTypeActivityEnum = pgEnum("source_type_activity_enum", [
  "purchase_order",
  "sale",
  "manual",
  "return",
]);
export const actionEnum = pgEnum("action_enum", [
  "create_item",
  "update_item",
  "stock_in",
  "stock_out",
  "sale",
  "return",
]);

// ========== COMPANIES ==========
export const companiesTable = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  created_by_user_id: uuid("created_by_user_id"),
  updated_by_user_id: uuid("updated_by_user_id"),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type CompanyCreateType = typeof companiesTable.$inferInsert;
export type CompanyType = typeof companiesTable.$inferSelect;

// ========== USERS ==========
export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  company_id: uuid("company_id").references(() => companiesTable.id),
  created_by_user_id: uuid("created_by_user_id"),
  updated_by_user_id: uuid("updated_by_user_id"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type UserCreateType = typeof usersTable.$inferInsert;
export type UserType = typeof usersTable.$inferSelect;

// ========== ITEMS ==========
export const itemsTable = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  image: jsonb("image").$type<{ fileId: string; name: string; url: string }>(),
  category: categoryEnum("category").notNull(),
  brand: varchar("brand", { length: 50 }),
  sku: varchar("sku", { length: 50 }).unique(), // optional, bisa dihapus kalau varian punya SKU sendiri
  unit: unitEnum("unit").default("pcs").notNull(),

  created_by_user_id: uuid("created_by_user_id")
    .references(() => usersTable.id)
    .notNull(),
  updated_by_user_id: uuid("updated_by_user_id").references(() => usersTable.id),
  company_id: uuid("company_id")
    .references(() => companiesTable.id)
    .notNull(),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type ItemCreateType = typeof itemsTable.$inferInsert;
export type ItemType = typeof itemsTable.$inferSelect;

// ========== ITEM VARIANTS ==========
export const itemVariantsTable = pgTable("item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id")
    .references(() => itemsTable.id)
    .notNull(),

  color: varchar("color", { length: 30 }),
  size: varchar("size", { length: 20 }),

  sku: varchar("sku", { length: 50 }).unique(),
  price: numeric("price", { precision: 12, scale: 2 }).default("0.00"),
  quantity: integer("quantity").default(0),
  created_by_user_id: uuid("created_by_user_id").references(() => usersTable.id),
  updated_by_user_id: uuid("updated_by_user_id").references(() => usersTable.id),

  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type ItemVariantCreateType = typeof itemVariantsTable.$inferInsert;
export type ItemVariantType = typeof itemVariantsTable.$inferSelect;

// ========== INVENTORY ACTIVITIES ==========
export const inventoryActivitiesTable = pgTable("inventory_activities", {
  id: uuid("id").primaryKey().defaultRandom(),

  item_id: uuid("item_id")
    .notNull()
    .references(() => itemsTable.id),

  item_variant_id: uuid("item_variant_id").references(() => itemVariantsTable.id),

  action: actionEnum("action").notNull(),
  quantity_change: integer("quantity_change"),
  stock_before: integer("stock_before"),
  stock_after: integer("stock_after"),

  source_type: sourceTypeActivityEnum("source_type").notNull(),
  source_id: uuid("source_id"),

  description: text("description"),

  created_by_user_id: uuid("created_by_user_id").references(() => usersTable.id),
  updated_by_user_id: uuid("updated_by_user_id").references(() => usersTable.id),
  company_id: uuid("company_id")
    .references(() => companiesTable.id)
    .notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type InventoryActivityCreateType = typeof inventoryActivitiesTable.$inferInsert;
export type InventoryActivityType = typeof inventoryActivitiesTable.$inferSelect;

// ========== RELATIONS ==========
export const companiesRelations = relations(companiesTable, ({ many, one }) => ({
  users: many(usersTable),
  items: many(itemsTable),
  activities: many(inventoryActivitiesTable),
  created_by: one(usersTable, {
    fields: [companiesTable.created_by_user_id],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [companiesTable.updated_by_user_id],
    references: [usersTable.id],
  }),
}));

export const usersRelations = relations(usersTable, ({ many, one }) => ({
  items: many(itemsTable),
  activities: many(inventoryActivitiesTable),
  company: one(companiesTable, {
    fields: [usersTable.company_id],
    references: [companiesTable.id],
  }),
  created_by: one(usersTable, {
    fields: [usersTable.created_by_user_id],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [usersTable.updated_by_user_id],
    references: [usersTable.id],
  }),
}));

export const itemsRelations = relations(itemsTable, ({ many, one }) => ({
  created_by: one(usersTable, {
    fields: [itemsTable.created_by_user_id],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [itemsTable.updated_by_user_id],
    references: [usersTable.id],
  }),
  company: one(companiesTable, {
    fields: [itemsTable.company_id],
    references: [companiesTable.id],
  }),
  variants: many(itemVariantsTable),
}));

export const itemVariantsRelations = relations(itemVariantsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [itemVariantsTable.item_id],
    references: [itemsTable.id],
  }),
  created_by: one(usersTable, {
    fields: [itemVariantsTable.created_by_user_id],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [itemVariantsTable.updated_by_user_id],
    references: [usersTable.id],
  }),
}));

export const inventoryActivitiesRelations = relations(inventoryActivitiesTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [inventoryActivitiesTable.item_id],
    references: [itemsTable.id],
  }),
  item_variant: one(itemVariantsTable, {
    fields: [inventoryActivitiesTable.item_variant_id],
    references: [itemVariantsTable.id],
  }),
  created_by: one(usersTable, {
    fields: [inventoryActivitiesTable.created_by_user_id],
    references: [usersTable.id],
  }),
  updated_by: one(usersTable, {
    fields: [inventoryActivitiesTable.updated_by_user_id],
    references: [usersTable.id],
  }),
  company: one(companiesTable, {
    fields: [inventoryActivitiesTable.company_id],
    references: [companiesTable.id],
  }),
}));
