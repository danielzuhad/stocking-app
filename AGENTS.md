# Agent Guide (Technical)

Dokumen ini adalah pedoman teknikal untuk pengembangan **Stocking App** (multi-tenant inventory + sales/invoice). Tujuannya: konsisten dengan proses bisnis, aman, performa baik, dan mudah diaudit.

## Prinsip Utama

1. **Multi-tenant by default**  
   Semua data operasional harus punya `companyId` dan setiap query/mutasi wajib ter-scope ke company yang sedang aktif.
2. **Audit-first**  
   Aksi penting harus menghasilkan jejak audit (activity log) yang dapat ditelusuri.
3. **Stock as ledger (event log)**  
   Perubahan stok direpresentasikan sebagai event `IN/OUT/ADJUST`, bukan sekadar mengubah angka stok di row produk.
4. **Server-first (Next.js App Router)**  
   Akses DB, secrets, dan integrasi pihak ketiga dilakukan di server (RSC, server actions, route handlers). Client component hanya untuk UI interaktif.
5. **Secure by default**  
   Validasi input, least privilege, tidak membocorkan data lintas company, dan tidak mengekspos secret ke client.

## Authentication (NextAuth.js / Auth.js)

- Gunakan **NextAuth.js (Auth.js) versi terbaru** untuk auth + session management (App Router).
- Metode login utama: **Credentials Provider** (identifier = `username` + password).
  - Password disimpan sebagai **hash** (disarankan: Argon2id atau bcrypt).
  - Validasi password dilakukan di server (constant-time compare) dan selalu audit kegagalan login bila memungkinkan.
  - Identitas user:
    - `username` **unik global**.
    - `email` **opsional/nullable** (bukan requirement pada MVP, dan tidak dipakai untuk login).
  - User lifecycle (MVP):
    - staff dibuat oleh **admin** (set password awal)
    - tidak ada “forgot password”; reset password dilakukan oleh **admin/superadmin** dan wajib tercatat di `activity_logs`
    - opsional: paksa ganti password pada login pertama
- Session strategy:
  - MVP boleh `jwt`, namun untuk production multi-tenant disarankan **database sessions** (lebih mudah revoke/force logout).
  - Session object harus membawa minimal `userId`, dan bisa diperluas untuk `activeCompanyId` + `permissions`.
- Struktur implementasi (disarankan):
  - config terpusat di `auth.ts`
  - route handler NextAuth di `app/api/auth/[...nextauth]/route.ts`
- Env (lihat `.env.example`):
  - `AUTH_URL` (public base URL)
  - `AUTH_SECRET` (random secret)
  - `AUTH_TRUST_HOST=true` bila di belakang reverse proxy (nginx)
- Security:
  - rate limit + incremental delay pada login gagal
  - cookie `httpOnly` + `secure` (prod) + `sameSite` sesuai kebutuhan
  - jangan pernah menyimpan secret/token sensitif di client storage

## Tenancy & Active Company

- Untuk MVP: **1 user = 1 company** untuk `ADMIN/STAFF` (tidak ada multi-company).  
  `activeCompanyId` bisa dianggap selalu = company milik user (tidak perlu picker/switcher).
- `SUPERADMIN` memakai **impersonation**: memilih company target dari panel superadmin untuk mengisi `activeCompanyId` (inilah “company switcher”).
- URL tidak wajib membawa `companySlug` pada MVP; switcher/picker cukup.
- Jangan menerima `companyId` dari client sebagai sumber kebenaran. Jika ada `companyId` dari request, perlakukan hanya sebagai “requested”, tetap validasi dengan session (company milik user / company hasil impersonation).
- Superadmin dapat melakukan **impersonation** company untuk kebutuhan support/monitoring (selalu tercatat di audit log).

## Role & Authorization

- Role minimum: `SUPERADMIN`, `ADMIN`, `STAFF`.
- Default rule:
  - `SUPERADMIN`: bisa memilih company mana pun (impersonation), melihat metrik global, dan **mengakses semua modul/fitur tanpa halangan** (bypass permission/limit bila diperlukan; semua override wajib tercatat di audit log).
  - `ADMIN`: full akses pada company-nya.
  - `STAFF`: akses modul operasional sesuai kebijakan via role/permission.
- Implementasi disarankan:
  - Satu fungsi guard terpusat untuk memastikan `companyId` + role terverifikasi di setiap action/route.
  - Semua endpoint/mutation harus menolak jika `companyId` tidak sesuai session.
  - Company provisioning: hanya **superadmin** yang membuat company, mengatur plan/limit, dan membuat akun `ADMIN` untuk company.
  - Superadmin harus selalu lolos guard/permission check (mis. `requirePermission` harus auto-allow untuk superadmin), namun tetap enforce tenant scope via impersonation.
  - Enforcement limit (mis. `maxAdmins`, `maxStaff`) harus dilakukan di server action/route handler (bukan hanya di UI) untuk admin; superadmin boleh override saat dibutuhkan (support/ops) dan wajib ada audit log.
  - Gunakan RBAC per company:
    - `ADMIN` selalu punya full access untuk company.
    - `STAFF` menggunakan **company roles** yang dapat dikustom oleh admin (superadmin bisa menyediakan template role dan/atau membatasi fitur sesuai plan).
  - Permission disarankan berupa string code, mis: `products.read`, `products.write`, `inventory.adjust`, `opname.finalize`, `sales.post`, `returns.post`, `returns.approve`, `reports.export`, `users.manage`, `settings.manage`.

### Default Staff Roles (saran)

- `Inventory`: produk/variant + penerimaan barang + stock adjustment + stock opname (tanpa akses user management).
- `Sales`: buat & post invoice/penjualan + proses retur sederhana (tanpa bisa adjustment).
- `Reports`: akses dashboard/report + export CSV/PDF (read-only).
- `Viewer`: read-only untuk master data & stok.

## Data Model (arah desain)

- Entity inti: `companies`, `users`, `memberships` (user↔company), `company_roles`, `products`, `product_variants`, `product_images`.
- User management:
  - `memberships` menyimpan role + status (aktif/nonaktif) per company; hindari hard delete agar audit aman.
  - Enforcement: untuk MVP, batasi 1 membership aktif per user (kecuali superadmin) agar sesuai rule **1 user = 1 company**.
  - Tambahkan `company_limits` / `company_plans` (mis. `maxAdmins`, `maxStaff`) yang dapat diubah oleh superadmin.
  - Validasi limit admin/staff harus transactional untuk mencegah race condition (cek jumlah user aktif per role + insert membership dalam 1 transaksi).
- Product & variant:
  - `products` menyimpan atribut umum (nama, kategori, satuan, status).
  - `product_variants` menyimpan kombinasi option (warna/ukuran/dll), `sku`, `barcode`, serta **harga jual** (dan diskon opsional) sebagai default saat transaksi.
  - Pricing (MVP):
    - Source of truth harga untuk transaksi ada di **variant** (cocok untuk fashion: ukuran/warna bisa beda harga).
    - Untuk kategori yang tidak butuh beda harga per varian, gunakan **default variant** saja atau set semua varian dengan harga yang sama.
    - Opsional: simpan “harga default” di `products` untuk prefill/inheritance saat membuat variant (variant boleh override).
    - `sales_invoice_items` wajib menyimpan **snapshot harga** (`unitPrice`/diskon) pada saat `POSTED` agar histori/audit tidak berubah ketika harga variant diupdate.
  - UX rule: CRUD product **tidak** menerima input stok; stok dibaca dari ledger dan perubahan stok harus lewat dokumen/aksi yang membuat `stock_movements`.
  - Produk tanpa varian tetap dibuat sebagai 1 **default variant** agar semua pergerakan stok konsisten di level variant.
- Expiry (opsional, disarankan per lot/batch):
  - Tambahkan `inventory_lots` (lot number, `expiresAt` nullable) dan relasikan ke `product_variant`.
  - `stock_movements` boleh punya `lotId` nullable; bila company tidak memakai expiry tracking, lotId selalu null.
- Inventory:
  - `stock_movements` (append-only): `type` (`IN|OUT|ADJUST`), `qty`, `productVariantId`, `companyId`, `reference` (invoice/return/opname/receiving), `createdBy`, `createdAt`, `effectiveAt` (opsional untuk backdate).
  - (Opsional) `stock_balances` / materialized view untuk membaca stok cepat; sumber kebenaran tetap ledger.
- Stock opname:
  - `stock_opnames` (header) + `stock_opname_items` (detail) yang mencatat `systemQty`, `countedQty`, `diffQty` (tanpa lokasi pada MVP).
- Penerimaan barang:
  - `suppliers` (opsional) + `receivings` (header) + `receiving_items` (detail) yang menghasilkan `stock_movements` IN saat `POSTED`.
- Penjualan / invoice:
  - `sales_invoices` (header) + `sales_invoice_items` (detail) yang menghasilkan `stock_movements` OUT saat `POSTED`.
  - Nomor invoice unik per company dan dibangkitkan saat `POSTED` (menghindari konflik dan memudahkan audit).
  - Format nomor invoice (saran): `INV-2025-000001` (unik per company, reset tahunan). Simpan juga `invoiceYear` + `invoiceSeq` untuk keperluan query/sort.
- Retur / refund:
  - `returns` (header) + `return_items` (detail) mereferensikan invoice; opsi restock vs write-off; refund amount opsional.
- Activity log:
  - `activity_logs` (append-only) untuk aksi penting (auth, CRUD master, transaksi, opname, adjustment, dll).

## Business Rules (MVP Defaults)

- Stock tidak dibagi per lokasi (company-wide).
- Tidak boleh minus stok (default). Jika diaktifkan, wajib ada audit log + permission khusus.
- Backdate dibatasi (mis. hanya admin, dan wajib alasan + `effectiveAt`).
- Stock opname:
  - sederhana & aman: saat opname `IN_PROGRESS`, blok mutasi stok (`POSTED`) sampai opname selesai (configurable jika nanti dibutuhkan).
  - finalisasi opname menghasilkan adjustment berbasis selisih dan tercatat sebagai event yang jelas.
- Penjualan/invoice:
  - lifecycle: `DRAFT` → `POSTED` atau `VOID`
  - perubahan dokumen yang sudah `POSTED` sebaiknya lewat dokumen pembalik (return/void) bukan edit langsung
- Retur/refund:
  - simple: partial return, restock atau write-off
  - approval dapat diaktifkan per company (via setting/permission). Jika aktif, posting retur butuh permission `returns.approve` (superadmin selalu boleh); jika tidak aktif, retur bisa langsung `POSTED` oleh permission `returns.post` (superadmin selalu boleh).
  - refund amount opsional, tanpa exchange kompleks untuk MVP
  - default: return type **restock** akan otomatis membuat movement `IN` (auto-restock) saat `POSTED`
  - catat alasan retur (rusak/salah item/expired/dll) untuk audit
  - void invoice tidak “mengembalikan stok otomatis”; gunakan dokumen return agar jejak audit jelas
  - otorisasi retur harus tenant-scoped dan tercatat di `activity_logs`
  - aturan approval/override sebaiknya configurable (company setting), bukan hard-coded
  - jika diperlukan, batasi siapa yang boleh melakukan write-off (permission terpisah)
  - jangan hard delete retur/ledger; gunakan status `VOID/CANCELLED` bila batal

- Expiry (opsional):
  - default: picking lot saat jual memakai **FEFO** dan memblok penjualan lot yang sudah expired
  - override (mis. jual expired / pilih lot manual) harus lewat permission khusus + audit log (superadmin selalu boleh)
  - reminder H-xx dibuat configurable per company

## Reporting & Export (CSV/PDF)

- Semua report/export wajib ter-scope oleh `activeCompanyId` dan dicek permission (mis. `reports.read`, `reports.export`).
- CSV:
  - gunakan pagination/filter server-side dan (bila datanya besar) streaming agar tidak memakan RAM besar.
- PDF:
  - generate di server; hindari solusi yang butuh headless browser berat jika tidak diperlukan.
  - pertimbangkan job async/queue jika report berpotensi besar atau butuh waktu lama.
- Angka laporan harus bersumber dari ledger (`stock_movements`) dan dokumen sumber (invoice/return/receiving) agar dapat diaudit.

## Soft Delete & Data Integrity

- Gunakan soft delete (`deletedAt`, `deletedBy`) untuk **master data** (product, variant, supplier, user membership) agar histori tetap aman.
- Untuk **transaksi/ledger** (invoice, return, stock movements, opname):
  - utamakan status `VOID/CANCELLED` atau dokumen pembalik (return) daripada “menghapus”.
  - jika soft delete tetap diperlukan, batasi hanya untuk superadmin dan tetap simpan jejak audit yang kuat (siapa/kenapa/kapan).

## Drizzle + PostgreSQL (Self-hosted)

- Simpan schema di folder yang jelas (mis. `db/schema/*`) dan gunakan migrations (drizzle-kit) untuk perubahan schema.
- Naming DB: gunakan **snake_case** untuk nama table/column/enum/index **dan** key properti di definisi schema Drizzle (contoh: `company_id`, `created_at`, `password_hash`).
- Untuk production, database berjalan di **VPS yang sama** dengan app (single VPS setup). Konsekuensinya: backup, security, dan monitoring menjadi tanggung jawab kita.
- Semua operasi yang memengaruhi stok/transaksi harus **transactional** (gunakan transaksi Postgres).
- Index yang wajib dipertimbangkan:
  - `(company_id, created_at)` untuk tabel event/log/transaksi
  - `(company_id, product_variant_id)` untuk movement dan detail transaksi
  - SKU unik per company bila SKU digunakan sebagai identifier
- Hindari N+1: rancang query join/aggregation dengan benar, gunakan pagination pada list besar.
- Security (wajib):
  - Jangan expose port Postgres ke publik; bind ke `localhost`/private network dan batasi via firewall.
  - Gunakan user DB dengan privilege minimum (pisahkan user migrasi vs user runtime bila perlu).
- Backup (wajib):
  - Jadwalkan backup DB rutin (mis. `pg_dump`) ke lokasi **eksternal** (object storage/drive terpisah), plus retensi (mis. 7/30 hari).
  - Pastikan pernah uji proses restore (backup tanpa restore = tidak valid).
- Connection management:
  - Batasi `max_connections` sesuai kapasitas VPS; pertimbangkan PgBouncer jika trafik/conn meningkat.
- Panduan deployment baseline (app + DB satu VPS): `DEPLOYMENT.md`.

## Next.js App Router Guidelines

- Pisahkan jelas:
  - **Server**: data fetching, DB access, ImageKit signing/upload, authorization, business logic.
  - **Client**: state UI, form interaksi, table sorting/filtering lokal.
- Mutasi data: gunakan **server actions** untuk internal app; gunakan **route handlers** (`app/api/*`) bila butuh API eksternal.
- Request guard: gunakan `proxy.ts` (Next.js terbaru; pengganti `middleware.ts`) untuk auth redirect/edge guard.
- Struktur route: gunakan **route group** (mis. `app/(public)/*` dan `app/(dashboard)/*`) untuk memisahkan area publik vs authenticated tanpa mengubah URL.
- Struktur folder saat menambah fitur (wajib konsisten):
  - Public pages → `app/(public)/...`
  - Authenticated pages → `app/(dashboard)/...`
  - Route handler/API → `app/api/...`
  - Code yang spesifik 1 route (UI/action/helper) → colocate di folder route tersebut; shared UI → `components/*`; shared server/domain/util → `lib/*` (server-only bila perlu); schema DB → `db/schema/*`; scripts/tooling → `scripts/*`; type augmentation → `types/*`.
- Route segment boundary (opsional, gunakan bila perlu):
  - Jangan buat `loading.tsx` / `error.tsx` / `not-found.tsx` untuk **setiap page** (overkill). Default: taruh di level **route group/fitur** jika UX/handling memang berbeda.
  - Rekomendasi baseline:
    - `app/not-found.tsx` untuk 404 global (dan/atau `app/(dashboard)/not-found.tsx` bila ingin 404 khusus dashboard).
    - `app/(dashboard)/loading.tsx` untuk skeleton area dashboard saat segment fetch/stream.
    - `app/(dashboard)/error.tsx` untuk error boundary dashboard (UI “Coba lagi” via `reset()`).
  - Catatan:
    - `error.tsx` wajib Client Component (`'use client'`).
    - `loading.tsx` dan `not-found.tsx` default Server Component.
    - Untuk error di root layout (rare), pertimbangkan `app/global-error.tsx` (harus render `<html>` + `<body>`).
- Setelah mutasi, revalidate cache yang relevan (`revalidatePath` / `revalidateTag`) agar dashboard/list tetap konsisten.

## Readability, DRY, dan Maintainability

- Utamakan kode yang mudah dibaca: nama variabel/fungsi jelas, struktur file konsisten, dan flow sederhana (early return, hindari nested kondisi berlapis).
- Pisahkan concern:
  - UI murni (rendering) di component.
  - Validasi, authorization, dan business rule di layer server/domain.
  - Query DB di modul terpusat (hindari query “nyebar” di banyak file tanpa pola).
- DRY dengan bijak (hindari over-abstraction):
  - Terapkan “rule of three”: baru ekstrak helper/shared code setelah pola duplikasi muncul berulang.
  - Buat util terpusat untuk hal-hal wajib seperti auth guard + tenant scope + audit log:
    - `requireAuthSession()` / `requireCompanyScope()` di `lib/auth/guards.ts`
    - `logActivity()` di `lib/audit.ts` (append-only ke `activity_logs`)
  - Untuk helper kecil yang sifatnya generic dan kepakai lintas fitur (mis. formatter date/time), taruh di `lib/utils.ts` dan reuse (hindari copy-paste antar page).
- Konsistensi tipe:
  - Definisikan tipe domain/DTO yang jelas; jangan bocorkan bentuk row DB mentah ke UI tanpa mapping yang disengaja.
  - Hindari `any`; prefer tipe eksplisit untuk boundary (server action input/output).
  - Untuk tipe yang bersumber dari DB, **derive dari Drizzle schema** (`$inferSelect` / `$inferInsert`) lalu compose via `Pick/Omit` (hindari menulis ulang `string | null | ...` manual).
  - Standarisasi naming tipe (wajib konsisten):
    - Untuk exported domain types/interfaces yang dishare lintas fitur (terutama di `types/*`), gunakan suffix **`Type`**: contoh `CompanyType`, `CompanyInsertType`, `SystemLogRowType`.
    - Jangan gunakan prefix `I` / `T` untuk concrete domain type (hindari `ICompany`, `TCompany`).
    - Prefix `T` hanya untuk generic parameter: contoh `TData`, `TInput`, `TContext`.
    - Saat import, gunakan `import type { ... }` untuk menjaga intent type-only dan membantu optimasi build.
  - Simpan tipe bersama di `lib/<domain>/types.ts` sebagai *type-only module* (gunakan `typeof import('@/db/schema').table.$inferSelect`) agar aman direuse lintas fitur dan otomatis ikut berubah saat schema berubah.
    - Jika perlu serialisasi untuk client (mis. `Date → string`), buat fungsi `serialize*()` di server (action/query) dan jadikan outputnya sebagai tipe DTO.

## Documentation & Comments

- Update dokumentasi saat menambah/mengubah fitur:
  - perubahan proses bisnis: update `README.md`
  - perubahan pedoman teknikal/arsitektur: update `AGENTS.md`
- Tulis komentar untuk menjelaskan **alasan/aturan bisnis** (why), bukan mengulang apa yang sudah jelas dari kode (what).
- Wajib dokumentasi singkat untuk:
  - **setiap exported function** (JSDoc 1–5 baris)
  - **setiap exported const/variable penting** (config, guard, permission code, business rule, magic number) via JSDoc/komentar inline
  - hal yang menyangkut security/tenant scope/audit harus jelas di doc
- Untuk function/konstanta penting (domain/service/guard/config), gunakan JSDoc singkat yang menjelaskan:
  - tujuan, input/output, dan error yang mungkin terjadi
  - permission yang dibutuhkan (jika terkait auth)
  - tenant scope (`activeCompanyId`) dan invariants (mis. “no minus stock”)
  - side effects (menulis tabel apa, membuat `stock_movements`, menulis `activity_logs`)
- Untuk perubahan berisiko (posting invoice, finalize opname, retur/refund), pastikan ada catatan jelas di code + audit log event yang konsisten.

## React (App Router) Best Practices

- Default ke **Server Components**; jadikan Client Components hanya untuk bagian yang benar-benar interaktif.
- Minimalkan state:
  - Prefer derived state daripada menyimpan “duplikasi” di `useState`.
  - Hindari `useEffect` untuk data fetching utama; lakukan fetching di server (RSC) atau server action.
- Struktur komponen:
  - Buat komponen kecil dan fokus (1 komponen = 1 tanggung jawab).
  - Props jelas dan sempit; hindari prop drilling ekstrem (gunakan composition atau context bila tepat).
- Optimisasi rendering:
  - Gunakan `useMemo`/`useCallback` hanya saat ada kebutuhan nyata (ukur dahulu).
  - Virtualisasi untuk list sangat besar (jika diperlukan).
- UX untuk mutasi data (React 19) (Jika dibutuhkan):
  - Gunakan `useTransition` untuk membungkus server action/mutasi agar UI tetap responsif dan mudah menampilkan state `pending`.
  - Gunakan `useOptimistic` untuk optimistic UI (mis. update table/list sebelum respons server) dengan rollback saat error dan tetap revalidate setelah sukses.
- UI components (shadcn/ui):
  - Gunakan **shadcn/ui** sebagai baseline komponen untuk konsistensi UI (letakkan di `components/ui`).
  - Setup: `bunx shadcn@latest init` lalu pilih lokasi komponen (mis. `components/ui`) dan base styling.
  - Tambah komponen via CLI (contoh): `bunx shadcn@latest add button dialog form`.
  - Ikuti arahan shadcn untuk Tailwind versi yang dipakai (repo ini memakai Tailwind CSS v4 dengan `app/globals.css` sebagai token/theme).
  - Jangan edit massal komponen vendor tanpa alasan; buat wrapper komponen internal jika butuh variasi/behavior tambahan.
- Images (Next.js `next/image`):
  - Untuk render gambar di UI, gunakan `ImageWithSkeleton` dari `components/ui/image-with-skeleton.tsx` (skeleton + fade-in konsisten).
  - Untuk Server Components, tetap prefer `next/image` langsung agar tidak memaksa client bundle; pakai `ImageWithSkeleton` hanya saat butuh loader/transition.
  - Wajib isi `alt`; untuk dekoratif gunakan `alt=""`.
  - Jika pakai `fill`, pastikan wrapper punya ukuran via `containerClassName` (mis. `aspect-square`) dan set `sizes` agar optimasi responsif benar.
  - Di Next.js terbaru, prefer `preload` (bukan `priority`, deprecated).
  - Hindari `onLoadingComplete` (deprecated); gunakan `onLoad`.
- Empty states:
  - Untuk state kosong / error state yang sifatnya “page-level”, gunakan `EmptyState` dari `components/ui/empty-state.tsx` agar markup konsisten dan tidak repetitif.
  - Hindari compose manual `Empty` + `EmptyHeader` + `EmptyTitle` di page kecuali butuh layout yang sangat custom.
- Tables (DataTable):
  - Untuk table interaktif (sort/search/column visibility/pagination), gunakan `DataTable` dari `components/ui/data-table.tsx` (TanStack + shadcn).
  - Jangan bikin `<table>` HTML manual di page—reuse `DataTable` / `components/ui/table.tsx`.
  - `DataTable` bersifat **UI-only**: data harus sudah disiapkan di `page.tsx`/server dan diteruskan via prop `data`.
  - Untuk label kolom di menu “Kolom”, set `meta: { label: '...' }` di `ColumnDef`.
  - Tipe row (`TData`) untuk DataTable sebaiknya didefinisikan di modul types terpusat (mis. `lib/<domain>/types.ts`) dan **diturunkan dari Drizzle schema**.
  - Optimasi: batasi ukuran dataset yang dikirim ke client. Jika data besar, lakukan paging/filter di server sebelum render.
  - URL state (plain params):
    - Jika ingin state table (pagination/search) tersimpan di URL, set `enableUrlState` + `urlStateKey` pada `DataTable`.
    - `DataTable` akan menulis parameter plain dengan prefix `urlStateKey`: `*_page`, `*_pageSize`, `*_q`.
    - `page.tsx` harus membaca `searchParams` dan melakukan fetch sesuai nilai URL (tenant-scoped).
    - Sorting tetap client-side dan tidak ditulis ke URL.
- State management (Zustand):
  - Gunakan **Zustand** untuk UI state lintas komponen (modal, filter, selection, multi-step flow), bukan untuk server state.
  - Store hanya dipakai di Client Components; jangan import store ke module server/RSC.
  - Hindari menyimpan data sensitif di store; gunakan selector untuk mengurangi re-render.
  - Install: `bun add zustand`
  - Persist hanya untuk preferensi non-sensitif (theme, table density), bukan untuk token/session.

## Next.js Optimization & Patterns

- Kurangi client bundle:
  - Jangan import library berat ke Client Component bila bisa dipindah ke server.
  - Gunakan dynamic import untuk komponen client yang berat bila memang dibutuhkan.
- Caching & revalidation:
  - Pakai cache bawaan Next untuk read path yang cocok, dan revalidate via tag/path setelah mutasi.
  - Pastikan data sensitif/multi-tenant tidak “tercache silang” antar company (cache key/tag harus mengandung `companyId` atau dipisahkan).
- Data access:
  - Semua akses DB dan secret harus di server; jangan pernah expose credential ke browser.

## ImageKit

- Private key hanya di server.
- Upload/signing dilakukan via server action/route handler.
- Di DB simpan minimal: `fileId`, `url`, `thumbnailUrl`, `width/height` bila dibutuhkan.

## Validasi, Error Handling, dan Observability

- Semua input dari user harus divalidasi di server (disarankan: **Zod**).
- Zod (validation schema):
  - Simpan schema di tempat yang konsisten (mis. `lib/validation/*`) dan gunakan ulang di client (form) + server (actions/route handlers).
  - Gunakan `safeParse` untuk mengembalikan error yang bisa di-map ke UI, tapi tetap fail-closed di server.
  - Install: `bun add zod`
- Forms (React Hook Form):
  - Gunakan **React Hook Form** untuk form UI.
  - Integrasikan schema via `@hookform/resolvers/zod` agar typesafe (type dari `z.infer<typeof schema>`).
  - Validasi di client hanya untuk UX; server tetap wajib validasi ulang sebelum mutasi DB.
  - Install: `bun add react-hook-form @hookform/resolvers`
- Typed env (typesafe akses env):
  - Wajib akses env via modul tunggal `env.ts` (gunakan `import { env } from '@/env'`); hindari akses `process.env.*` langsung di file lain (kecuali tooling/config CLI seperti `drizzle.config.ts`).
  - Jangan import env server (secret) ke Client Component; untuk env client gunakan `NEXT_PUBLIC_*` dan definisikan di bagian `client` pada `createEnv`.
  - Disarankan pakai `@t3-oss/env-nextjs` + `zod` agar beda env server/client jelas (ingat `NEXT_PUBLIC_*` untuk client).
  - Install: `bun add @t3-oss/env-nextjs`
  - Pattern (contoh ringkas):

    ```ts
    import { createEnv } from '@t3-oss/env-nextjs';
    import { z } from 'zod';

    export const env = createEnv({
      server: {
        DATABASE_URL: z.string().min(1),
        AUTH_SECRET: z.string().min(1),
      },
      client: {},
      runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL,
        AUTH_SECRET: process.env.AUTH_SECRET,
      },
      emptyStringAsUndefined: true,
    });
    ```

- Server actions (standarisasi response):
  - Jangan `throw` untuk error yang diharapkan; kembalikan response yang konsisten dan typesafe.
  - Gunakan `ActionResult<T>` dari `lib/actions/result.ts` (pattern: `{ ok: true, data }` atau `{ ok: false, error: { code, message, field_errors? } }`).
- Route handlers / Fetch API (standarisasi response):
  - Untuk endpoint internal (`app/api/*`), **return JSON berbentuk `ActionResult`** agar client tidak perlu parsing custom.
  - Gunakan helper `lib/http/response.ts` (`jsonOk/jsonErr`) untuk konsistensi status code + payload.
  - Di client, konsumsi endpoint internal via `fetchActionResult()` (`lib/http/fetch.ts`), bukan `fetch()` manual.
  - **Jangan pernah** mengirim error mentah (SQL, stack trace, params) ke client; untuk 5xx kembalikan pesan aman + log detailnya di server.
- NextAuth `signIn()` (Credentials):
  - Jangan tampilkan `result.error` mentah ke user (bisa berisi detail internal).
  - Map `result.error` ke pesan aman via `getLoginErrorMessage()` (`lib/auth/errors.ts`).
  - Di `CredentialsProvider.authorize()`, tangkap error infra (mis. DB mati) dan `throw new Error(AUTH_ERROR.SERVICE_UNAVAILABLE)` agar client bisa menampilkan pesan yang benar tanpa leak.
- Error message untuk user harus aman (tidak membocorkan detail DB/stack).
- Standardisasi error UI:
  - **Expected error** (validasi/permission/not-found) → render state UI biasa (pakai `ActionResult`), jangan lempar error.
  - **Unexpected error** (infra/bug/DB down) → biarkan kena `error.tsx`; tampilkan pesan aman + “Kode” (`digest`) untuk user, dan tampilkan detail troubleshooting hanya untuk developer/superadmin (harus disanitize).
  - Untuk kasus error server/data (mis. DB down), tombol “Coba lagi” di `error.tsx` sebaiknya menjalankan `reset()` **dan** `router.refresh()` agar server component refetch tanpa hard refresh.
- Log event penting untuk audit (bukan sekadar `console.log`).

## Performance & UX

- List besar: pagination + search server-side.
- Dashboard: gunakan agregasi SQL dan cache dengan tag untuk mengurangi beban.
- Optimasi gambar: gunakan ImageKit transform URL + Next Image bila sesuai.

## Date & Time (moment)

- Simpan waktu di DB sebagai `timestamptz` (UTC) dan konversi untuk display sesuai kebutuhan bisnis (mis. `Asia/Jakarta`).
- Gunakan **moment** untuk formatting/parsing jika dibutuhkan, tapi perhatikan ukuran bundle:
  - Prefer formatting di server (RSC/export) agar tidak membebani client bundle.
  - Jika dipakai di client, pertimbangkan import terbatas/dynamic import pada halaman yang benar-benar perlu.
- Standarisasi helper format (mis. `formatDate`, `formatDateTime`) agar konsisten di UI/report/export.
  - Default formatter saat ini: `formatDateTime()` di `lib/utils.ts` (locale `id-ID`, timezone `Asia/Jakarta`).
- Install: `bun add moment` (opsional: `moment-timezone` jika butuh timezone rules)

## Testing (Jest)

- Runner: Jest + React Testing Library.
- Konvensi:
  - simpan test di `__tests__/` atau gunakan nama file `*.test.ts(x)`
  - fokus ke perilaku (render, interaksi, edge case), bukan implementasi internal
- Prioritas test:
  - pure function (pricing/diskon, perhitungan diff opname, validasi rule) → unit test
  - komponen UI penting (form submit, table state, error state) → component test (jsdom)
  - logic yang menyentuh DB sebaiknya dipisah ke layer domain agar bisa di-test tanpa render UI
- Jalankan:
  - `bun run test` (sekali)
  - `bun run test:watch` (dev)
  - `bun run test:ci` / `bun run test:coverage` (CI/coverage)

## Code Quality

- TypeScript: hindari `any`, gunakan tipe domain yang jelas.
- Format: Prettier; Lint: ESLint. Usahakan lulus sebelum merge.
- Naming: konsisten, deskriptif, hindari singkatan yang membingungkan.
  - Khusus shared domain type/interface: gunakan suffix `Type` (contoh `ProductType`, `ProductInsertType`).
- Git hooks (Husky):
  - Gunakan **Husky** untuk quality gate (mis. pre-commit lint, pre-push test).
  - Hooks harus cepat; jika test suite sudah besar, pindahkan test berat ke pre-push/CI.
  - Untuk docker/CI yang tidak punya `.git`, installer husky harus skip (lihat `scripts/husky-install.mjs`).
  - Jika hooks tidak jalan:
    - pastikan tidak commit dengan `--no-verify` dan env `HUSKY` bukan `0`
    - cek `git config core.hooksPath` harus bernilai `.husky/_` (kalau kosong, jalankan `bun install` atau `bun run prepare`)
  - Install: `bun add -d husky`

## Don’t

- Jangan pernah mengakses data tanpa `companyId` scope (kecuali superadmin yang eksplisit).
- Jangan menyimpan secret/credential di client atau repo.
- Jangan mengubah stok “langsung” tanpa mencatat `stock_movements`.
- Jangan hard delete ledger/transaksi penting; gunakan status `VOID/CANCELLED` atau dokumen pembalik agar audit trail tetap utuh.
