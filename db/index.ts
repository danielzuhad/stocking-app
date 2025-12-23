import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import { env } from '@/env';
import * as schema from './schema';

type GlobalWithDb = typeof globalThis & {
  __dbSql?: postgres.Sql;
};

const globalWithDb = globalThis as GlobalWithDb;

const sql =
  globalWithDb.__dbSql ??
  postgres(env.DATABASE_URL, {
    max: process.env.NODE_ENV === 'production' ? 10 : 1,
  });

if (process.env.NODE_ENV !== 'production') globalWithDb.__dbSql = sql;

/**
 * Drizzle database client (PostgreSQL).
 *
 * Tenant scope is enforced at the query layer (guards/services), not here.
 */
export const db = drizzle(sql, { schema });

export { sql };
