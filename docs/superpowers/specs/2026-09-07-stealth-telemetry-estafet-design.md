# Spesifikasi Desain: Sistem Telemetri Siluman & Serah Terima Estafet (Double-Blind)

## 1. Ikhtisar & Arsitektur Sistem

Sistem ini mengimplementasikan mekanisme pengawasan anti-fraud senyap (*stealth telemetry*) pada klien POS Kasir dan serah terima estafet laci kasir (*double-blind shift handover with cash skim*) yang terhubung secara *real-time* ke konsol kendali pemilik toko (*Owner Command Center*).

### Prinsip Utama:
1. **Zero Bocoran ke Kasir**: Kasir membuka dan menutup shift secara "buta" (*blind*). Kasir tidak mengetahui angka modal yang ditinggalkan kasir sebelumnya, omzet aktual sistem, maupun status selisih kas. Jika terdeteksi selisih modal estafet, respons HTTP kasir tetap `201 Created` tanpa pesan selisih.
2. **Telemetri Asinkron & Senyap**: Klien POS mendeteksi anomali operasional kasir (penghapusan masif, pembatalan keranjang besar, salah PIN berulang, buka laci paksa) dan mengirimkannya melalui endpoint tersamar `/api/v1/metrics/sync` dengan metode `fetch(..., { keepalive: true })` dalam waktu <40 ms tanpa memblokir thread POS kasir.
3. **Radar Keamanan Pemilik Realtime**: Pemilik toko dengan tier MANAJER / EKSEKUTIF menerima siaran WebSockets Supabase Realtime di `shop_security:${shop_id}` dengan audio synthesizer mandiri (Web Audio API) dan *Floating Red Alert Card* Pop-Art Brutalist di root layout aplikasi.

---

## 2. Diagram Alur Kerja Estafet & Radar

```text
[ KASIR POS CLIENT ]                      [ SUPABASE & BACKEND CORE ]                 [ OWNER COMMAND CONSOLE ]
         │                                             │                                          │
[TUTUP SHIFT KASIR 1]                                  │                                          │
1. Hitung Fisik Blind: Rp 2.500.000                    │                                          │
2. Input Setoran ke Bos: Rp 2.000.000                  │                                          │
3. Sisa Laci Ditinggal: Rp 500.000                     │                                          │
Klik [Kunci Shift] ───────────────────────────► POST /api/v1/shifts/close                         │
Layar Kasir 1 Logout Seketika                          │ Eksekusi RPC:                            │
                                                       │ close_cashier_shift_with_skim()          │
                                                       │ leftover_cash = Rp 500.000               │
                                                       │ Status: CLOSED                           │
                                                       │                                          │
    [JEDA ESTAFET LACI DITINGGAL (MAKS. 12 JAM)]       │                                          │
                                                       │                                          │
[BUKA SHIFT KASIR 2 (REGISTER_1)]                      │                                          │
Login -> StartShiftModal (Blind Input)                 │                                          │
Hitung Fisik Laci: Rp 350.000 (Kurang Rp 150.000!)     │                                          │
Klik [Buka Shift] ────────────────────────────► POST /api/v1/shifts/start                         │
                                                       │ Eksekusi RPC:                            │
                                                       │ start_shift_with_estafet_audit()         │
                                                       │                                          │
                                                       ├── Evaluasi:                              │
                                                       │   Diff = 350.000 - 500.000 = -150.000    │
                                                       │   Status: DISCREPANCY                    │
                                                       │                                          │
                                                       ├── INSERT security_anomaly_events         │
                                                       │   (HEM / CRITICAL)                       │
                                                       │                                          │
[POS KASIR 2 TERBUKA NORMAL] ◄─────────────────────────┼── Return HTTP 201 { success: true }      │
(Zero Bocoran, Kasir Siap Jual)                        │   (Data selisih disembunyikan)           │
                                                       │                                          │
                                                       └── Supabase Realtime Broadcast ──────────► Menerima Event WebSocket
                                                           Channel: 'shop_security:${shop_id}'     │
                                                                                                  ├── Web Audio Chime (440->880Hz)
                                                                                                  ├── Floating Red Card Muncul
                                                                                                  └── Unread Badge +1
```

---

## 3. Matriks 8 Anomali Kasir & Ambang Heuristik Anti-False Alarm

| Kode | Severity | Ambang Batas & Heuristik Filter | Metadata Forensik (JSONB) |
|---|---|---|---|
| **CIP** | HIGH | Hapus $\ge$ 3 item DAN total > Rp 30.000 DAN sudah sempat masuk step kalkulasi/pembayaran | `{ items_removed, cart_total, item_count, cashier_name }` |
| **VAC** | CRITICAL | Reset/batal keranjang saat nilai total produk yang sudah di-scan > Rp 50.000 | `{ cart_snapshot: [...items], total_nominal, cleared_at }` |
| **FPA** | CRITICAL | Salah input 6-digit PIN Owner saat bypass jual rugi / diskon (termasuk percobaan ke-1) | `{ attempt_number, target_action, terminal_id, timestamp }` |
| **RPC** | MEDIUM | Scan barcode sama $\ge$ 4 kali berturut-turut lalu dihapus total tanpa terjadi transaksi | `{ barcode, product_name, scan_count, elapsed_seconds }` |
| **ACD** | HIGH | Simpan kembalian > Rp 20.000 ke celengan pada profil pelanggan tanpa nomor HP valid | `{ change_amount, target_cust_id, customer_name, receipt_id }` |
| **DFO** | CRITICAL | Kirim pulse buka laci (ESC/POS) manual di luar status transaksi pembayaran tunai lunas | `{ trigger_source: 'HOTKEY_F9', active_cart_empty: boolean }` |
| **SDC** | HIGH | Terapkan diskon manual $\ge$ 3 kali dalam rentang 60 menit pada pelanggan berbeda | `{ occurrences: 3, window: '1h', total_discount_given: bigint }` |
| **HEM** | CRITICAL | Selisih modal Kasir 2 vs sisa laci Kasir 1 $\neq$ 0 pada terminal yang sama (jeda $\le$ 12 jam) | `{ terminal_id, outgoing_cash, incoming_cash, diff, gap_min }` |

---

## 4. Skema Basis Data PostgreSQL & RPC Supabase

Skrip migrasi fisik (`scratch/stealth_security_ddl.sql`):
1. **Perubahan Tabel `cashier_shifts`**:
   - `register_id VARCHAR(50) NOT NULL DEFAULT 'REGISTER_MAIN'`
   - `cash_drop_amount BIGINT NOT NULL DEFAULT 0`
   - `leftover_cash BIGINT NOT NULL DEFAULT 0`
   - `previous_shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL`
   - `handover_difference BIGINT DEFAULT 0`
   - `handover_status VARCHAR(20) DEFAULT 'STANDALONE' CHECK (handover_status IN ('MATCH', 'DISCREPANCY', 'STANDALONE'))`
   - `handover_gap_minutes INTEGER DEFAULT 0`
   - Index `idx_shifts_shop_reg_closed ON cashier_shifts(shop_id, register_id, end_time DESC) WHERE status = 'CLOSED'`
2. **Tabel Baru `security_anomaly_events`**:
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `shop_id UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE`
   - `shift_id UUID REFERENCES cashier_shifts(id) ON DELETE SET NULL`
   - `cashier_id UUID NOT NULL REFERENCES profiles(id)`
   - `cashier_name VARCHAR(150) NOT NULL`
   - `event_type VARCHAR(20) NOT NULL` (`CIP`, `VAC`, `FPA`, `RPC`, `ACD`, `DFO`, `SDC`, `HEM`)
   - `severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))`
   - `metadata JSONB NOT NULL DEFAULT '{}'::jsonb`
   - `is_read_by_owner BOOLEAN NOT NULL DEFAULT FALSE`
   - `created_at TIMESTAMPTZ DEFAULT NOW()`
3. **Kebijakan Row Level Security (RLS)**:
   - `SELECT`: Khusus role `'BOSS'` atau `'ADMIN'` pemilik toko terkait.
   - `INSERT`: Diperbolehkan bagi user terautentikasi dalam toko terkait.
4. **RPC: `close_cashier_shift_with_skim`**:
   - Menerima `(p_shift_id, p_shop_id, p_actual_cash, p_cash_drop_amount, p_denominations, p_notes)`.
   - Menghitung `v_leftover_cash = p_actual_cash - p_cash_drop_amount`.
   - Mengunci shift ke `CLOSED`.
   - Mencatat anomali `DRAWER_DISCREPANCY` jika `v_difference != 0`.
5. **RPC: `start_shift_with_estafet_audit`**:
   - Menerima `(p_shop_id, p_cashier_id, p_register_id, p_starting_cash, p_denominations)`.
   - Mencari shift `CLOSED` terakhir pada `shop_id` DAN `register_id` yang sama.
   - Jika jeda $\le$ 720 menit (12 jam):
     - `diff = p_starting_cash - v_last_shift.leftover_cash`.
     - Jika `diff != 0`: catat event `HEM` (CRITICAL).
   - Membuka shift baru (`status = 'OPEN'`).
   - Mengembalikan `{ success: true, shift_id, register_id }` tanpa membocorkan `diff`.

---

## 5. Spesifikasi Backend API Endpoints

### Endpoint 1: Penyamaran Telemetri (`POST /api/v1/metrics/sync`)
- File: `src/app/api/v1/metrics/sync/route.js`
- Autentikasi: Menggunakan cookie sesi Supabase (`createRouteHandlerClient` / auth-helpers).
- Payload: `{ t: timestamp, e: code, m: metadata }`.
- Logika:
  - Mapping code: `CIP`, `VAC`, `FPA`, `RPC`, `ACD`, `DFO`, `SDC`, `HEM`.
  - Simpan ke `security_anomaly_events`.
  - Cek tier toko (`src/config/tiers.js`): Jika `realtime_security_alerts: true` (Tier MANAJER / EKSEKUTIF), siarkan via Supabase Realtime broadcast channel `shop_security:${shop_id}` event `ANOMALY_TRIGGERED`.
  - Return: `HTTP 204 No Content` dalam waktu <40 ms.

### Endpoint 2: Pembukaan Shift (`POST /api/v1/shifts/start`)
- File: `src/app/api/v1/shifts/start/route.js`
- Payload: `{ starting_cash: number, register_id?: string, denominations?: object }`.
- Logika:
  - Resolusi `register_id` (default `'REGISTER_MAIN'`).
  - Eksekusi RPC `start_shift_with_estafet_audit`.
  - Cek apakah terbit anomali `HEM`: jika terbit dan tier mendukung realtime alert, siarkan event realtime ke channel pemilik.
  - Return: `HTTP 201 Created` `{ success: true, shift_id: "...", register_id: "..." }` (tanpa menyertakan nominal selisih).

### Endpoint 3: Penutupan Shift (`POST /api/v1/shifts/close`)
- File: `src/app/api/v1/shifts/close/route.js`
- Payload: `{ shift_id, actual_cash, cash_drop_amount, denominations, notes }`.
- Logika:
  - Validasi kepemilikan shift.
  - Panggil RPC `close_cashier_shift_with_skim`.
  - Jika `cash_drop_amount > 0`: catat rekaman ke `cash_drawer_movements` (`type: 'CASH_DROP_TO_SAFE'`).
  - Kembalikan status penutupan.

---

## 6. Komponen Frontend Sisi Kasir (POS Client)

### 1. `src/utils/stealthTelemetry.js`
- Fungsi `emitStealthMetric(code, metadata = {})`.
- Mengirimkan `POST /api/v1/metrics/sync` dengan header `'Content-Type': 'application/json'` dan `keepalive: true`.
- Gagal senyap (*fail silently*) tanpa melempar exception ke UI kasir.

### 2. `src/utils/terminalConfig.js`
- `getRegisterId()`: Membaca `localStorage.getItem('hl_pos_register_id') || 'REGISTER_MAIN'`.
- `setRegisterId(newId)`: Menyimpan ID terminal (alphanumeric uppercase, max 30 char).

### 3. Modal Buka Shift Blind (`src/components/pos/StartShiftModal.jsx`)
- Tampil saat shift kasir belum aktif.
- Mode input ganda: Tab Input Cepat (dengan tombol preset +50k, +100k, +200k, +500k) dan Tab Kalkulator Denominasi Fisik.
- Menyertakan `register_id` otomatis dari `getRegisterId()`.
- Menutup instan setelah submit dan memfokuskan kursor ke input pencarian / scanner barcode.

### 4. Modal Tutup Shift & Setoran Bos (`src/components/pos/CloseShiftModal.jsx`)
- Menggantikan `ShiftHandoverModal.jsx`.
- **Tahap 1**: Hitung Uang Fisik Laci (Blind Count).
- **Tahap 2**: Alokasi Setoran ke Bos / Brankas (Cash Drop).
  - Validasi: `cash_drop_amount <= actual_cash`.
  - Live indicator: "Sisa modal di laci untuk kasir berikutnya: Rp [actual_cash - cash_drop_amount]".
- **Aksi Final**: Tombol `[ Kunci Laci & Selesaikan Shift ]`.
  - Memanggil `POST /api/v1/shifts/close`.
  - Auto-logout dalam tempo 500 ms ke halaman login.

### 5. Integrasi Triggers di `src/app/pos/page.js`
- `CIP`: Dipicu jika kasir menghapus $\ge 3$ item DAN total nominal > Rp 30.000 setelah sempat masuk tahap pembayaran.
- `VAC`: Dipicu saat tombol reset/kosongkan keranjang ditekan ketika total produk > Rp 50.000.
- `FPA`: Dipicu di `NegativeMarginOverrideModal.jsx` saat PIN owner salah diinput.
- `RPC`: Dipicu jika barcode yang sama di-scan $\ge 4$ kali berturut-turut lalu dibatalkan.
- `ACD`: Dipicu di `SmartChangeModal.jsx` jika kembalian > Rp 20.000 dimasukkan ke celengan pelanggan tanpa nomor HP valid.
- `DFO`: Dipicu saat hotkey buka laci manual (F9) ditekan di luar transaksi tunai lunas.
- `SDC`: Dipicu jika diskon manual diberikan $\ge 3$ kali dalam 60 menit ke pelanggan berbeda.
- Badge terminal di header POS: `[ 🖥️ Kasir: REGISTER_MAIN ]` (dapat diubah oleh BOSS/ADMIN).

---

## 7. Pusat Kendali Sisi Pemilik (Owner Command Center)

### 1. `src/utils/soundAlerts.js`
- Inisialisasi `AudioContext` pada interaksi pertama pengguna (`click`, `keydown`, `touchstart`).
- `playSecurityChime(severity)`:
  - `CRITICAL`: Sawtooth oscilator ramp 440 Hz $\to$ 880 Hz (durasi 350 ms).
  - Non-critical (`HIGH` / `MEDIUM`): Sine wave 587.33 Hz (durasi 220 ms).

### 2. `src/components/owner/SecurityRadarAlert.jsx`
- Mendengarkan channel Supabase Realtime `shop_security:${shopId}` event `ANOMALY_TRIGGERED`.
- Menjalankan `playSecurityChime(payload.severity)`.
- Menampilkan Pop-Art Brutalist Floating Red Card dengan detail insiden (Nama Kasir, Terminal, Selisih/Jenis Anomali).
- Tombol: `[ 🔍 Telusuri Rekaman ]` dan `[ ✕ Tutup ]`.

### 3. `src/components/owner/SecurityForensicDrawer.jsx`
- Drawer sisi kanan yang dibuka via ikon `ShieldAlert` di navbar pemilik.
- Menampilkan timeline anomali hari ini, snapshot keranjang yang dihapus, filter severity, dan status dibaca (`is_read_by_owner`).

### 4. Pemasangan di Root Layout (`src/app/(authenticated)/layout.js`)
- Di-mount secara kondisional khusus role `'BOSS'` atau `'ADMIN'`:
  ```jsx
  {profile?.role === 'BOSS' || profile?.role === 'ADMIN' ? (
    <>
      <SecurityRadarAlert shopId={profile.shop_id} />
      <SecurityForensicDrawer 
        isOpen={isForensicDrawerOpen} 
        onClose={() => setIsForensicDrawerOpen(false)} 
        shopId={profile.shop_id} 
      />
    </>
  ) : null}
  ```
- Menambahkan tombol `ShieldAlert` pada header/sidebar dengan indikator *unread badge count*.

---

## 8. Penegakan Batasan Tier Langganan (`src/config/tiers.js`)

| Feature Flag | MAGANG | SUPERVISOR | MANAJER | EKSEKUTIF |
|---|:---:|:---:|:---:|:---:|
| `stealth_telemetry_logging` | `false` | `true` | `true` | `true` |
| `realtime_security_alerts` | `false` | `false` | `true` | `true` |
| `double_blind_estafet` | `false` | `false` | `true` | `true` |
| `cash_skim_management` | `false` | `true` | `true` | `true` |
| `forensic_cart_drawer` | `false` | `false` | `true` | `true` |
| `multi_branch_security_radar`| `false` | `false` | `false` | `true` |

---

## 9. Rencana Pengujian Otomatis (`scratch/verify_final_stealth.cjs`)

1. **Test Penyamaran `/api/v1/metrics/sync`**: Payload `{ e: 'CIP', m: { val: 45000 } }` menghasilkan HTTP 204 No Content (<50 ms).
2. **Test RLS Kasir**: Query `SELECT * FROM security_anomaly_events` oleh role CASHIER ditolak (error 42501).
3. **Test Estafet MATCH**: Kasir A setor ke bos Rp 2.500.000 dari total Rp 3.000.000 $\to$ sisa Rp 500.000. Kasir B input modal Rp 500.000 $\to$ status `MATCH`, tidak ada event `HEM`.
4. **Test Estafet DISCREPANCY (HEM)**: Kasir A sisa Rp 500.000. Kasir B input Rp 350.000 $\to$ status `DISCREPANCY` (-150.000), event `HEM` terbit (CRITICAL), HTTP response Kasir B tetap 201 sukses tanpa bocor nominal selisih.
5. **Test Multi-Terminal Isolation**: Kasir Meja 1 tutup sisa Rp 200.000, Meja 2 sisa Rp 800.000. Kasir Meja 1 buka Rp 200.000 $\to$ MATCH terhadap Meja 1 (bukan Meja 2).
6. **Test Jeda Operasional > 12 Jam**: Buka shift setelah jeda 14 jam diberi status `STANDALONE` tanpa memicu selisih.
7. **Test Produksi & ESLint**: Validasi linting 0 error dan kompilasi Next.js.
