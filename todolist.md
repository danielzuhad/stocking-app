# TODO List (UI/UX & Navigasi)

Dokumen ini menyimpan hasil diskusi awal terkait struktur navigasi dan layout dashboard untuk **Stocking App**.

## Keputusan Sementara

- Layout utama: **Sidebar + Topbar** (lebih scalable untuk banyak modul, lebih rapi untuk dashboard).
- Max width:
  - Default aman untuk dashboard data-heavy: `max-w-screen-2xl` (≈1536px)
  - Halaman tabel lebar (ledger/report): pertimbangkan `max-w-none` + `overflow-x-auto`
  - Halaman detail/form fokus: `max-w-3xl` / `max-w-4xl`
- Tailwind `container`:
  - Jangan dipasang global di `app/layout.tsx` (berisiko bikin halaman tabel jadi sempit).
  - Apply wrapper per halaman/section atau via layout khusus route group.

## Struktur Menu (Admin/Staff – 1 company)

- Dashboard
- Produk
  - Products
  - Variants (bisa jadi tab/submenu)
  - Master tambahan (opsional): kategori/brand/satuan
- Inventory
  - Stock Card / Ledger
  - Receiving (stok masuk)
  - Stock Opname
  - Adjustment
  - Lots/Expiry (muncul jika expiry tracking aktif)
- Sales / Invoice (Stock Out)
  - Buat Invoice
  - Daftar Invoice
- Retur / Refund
- Reports
  - Export CSV/PDF
- Activity Log
- Settings
  - Users & Roles (staff + permission)
  - Company Settings (aturan retur approval, blok expired, allow minus stock, dsb.)
  - Integrations (ImageKit, dsb.)

## Struktur Menu (Superadmin)

- Global Dashboard
- Companies (buat company, set `maxAdmins/maxStaff`, status)
- Impersonate / Masuk sebagai company (pilih company target)
- System Logs/Audit (global)

## Topbar (fungsi yang disarankan)

- Breadcrumb / judul halaman
- Search / Command palette (quick jump: product/invoice)
- Quick actions (Create: product/receiving/invoice)
- User menu + theme toggle
- Jika superadmin sedang impersonation: indikator company aktif + tombol “Keluar”

## Pertanyaan / Keputusan yang Perlu Ditentukan

- [ ] Halaman “Kasir/Invoice” mau mode **full-screen fokus** (tanpa sidebar/topbar, ala POS) atau tetap layout dashboard biasa?
- [ ] Seberapa lebar tabel utama (kira-kira 8–12 kolom vs 15+)? Ini memengaruhi keputusan `max-w-*` dan overflow.
- [ ] Modul mana yang harus “always visible” di sidebar vs disembunyikan di “More/Settings”?

## Next Steps (Implementasi)

- [x] Buat `app/(dashboard)/layout.tsx` (route group) untuk wrapper sidebar+topbar.
- [x] Siapkan komponen `Sidebar` + `Topbar` (breadcrumb & command palette menyusul bila dibutuhkan).
- [ ] Tentukan layout khusus untuk halaman tabel lebar (ledger/report) vs halaman form/detail.
