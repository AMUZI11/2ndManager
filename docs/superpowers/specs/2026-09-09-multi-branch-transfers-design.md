# Design Specification: Tahap 7 — Langkah 1: Multi-Branch Hierarchy & Two-Phase Stock Transfer Engine

**Document ID**: SPEC-PHASE7-MULTI-BRANCH-TRANSFERS  
**Status**: DRAFT FOR USER REVIEW  
**Date**: 2026-09-09  
**Platforms**: Next.js 16.2.9 (App Router / Turbopack), Supabase PostgreSQL, IndexedDB  

---

## 1. Executive Summary

Tahap 7 Langkah 1 membangun infrastruktur multi-cabang (1 akun Organisasi mengelola hingga 3 cabang) dan protokol transfer stok dua arah (*Two-Phase Handshake*) dengan:
1. **Hierarki Multi-Cabang**: Struktur `organizations` dan `branches` yang tersinkronisasi 1-to-1 dengan `shops` sehingga 100% kompatibel dengan 79 rute API, transaksi POS, kasir, dan laporan yang sudah ada.
2. **Isolasi Inventaris per Cabang**: Tabel `branch_product_stocks` mencatat `available_stock` dan `in_transit_stock` unik per cabang, mencegah kebocoran stok lintas toko fisik.
3. **Two-Phase Handshake Stock Transfer**:
   - **Fase 1 (Dispatch)**: Cabang asal memindahkan stok dari `available_stock` ke `in_transit_stock` menggunakan `SELECT ... FOR UPDATE` atomik, menghasilkan nomor surat jalan dan 6-digit PIN rahasia (hash SHA-256 tersimpan di database).
   - **Fase 2 (Receive & Reconcile)**: Cabang tujuan memvalidasi PIN 6-digit, memeriksa fisik barang (Diterima Baik, Rusak, Hilang), memotong `in_transit_stock` cabang asal, dan menambah `available_stock` cabang tujuan.
4. **Pencatatan Susut Barang di Jalan (Transit Shrinkage)**: Selisih fisik barang rusak/hilang otomatis dicatat ke `transit_shrinkage_logs` dengan beban modal (HPP * jumlah susut) dan memicu security anomaly event `TRANSFER_SHRINKAGE`.
5. **Pengikatan Terminal Kasir (Branch Device Guard)**: Setiap terminal kasir diikat ke 1 `branch_id` unik pada `localStorage: hl_pos_device_branch_id`. Kasir Cabang A dilarang menjual stok Cabang B.
6. **Surat Jalan Thermal ESC/POS**: Slip surat jalan kurir 58mm/80mm memuat nomor transfer, rute asal-tujuan, daftar SKU, PIN verifikasi rahasia tebal, barcode/QR, dan kolom tanda tangan fisik kurir serta penerima.

---

## 2. Database Schema & PostgreSQL RPCs

### 2.1 Skema Organisasi & Cabang (`scratch/multi_branch_transfers_schema.sql`)

```sql
-- 1. Tabel Organisasi Pemilik Warung
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  tier_id VARCHAR(50) DEFAULT 'EKSEKUTIF',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel Cabang (Tersinkronisasi 1-ke-1 dengan shops)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  shop_id UUID REFERENCES shops(id) ON DELETE CASCADE,
  branch_name VARCHAR(255) NOT NULL,
  branch_code VARCHAR(10) NOT NULL,
  address TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_org_branch_code UNIQUE(organization_id, branch_code)
);

-- 3. Tabel Stok Terisolasi per Cabang
CREATE TABLE IF NOT EXISTS branch_product_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  available_stock INT DEFAULT 0 CHECK (available_stock >= 0),
  in_transit_stock INT DEFAULT 0 CHECK (in_transit_stock >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_branch_product UNIQUE (branch_id, product_id)
);

-- 4. Tabel Mutasi Pengiriman Antar-Cabang
CREATE TABLE IF NOT EXISTS stock_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_number VARCHAR(30) UNIQUE NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_branch_id UUID NOT NULL REFERENCES branches(id),
  target_branch_id UUID NOT NULL REFERENCES branches(id),
  status VARCHAR(20) DEFAULT 'DISPATCHED' CHECK (status IN ('DISPATCHED', 'RECEIVED', 'DISCREPANCY', 'CANCELLED')),
  pin_hash VARCHAR(64) NOT NULL,
  dispatched_by UUID,
  received_by UUID,
  notes TEXT,
  dispatched_at TIMESTAMPTZ DEFAULT NOW(),
  received_at TIMESTAMPTZ
);

-- 5. Tabel Item Mutasi Pengiriman
CREATE TABLE IF NOT EXISTS stock_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  qty_dispatched INT NOT NULL CHECK (qty_dispatched > 0),
  qty_received INT DEFAULT 0 CHECK (qty_received >= 0),
  qty_damaged INT DEFAULT 0 CHECK (qty_damaged >= 0),
  qty_lost INT DEFAULT 0 CHECK (qty_lost >= 0),
  cogs_per_unit NUMERIC DEFAULT 0,
  notes TEXT
);

-- 6. Tabel Log Susut Perjalanan (Transit Shrinkage)
CREATE TABLE IF NOT EXISTS transit_shrinkage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES stock_transfers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id),
  shrinkage_type VARCHAR(20) NOT NULL CHECK (shrinkage_type IN ('DAMAGED', 'LOST')),
  quantity INT NOT NULL CHECK (quantity > 0),
  cogs_per_unit NUMERIC NOT NULL,
  total_loss_amount NUMERIC NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Stored Procedure PostgreSQL (ACID Serializable)

- **RPC `dispatch_stock_transfer`**:
  - Validasi keberadaan baris di `branch_product_stocks` untuk cabang pengirim.
  - Kunci baris dengan `SELECT ... FOR UPDATE`.
  - Periksa `available_stock >= qty_dispatched`. Jika kurang, batalkan transaksi.
  - `UPDATE branch_product_stocks SET available_stock = available_stock - qty, in_transit_stock = in_transit_stock + qty`.
  - Insert ke `stock_transfers` (status = 'DISPATCHED') dan `stock_transfer_items`.
  - Catat log `stock_mutations` bertipe `TRANSFER_OUT`.

- **RPC `receive_stock_transfer`**:
  - Hitung SHA-256 dari input raw PIN kasir penerima. Cocokkan dengan `pin_hash` pada `stock_transfers`. Jika tidak cocok, batalkan transaksi (`PIN_INVALID`).
  - Kunci baris transfer dan baris stok kedua cabang dengan `FOR UPDATE`.
  - Kurangi `in_transit_stock` cabang pengirim sebesar `qty_dispatched`.
  - Tambah `available_stock` cabang penerima sebesar `qty_received`.
  - Jika ada `qty_damaged` atau `qty_lost`:
    - Catat ke `transit_shrinkage_logs` dengan `total_loss_amount = cogs * (damaged + lost)`.
    - Insert notifikasi anomali `TRANSFER_SHRINKAGE` ke `security_anomaly_events`.
  - Set status transfer ke `RECEIVED` (jika tidak ada selisih) atau `DISCREPANCY` (jika ada rusak/hilang).

---

## 3. Client & Terminal Security Guard

- **`src/utils/branchDeviceGuard.js`**:
  - `getPosDeviceBranchId()`: Mengambil ID cabang yang diikat pada terminal kasir.
  - `setPosDeviceBranchId(branchId)`: Menyimpan ikatan cabang ke `localStorage`.
  - Badge navbar kasir POS: `[ 📍 CABANG: TOKO UTAMA (POS-01) ]`.
  - Filter inventaris kasir: Kasir hanya menampilkan dan mengecek stok dari cabang yang sedang aktif.

- **`src/utils/transitSecurity.js`**:
  - `generateSecureTransferPin()`: 6-digit string acak (100000 - 999999).
  - `hashTransferPin(pin)`: Digest SHA-256 via Web Crypto API / crypto module.

---

## 4. UI/UX Arcade Brutalist

- **Global Branch Switcher (`src/components/BranchSwitcher.jsx`)**:
  - Header selector kontras tinggi: `[ 🏢 KONSOLIDASI (SEMUA TOKO) ]`, `[ 📍 Cabang 1: Toko Utama ]`, `[ 📍 Cabang 2: Pasar Subuh ]`, `[ 📍 Cabang 3: Kios Gang ]`.
- **Halaman Mutasi Cabang (`src/app/(authenticated)/transfers/page.js`)**:
  - Tab 1: Kirim Barang (Dispatch)
  - Tab 2: Terima Barang (Receive & Verifikasi Fisik)
  - Tab 3: Radar Barang Dalam Perjalanan (In-Transit Radar)
  - Paywall Guard untuk tier selain Eksekutif.
- **Surat Jalan Thermal ESC/POS (`src/utils/escposPrinter.js`)**:
  - Format 58mm / 80mm: Header surat jalan, nomor transfer, rute asal-tujuan, rincian barang, PIN RAHASIA tebal, barcode transfer, tanda tangan fisik kurir dan penerima.

---

## 5. Subscription Feature Gates

- `multi_branch_access`: Eksekutif (Maks 3 Cabang).
- `inter_branch_stock_transfer`: Eksekutif.
- `consolidated_dashboard_radar`: Eksekutif.
