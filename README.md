# Stocking App

Aplikasi manajemen stok multi-perusahaan (multi-tenant) untuk berbagai jenis produk (fashion, kosmetik, F&B, dll). Fokus utama: pencatatan pergerakan stok yang rapi, audit trail yang jelas, serta alur kasir/transaksi yang terintegrasi.

## Roles & Akses

- **Superadmin (pemilik platform)**: akses seluruh perusahaan **dan semua fitur tanpa batas permission**; monitoring global; mengelola onboarding perusahaan.
- **Admin (pemilik perusahaan)**: akses penuh untuk perusahaannya sendiri; mengelola produk, stok, transaksi, staff, dan dashboard.
- **Staff (bawahan admin)**: akses terbatas untuk perusahaannya sendiri sesuai kebutuhan operasional.

> Prinsip utama: **admin/staff hanya melihat & mengubah data perusahaannya (company scope)**. Superadmin bisa akses lintas perusahaan dan **selalu boleh mengakses semua modul/fitur**.

## Status Implementasi Saat Ini (MVP Bertahap)

- ✅ Auth credentials + tenant scope (`active_company_id`) + superadmin impersonation.
- ✅ Master products + variants + upload gambar (ImageKit) + audit log.
- ✅ Inventory MVP dasar:
  - stock ledger (`stock_movements`) dengan event `IN/OUT/ADJUST`
  - receiving (`DRAFT -> POSTED/VOID`)
  - stock adjustment (no minus stock)
  - stock opname (`IN_PROGRESS -> FINALIZED/VOID`) + blokir posting mutasi saat opname aktif
- 🚧 Sales/Returns/Reports/Settings masih bertahap.

### Tenancy & Active Company

- Untuk MVP: **1 user = 1 company** untuk `ADMIN` dan `STAFF`. Setelah login, seluruh halaman/list/report otomatis ter-scope ke company tersebut (tanpa company picker/switcher).
- `SUPERADMIN` bisa mengakses semua company lewat mode **impersonation**: pilih company dari panel superadmin untuk masuk ke konteks company tersebut (ini yang dimaksud “company switcher”). Di konteks ini, superadmin tetap **full access** ke semua fitur.
- URL tidak wajib membawa `companySlug` pada MVP (bisa ditambah nanti jika butuh link shareable per company).

## Proses Bisnis (Ringkas)

### 1) Onboarding Perusahaan & User

- Superadmin membuat/mengaktifkan **Company**.
- Superadmin membuat/mengelola akun **Admin** untuk company (sesuai limit).
- Admin membuat/mengelola **Staff** (set `username` + password awal) dan menentukan hak akses (role + permission).

### 1b) Manajemen Pengguna (Admin & Staff)

- **Admin** dapat CRUD user staff untuk company-nya:
  - tambah staff (set `username` + password awal)
  - ubah detail/role/permission (customizable per staff)
  - nonaktifkan/aktifkan kembali (disarankan soft-delete via status, bukan hapus data)
- **Staff** dapat mengelola akunnya sendiri (mis. ubah profil, ganti password) dan mengakses modul operasional sesuai role/permission.
- Identitas user: `username` **unik global**, email tidak wajib (opsional untuk masa depan).
- Tidak ada “forgot password” pada MVP; reset password dilakukan oleh **admin/superadmin** (dan tercatat di activity log).
- Semua aksi user management tercatat di **activity log**.

### 1c) Paket/Limit Company (Superadmin)

- Superadmin dapat mengatur batasan per company (contoh: **maksimal jumlah admin** dan **maksimal jumlah staff**).
- Superadmin membuat/mengelola akun admin untuk company sesuai limit.
- Saat admin menambah staff, sistem menolak jika sudah melewati limit (agar kontrol biaya/fitur jelas sejak awal).

### 2) Master Produk (CRUD Product)

- Admin membuat/mengubah **Product** (nama, kategori, satuan, status, foto).
- Foto produk di-host lewat **ImageKit**; aplikasi menyimpan metadata/URL yang diperlukan.
- Produk bisa punya **Variant** (opsional) untuk kombinasi seperti warna/ukuran, dst:
  - SKU/Barcode disarankan di level **variant** (lebih fleksibel), dengan opsi fallback ke level product untuk produk tanpa varian.
  - **Pricing (MVP)**: harga jual disimpan di level **variant** (karena untuk fashion ukuran/warna bisa beda harga). Untuk produk yang tidak butuh varian/harganya sama, cukup pakai **default variant** atau biarkan semua variant memakai harga yang sama.
  - Opsional: product boleh punya “harga default” untuk memudahkan input (prefill) dan diwariskan ke variant (variant bisa override jika perlu).
- Default rule (MVP): stok dicatat di level **variant**. Produk tanpa varian diperlakukan sebagai 1 **default variant**.
- **UX rule**: form product fokus ke master data; **stok tidak diinput di form product**. Stok ditampilkan read-only dan perubahan stok dilakukan lewat dokumen/aksi `Receiving`, `Adjustment`, `Opname`, `Invoice`, `Return` (ledger).
- **Audit rule**: saat `POSTED`, item invoice menyimpan **snapshot harga** yang dipakai saat transaksi (agar histori tidak berubah ketika harga variant diubah).
- Expiry (opsional): produk tertentu (mis. F&B/kosmetik) bisa mengaktifkan tracking expiry (lihat bagian “Expiry” di bawah).

### 3) Manajemen Stok (Stock Ledger)

- Stok **tidak** dihitung dari “angka yang dimutasi manual”, tetapi dari **riwayat pergerakan (IN/OUT/ADJUST)** agar audit dan rekonsiliasi mudah.
- Sumber pergerakan stok:
  - penerimaan/pembelian barang (IN)
  - penjualan/invoice (OUT)
  - retur (IN/OUT)
  - koreksi/penyesuaian (ADJUST)
- Default rule (MVP): **tidak boleh minus stok** (configurable oleh admin/superadmin bila perlu) dan semua perubahan stok wajib punya alasan/reference.

### 3b) Penerimaan Barang (Purchasing/Receiving)

- Penerimaan barang dipakai untuk mencatat stok masuk dengan reference yang jelas (supplier + nomor invoice/nota, opsional).
- Lifecycle sederhana: `DRAFT` → `RECEIVED/POSTED` (final) atau `VOID`.
- Pada form create receiving, user bisa memilih status awal: simpan sebagai `DRAFT`
  atau langsung `POSTED`.
- UI create receiving menggunakan halaman khusus (bukan quick dialog) agar input
  banyak produk/varian lebih nyaman.
- Saat `RECEIVED/POSTED`, sistem membuat **stock movement IN** per item (dan per lot bila expiry tracking dipakai).
- MVP: penerimaan barang fokus ke qty + reference (tanpa costing). **Unit cost/COGS** bisa ditambahkan nanti untuk laporan margin.
- “Stok awal” (first-time setup) direkomendasikan masuk lewat penerimaan barang atau adjustment dengan reason `INITIAL_STOCK` agar tetap teraudit.

### 4) Stock Opname (tanpa lokasi)

- Staff melakukan hitung fisik **untuk seluruh company** (karena stok tidak dibagi per lokasi pada MVP).
- Sistem membandingkan stok sistem vs fisik dan menghasilkan **selisih**.
- Selisih diselesaikan lewat **adjustment** dan tercatat sebagai event yang dapat diaudit.
- Default rule (MVP): selama opname `IN_PROGRESS`, sistem membatasi transaksi yang mem-posting mutasi stok agar hasil hitung konsisten (configurable).

### 5) Transaksi Penjualan / Invoice (Stock Out)

- Pembuatan transaksi (gaya POS di UI, namun fokus ke inventory & invoice): item product/variant, qty, diskon (opsional), customer (opsional).
- Lifecycle sederhana: `DRAFT` → `POSTED` (final) atau `VOID`.
- Saat `POSTED`, sistem membuat **stock movement OUT** dan menghasilkan nomor invoice/receipt (unik per company) untuk kebutuhan data/laporan.
- Format nomor invoice (saran): `INV-2025-000001` (unik per company, reset tahunan).
- MVP tidak membutuhkan status pembayaran; invoice dipakai sebagai dokumen stock-out + nomor invoice.

### 5b) Retur / Refund

- Retur mereferensikan invoice/penjualan dan bisa **partial**.
- Approval retur bersifat configurable per company (via setting/permission). Jika diaktifkan, hanya role yang punya permission approval (atau **superadmin**) yang boleh mem-posting retur.
- Opsi penyelesaian retur:
  - **Restock** (barang kembali baik) → stock movement `IN`
  - **Write-off** (barang rusak/tidak layak) → tidak menambah stok, tetap tercatat di retur
- Refund nominal (opsional) dicatat untuk kebutuhan laporan.

### 5c) Expiry (opsional)

- Tracking expiry disarankan berbasis **batch/lot** (bukan hanya per variant) agar realistis untuk penerimaan barang bertahap.
- Aturan default (bisa configurable):
  - sistem memberi peringatan untuk item mendekati expiry (H-xx)
  - sistem memblok penjualan item yang sudah expired (kecuali di-override oleh admin/**superadmin** dengan audit log)
- Picking lot saat jual:
  - default: auto-pick **FEFO** (first-expired-first-out)
  - opsional: user bisa pilih lot manual jika diberi permission

### 6) Activity Log / Audit Trail

- Semua aksi penting dicatat: aktor, waktu, aksi, target entity, dan konteks.
- Dipakai untuk audit, keamanan, dan debugging.
- Yang dapat melihat: **superadmin** dan **admin** (staff hanya jika diberi permission khusus).

### 7) Statistik / Dashboard

- **Perusahaan**: ringkasan stok, fast/slow moving, penjualan harian/bulanan, produk terlaris, dll.
- **Superadmin**: metrik global (jumlah company aktif, tren transaksi agregat, kesehatan platform).
- Report dasar mendukung **export CSV/PDF** (untuk inventory ledger, penerimaan barang, penjualan/invoice, retur).
- PDF: format A4, header company (nama + opsional logo), bahasa Indonesia.

## Tech Stack

- **Next.js 16** (App Router), **React 19**, **TypeScript**
- **Tailwind CSS 4**
- **Drizzle ORM** + **PostgreSQL (self-hosted di VPS)**
- Auth: **NextAuth.js (Auth.js)** (credentials username + password)
- **ImageKit.io** (upload, CDN, transformasi gambar)
- Testing: **Jest** + **React Testing Library**
- Tooling: **ESLint 9**, **Prettier 3**

## Infrastruktur (Production - draft)

- **1 VPS**: menjalankan **Next.js app** + **PostgreSQL** (database di server yang sama).
- **ImageKit**: penyimpanan & delivery gambar produk (mengurangi beban disk/bandwidth VPS).
- Catatan ops: wajib ada **backup DB** ke lokasi eksternal, DB tidak diexpose ke publik, dan lakukan monitoring dasar (CPU/RAM/disk).

Pedoman teknikal: `AGENTS.md`.
Panduan deploy: `DEPLOYMENT.md`.

## Development

### Prerequisites

- Node.js 20+
- Package manager: **bun** (recommended) / npm / pnpm / yarn

### Install & Run

```bash
bun install
bun dev
```

Buka `http://localhost:3000`.

### Testing (Jest)

```bash
bun run test
bun run test:watch
bun run test:coverage
```

- Konfigurasi: `jest.config.js` + `jest.setup.ts`
- Konvensi file test: colocated `*.test.ts(x)` di folder fitur/komponen terkait.
- Untuk shared hook/komponen, pakai struktur folderized module (contoh):
  - `hooks/use-data-table-url-pagination/use-data-table-url-pagination.ts`
  - `hooks/use-data-table-url-pagination/use-data-table-url-pagination.test.ts`
  - optional re-export: `hooks/use-data-table-url-pagination/index.ts`

### Environment Variables (draft)

Buat env sesuai cara jalanin app:

- **Local dev (tanpa Docker DB)**: copy `.env.example` → `.env.local` lalu set `DATABASE_URL` ke host `localhost`.
- **Docker Compose**: copy `.env.example` → `.env` (dipakai oleh `docker compose`).

```bash
# lihat `.env.example`
```

## Catatan Implementasi

- Multi-tenant: semua query data operasional wajib ter-scope oleh `companyId`.
- Active company: ambil dari session (untuk `ADMIN/STAFF` = company miliknya; untuk `SUPERADMIN` = hasil impersonation), bukan dari input client.
- Permission: staff memakai role/permission yang bisa dikustom oleh admin (template bisa disediakan superadmin).
- Stok: gunakan pendekatan **ledger/event** (movement) untuk menghindari mismatch dan memudahkan audit.
- Audit log: simpan event penting secara append-only.

## MVP Scope (draft)

- Auth (NextAuth) + manajemen company/user (superadmin/admin/staff) + limit admin/staff per company
- CRUD product + variant + upload gambar
- Stock movement + penerimaan barang + stock opname
- Penjualan/invoice + retur/refund (simple)
- Laporan sederhana + export CSV/PDF
- Dashboard dasar (per company + superadmin)
