# Design Specification: Tahap 6 — Community Commerce & Physical Asset Citadel

**Document ID**: SPEC-PHASE6-COMMUNITY-ASSETS  
**Status**: APPROVED IN BRAINSTORM  
**Date**: 2026-09-08  
**Platforms**: Next.js 16.2.9 (App Router / Turbopack), Supabase PostgreSQL, IndexedDB  

---

## 1. Executive Summary

Tahap 6 membangun infrastruktur perdagangan komunitas dan aset fisik rolling untuk toko kelontong dan warung modern 2ndManager. Fokus utama mencakup:
1. **Container Escrow & Rolling Asset Loans**: Pengelolaan tabung gas elpiji 3kg, galon air mineral, dan krat botol dengan sistem titipan dana jaminan (*deposit escrow*) yang tidak mendistorsi omzet penjualan toko serta pengembalian fisik tunai melalui laci kas.
2. **Atomic Multi-Tier Auto-Unpack**: Mesin pemecah kemasan induk bertingkat (Dus/Slop/Pak ke Pcs) yang mendeteksi stok eceran habis saat pemindaian barcode kasir, menampilkan soft-badge taktil non-blocking di keranjang POS, dan mengeksekusi mutasi atomik saat checkout dengan *row-level locking* (`SELECT ... FOR UPDATE`).
3. **Tripartite Consignment Engine**: Pusat penerimaan (*check-in* pagi) dan rekonsiliasi sore (*settlement*) titip jual kue basah/makanan tetangga dengan kebijakan penanganan barang basi yang fleksibel (*Vendor Borne*, *Store Borne*, *Shared 50:50*), pemicu hentak laci kas fisik, dan tanda terima WhatsApp terstruktur.

---

## 2. Database Schema & PostgreSQL RPCs

### 2.1 Skema Pinjaman Aset & Deposit Escrow (`scratch/asset_loans_schema.sql`)

```sql
-- Tabel status pinjaman aset wadah pelanggan
CREATE TABLE IF NOT EXISTS customer_asset_loans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  asset_type VARCHAR(30) NOT NULL, -- 'GAS_3KG', 'GALON_AQUA', 'KRAT_BOTOL'
  quantity INT NOT NULL CHECK (quantity > 0),
  deposit_amount_per_unit NUMERIC DEFAULT 0,
  is_deposit_waived BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'BORROWED' CHECK (status IN ('BORROWED', 'RETURNED', 'FORFEITED')),
  borrowed_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel pos penampungan escrow jaminan fisik (Non-Revenue)
CREATE TABLE IF NOT EXISTS customer_asset_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES customer_asset_loans(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
  deposit_amount NUMERIC NOT NULL CHECK (deposit_amount >= 0),
  status VARCHAR(20) DEFAULT 'HELD' CHECK (status IN ('HELD', 'REFUNDED', 'FORFEITED')),
  refunded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### RPC: `process_asset_loan_checkout`
- **Tujuan**: Mencatat pinjaman aset bersamaan dengan transaksi POS.
- **Logika**:
  - Jika `p_is_deposit_waived = false`: Masukkan entri ke `customer_asset_loans` dan catat saldo dana titipan ke `customer_asset_deposits` dengan status `'HELD'`.
  - Jika `p_is_deposit_waived = true`: Catat pinjaman ke `customer_asset_loans` sebagai kasbon wadah tanpa mutasi escrow deposit.
  - Mutasi agregasi `loaned_assets` pada tabel `customers`.

#### RPC: `process_asset_return`
- **Tujuan**: Menerima kembali tabung/galon kosong dan mencairkan refund deposit.
- **Logika**:
  - Validasi sisa kuantitas pinjaman aktif.
  - Periksa kondisi fisik: `'GOOD'`, `'DAMAGED'`, `'REJECTED'`.
  - Jika kondisi baik & ada deposit aktif: ubah status deposit menjadi `'REFUNDED'`, status pinjaman menjadi `'RETURNED'`.
  - Kembalikan instruksi pengeluaran kas laci (`cash_movement: 'ASSET_DEPOSIT_REFUND'`).

---

### 2.2 Skema Pemecah Satuan Bertingkat Atomik (`scratch/multi_tier_unpack_rpc.sql`)

#### RPC: `execute_atomic_unit_unpack(p_product_id UUID, p_required_pcs INT)`
- **Tujuan**: Memecah kemasan induk secara atomik dan kebal race-condition.
- **Logika**:
  1. Kunci baris produk dan unit kemasan dengan `SELECT stock FROM products WHERE id = p_product_id FOR UPDATE`.
  2. Periksa stok base unit. Jika `current_stock < p_required_pcs`:
     - Ambil unit induk terdekat dari `product_units` di mana `stock > 0` dan urutkan berdasarkan `conversion_factor ASC`.
     - Hitung `unpacks_needed = CEIL((p_required_pcs - current_stock) / parent_conversion_factor)`.
     - Jika `parent_unit.stock < unpacks_needed`: Lempar exception `INSUFFICIENT_PARENT_STOCK`.
     - Kurangi stok unit induk: `UPDATE product_units SET stock = stock - unpacks_needed WHERE id = parent_unit_id`.
     - Tambah stok produk base unit: `UPDATE products SET stock = stock + (unpacks_needed * parent_conversion_factor) WHERE id = p_product_id`.
     - Catat riwayat audit ke `stock_mutations` (tipe: `'AUTO_UNPACK'`).
  3. Return stok base unit terkini yang tersedia.

---

### 2.3 Skema Konsinyasi Tripartit (`scratch/consignments_schema.sql`)

```sql
CREATE TABLE IF NOT EXISTS consignment_vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vendor_name VARCHAR(100) NOT NULL,
  phone_number VARCHAR(30),
  commission_percentage NUMERIC DEFAULT 0,
  stale_policy VARCHAR(20) DEFAULT 'VENDOR_BORNE' CHECK (stale_policy IN ('VENDOR_BORNE', 'STORE_BORNE', 'SHARED_50_50')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consignment_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES consignment_vendors(id) ON DELETE CASCADE,
  batch_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SETTLED', 'CANCELLED')),
  total_items_received INT DEFAULT 0,
  total_items_sold INT DEFAULT 0,
  total_items_returned_good INT DEFAULT 0,
  total_items_returned_stale INT DEFAULT 0,
  vendor_payout_amount NUMERIC DEFAULT 0,
  store_margin_amount NUMERIC DEFAULT 0,
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consignment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES consignment_batches(id) ON DELETE CASCADE,
  product_name VARCHAR(150) NOT NULL,
  qty_received INT NOT NULL CHECK (qty_received >= 0),
  qty_sold INT DEFAULT 0 CHECK (qty_sold >= 0),
  qty_returned_good INT DEFAULT 0 CHECK (qty_returned_good >= 0),
  qty_returned_stale INT DEFAULT 0 CHECK (qty_returned_stale >= 0),
  vendor_price NUMERIC NOT NULL CHECK (vendor_price >= 0),
  retail_price NUMERIC NOT NULL CHECK (retail_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Komponen Antarmuka Pengguna (Arcade Brutalist)

### 3.1 Modal Kasir Pinjaman Aset (`src/components/customers/AssetLoanModal.jsx`)
- Taktil modal dengan dua opsi tabung:
  1. `[ 🔄 Tukar Tabung Kosong (Normal) ]`: Tidak ada deposit/pinjaman aset.
  2. `[ ⚠️ Pembeli Tidak Bawa Wadah (Pinjam Aset) ]`:
     - Wajib pilih pelanggan terdaftar.
     - Opsi A: `[ 💵 Titip Uang Jaminan ]` (Default misal Rp 150.000/tabung gas atau Rp 50.000/galon).
     - Opsi B: `[ 🤝 Jaminan Kepercayaan / Kasbon Wadah ]` (Warning badge risiko tekor).
- Menghasilkan URL WhatsApp konfirmasi penerimaan wadah ke nomor pelanggan.

### 3.2 Integrasi Auto-Unpack pada POS (`src/app/pos/page.js` & `src/utils/posEngine.js`)
- Local resolver mendeteksi saat stok eceran kurang dari kuantitas yang dimasukkan.
- Merender soft-badge di bawah nama item:
  `[ ⚡ AUTO-UNPACK: 1 Dus dipecah menjadi 40 Pcs ]`
- Menyertakan payload `auto_unpack_actions` saat pemanggilan `/api/v1/transactions`.

### 3.3 Konsinyasi Tripartit (`src/views/ConsignmentManagement.jsx` & `src/utils/consignmentEngine.js`)
- Tab Check-In Pagi: Input item titipan, cetak slip terima barang via ESC/POS.
- Tab Rekonsiliasi Sore:
  - Input hitung fisik sisa kue: Sisa Baik vs Sisa Basi.
  - Kalkulasi otomatis sesuai `stale_policy`:
    * `qty_sold = qty_received - (qty_returned_good + qty_returned_stale)`
    * `vendor_payout = (qty_sold * vendor_price) + stale_compensation`
    * `store_net_margin = (qty_sold * (retail_price - vendor_price)) - store_stale_loss`
  - Tombol aksi: Cetak struk rekap settlement, buka laci kas tunai (drawer kick), dan kirim pesan WhatsApp otomatis ke vendor.

---

## 4. Penegakan Batasan Tier (`src/config/tiers.js`)

| Fitur | Warung Gratis | Juragan Kelontong (Supervisor) | Super Grosir (Manajer) | Multi Outlet (Eksekutif) |
|---|---|---|---|---|
| `asset_loan_tracker_basic` | ❌ | ✅ (Maks 20 wadah aktif) | ✅ (Unlimited) | ✅ (Unlimited) |
| `asset_loan_tracker_unlimited` | ❌ | ❌ | ✅ | ✅ |
| `atomic_multi_tier_unpack` | ❌ | ✅ | ✅ | ✅ |
| `consignment_management` | ❌ | ✅ (Maks 5 vendor) | ✅ (Unlimited) | ✅ (Unlimited) |
| `consignment_whatsapp_receipt` | ❌ | ❌ | ✅ | ✅ |

---

## 5. Rencana Verifikasi Otomatis (`scratch/verify_phase6_community_assets.cjs`)

1. Uji logika kalkulasi deposit escrow & pengembalian tabung.
2. Uji rekursif auto-unpack stok kemasan induk.
3. Uji formula rekonsiliasi konsinyasi untuk ketiga kebijakan basi (*Vendor Borne*, *Store Borne*, *Shared 50:50*).
4. Uji format generator pesan WhatsApp titip jual & tanda terima jaminan.
5. Uji kepatuhan feature flags pada `TIER_CONFIG`.
6. Audit statis ESLint 0 error & kompilasi `npm run build` 77/77 rute lolos.
