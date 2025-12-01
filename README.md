# Stocking App

A Next.js 15 application for managing product catalogs, stock variants, and audit trails for small teams. The project combines a typed Postgres schema (Drizzle ORM + Neon), credential-based authentication (NextAuth + bcrypt), and ImageKit-powered media uploads so admins can capture product details quickly while keeping every stock change logged.

## Features

- Secure login/session flow with middleware-based route protection plus auto-expiring tokens.
- Multi-tenant company scoping: each admin belongs to a company, and super admins can audit every tenant.
- Typed database schema covering users, items, variants, and inventory activities with automatic audit logging.
- Item creation UI with ImageKit uploads, variant management, and client/server validations that mirror database constraints.
- Inventory dashboard that lists current products, variant counts, and aggregate stock with refresh controls.
- Activity timeline summarizing the most recent stock movements (create/update/in/out) for the signed-in user.
- Company member management screen (for admins) and a super-admin-only Master Data area to manage tenants and their admins without exposing a public registration page.

> Super admins are responsible for creating tenants and inviting the first admin. Subsequent admins should be invited through the **Members** page so they automatically inherit the correct company context.

## Tech Stack

- **Framework:** Next.js 15 (App Router) + React 19
- **Styling:** Tailwind CSS v4, shadcn/ui primitives, custom typography
- **Auth:** NextAuth credentials provider + bcrypt hashes
- **Database:** Neon serverless Postgres with Drizzle ORM + drizzle-kit migrations
- **Media:** ImageKit direct uploads via `/api/upload-auth`
- **Forms & Validation:** React Hook Form, Zod, drizzle-zod

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment** – create `.env.local` with:
   ```env
   DATABASE_URL=postgres://...
   NEXTAUTH_SECRET=super-secret-key
   NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/<id>
   IMAGEKIT_PUBLIC_KEY=public_key
   IMAGEKIT_PRIVATE_KEY=private_key
   ```
3. **Run database migrations**
   ```bash
   npm run generate   # optional: re-generate SQL from schema changes
   npm run migrate    # apply migrations locally
   ```
4. **Start the app**
   ```bash
   npm run dev
   ```
   Visit [http://localhost:3000](http://localhost:3000) and log in with your seeded super admin. Once signed in, open **Members** to invite other admins under the same company.

> Tip: create the very first super admin by inserting a user directly into the `users` table (role `super_admin`, `company_id` can be `NULL`) or by extending the existing migration scripts. After that, all member management happens inside the app.

## Scripts

| Command           | Description                                   |
| ----------------- | --------------------------------------------- |
| `npm run dev`     | Start Next.js in development mode (Turbopack) |
| `npm run build`   | Create a production build                      |
| `npm run start`   | Run the production server                      |
| `npm run lint`    | Lint the project with ESLint                   |
| `npm run generate`| Generate drizzle migrations from the schema    |
| `npm run migrate` | Apply the latest migrations                    |
| `npm run push`    | Push schema changes to the remote database     |

## Testing & QA

Automated tests are not wired up yet. When adding new features or API routes, rely on:

- `npm run lint` to catch TypeScript/ESLint issues.
- Drizzle migrations plus `npm run dev` smoke tests to confirm schema + runtime alignment.
- Manual verification of the inventory form, activity feed, and auth flows (login/logout/member invite).

Consider introducing component/integration tests (e.g., Playwright) as the data model stabilizes to prevent regressions in inventory mutations and audit logging.
