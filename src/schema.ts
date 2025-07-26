import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  uid: uuid("uid").primaryKey().defaultRandom(), // UID unik
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(), // hashed password
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type UserCreateType = typeof usersTable.$inferInsert;
export type UserType = typeof usersTable.$inferSelect;
