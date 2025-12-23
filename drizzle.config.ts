import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required to run drizzle-kit commands.');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./db/schema/*.ts'],
  out: './db/migrations',
  dbCredentials: {
    url: databaseUrl,
  },
});
