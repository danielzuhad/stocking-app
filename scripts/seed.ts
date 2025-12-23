import { config as loadEnv } from 'dotenv';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import { hashSync } from 'bcryptjs';
import postgres from 'postgres';

import { companies, memberships, users } from '../db/schema';

loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env' });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required.');
}

const superadminUsername = process.env.SEED_SUPERADMIN_USERNAME ?? 'superadmin';
const superadminPassword = process.env.SEED_SUPERADMIN_PASSWORD;

const companyName = process.env.SEED_COMPANY_NAME ?? 'Demo Company';
const companySlug = process.env.SEED_COMPANY_SLUG ?? 'demo';

const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
const adminPassword = process.env.SEED_ADMIN_PASSWORD;

if (!superadminPassword) {
  throw new Error('SEED_SUPERADMIN_PASSWORD is required for seeding.');
}

if (!adminPassword) {
  throw new Error('SEED_ADMIN_PASSWORD is required for seeding.');
}

const sql = postgres(databaseUrl, { max: 1 });
const db = drizzle(sql);

/**
 * Seed data for local development.
 *
 * Creates (if missing):
 * - `SUPERADMIN` user (global)
 * - 1 demo company
 * - 1 company admin user + membership
 */
async function main() {
  await db.transaction(async (tx) => {
    const [existingCompany] = await tx
      .select({ id: companies.id })
      .from(companies)
      .where(eq(companies.slug, companySlug))
      .limit(1);

    const company_id =
      existingCompany?.id ??
      (
        await tx
          .insert(companies)
          .values({ name: companyName, slug: companySlug })
          .returning({ id: companies.id })
      )[0]!.id;

    const [existingSuperadmin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, superadminUsername))
      .limit(1);

    if (!existingSuperadmin) {
      await tx.insert(users).values({
        username: superadminUsername,
        password_hash: hashSync(superadminPassword!, 10),
        system_role: 'SUPERADMIN',
      });
      console.log(`Seeded SUPERADMIN: ${superadminUsername}`);
    } else {
      console.log(`SUPERADMIN exists: ${superadminUsername}`);
    }

    const [existingAdmin] = await tx
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, adminUsername))
      .limit(1);

    const admin_id =
      existingAdmin?.id ??
      (
        await tx
          .insert(users)
          .values({
            username: adminUsername,
            password_hash: hashSync(adminPassword!, 10),
            system_role: 'ADMIN',
          })
          .returning({ id: users.id })
      )[0]!.id;

    const [existingMembership] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(eq(memberships.user_id, admin_id))
      .limit(1);

    if (!existingMembership) {
      await tx.insert(memberships).values({
        user_id: admin_id,
        company_id,
        role: 'ADMIN',
        status: 'ACTIVE',
      });
      console.log(`Seeded membership for admin: ${adminUsername}`);
    } else {
      console.log(`Membership exists for admin: ${adminUsername}`);
    }
  });
}

main()
  .then(async () => {
    await sql.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(error);
    await sql.end();
    process.exit(1);
  });
