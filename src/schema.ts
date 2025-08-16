import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// USERS
export const roleEnum = pgEnum("role_enum", ["admin", "super_admin"]);

export const usersTable = pgTable("users", {
  uid: uuid("uid").primaryKey().defaultRandom(), // UID unik
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  role: roleEnum("role").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type UserCreateType = typeof usersTable.$inferInsert;
export type UserType = typeof usersTable.$inferSelect;

// ITEM
export const categoryEnum = pgEnum("category_enum", [
  "fashion",
  "electronics",
  "beauty",
  "home",
  "sports",
  "toys",
]);

export const unitEnum = pgEnum("unit_enum", [
  "pcs", // pieces
  "box", // kotak
  "kg", // kilogram
  "g", // gram
  "m", // meter
  "cm", // centimeter
  "l", // liter
  "ml", // milliliter
]);

export const itemsTable = pgTable("items", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  image_url: text("image_url"),
  category: categoryEnum("category").notNull(),
  brand: varchar("brand", { length: 50 }),
  sku: varchar("sku", { length: 50 }).unique(),
  unit: unitEnum("unit").default("pcs").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).default("0.00"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type ItemCreateType = typeof itemsTable.$inferInsert;
export type ItemType = typeof itemsTable.$inferSelect;

// ITEM VARIANT
export const itemVariantsTable = pgTable("item_variants", {
  id: uuid("id").primaryKey().defaultRandom(),
  item_id: uuid("item_id")
    .references(() => itemsTable.id)
    .notNull(),
  color: varchar("color", { length: 30 }),
  size: varchar("size", { length: 20 }),
  sku: varchar("sku", { length: 50 }).unique(),
  quantity: integer("quantity").default(0),
});

export type ItemVariantCreateType = typeof itemVariantsTable.$inferInsert;
export type ItemVariantType = typeof itemVariantsTable.$inferSelect;

// INVENTORY ACTIVITIES
export const inventoryActivitiesTable = pgTable("inventory_activities", {
  id: uuid("id").primaryKey().defaultRandom(),

  item_id: uuid("item_id")
    .notNull()
    .references(() => itemsTable.id),
  item_variant_id: uuid("item_variant_id").references(() => itemVariantsTable.id),

  action: text("action").notNull(), // 'CREATE_ITEM', 'UPDATE_ITEM', 'STOCK_IN', 'STOCK_OUT', 'SALE', 'RETURN'
  quantity_change: integer("quantity_change"),
  stock_before: integer("stock_before"),
  stock_after: integer("stock_after"),

  source_type: text("source_type"), // 'PURCHASE_ORDER', 'SALE', 'MANUAL', 'RETURN'
  source_id: uuid("source_id"),

  description: text("description"),

  created_by: uuid("created_by").references(() => usersTable.uid),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type InventoryActivityCreateType = typeof inventoryActivitiesTable.$inferInsert;
export type InventoryActivityType = typeof inventoryActivitiesTable.$inferSelect;
