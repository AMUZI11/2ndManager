# Spesifikasi Desain Teknis Tahap 5: The Anti-Theft Citadel
**Platform:** 2ndManager (Next.js 16 App Router, React 19, Supabase PostgreSQL, IndexedDB)  
**Tanggal:** 07 September 2026  
**Status:** DRAFT (Menunggu Persetujuan Eksekusi)

---

## 1. Ringkasan Eksekutif & Sasaran
Tahap 5 (The Anti-Theft Citadel) memperkokoh platform 2ndManager sebagai sistem operasi warung anti-bocor dengan 4 pilar keamanan transaksi:
1. **Double-Blind Estafet Shift Handover**: Serah terima shift kasir secara in-place di mana kasir keluar dan kasir pengganti sama-sama menghitung uang fisik tanpa melihat angka sistem maupun angka satu sama lain. Selisih langsung dievaluasi oleh stored procedure atomik di PostgreSQL.
2. **Stealth Anomaly Detection Engine (VAC, CIP, HEM)**: Algoritma pendeteksi kecurangan kasir berbasis heuristik di sisi klien yang berjalan senyap tanpa peringatan visual di layar kasir, dengan fail-safe buffer offline IndexedDB `telemetry_queue`.
3. **Smart Change FIFO Reconciler**: Mesin pembagian kembalian receh yang secara otomatis memotong utang kasbon tertua pelanggan secara berurutan (First-In, First-Out) dengan antarmuka mini-ledger transparan dan pencatatan mutasi piutang.
4. **Realtime Security Radar & Remote Panic Dispatch**: Pusat komando pemilik warung di `/radar` dengan live stream anomali via Supabase Realtime, audio sirine retro Web Audio API sintetis (zero-asset), kartu status register, dan protokol tombol darurat *Freeze Register* untuk membekukan terminal kasir secara remote.

---

## 2. Arsitektur Komponen & Alur Data

### 2.1 Double-Blind Estafet Shift Handover
```
[ Kasir Keluar ] ──( Langkah 1: Blind Count Pecahan Fisik )
       │
       ▼ (Validasi > 0, Lanjut F2)
[ Kasir Masuk ]  ──( Langkah 2: Pilih Nama Kasir, Input PIN 6-Digit, Input Modal Awal Fisik )
       │
       ▼ (Klik [ Kunci & Buka Shift Baru ])
[ RPC: execute_double_blind_handover ]
       ├── 1. Validasi Shift OPEN & Kasir Keluar
       ├── 2. Hitung Expected Cash Sistem
       ├── 3. Evaluasi diff_outgoing & diff_handoff
       ├── 4. Tutup Shift Lama ('CLOSED') & Buka Shift Baru ('OPEN')
       ├── 5. Jika |diff| > Threshold -> Insert security_anomaly_events & Broadcast
       └── 6. Return { success, old_shift_id, new_shift_id, requires_owner_review }
       │
       ▼
[ POS Terminal State ]
       ├── Cetak Slip Serah Terima (printReceiptDirect ESC/POS)
       ├── Switch Session Kasir In-Place (currentShift & currentUser)
       └── Reset Cart & Search
```

### 2.2 Dual-Control Remote Freeze & Panic Dispatch
```
[ Owner di /radar ] ──( Klik [ Freeze Register ] )
       │
       ▼
[ Supabase Realtime Channel: security_radar:{shopId} ] ──( Event: FREEZE_REGISTER )
       │
       ├── Update DB: registers.is_frozen = true, registers.frozen_reason = reason
       │
       ▼
[ POS Terminal /pos ]
       ├── Tampilkan FreezeRegisterOverlay.jsx (Arcade Brutalist #0B0F17, border-4 red-500)
       ├── Blokir Hotkey F1-F12 & Scanner Barcode
       │
       ├── Jalur Buka 1 (Remote): Dengarkan UNFREEZE_REGISTER dari /radar -> Tutup Overlay
       └── Jalur Buka 2 (Lokal): Masukkan 6-digit Owner PIN -> Verifikasi -> Kirim Audit -> Tutup Overlay
```

### 2.3 Smart Change FIFO Mini-Ledger
```
[ Transaksi POS: Kembalian > 0 & Pelanggan Terdata ]
       │
       ▼
[ calculateFifoDebtDeduction(changeAmount, activeDebts) ]
       ├── Sort Debts: created_at ASC (Tertua lebih dulu)
       ├── Alokasi Uang Kembalian ke Pokok Piutang
       ├── Sisa Uang Kembalian -> Opsi Masuk Celengan (customer_balances)
       │
       ▼
[ SmartChangeModal.jsx ]
       ├── Kartu Mini-Ledger: No. Bon, Tgl, Terpotong, Status [LUNAS] / [SISA]
       └── Kirim debt_allocations di payload transaksi
```

---

## 3. Rincian File & Perubahan Modul

### 3.1 Database & RPC
1. **`scratch/double_blind_handover_rpc.sql`**:
   - Fungsi PostgreSQL `execute_double_blind_handover`:
     - Parameter: `p_shift_id UUID, p_outgoing_cash_count NUMERIC, p_incoming_cash_count NUMERIC, p_incoming_cashier_id UUID, p_incoming_pin VARCHAR, p_notes TEXT`.
     - Menghitung arus kas laci: `starting_cash + cash_sales + debt_settled + savings_deposits + drawer_in - drawer_out - consignment_paid`.
     - Validasi PIN kasir pengganti.
     - Tutup shift lama dan buat shift baru secara atomik.
     - Pengecekan anomali: jika `|diff_outgoing| > 10.000` atau `|diff_handoff| > 5.000`, insert ke `security_anomaly_events` (tipe `SHIFT_DISCREPANCY`, severity `CRITICAL`).
     - Emit broadcast `pg_notify` / Supabase Realtime.

### 3.2 Utilitas & Mesin Logika (Utils)
1. **`src/utils/stealthTelemetry.js`**:
   - `emitStealthMetric(code, metadata)`:
     - Deteksi offline, buffer ke IndexedDB `telemetry_queue`.
     - Flush otomatis via `posSyncEngine.js` saat koneksi online terdeteksi.
     - Handler heuristik:
       - **VAC**: Pembatalan keranjang belanja $\ge \text{Rp } 25.000$ dalam tempo $< 7\text{ detik}$ setelah masuk fase bayar.
       - **CIP**: Penghapusan item $\ge 3$ kali atau total nilai barang yang dihapus $> \text{Rp } 30.000$.
       - **HEM**: Pembukaan laci kas $> 2$ kali dalam 15 menit tanpa transaksi tunai/kas laci resmi.
2. **`src/utils/smartChangeEngine.js`**:
   - `calculateFifoDebtDeduction(changeAmount, activeDebts)`:
     - Mengurutkan kasbon aktif (`created_at ASC`).
     - Mengalokasikan kembalian receh ke bon tertua hingga lunas atau kembalian habis.
     - Menghitung sisa uang untuk celengan belanja.
3. **`src/utils/sirenAudio.js`**:
   - Generator audio sirine darurat retro sintetis murni menggunakan Web Audio API `AudioContext` (`sawtooth` oscillator 800Hz - 400Hz - 800Hz, envelope 0.6s). Zero external asset.

### 3.3 Komponen Antarmuka (Components)
1. **`src/components/pos/CloseShiftModal.jsx`**:
   - Dirombak menjadi 2 langkah terisolasi dengan `useFocusTrap`:
     - **Langkah 1**: Hitung fisik buta (denominasi lembaran & koin), tanpa target sistem.
     - **Langkah 2**: Pilih kasir masuk, input PIN 6-digit (masked), input modal awal fisik yang diterima dari kasir keluar secara buta.
   - Eksekusi handover via RPC `execute_double_blind_handover`.
   - Cetak slip serah terima via ESC/POS driver.
   - Update state sesi kasir in-place di POS page.
2. **`src/components/pos/FreezeRegisterOverlay.jsx`**:
   - Overlay layar penuh Arcade Brutalist (`#0B0F17`, border-4 border-red-500) yang memblokir terminal kasir saat dibekukan oleh pemilik.
   - Mendengarkan event `UNFREEZE_REGISTER` dari realtime channel.
   - Sediakan input 6-digit PIN Owner untuk unfreeze fisik di tempat dengan pengamanan anti-bruteforce (delay 60s jika gagal 3x berturut-turut).
3. **`src/components/pos/SmartChangeModal.jsx`**:
   - Rincian kartu mini-ledger transparan daftar bon utang kasbon yang dipotong (No. Bon, Tanggal, Nominal Terpotong, Status LUNAS / SISA).
   - Opsi kedua untuk sisa kembalian (Tabung ke Celengan / Kembalikan Tunai).

### 3.4 Halaman & Rute Aplikasi (App Router)
1. **`src/app/(authenticated)/radar/page.js`**:
   - Pusat Kendali Keamanan Pemilik Warung (Arcade Brutalist Security Console).
   - Header: Latar `#0B0F17`, aksen amber/neon, toggle audio sirine `[ 🔊 Sirine Alarm: AKTIF/MATI ]`.
   - Kartu Kasir & Register Aktif: Menampilkan nama kasir bertugas, durasi shift, buka laci, serta tombol `[ 🚨 Freeze Register ]` / `[ 🔓 Unfreeze ]`.
   - Live Feed Anomali: Realtime card feed dengan badge merah `[ VAC ALERT ]`, oranye `[ CIP WARNING ]`, kuning `[ SHIFT DISCREPANCY ]`.
2. **`src/app/pos/page.js`**:
   - Integrasi `FreezeRegisterOverlay.jsx`.
   - Listener Supabase Realtime channel `security_radar:${shopId}` untuk menangkap event `FREEZE_REGISTER` dan `UNFREEZE_REGISTER`.
   - Integrasi heuristik VAC (penghitung waktu $< 7$ detik pembatalan bon setelah masuk fase bayar).
   - Integrasi heuristik HEM (pembukaan laci kas tanpa mutasi tunai).
   - In-place session switch saat estafet handover sukses.
3. **`src/config/tiers.js`**:
   - Feature gates:
     - `double_blind_handover`: Supervisor, Manajer, Eksekutif.
     - `stealth_telemetry_engine`: Manajer, Eksekutif.
     - `smart_change_reconciler`: Manajer, Eksekutif.
     - `realtime_security_radar`: Manajer, Eksekutif.
     - `remote_panic_dispatch`: Eksekutif.

---

## 4. Standar Higienitas & Pengujian
- **Zero Raw Emojis**: Menggunakan ikon Lucide-React SVG dengan `strokeWidth={2.5}`.
- **Zero Em-Dashes**: Menggunakan tanda hubung biasa (`-`) atau titik dua (`:`).
- **Automated Verification Suite**: `scratch/verify_phase5_anti_theft.cjs` yang memverifikasi seluruh perhitungan FIFO, alokasi handover, ambang batas heuristik, dan sintaks buffer.
- **Kompilasi Produksi**: `npx eslint` dan `npm run build` wajib lulus 100% dengan Exit Code 0.
