# Design Specification: Tahap 7 — Multi-Branch Hierarchy & Two-Phase Stock Transfer Engine

**Document ID**: SPEC-PHASE7-MULTI-BRANCH-TRANSFERS  
**Status**: APPROVED IN BRAINSTORM  
**Date**: 2026-09-09  
**Platforms**: Next.js 16.2.9 (App Router / Turbopack), React 19.2.4, Supabase PostgreSQL, Web Crypto API, IndexedDB, ESC/POS Thermal  

---

## 1. Executive Summary

Tahap 7 merealisasikan arsitektur multi-gerai (Multi-Branch Hierarchy) dan protokol transfer stok dua arah (Two-Phase Handshake) untuk platform 2ndManager (https://2ndmanager.com). Arsitektur ini dirancang khusus untuk memenuhi kebutuhan pemilik warung dan grosir yang memiliki 1 hingga 3 cabang (Tier Eksekutif).

Fokus implementasi utama mencakup:
1. **Hierarki Organisasi & Cabang Terhubung (Dual-Sync with shops.id)**:
   - Satu akun Owner menaungi tabel `organizations`, membawahi hingga 3 entitas di tabel `branches`.
   - Setiap entitas `branches` menautkan `shop_id` unik ke tabel `shops` eksisting, memastikan 100% kompatibilitas mundur dengan 79 rute API, transaksi kasir, dan sesi shift.
   - Script migrasi idempoten otomatis membungkus seluruh toko tunggal yang sudah terdaftar menjadi Cabang Utama (Pusat / `CBG-01`).
2. **Master Katalog Terpusat & Inventaris Terisolasi per Cabang (`branch_product_stocks`)**:
   - Tabel master `products` bertindak sebagai katalog universal SKU (nama, barcode, harga jual dasar, kemasan).
   - Tabel `branch_product_stocks` mengisolasi ketersediaan stok fisik per cabang (`available_stock`, `in_transit_stock`, `safety_stock`), dilengkapi trigger inisialisasi otomatis untuk produk baru maupun cabang baru.
3. **Protokol Transfer Stok Dua Arah Mengambang (Two-Phase Handshake & In-Transit Status)**:
   - **Phase 1 (Dispatch)**: Mengunci stok cabang asal dengan `SELECT ... FOR UPDATE`, memindahkan dari `available_stock` ke `in_transit_stock`, dan menerbitkan surat jalan dengan 6-digit PIN acak kriptografis (SHA-256).
   - **Phase 2 (Receive & Physical Verification)**: Cabang tujuan memverifikasi PIN 6-digit (dengan proteksi brute-force max 3 kali gagal). Menghitung fisik barang baik, rusak, dan hilang.
   - Mengalokasikan selisih barang rusak/pecah/hilang ke akun `transit_shrinkage_logs` dan memicu radar anomali `TRANSFER_SHRINKAGE` ke `security_anomaly_events`.
4. **Otorisasi Pembatalan Khusus Owner & Pengembalian Atomik**:
   - Tiket pengiriman yang masih berstatus `DISPATCHED` dapat dibatalkan hanya oleh Owner sah via RPC `cancel_stock_transfer` dengan PIN Owner, memulihkan `in_transit_stock` kembali ke `available_stock` cabang asal secara atomik.
5. **Pengikatan Perangkat Kasir Permanen (`src/utils/branchDeviceGuard.js`)**:
   - Terminal kasir diikat ke 1 `branch_id` unik via `localStorage: hl_pos_device_branch_id` yang terkunci dengan PIN Owner 6-digit.
   - Kasir di Cabang A diblokir keras menjual stok Cabang B. Navbar kasir menampilkan badge taktil `[ 📍 CABANG: TOKO UTAMA (POS-01) 🔒 ]`.
6. **Surat Jalan Thermal ESC/POS (`src/utils/escposPrinter.js`)**:
   - Format cetak thermal 58mm / 80mm: Nomor Transfer, Cabang Asal -> Tujuan, Daftar SKU, PIN Verifikasi Besar & Tebal, Barcode/QR, dan baris tanda tangan fisik kurir serta penerima.

---

## 2. Database Schema & PostgreSQL RPCs

### 2.1 Skema Hierarki Multi-Cabang & Inventaris Terisolasi (`scratch/multi_branch_transfers_schema.sql`)

```sql
-- 1. Tabel Organisasi Induk
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  tier_id VARCHAR(30) DEFAULT 'EKSEKUTIF',
  max_branches INT DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Cabang (Menautkan ke shops.id eksisting)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id UUID UNIQUE NOT NULL REFERENCES shops(id) ON DELETE RESTRICT,
  branch_name VARCHAR(100) NOT NULL,
  branch_code VARCHAR(10) NOT NULL,
  is_main_branch BOOLEAN DEFAULT FALSE,
  address TEXT,
  phone_number VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, branch_code)
);

-- 3. Tabel Stok Terisolasi per Cabang
CREATE TABLE IF NOT EXISTS branch_product_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  available_stock INT DEFAULT 0 CHECK (available_stock >= 0),
  in_transit_stock INT DEFAULT 0 CHECK (in_transit_stock >= 0),
  safety_stock INT DEFAULT 0 CHECK (safety_stock >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(branch_id, product_id)
);

-- 4. Tabel Mutasi Pengiriman Antar-Cabang (Header)
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(30) UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  target_branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  status VARCHAR(20) DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED', 'RECEIVED', 'DISCREPANCY', 'CANCELLED')),
  pin_hash VARCHAR(64) NOT NULL,
  dispatched_by UUID REFERENCES auth.users(id),
  received_by UUID REFERENCES auth.users(id),
  notes TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ,
  failed_pin_attempts INT DEFAULT 0,
  is_locked BOOLEAN DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID REFERENCES auth.users(id),
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabel Rincian Item Mutasi Antar-Cabang (Items)
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_dispatched INT NOT NULL CHECK (qty_dispatched > 0),
  qty_received INT DEFAULT 0 CHECK (qty_received >= 0),
  qty_damaged INT DEFAULT 0 CHECK (qty_damaged >= 0),
  qty_lost INT DEFAULT 0 CHECK (qty_lost >= 0),
  cogs_per_unit NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabel Log Susut Perjalanan (Transit Shrinkage)
CREATE TABLE IF NOT EXISTS transit_shrinkage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty_damaged INT DEFAULT 0,
  qty_lost INT DEFAULT 0,
  cogs_per_unit NUMERIC DEFAULT 0,
  total_shrinkage_cogs NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### 2.2 Stored Procedures Atomik (ACID Serializable)

#### 1. RPC: `dispatch_stock_transfer`
- **Parameter**: `(p_org_id UUID, p_source_branch_id UUID, p_target_branch_id UUID, p_items JSONB, p_pin_hash TEXT, p_dispatched_by UUID, p_notes TEXT)`
- **Alur Kerja**:
  1. Validasi: `p_source_branch_id != p_target_branch_id`.
  2. Generate nomor transfer urut: `TRF-YYYYMMDD-XXXX`.
  3. Iterasi setiap item dalam `p_items`:
     - Kunci baris stok cabang asal: `SELECT available_stock FROM branch_product_stocks WHERE branch_id = p_source_branch_id AND product_id = item.product_id FOR UPDATE`.
     - Validasi `available_stock >= item.qty_dispatched`. Jika kurang: `RAISE EXCEPTION 'STOK_TIDAK_CUKUP: Produk % hanya memiliki stok %'`.
     - Potong `available_stock = available_stock - item.qty_dispatched`.
     - Tambah `in_transit_stock = in_transit_stock + item.qty_dispatched`.
     - Ambil `cogs_per_unit` dari `products.harga_modal`.
  4. Masukkan baris ke `stock_transfers` (status `'DISPATCHED'`, `pin_hash = p_pin_hash`).
  5. Masukkan seluruh baris ke `stock_transfer_items`.
  6. Catat audit ke `stock_mutations` bertipe `'TRANSFER_OUT'`.
  7. Return: `jsonb_build_object('success', true, 'transfer_id', v_transfer_id, 'transfer_number', v_transfer_num)`.

#### 2. RPC: `receive_stock_transfer`
- **Parameter**: `(p_transfer_id UUID, p_target_branch_id UUID, p_received_items JSONB, p_raw_pin TEXT, p_received_by UUID)`
- **Alur Kerja**:
  1. Kunci baris transfer: `SELECT * FROM stock_transfers WHERE id = p_transfer_id FOR UPDATE`.
  2. Periksa status: Pastikan status `'DISPATCHED'`. Jika `'LOCKED'`: `RAISE EXCEPTION 'TRANSFER_LOCKED: Tiket transfer terkunci akibat salah PIN berulang kali.'`.
  3. Cek kecocokan PIN: Hitung `encode(digest(p_raw_pin, 'sha256'), 'hex')` vs `pin_hash`.
     - Jika TIDAK COCOK:
       - `failed_pin_attempts = failed_pin_attempts + 1`.
       - Jika `failed_pin_attempts >= 3`: set `is_locked = TRUE, locked_at = NOW()`. Picu anomali `TRANSFER_PIN_BRUTEFORCE`.
       - `RAISE EXCEPTION 'PIN_INVALID'`.
  4. Validasi rekonsiliasi kuantitas:
     - Untuk setiap item: `item.qty_dispatched == (item.qty_received + item.qty_damaged + item.qty_lost)`.
  5. Eksekusi mutasi stok:
     - Kunci stok kedua cabang: `FOR UPDATE`.
     - Kurangi `in_transit_stock` di cabang asal sebesar `qty_dispatched`.
     - Tambah `available_stock` di cabang tujuan sebesar `qty_received`.
     - Jika `qty_damaged > 0` atau `qty_lost > 0`:
       - Catat entri ke `transit_shrinkage_logs` dengan `total_shrinkage_cogs = cogs_per_unit * (qty_damaged + qty_lost)`.
       - Catat anomali `'TRANSFER_SHRINKAGE'` ke `security_anomaly_events`.
       - Set flag `v_has_discrepancy = TRUE`.
  6. Perbarui status: jika `v_has_discrepancy = TRUE` set status ke `'DISCREPANCY'`, jika nol susut set ke `'RECEIVED'`.
  7. Catat audit ke `stock_mutations` bertipe `'TRANSFER_IN'`.
  8. Return: `jsonb_build_object('success', true, 'status', v_final_status, 'total_received', v_total_rec, 'total_shrinkage', v_total_shrink)`.

#### 3. RPC: `cancel_stock_transfer`
- **Parameter**: `(p_transfer_id UUID, p_owner_pin_hash TEXT, p_reason TEXT, p_owner_id UUID)`
- **Alur Kerja**:
  1. Verifikasi PIN Owner organisasi.
  2. Kunci transfer dengan `FOR UPDATE`. Pastikan status masih `'DISPATCHED'`.
  3. Iterasi seluruh `stock_transfer_items`:
     - Pada cabang asal: `in_transit_stock = in_transit_stock - qty_dispatched`, `available_stock = available_stock + qty_dispatched`.
  4. Catat mutasi di `stock_mutations` bertipe `'TRANSFER_CANCELLED'`.
  5. Update status `stock_transfers`: `'CANCELLED'`, `cancelled_at = NOW()`, `cancellation_reason = p_reason`, `cancelled_by = p_owner_id`.
  6. Return: `jsonb_build_object('success', true, 'transfer_id', p_transfer_id)`.

---

## 3. Client Engine & Device Binding

### 3.1 Device-Level Branch Binding Guard (`src/utils/branchDeviceGuard.js`)
- **Tujuan**: Menjamin isolasi terminal kasir secara mutlak di tingkat browser client.
- **Kunci Penyimpanan `localStorage`**:
  - `hl_pos_device_branch_id`: UUID cabang yang terikat ke browser kasir.
  - `hl_pos_device_register_name`: Label register kasir (misal: "REGISTER-01").
- **Fungsi Utama**:
  - `getAssignedBranchId()`: Mengembalikan UUID cabang atau `null`.
  - `getAssignedRegisterName()`: Mengembalikan nama register atau "POS-01".
  - `bindDeviceToBranch({ branchId, registerName, ownerPinHash })`: Memverifikasi otorisasi Owner dan menyimpan identitas perangkat.
  - `unbindDeviceFromBranch(ownerPinHash)`: Melepas ikatan cabang hanya setelah PIN Owner terverifikasi.

### 3.2 Transit Security Engine (`src/utils/transitSecurity.js`)
- `generateSecureTransferPin()`: Menggunakan `crypto.getRandomValues` untuk menghasilkan 6-digit PIN acak (100000 - 999999).
- `hashTransferPin(pin)`: Menggunakan Web Crypto API `crypto.subtle.digest('SHA-256')` untuk menghasilkan heksadesimal 64 karakter.

---

## 4. Backend API Routes (App Router)

1. **`GET /api/v1/branches`**: Mengambil daftar cabang aktif milik organisasi akun yang sedang login.
2. **`POST /api/v1/transfers/dispatch`**: Memvalidasi sesi Tier Eksekutif, memanggil RPC `dispatch_stock_transfer`.
3. **`POST /api/v1/transfers/receive`**: Menerima verifikasi fisik dan PIN, memanggil RPC `receive_stock_transfer`.
4. **`POST /api/v1/transfers/cancel`**: Memvalidasi PIN Owner, memanggil RPC `cancel_stock_transfer`.
5. **`GET /api/v1/transfers`**: Mengambil riwayat mutasi antar-cabang dengan filter status (`DISPATCHED`, `RECEIVED`, `DISCREPANCY`, `CANCELLED`).

---

## 5. Antarmuka Pengguna Arcade Brutalist

1. **Global Branch Switcher (`src/components/layout/BranchSwitcher.jsx`)**:
   - Ditempatkan di Header Navbar Admin. Memilih `[ 🏢 KONSOLIDASI (SEMUA TOKO) ]` atau cabang spesifik (`Toko Utama`, `Pasar Subuh`, dll).
2. **Pusat Mutasi Antar-Cabang (`src/app/(authenticated)/transfers/page.js`)**:
   - **Tab 1: Kirim Barang (Dispatch)**: Form pemilihan cabang asal/tujuan, pencarian SKU, input jumlah kirim dengan kalkulator konversi satuan, tombol kirim & terbitkan surat jalan, dan modal PIN rahasia.
   - **Tab 2: Terima Barang (Receive)**: Scan barcode nomor transfer, input 6-digit masked PIN, tabel audit kuantitas fisik (Baik, Rusak, Hilang), tombol konfirmasi penerimaan.
   - **Tab 3: Radar Barang Dalam Perjalanan (In-Transit Radar)**: Pelacakan real-time barang di jalan, tombol pembatalan mutasi khusus Owner, dan kalkulasi nilai rupiah mengambang.
3. **Modal Setup Terminal Kasir (`src/components/pos/BranchSetupModal.jsx`)**:
   - Muncul otomatis jika kasir belum diikat ke cabang tertentu atau saat ganti cabang diklik.
   - Dilindungi input PIN Owner 6-digit.
4. **Surat Jalan Thermal ESC/POS (`src/utils/escposPrinter.js`)**:
   - Fungsi `printTransferManifestSlip(transferData)` menghasilkan format struk 58mm / 80mm lengkap dengan PIN besar & tebal, nomor transfer, dan area tanda tangan kurir/penerima.

---

## 6. Tier Monetization & Quality Gates

- **Feature Gates (`src/config/tiers.js`)**:
  - `multi_branch_access`: Eksekutif (Maks 3 Cabang).
  - `inter_branch_stock_transfer`: Eksekutif.
  - `consolidated_dashboard_radar`: Eksekutif.
  - Paywall overlay Arcade Brutalist aktif jika tier di bawah Eksekutif mengakses `/transfers`.
- **Automated Verification Suite (`scratch/verify_phase7_multi_branch.cjs`)**:
  - 12+ kasus uji mandiri memvalidasi skema, transfer atomik, isolasi POS, verifikasi PIN, pelaporan shrinkage, ESLint 0 warning, dan kompilasi build produksi Next.js.
