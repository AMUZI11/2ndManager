# Spec Design: Multi-Role, Multi-Branch, Keyboard-First & Strict Cashier Lockout System

**Tanggal Update:** 27 Juli 2026  
**Status:** Approved with Revisions  
**Target Stack:** Next.js 16 (App Router + Middleware) + Supabase PostgreSQL (RLS & Service Role API)

---

## 1. Ringkasan Sistem & Tujuan

Arsitektur Multi-Role dan Multi-Branch dengan proteksi **Strict Lockout berlapis (Next.js Middleware + Supabase RLS + Server API Protection)** untuk memastikan Role Kasir murni berfungsi sebagai Kiosk POS tanpa celah keamanan. Sistem juga dirancang tangguh terhadap koneksi buruk (Offline Resilience) dan pengoperasian super cepat via navigasi Keyboard-First.

---

## 2. Peran Pengguna (Roles)

1. **SUPERADMIN (Pemilik Platform)**
   - Akses global via Supabase Service Role API (hanya dieksekusi di Server Actions/API Route server-side, tidak pernah di-expose ke client).
   - Mengontrol seluruh toko/tenant di platform, verifikasi bukti pembayaran QRIS, dan memantau statistik platform.
2. **BOSS WARUNG (Pemilik Toko & Cabang)**
   - Akses penuh manajemen cabang, melihat analitik konsolidasi & per-cabang via **Branch Switcher Dropdown** di header.
   - Dilengkapi **Onboarding Wizard (Empty State)** untuk panduan cepat pengguna baru.
   - Menambah cabang baru dan merekrut **Akun Kasir Baru** per cabang.
3. **CASHIER (Kasir Cabang)**
   - Terkunci 100% di 1 cabang fisik (`shop_id`).
   - Tampilan bersih (**Dedicated Kiosk POS Mode**) tanpa sidebar navigasi manajemen.
   - Dioptimalkan dengan navigasi **Keyboard-First** (`F1` = Focus Search/Scanner, `F2` = Proses Bayar, `Esc` = Batal/Reset Keranjang).
   - Langsung ter-redirect ke `/pos` dan dilarang keras membuka halaman manajemen.

---

## 3. Pembaruan Skema Database (Supabase PostgreSQL)

### A. Tabel `shops` (Toko Utama & Cabang)
- `id` (UUID, PK)
- `name` (TEXT) - Nama cabang (misal: "HL Warung - Margonda")
- `owner_id` (UUID, FK `auth.users`) - ID Bos Pemilik
- `parent_shop_id` (UUID, Nullable, FK `shops.id`) - Parent shop ID jika cabang tambahan.
- `created_at` (TIMESTAMPTZ)

### B. Tabel `profiles` (Profil User & Role)
- `id` (UUID, PK, FK `auth.users`)
- `username` (TEXT)
- `role` (TEXT: `'SUPERADMIN' | 'BOSS' | 'CASHIER'`)
- `shop_id` (UUID, FK `shops.id`) - ID cabang tempat kasir bertugas / cabang aktif Bos.

### C. Tabel `user_shops` (Junction Multi-Tenant)
- `user_id` (UUID, FK `auth.users`)
- `shop_id` (UUID, FK `shops.id`)

### D. Tabel `products` (Katalog Produk & Soft-Delete)
- `id` (UUID, PK)
- `shop_id` (UUID, FK `shops.id`)
- `nama` (TEXT), `barcode` (TEXT), `harga_modal` (BIGINT), `harga_base` (BIGINT)
- `stock` (INT), `reorder_threshold` (INT)
- `is_active` (BOOLEAN, default `TRUE`) - **Dilarang Hapus Fisik (DELETE)** untuk menjaga integritas riwayat nota bon. Gunakan Soft-Delete (`is_active = FALSE` / `is_deleted = TRUE`).

---

## 4. Lapisan Penguncian & Keamanan (Strict Lockout Guard 3 Layer)

### 🚨 [CRITICAL] Layer 1 — Next.js Server-Side Middleware (`src/middleware.js` / `src/proxy.js`)
Pengecekan role dilakukan di level server **sebelum halaman di-render**:
- Middleware memeriksa JWT/Session token Supabase & Profile Role.
- Jika pengguna ber-role `CASHIER` mencoba mengakses URL manajemen (`/dashboard`, `/reporting`, `/products`, `/customers`, `/billing`, `/settings`, `/superadmin`), Middleware secara **instan melakukan HTTP 307/302 Redirect paksa ke `/pos`**.

### 🔒 Layer 2 — Supabase Row Level Security (RLS)
Akses read/write data dikunci ketat di level PostgreSQL:
- Kasir hanya bisa membaca/menulis baris data (`products`, `transactions`, `transaction_items`, `void_logs`) yang `shop_id`-nya identik dengan `profile.shop_id` milik cabang mereka.

### 🛡️ Layer 3 — Proteksi Endpoint & Server-Side Admin API
Pendaftaran akun kasir baru (menggunakan `supabase.auth.admin.createUser`) **wajib** diletakkan di dalam Server Actions / API Route server-side (`/api/v1/cashiers`). `SUPABASE_SERVICE_ROLE_KEY` disimpan aman di `.env.local` server dan **tidak pernah dipanggil dari Client Components**.

---

## 5. UI/UX Tangguh & Keyboard-First POS

### A. Navigasi Keyboard-First di Terminal Kasir (`/pos`)
- **`F1`**: Langsung memindahkan kursor (*focus trap*) ke kolom pencarian / auto-scanner barcode.
- **`F2`**: Membuka dialog / mentrigger checkout bayar transaksi.
- **`Esc`**: Membatalkan modal / mengosongkan keranjang belanja.

### B. Indikator Sinyal Internet & Resilience Koneksi (Graceful Degradation)
- **Indikator Sinyal Online/Offline**: Widget sinyal *real-time* di header `/pos` (Hijau = Online, Merah = Offline).
- **Penanganan Putus Koneksi (Offline Resilience)**:
  - Jika internet putus saat transaksi, keranjang disimpan aman di `localStorage` (`hl_pos_offline_cart`).
  - Sistem menampilkan banner peringatan UI yang jelas: *"Koneksi Terputus - Keranjang Tersimpan Aman"*.
  - Saat koneksi kembali stabil, sistem memberikan tombol 1-klik untuk melakukan sinkronisasi & verifikasi bayar ke server tanpa kehilangan data keranjang.

---

## 6. Rencana Verifikasi (Verification Plan)

1. **Build Verification**: `npm run build` berhasil tanpa error compilasi.
2. **Server Middleware Redirect Verification**: Cek simulasi request dari browser dengan role Kasir ke `/dashboard` -> harus ter-redirect ke `/pos` sebelum page render.
3. **Keyboard Shortcut Test**: Pengujian penekanan tombol `F1`, `F2`, `Esc` di halaman `/pos`.
4. **Offline Resilience Test**: Simulasi pemutusan koneksi internet (Network Offline Mode) -> keranjang belanja tersimpan aman di `localStorage` dan tidak crash.
