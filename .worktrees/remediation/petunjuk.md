# HL Manager Pro
## Master Product Document v2.0
### Gabungan PRD + Fitur Tutorial System

---

# 📌 DAFTAR ISI

```
BAGIAN 1 — EXECUTIVE OVERVIEW
BAGIAN 2 — USER PERSONA & RESEARCH
BAGIAN 3 — COMPLETE FEATURE LIST (PRD)
  3A — Core Features (Original)
  3B — Tutorial System (New Feature)
BAGIAN 4 — MVP SCOPE
BAGIAN 5 — UNIQUE SELLING PROPOSITION
BAGIAN 6 — DESIGN SYSTEM
  6A — Philosophy & Color
  6B — Typography & Components
  6C — Page-by-Page Specification
  6D — Tutorial UI Specification
BAGIAN 7 — ACCEPTANCE CRITERIA LENGKAP
  7A — Original AC (dari dokumen klien)
  7B — Tutorial System AC (baru)
BAGIAN 8 — DATABASE SCHEMA
BAGIAN 9 — API DESIGN
BAGIAN 10 — IMPLEMENTATION PLAN
BAGIAN 11 — NEXT DEVELOPMENT IDEAS
BAGIAN 12 — BUDGET & DELIVERABLES
BAGIAN 13 — RISK REGISTER
```

---

# BAGIAN 1 — EXECUTIVE OVERVIEW

---

## 1.1 Product Summary

| Field | Detail |
|-------|--------|
| **Nama Produk** | HL Manager Pro |
| **Versi Dokumen** | 2.0 (Master Consolidated) |
| **Tipe Produk** | Web Application (Mobile-Responsive, PWA-ready) |
| **Target User** | Single user — pemilik bisnis HL, usia 50–65 tahun |
| **Bahasa** | Bahasa Indonesia sepenuhnya |
| **Currency** | IDR (Rupiah) — tanpa PPN/tax |
| **Akuntansi** | Cash Basis (Lunas = recognized) |
| **Status Dokumen** | Final — Ready for Development |

---

## 1.2 Problem Statement

```
KONDISI SAAT INI (Before HL Manager Pro):

  📒 Buku tulis / Excel manual
       ↓
  ❌ Salah hitung diskon bertingkat
  ❌ Piutang tidak terpantau
  ❌ Bonus pelanggan terlewat / salah hitung
  ❌ Rekap bulanan makan waktu berjam-jam
  ❌ Tidak ada laporan yang bisa dicetak cepat
  ❌ Pengguna baru (lansia) bingung pakai sistem digital

KONDISI SETELAH HL Manager Pro:

  💻 Satu aplikasi web, bisa dari HP / laptop
       ↓
  ✅ Kalkulasi 100% otomatis & akurat
  ✅ Piutang real-time terpantau
  ✅ Notifikasi bonus otomatis
  ✅ Rekap instan, export PDF 1 klik
  ✅ Tutorial interaktif built-in — belajar sambil pakai
```

---

## 1.3 Product Vision

> **"Menjadi sistem manajemen bisnis paling mudah digunakan oleh pemilik usaha generasi 50+, dengan kecerdasan kalkulasi setara akuntan dan keramahan sebuah asisten pribadi."**

---

## 1.4 Success Metrics

| Metrik | Baseline (Sekarang) | Target (3 Bulan Post-Launch) |
|--------|--------------------|-----------------------------|
| Error kalkulasi diskon | Sering terjadi | 0% |
| Waktu input 1 bon | ~10 menit manual | < 3 menit |
| Task completion tanpa bantuan | ~20% | > 90% |
| Piutang tertunggak terdeteksi | Tidak terpantau | 100% akurat |
| Bonus tidak terlewat | Sering terlewat | 100% ternotifikasi |
| User selesai onboarding mandiri | 0% | > 85% via tutorial |
| Waktu belajar pakai sistem | Butuh orang lain | < 30 menit via tutorial |

---

# BAGIAN 2 — USER PERSONA & RESEARCH

---

## 2.1 Primary User Persona

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  👤 PERSONA UTAMA: "Pak/Bu HL"                              │
│  ─────────────────────────────────────────────────────────  │
│  Usia        : 50–65 tahun                                  │
│  Pendidikan  : SMA / D3 / S1                                │
│  Pekerjaan   : Pemilik & operator bisnis HL                 │
│  Device      : Smartphone Android (utama) + Laptop/PC       │
│  Tech Level  : Rendah–Sedang                                │
│                                                              │
│  YANG BIASA DILAKUKAN:                                       │
│  • Aktif WhatsApp — terbiasa chat & foto                    │
│  • Pakai kalkulator HP untuk hitung-hitungan                │
│  • Tulis nota di buku                                       │
│  • Sesekali pakai Excel tapi tidak mahir                    │
│                                                              │
│  KEBUTUHAN UTAMA:                                            │
│  • Tombol besar, tulisan jelas                               │
│  • Bahasa Indonesia sederhana (bukan jargon IT)             │
│  • Konfirmasi setelah setiap aksi penting                   │
│  • Bisa belajar sendiri tanpa minta tolong                  │
│  • Tidak takut salah tekan tombol                           │
│                                                              │
│  PAIN POINTS:                                                │
│  • "Saya takut salah pencet nanti datanya hilang"           │
│  • "Diskonnya beda-beda, saya sering salah hitung"          │
│  • "Siapa ya yang belum bayar bulan ini?"                   │
│  • "Bonusnya Bu X sudah berapa ya?"                         │
│  • "Kalau ada aplikasi baru, saya bingung mulai dari mana"  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## 2.2 Secondary User Persona (Fase 2)

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  👤 PERSONA SEKUNDER: "Asisten / Anak"                      │
│  ─────────────────────────────────────────────────────────  │
│  Usia        : 20–30 tahun (Gen Z / Millennial)             │
│  Role        : Membantu bisnis orang tua                    │
│  Tech Level  : Tinggi                                        │
│                                                              │
│  KEBUTUHAN:                                                  │
│  • Tampilan lebih modern (Gen Z Mode — Fase 2)              │
│  • Bisa lihat data dengan cepat                             │
│  • Shortcut & navigasi efisien                              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

# BAGIAN 3 — COMPLETE FEATURE LIST (PRD)

---

## 3A — CORE FEATURES

### Module 1: Authentication

**Deskripsi:** Sistem login single-user yang aman dan sederhana.

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-1.1 | Single user login (username + password) | P0 | AC-1.1, 1.2 |
| FR-1.2 | Redirect ke dashboard setelah login berhasil | P0 | AC-1.3 |
| FR-1.3 | Pesan error merah jelas saat login gagal | P0 | AC-1.4 |
| FR-1.4 | Sesi persisten hingga logout | P0 | AC-1.5 |
| FR-1.5 | Tombol logout selalu tersedia | P0 | AC-1.5 |
| FR-1.6 | Session timeout 8 jam (keamanan) | P1 | — |

**User Flow Login:**
```
Buka App
   ↓
Halaman Login
   ↓
[Isi Username + Password]
   ↓
Klik MASUK
   ↓
Valid? ──YES──→ Dashboard ──→ Mulai Kerja
  │
  NO
  ↓
Pesan error merah
"Username atau password salah.
 Silakan coba lagi."
  ↓
Tetap di halaman Login
```

---

### Module 2: Customer Management (CRUD)

**Deskripsi:** Kelola data pelanggan beserta diskon bertingkat dan threshold bonus.

**Data Model Pelanggan:**
```
Customer {
  nama               : string (wajib)
  diskon_LM          : ordered array of % [d1, d2, ...dn]
  diskon_BR          : ordered array of % [d1, d2, ...dn]
  bonus_threshold    : integer IDR (e.g. 10.000.000)
  is_deleted         : boolean (soft-delete)
}
```

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-2.1 | Buat pelanggan baru (nama wajib) | P0 | AC-2.1 |
| FR-2.2 | Edit semua field pelanggan | P0 | AC-2.2 |
| FR-2.3 | Soft-delete pelanggan (data historis tetap ada) | P0 | AC-2.3 |
| FR-2.4 | Diskon terpisah untuk LM dan BR | P0 | AC-2.4 |
| FR-2.5 | Diskon berupa ordered list (urutan menentukan kalkulasi) | P0 | AC-2.5 |
| FR-2.6 | Tambah / edit / hapus step diskon individual | P0 | AC-2.6 |
| FR-2.7 | Validasi nilai diskon: angka, 0–100 | P0 | AC-2.7 |
| FR-2.8 | Input bonus threshold (nominal Rp) | P0 | AC-2.8 |
| FR-2.9 | Preview hasil kalkulasi cascading saat edit diskon | P1 | AC-2.9 |

**Cascading Discount Formula:**
```
Harga Dasar (B) = misal Rp 100.000
Diskon LM = [20%, 20%, 10%]

Langkah:
  B × (1 - 0.20) = 80.000
  80.000 × (1 - 0.20) = 64.000
  64.000 × (1 - 0.10) = 57.600  ← Harga akhir

⚠️ BUKAN 100.000 × (1 - 0.50) = 50.000
   Efektif diskon: 42.4%, BUKAN 50%
```

---

### Module 3: Product Management (CRUD)

**Deskripsi:** Kelola katalog produk dengan harga modal dan harga jual.

**Data Model Produk:**
```
Product {
  nama          : string (wajib)
  harga_modal   : integer IDR ≥ 0  (rahasia, hanya untuk kalkulasi laba)
  harga_base    : integer IDR ≥ 0  (harga jual sebelum diskon)
  tipe          : enum ['LM', 'BR']
  is_deleted    : boolean (soft-delete)
}
```

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-3.1 | CRUD produk lengkap | P0 | AC-3.1 |
| FR-3.2 | Tipe produk hanya LM atau BR (dropdown) | P0 | AC-3.2 |
| FR-3.3 | Validasi harga: angka, ≥ 0 | P0 | AC-3.3 |
| FR-3.4 | Harga modal tidak pernah ditampilkan sebagai harga ke pelanggan | P0 | AC-3.4 |
| FR-3.5 | Soft-delete produk | P0 | AC-3.5 |
| FR-3.6 | Filter daftar produk berdasarkan tipe LM/BR | P1 | — |

---

### Module 4: Transaction (Bon) Management

**Deskripsi:** Inti operasional — mencatat setiap transaksi penjualan dengan kalkulasi otomatis.

**Data Model Transaksi:**
```
Transaction (Bon) {
  nomor_bon       : string (unik, wajib)
  tanggal         : date (default: hari ini, bisa diubah)
  customer_id     : FK → Customer (wajib, dari daftar)
  items[]         : array of line items
  ongkir          : integer IDR ≥ 0
  deskripsi       : string (opsional)
  is_bonus        : boolean (false = normal, true = bon bonus)
  status          : enum ['Piutang', 'Lunas'] — default: Piutang
  tanggal_lunas   : date (diisi saat pelunasan)
}

TransactionItem (Line Item) {
  product_id              : FK → Product
  quantity                : integer ≥ 1
  harga_base_snapshot     : integer (harga saat transaksi dibuat)
  harga_modal_snapshot    : integer (harga modal saat transaksi dibuat)
  discounted_unit_price   : integer (hasil kalkulasi cascading)
  line_omzet              : integer
  line_laba               : integer
  is_bonus_item           : boolean
}
```

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-4.1 | Tanggal default hari ini, bisa diubah | P0 | AC-4.1 |
| FR-4.2 | Nomor bon unik & wajib, duplikat ditolak dengan pesan jelas | P0 | AC-4.2 |
| FR-4.3 | Pilih pelanggan dari daftar (bukan teks bebas) | P0 | AC-4.3 |
| FR-4.4 | Pilih produk dari katalog (bukan teks bebas) | P0 | AC-4.4 |
| FR-4.5 | Multi-line produk, quantity ≥ 1 per baris | P0 | AC-4.5 |
| FR-4.6 | Setiap baris tampilkan tipe (LM/BR) + harga diskon otomatis | P0 | AC-4.6 |
| FR-4.7 | Diskon tidak diinput manual — otomatis dari pelanggan × tipe | P0 | AC-4.7 |
| FR-4.8 | Ongkir per transaksi (bukan per baris), ≥ 0 | P0 | AC-4.8 |
| FR-4.9 | Status default: Piutang | P0 | AC-4.9 |
| FR-4.10 | View, edit, delete bon | P0 | AC-4.10 |
| FR-4.11 | Kalkulasi ulang otomatis saat bon diedit | P0 | AC-4.10.1 |
| FR-4.12 | Tampilkan: omzet per baris, total omzet, ongkir, total tagihan | P0 | AC-4.11 |

**Kalkulasi Per Transaksi (Master Formula):**
```
┌────────────────────────────────────────────────────────────┐
│  FORMULA KALKULASI (Single Source of Truth)               │
│                                                            │
│  Discounted Unit Price                                     │
│    = Harga Base × Π(1 - dᵢ/100)                          │
│    (cascading, bukan dijumlah)                             │
│                                                            │
│  Line Omzet = Discounted Unit Price × Qty                  │
│                                                            │
│  Transaction Omzet = Σ Line Omzet  (ONGKIR EXCLUDED)      │
│                                                            │
│  Amount Owed (Piutang) = Transaction Omzet + Ongkir        │
│                                                            │
│  Line Laba HL = (Discounted Price - Harga Modal) × Qty     │
│                                                            │
│  Transaction Laba HL = Σ Line Laba  (ONGKIR EXCLUDED)     │
│                                                            │
│  Recognized Omzet = Σ Omzet WHERE status = 'Lunas'        │
│  Recognized Laba  = Σ Laba   WHERE status = 'Lunas'        │
│                                                            │
│  ⚠️ Ongkir: pass-through — tidak mempengaruhi Laba HL     │
│  ⚠️ Cash basis: Omzet & Laba hanya diakui saat Lunas      │
└────────────────────────────────────────────────────────────┘
```

---

### Module 5: Bonus Logic

**Deskripsi:** Sistem bonus otomatis berdasarkan akumulasi omzet Lunas per pelanggan.

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-5.1 | Threshold bonus per pelanggan (Rp) | P0 | AC-5.1 |
| FR-5.2 | Hitung akumulasi omzet Lunas per pelanggan secara real-time | P0 | AC-5.2 |
| FR-5.3 | Bonus tersedia = floor(akumulasi / threshold) - bonus sudah diberikan | P0 | AC-5.3 |
| FR-5.4 | Notifikasi/flag jika ada bonus tersedia | P0 | AC-5.4 |
| FR-5.5 | Bon bonus: is_bonus = true | P0 | AC-5.5 |
| FR-5.6 | Bisa include beberapa bonus dalam 1 bon | P0 | AC-5.5 |
| FR-5.7 | Setiap 1 bonus mengkonsumsi 1 threshold, sisa carry over | P0 | AC-5.6 |
| FR-5.8 | Item bonus: omzet = 0, laba = 0 (gratis, tidak pengaruhi profit) | P0 | AC-5.7 |
| FR-5.9 | Bon bonus terlihat berbeda di daftar & laporan | P0 | AC-5.8 |

**Skenario Bonus (Worked Example):**
```
Customer A:
  Threshold          = Rp 10.000.000
  Akumulasi Lunas    = Rp 25.000.000
  Bonus sudah dapat  = 0

Kalkulasi:
  floor(25.000.000 / 10.000.000) - 0 = 2 bonus tersedia

User membuat 1 bon bonus dengan 2 bonus:
  Dikonsumsi    = 2 × Rp 10.000.000 = Rp 20.000.000
  Carry over    = Rp 25.000.000 - Rp 20.000.000 = Rp 5.000.000
  Item produk   → omzet Rp 0, laba Rp 0
```

---

### Module 6: Customer Detail Page

**Deskripsi:** Halaman detail per pelanggan menampilkan semua aktivitas terkelompok per bulan.

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-6.1 | Transaksi dikelompokkan per bulan (selector bulan/tahun) | P0 | AC-6.1 |
| FR-6.2 | Per bulan: list bon, total piutang, total dibayar, omzet, laba | P0 | AC-6.2 |
| FR-6.3 | Omzet tampil dalam kolom terpisah: LM, BR, Total | P0 | AC-6.3 |
| FR-6.4 | Download PDF: daftar piutang & daftar transaksi | P1 | AC-6.4 |
| FR-6.5 | Pelunasan seluruh bulan (modal: tanggal pelunasan) | P0 | AC-6.5 |
| FR-6.6 | Pelunasan 1 bon (modal: tanggal pelunasan) | P0 | AC-6.6 |
| FR-6.7 | Update total real-time setelah pelunasan | P0 | AC-6.7 |
| FR-6.8 | Bon Lunas tidak bisa di-settle ulang, tampil berbeda visual | P0 | AC-6.8 |
| FR-6.9 | Klik bon → detail lengkap (baris, qty, harga, ongkir, omzet, status) | P0 | AC-6.9 |

**Settlement Flow:**
```
PELUNASAN 1 BON:
  Buka detail Bon
    ↓
  Klik [LUNAS]
    ↓
  Modal muncul:
  "Masukkan Tanggal Bayar"
  [  5 Januari 2025  ] ← date picker
  [Batal]   [Konfirmasi]
    ↓
  Konfirmasi
    ↓
  Status bon → Lunas
  Tanggal lunas disimpan
  Omzet & Laba diakui (cash basis)
  Total dashboard update real-time

PELUNASAN 1 BULAN PENUH:
  (sama, tapi semua bon dalam bulan itu sekaligus)
```

---

### Module 7: Recap / Reporting

**Deskripsi:** Laporan keuangan ringkas dengan berbagai filter dan export PDF.

| Req ID | Requirement | Prioritas | AC Ref |
|--------|-------------|-----------|--------|
| FR-7.1 | Rekap per pelanggan | P1 | AC-7.1 |
| FR-7.2 | Rekap per tipe produk (LM / BR) | P1 | AC-7.2 |
| FR-7.3 | Rekap keseluruhan semua pelanggan | P1 | AC-7.3 |
| FR-7.4 | Filter per bulan dan per tahun | P1 | AC-7.4 |
| FR-7.5 | Setiap rekap tampilkan: Omzet Lunas, Laba Lunas, Piutang Outstanding, Sudah Dibayar | P1 | AC-7.5 |
| FR-7.6 | Breakdown LM vs BR per rekap | P1 | AC-7.5 |
| FR-7.7 | Total Laba HL lintas semua pelanggan (rekap overall) | P1 | AC-7.6 |
| FR-7.8 | Bonus transaction excluded dari omzet/laba, ada bonus log terpisah | P1 | AC-7.7 |
| FR-7.9 | Export rekap ke PDF | P1 | AC-7.8 |

---

## 3B — TUTORIAL SYSTEM (NEW FEATURE)

---

### Latar Belakang Penambahan Fitur Tutorial

```
KENAPA TUTORIAL SYSTEM PENTING?

User utama adalah lansia (50–65 tahun) dengan tech literacy rendah.
Tanpa panduan built-in:
  ❌ User bingung mulai dari mana
  ❌ Butuh orang lain untuk ajari
  ❌ Takut salah pencet → tidak mau pakai
  ❌ Support cost tinggi untuk developer/tim

Dengan Tutorial System:
  ✅ User bisa onboarding mandiri < 30 menit
  ✅ Panduan kontekstual — muncul saat dibutuhkan
  ✅ Tidak perlu buku manual terpisah
  ✅ Bisa diulang kapan saja
  ✅ Kepercayaan diri user meningkat
```

---

### Module 8: Tutorial System

**Deskripsi:** Sistem panduan interaktif built-in yang membantu user belajar menggunakan aplikasi secara mandiri, terdiri dari 4 komponen utama yang saling melengkapi.

```
ARSITEKTUR TUTORIAL SYSTEM

┌─────────────────────────────────────────────────────────────┐
│                   TUTORIAL SYSTEM                           │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  KOMPONEN 1  │  │  KOMPONEN 2  │  │     KOMPONEN 3      │ │
│  │  Onboarding  │  │  Contextual  │  │   Tutorial Mode     │ │
│  │    Tour      │  │    Tooltip   │  │   (Step-by-Step)    │ │
│  │             │  │             │  │                     │ │
│  │ Muncul 1x   │  │ Muncul saat │  │  User aktifkan      │ │
│  │ saat first  │  │ hover/tap ? │  │  sendiri kapanpun   │ │
│  │ login       │  │             │  │                     │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    KOMPONEN 4                        │  │
│  │              Video Panduan Singkat                   │  │
│  │         (Embedded atau link ke video lokal)          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

#### 8.1 Komponen 1: Onboarding Tour (First Login)

**Deskripsi:** Tur panduan otomatis yang muncul HANYA satu kali saat pengguna pertama kali login ke sistem.

| Req ID | Requirement | Prioritas |
|--------|-------------|-----------|
| TU-1.1 | Tur onboarding otomatis muncul saat first login | P0 |
| TU-1.2 | User bisa skip tur kapan saja | P0 |
| TU-1.3 | Progress indicator: "Langkah X dari Y" | P0 |
| TU-1.4 | Tombol Lanjut & Kembali di setiap langkah | P0 |
| TU-1.5 | Overlay gelap dengan spotlight pada elemen yang dijelaskan | P0 |
| TU-1.6 | Balon penjelasan (tooltip bubble) dengan teks bahasa Indonesia sederhana | P0 |
| TU-1.7 | Status "tour selesai" disimpan — tidak muncul lagi saat login berikutnya | P0 |
| TU-1.8 | User bisa ulangi tur dari menu Bantuan | P1 |
| TU-1.9 | Tur bisa di-pause dan dilanjut sesi berikutnya | P1 |

**Konten Onboarding Tour (8 Langkah):**
```
LANGKAH 1: Selamat Datang
  Elemen  : Modal center screen (bukan overlay elemen)
  Judul   : "Selamat Datang di HL Manager! 👋"
  Isi     : "Kami akan bantu Bapak/Ibu mengenal
             aplikasi ini dalam 2 menit.
             Klik MULAI untuk memulai."
  Tombol  : [Lewati] [MULAI →]

LANGKAH 2: Dashboard (Ringkasan Bisnis)
  Elemen  : Highlight area stat cards
  Judul   : "📊 Ini Ringkasan Bisnis Anda"
  Isi     : "Di sini Bapak/Ibu bisa langsung melihat:
             • Berapa piutang yang belum dibayar
             • Berapa yang sudah dibayar
             • Laba bulan ini
             Informasi ini update otomatis setiap saat."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 3: Notifikasi Bonus
  Elemen  : Highlight area bonus alert (jika ada) / area placeholder
  Judul   : "🎁 Bonus Pelanggan"
  Isi     : "Kalau ada pelanggan yang sudah berhak
             dapat bonus, pemberitahuan akan muncul
             di sini. Bapak/Ibu tinggal klik untuk
             membuat bon bonus."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 4: Menu Pelanggan
  Elemen  : Highlight menu/ikon Pelanggan di navigasi
  Judul   : "👥 Menu Pelanggan"
  Isi     : "Di sini Bapak/Ibu bisa:
             • Tambah pelanggan baru
             • Lihat riwayat transaksi per pelanggan
             • Atur diskon per pelanggan
             Klik menu ini kapan pun butuh cek pelanggan."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 5: Menu Produk
  Elemen  : Highlight menu/ikon Produk
  Judul   : "📦 Menu Produk"
  Isi     : "Daftar semua produk yang Bapak/Ibu jual.
             Tambah produk baru di sini.
             Harga dan tipe produk tersimpan otomatis."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 6: Tombol Buat Bon
  Elemen  : Highlight tombol BON BARU (CTA utama)
  Judul   : "➕ Buat Bon Baru (yang paling sering dipakai!)"
  Isi     : "Setiap ada transaksi penjualan,
             klik tombol ini.
             Nanti harga diskon dihitung otomatis —
             Bapak/Ibu tidak perlu hitung manual."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 7: Menu Laporan
  Elemen  : Highlight menu Laporan
  Judul   : "📋 Laporan Bisnis"
  Isi     : "Rekap omzet, laba, dan piutang
             bisa dilihat di sini.
             Bisa difilter per bulan.
             Bisa dicetak / disimpan PDF."
  Tombol  : [← Kembali] [Lanjut →]

LANGKAH 8: Selesai
  Elemen  : Modal center screen
  Judul   : "Siap Memulai! 🎉"
  Isi     : "Tur singkat selesai!
             Kalau sewaktu-waktu lupa caranya,
             klik tombol [?] di pojok kanan atas
             untuk buka panduan lagi.
             Selamat bekerja, Bapak/Ibu!"
  Tombol  : [MULAI GUNAKAN APLIKASI ✓]
```

---

#### 8.2 Komponen 2: Contextual Tooltip

**Deskripsi:** Ikon tanda tanya kecil (?) di samping setiap elemen kompleks. Saat di-tap, muncul penjelasan singkat tanpa meninggalkan halaman.

| Req ID | Requirement | Prioritas |
|--------|-------------|-----------|
| TU-2.1 | Ikon ? tersedia di samping setiap field/fitur yang kompleks | P0 |
| TU-2.2 | Tap ikon ? → muncul tooltip bubble dengan penjelasan singkat | P0 |
| TU-2.3 | Tooltip bisa ditutup dengan tap di luar area | P0 |
| TU-2.4 | Tooltip tidak mengganggu form / interaksi utama | P0 |
| TU-2.5 | Tooltip muncul di posisi yang tidak menutupi konten penting | P0 |
| TU-2.6 | Konten tooltip: bahasa Indonesia sederhana, max 3 kalimat | P0 |
| TU-2.7 | Tooltip ada opsi "Pelajari lebih lanjut" yang link ke panduan lengkap | P1 |

**Daftar Tooltip Wajib Ada:**
```
HALAMAN PELANGGAN:
  [?] di "Diskon LM"
    → "Diskon untuk produk tipe LM (Langsung Minum).
       Bisa lebih dari satu tahap — sistem hitung otomatis.
       Contoh: 20% lalu 10% = bukan 30%, tapi dihitung bertahap."

  [?] di "Diskon BR"
    → "Diskon untuk produk tipe BR.
       Sama dengan LM tapi untuk jenis produk berbeda."

  [?] di "Threshold Bonus"
    → "Pelanggan dapat bonus gratis setelah
       omzet yang sudah dibayar (Lunas) mencapai
       jumlah ini. Contoh: Rp 10.000.000."

HALAMAN BUAT BON:
  [?] di "Nomor Bon"
    → "Nomor unik untuk bon ini.
       Tidak boleh sama dengan bon lain.
       Contoh: BON-001, atau 2025/01/001."

  [?] di "Omzet"
    → "Total nilai penjualan (harga diskon × jumlah).
       Ongkir tidak dihitung dalam omzet."

  [?] di "Ongkir"
    → "Biaya kirim yang dibayar pelanggan.
       Biaya ini tidak menambah atau mengurangi laba HL."

  [?] di "Status: Piutang/Lunas"
    → "Piutang = pelanggan belum bayar.
       Lunas = sudah bayar.
       Omzet dan laba baru dihitung saat Lunas."

HALAMAN LAPORAN:
  [?] di "Omzet"
    → "Total penjualan dari bon yang sudah Lunas.
       Belum termasuk bon yang masih Piutang."

  [?] di "Laba HL"
    → "Keuntungan bersih = harga jual diskon - harga modal.
       Ongkir tidak dihitung dalam laba."

  [?] di "Bon Bonus"
    → "Bon khusus untuk pemberian produk gratis.
       Tidak dihitung sebagai pendapatan atau piutang."
```

---

#### 8.3 Komponen 3: Tutorial Mode (Step-by-Step Interactive)

**Deskripsi:** Mode tutorial interaktif yang bisa diaktifkan kapan saja dari menu Bantuan. Berbeda dengan onboarding (pasif), tutorial mode ini memandu user melakukan aksi nyata di aplikasi.

| Req ID | Requirement | Prioritas |
|--------|-------------|-----------|
| TU-3.1 | Menu "Bantuan & Panduan" tersedia di navigasi utama | P0 |
| TU-3.2 | Halaman Bantuan menampilkan daftar topik tutorial | P0 |
| TU-3.3 | Setiap tutorial berupa panduan langkah interaktif (guided steps) | P0 |
| TU-3.4 | Tutorial mode aktifkan overlay + highlight elemen aktif | P0 |
| TU-3.5 | User tidak bisa klik elemen lain saat tutorial aktif (kecuali yang diarahkan) | P0 |
| TU-3.6 | Ada progress bar "Langkah X dari Y" | P0 |
| TU-3.7 | Tombol Keluar Tutorial tersedia di setiap langkah | P0 |
| TU-3.8 | Tutorial bisa di-pause, lanjut sesi berikutnya | P1 |
| TU-3.9 | Setelah tutorial selesai, badge "Sudah Dipelajari ✓" tampil di topik | P1 |
| TU-3.10 | Tutorial menggunakan data demo (tidak memodifikasi data asli) | P0 |

**Daftar Tutorial Topics:**
```
TUTORIAL TERSEDIA:

  📚 DASAR (Pemula)
  ├── TUT-01: Cara Menambah Pelanggan Baru            [~3 menit]
  ├── TUT-02: Cara Menambah Produk Baru              [~2 menit]
  ├── TUT-03: Cara Membuat Bon Penjualan             [~5 menit]
  └── TUT-04: Cara Melihat Daftar Piutang            [~2 menit]

  📚 MENENGAH
  ├── TUT-05: Cara Melunaskan Bon (1 bon)            [~2 menit]
  ├── TUT-06: Cara Melunaskan Seluruh Bulan          [~2 menit]
  ├── TUT-07: Cara Mengatur Diskon Pelanggan         [~4 menit]
  └── TUT-08: Cara Melihat Laporan & Export PDF      [~3 menit]

  📚 LANJUTAN
  ├── TUT-09: Cara Membuat Bon Bonus                 [~4 menit]
  ├── TUT-10: Memahami Omzet, Laba, dan Piutang      [~5 menit]
  └── TUT-11: Cara Mengedit dan Menghapus Data       [~3 menit]
```

**Detail Konten Tutorial TUT-03 (Contoh Paling Kompleks):**
```
TUT-03: CARA MEMBUAT BON PENJUALAN
Total Langkah: 12 | Estimasi waktu: ~5 menit
Data: Menggunakan mode demo (tidak simpan ke data asli)

LANGKAH 1/12
  Highlight : Tombol "BON BARU" di dashboard
  Instruksi : "Untuk membuat bon baru, klik tombol
               besar [BON BARU] ini."
  Aksi      : User harus klik tombol tersebut untuk lanjut

LANGKAH 2/12
  Highlight : Field "Nomor Bon"
  Instruksi : "Isi Nomor Bon. Contoh: BON-001.
               Nomor ini tidak boleh sama dengan bon lain."
  Aksi      : User mengisi field (demo mode)

LANGKAH 3/12
  Highlight : Field "Tanggal"
  Instruksi : "Tanggal sudah terisi otomatis hari ini.
               Bisa diubah jika perlu."
  Aksi      : Tap LANJUT (tidak perlu aksi khusus)

LANGKAH 4/12
  Highlight : Dropdown "Pilih Pelanggan"
  Instruksi : "Pilih nama pelanggan dari daftar.
               Ketik nama untuk mencari lebih cepat."
  Aksi      : User memilih pelanggan demo

LANGKAH 5/12
  Highlight : Bagian "Produk" + tombol "Tambah Produk"
  Instruksi : "Klik [+ Tambah Produk] untuk menambahkan
               barang yang dijual."
  Aksi      : User klik tombol Tambah Produk

LANGKAH 6/12
  Highlight : Dropdown pilih produk di baris baru
  Instruksi : "Pilih produk dari daftar.
               Tipe dan harga diskon muncul otomatis —
               Bapak/Ibu tidak perlu hitung sendiri!"
  Aksi      : User memilih produk demo

LANGKAH 7/12
  Highlight : Field "Jumlah" (quantity) di baris produk
  Instruksi : "Isi jumlah barang yang dijual.
               Omzet langsung dihitung otomatis."
  Aksi      : User mengisi quantity

LANGKAH 8/12
  Highlight : Area kalkulasi baris (harga diskon, omzet baris)
  Instruksi : "Lihat! Harga diskon dan omzet sudah
               dihitung otomatis berdasarkan diskon
               pelanggan yang dipilih."
  Aksi      : Tap LANJUT

LANGKAH 9/12
  Highlight : Field "Ongkir"
  Instruksi : "Isi ongkos kirim jika ada.
               Kalau tidak ada ongkir, isi 0 atau kosongkan."
  Aksi      : User mengisi ongkir (demo)

LANGKAH 10/12
  Highlight : Area ringkasan total (omzet, ongkir, total tagihan)
  Instruksi : "Di sini bisa dilihat ringkasan:
               • Total Omzet (belum termasuk ongkir)
               • Ongkir
               • Total yang harus dibayar pelanggan"
  Aksi      : Tap LANJUT

LANGKAH 11/12
  Highlight : Dropdown "Status" (Piutang/Lunas)
  Instruksi : "Status otomatis 'Piutang' karena pelanggan
               biasanya belum langsung bayar.
               Bisa diubah ke 'Lunas' kalau sudah bayar."
  Aksi      : Tap LANJUT

LANGKAH 12/12
  Highlight : Tombol "SIMPAN BON"
  Instruksi : "Klik SIMPAN BON untuk menyimpan.
               (Di mode latihan ini, data tidak tersimpan)
               Bon asli bisa dibuat dari menu BON BARU!"
  Aksi      : Tap SELESAI

SELESAI:
  Modal: "Tutorial selesai! 🎉
          Sekarang Bapak/Ibu sudah tahu cara
          membuat bon baru.
          Mau langsung coba buat bon sungguhan?"
  Tombol: [Buat Bon Sekarang] [Kembali ke Panduan]
```

---

#### 8.4 Komponen 4: Pusat Bantuan (Help Center)

**Deskripsi:** Halaman terpusat berisi semua panduan, FAQ, dan akses ke semua tutorial.

| Req ID | Requirement | Prioritas |
|--------|-------------|-----------|
| TU-4.1 | Halaman Bantuan accessible dari nav utama | P0 |
| TU-4.2 | Tampilkan daftar semua tutorial terkelompok (Dasar/Menengah/Lanjutan) | P0 |
| TU-4.3 | Tampilkan FAQ (Pertanyaan Sering Ditanya) | P0 |
| TU-4.4 | Setiap item FAQ expandable (accordion style) | P0 |
| TU-4.5 | Pencarian artikel bantuan (search bar) | P1 |
| TU-4.6 | Tombol "Ulangi Tur Pengenalan" untuk ulangi onboarding tour | P1 |
| TU-4.7 | Panduan PDF bisa diunduh dari halaman bantuan | P1 |
| TU-4.8 | Glosarium istilah: LM, BR, Omzet, Laba, Piutang, Bon, dll. | P0 |

**Konten FAQ (Minimum):**
```
PERTANYAAN SERING DITANYA:

Q: Apa bedanya Piutang dan Lunas?
A: Piutang = pelanggan belum membayar.
   Lunas = pelanggan sudah membayar.
   Omzet dan laba baru dihitung saat bon sudah Lunas.

Q: Kenapa diskon saya berbeda dari yang saya hitung?
A: Diskon di aplikasi ini dihitung bertingkat (cascading),
   bukan dijumlahkan. Contoh: diskon 20% lalu 10%
   BUKAN berarti 30%, tapi dihitung: harga × 80% × 90%.
   Ini cara hitung yang benar dan akurat.

Q: Bagaimana cara tahu pelanggan berhak dapat bonus?
A: Notifikasi kuning akan muncul di dashboard otomatis.
   Tidak perlu hitung manual.

Q: Kalau saya hapus pelanggan, data bonnya hilang tidak?
A: Tidak. Data historis tetap aman.
   Pelanggan hanya tidak muncul di pilihan bon baru.

Q: Bagaimana cara cetak laporan?
A: Buka menu Laporan, atur filter bulan/tahun,
   lalu klik tombol "Unduh PDF".

Q: Apa itu Ongkir dan apakah mempengaruhi laba?
A: Ongkir = ongkos kirim yang dibayar pelanggan.
   Ongkir TIDAK mempengaruhi laba HL — hanya diteruskan.

Q: Kalau saya salah isi bon, bisa diubah?
A: Bisa. Buka bon yang ingin diubah, klik Edit,
   perbaiki, lalu simpan. Semua angka dihitung ulang.

Q: Kenapa nomor bon tidak bisa sama?
A: Setiap bon harus punya nomor unik agar mudah
   dilacak. Gunakan sistem penomoran seperti
   BON-001, BON-002, dst.

Q: Apa itu Harga Modal?
A: Harga yang dibayar HL ke supplier.
   Dipakai untuk hitung laba — tidak ditampilkan ke pelanggan.

Q: Bagaimana cara ulangi tutorial kalau lupa?
A: Buka menu Bantuan → pilih topik yang ingin dipelajari
   → klik Mulai Tutorial.
```

**Glosarium:**
```
GLOSARIUM ISTILAH:

Bon       : Nota / faktur transaksi penjualan
LM        : Langsung Minum — tipe produk
BR        : Berbagai Rasa — tipe produk (sesuaikan dengan bisnis HL)
Omzet     : Total nilai penjualan (harga diskon × jumlah)
Laba HL   : Keuntungan = harga jual diskon - harga modal
Piutang   : Belum dibayar pelanggan
Lunas     : Sudah dibayar pelanggan
Ongkir    : Ongkos kirim — diteruskan ke pelanggan
Diskon    : Potongan harga
Threshold : Batas minimum omzet untuk dapat bonus
Rekap     : Ringkasan laporan keuangan periode tertentu
Cash Basis: Sistem akuntansi — omzet/laba diakui saat bayar (Lunas)
```

---

### 8.5 Tutorial System — State Management

```
TUTORIAL STATE (disimpan per user di database):

tutorial_progress {
  user_id              : FK → users
  onboarding_completed : boolean (default: false)
  onboarding_step      : integer (langkah terakhir jika di-pause)
  tutorials_completed  : array of tutorial_ids yang sudah selesai
  tutorials_in_progress: array of { tutorial_id, last_step }
  last_updated         : timestamp
}

LOGIKA:
  1. First login → cek onboarding_completed
     → false: mulai onboarding tour
     → true: skip, langsung dashboard

  2. User buka Bantuan → tampil semua tutorial
     → badge ✓ pada yang sudah completed
     → "Lanjutkan" pada yang in_progress

  3. Tutorial mode → gunakan demo_data_flag
     → semua write operation redirect ke demo namespace
     → tidak menyentuh data produksi
```

---

# BAGIAN 4 — MVP SCOPE

---

## 4.1 MVP Definition

```
┌───────────────────────────────────────────────────────────────┐
│                      MVP SCOPE v1.0                           │
│                                                               │
│  ✅ MASUK MVP                    │ 🔜 FASE BERIKUTNYA        │
│  ─────────────────────────────   │ ──────────────────────     │
│  CORE FEATURES:                  │                           │
│  • Login / Logout                │ • Dashboard grafik/chart  │
│  • CRUD Pelanggan + Diskon       │ • Gen Z Mode toggle       │
│  • CRUD Produk                   │ • Notifikasi WhatsApp     │
│  • Buat & Kelola Bon             │ • Import data Excel       │
│  • Kalkulasi otomatis            │ • Backup cloud otomatis   │
│  • Status Piutang → Lunas        │ • PWA offline mode        │
│  • Pelunasan bon & bulan         │ • Target omzet            │
│  • Bonus logic + notifikasi      │ • Template bon            │
│  • Customer detail per bulan     │ • Multi-user              │
│  • Rekap + filter bulan/tahun    │ • Customer portal         │
│  • Export PDF                    │                           │
│  • Soft-delete semua entity      │                           │
│                                  │                           │
│  TUTORIAL SYSTEM:                │                           │
│  • Onboarding tour (8 langkah)   │ • Video tutorial          │
│  • Contextual tooltips (wajib)   │ • Search bantuan          │
│  • Tutorial Mode (11 topik)      │ • Panduan PDF downloadable│
│  • FAQ & Glosarium               │ • Badge completion        │
│  • Pusat Bantuan                 │                           │
└───────────────────────────────────────────────────────────────┘
```

## 4.2 MVP User Stories

```
EPIC 1 — AUTHENTICATION
  STORY-001: Login & Logout aman

EPIC 2 — CUSTOMER MANAGEMENT
  STORY-002: Tambah pelanggan + diskon bertingkat
  STORY-003: Lihat & edit daftar pelanggan
  STORY-004: Detail pelanggan per bulan

EPIC 3 — PRODUCT MANAGEMENT
  STORY-005: Tambah & kelola produk

EPIC 4 — TRANSACTION (CORE)
  STORY-006: Buat bon dengan kalkulasi otomatis ⭐
  STORY-007: Lunaskan bon (1 bon / 1 bulan)
  STORY-008: Edit & hapus bon

EPIC 5 — BONUS
  STORY-009: Notifikasi bonus tersedia
  STORY-010: Buat bon bonus

EPIC 6 — REPORTING
  STORY-011: Lihat rekap + export PDF

EPIC 7 — TUTORIAL SYSTEM
  STORY-012: Onboarding tour first login ⭐
  STORY-013: Tooltip bantuan di setiap field kompleks
  STORY-014: Tutorial mode langkah demi langkah
  STORY-015: Pusat bantuan + FAQ + Glosarium
```

---

# BAGIAN 5 — UNIQUE SELLING PROPOSITION

---

## 5.1 Competitive Positioning

| Fitur | HL Manager Pro | Excel Manual | Aplikasi Kasir Umum | Buku Tulis |
|-------|:-----------:|:----------:|:-----------------:|:--------:|
| Diskon bertingkat otomatis | ✅ | ❌ | ❌ | ❌ |
| Piutang tracking real-time | ✅ | ⚠️ | ✅ | ❌ |
| Bonus otomatis per threshold | ✅ | ❌ | ❌ | ❌ |
| Rekap LM vs BR terpisah | ✅ | ⚠️ | ❌ | ❌ |
| Cash basis terintegrasi | ✅ | ⚠️ | ❌ | ❌ |
| Tutorial built-in interaktif | ✅ | ❌ | ❌ | ❌ |
| Ramah pengguna lansia | ✅ | ❌ | ⚠️ | ✅ |
| Export PDF | ✅ | ⚠️ | ✅ | ❌ |
| Onboarding mandiri | ✅ | ❌ | ❌ | ❌ |

## 5.2 USP Statements

**USP Utama:**
> **"Satu-satunya aplikasi manajemen bisnis dengan tutorial interaktif built-in yang memandu langkah demi langkah — dirancang khusus agar pemilik bisnis usia 50+ bisa mandiri tanpa perlu minta tolong siapapun."**

**USP Pendukung:**

| # | USP | Tagline |
|---|-----|---------|
| 1 | 🎯 Zero Error Calculation | Diskon bertingkat, omzet, laba — dihitung 100% otomatis |
| 2 | 🎓 Belajar Sendiri | Tutorial interaktif 11 topik, bisa diulang kapan saja |
| 3 | ⚡ 3-Tap Settlement | Lunaskan bon atau satu bulan penuh dalam hitungan detik |
| 4 | 🎁 Smart Bonus Alert | Tidak ada bonus pelanggan yang terlewat |
| 5 | 👴 Senior-First Design | Font besar, tombol jumbo, bahasa sederhana, tidak flat |
| 6 | 📊 Instant Business Insight | Rekap omzet LM/BR, laba, piutang — siap cetak PDF |

**Tagline Produk:** *"Bisnis Lebih Rapi, Hitung Lebih Tepat"*

---

# BAGIAN 6 — DESIGN SYSTEM

---

## 6.1 Design Philosophy

**Nama Filosofi:** *"Warm Premium Depth"*

```
PRINSIP DESAIN:

1. DEPTH OVER FLAT
   Setiap elemen punya dimensi: shadow, gradient,
   border radius, glassmorphism. Tidak ada permukaan datar polos.

2. WARMTH & TRUST
   Warna hangat (biru navy, gold, hijau emerald).
   Bukan cold tech biru pucat. User merasa "dipercaya".

3. CLARITY FIRST
   Untuk lansia: font besar, label jelas, kontras tinggi.
   Informasi penting tidak bersembunyi.

4. PROGRESSIVE DISCLOSURE
   Tidak semua info langsung ditampilkan.
   Detail muncul saat dibutuhkan (tooltip, expand).

5. CONFIDENCE BUILDING
   Konfirmasi setelah setiap aksi penting.
   Pesan error ramah, bukan menakutkan.
   Tombol besar = user tidak takut salah tekan.

KEPUTUSAN HYBRID DESIGN:
  → Design dasar = Senior-Friendly (prioritas utama)
  → Elemen visual = Modern Depth (Gen Z aesthetic)
  → Bukan dua mode terpisah — melainkan 1 desain
    yang nyaman untuk 50+ tapi tidak terlihat kuno
  → Gen Z Mode toggle masuk Fase 2
```

## 6.2 Color System

```
╔══════════════════════════════════════════════════════════════╗
║                    COLOR PALETTE                            ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  PRIMARY — Navy Blue (Kepercayaan, Profesional)             ║
║  ████  #1E40AF  Deep Navy      → Header, teks utama         ║
║  ████  #3B82F6  Bright Blue    → CTA, link, active state    ║
║  ████  #DBEAFE  Ice Blue       → Card background, highlight  ║
║  ████  #EFF6FF  Frost          → Page section background    ║
║                                                              ║
║  ACCENT — Amber Gold (Bonus, Premium, Alert)                ║
║  ████  #D97706  Deep Amber     → Bonus badge, CTA sekunder  ║
║  ████  #F59E0B  Gold           → Highlight, bintang         ║
║  ████  #FDE68A  Soft Yellow    → Notifikasi background      ║
║  ████  #FFFBEB  Cream          → Bonus area background      ║
║                                                              ║
║  SUCCESS — Emerald (Lunas, Konfirmasi, Positif)             ║
║  ████  #059669  Deep Emerald   → Status Lunas, success msg  ║
║  ████  #10B981  Emerald        → Tombol konfirmasi          ║
║  ████  #D1FAE5  Mint           → Lunas background           ║
║                                                              ║
║  DANGER — Red (Piutang, Error, Warning)                     ║
║  ████  #DC2626  Deep Red       → Status Piutang, error      ║
║  ████  #EF4444  Red            → Delete button              ║
║  ████  #FEE2E2  Rose           → Piutang background         ║
║                                                              ║
║  NEUTRAL — Charcoal & Gray                                  ║
║  ████  #111827  Near Black     → Heading text               ║
║  ████  #1F2937  Dark Charcoal  → Body text                  ║
║  ████  #374151  Charcoal       → Secondary text             ║
║  ████  #6B7280  Gray           → Placeholder, hint          ║
║  ████  #E5E7EB  Light Gray     → Border, divider            ║
║  ████  #F9FAFB  Off-White      → Page background            ║
║  ████  #FFFFFF  White          → Card surface               ║
║                                                              ║
║  GLASS / DEPTH                                              ║
║  ░░░░  rgba(255,255,255,0.80)  → Glassmorphism card         ║
║  ░░░░  rgba(30,64,175,0.06)   → Blue tint overlay          ║
║  ░░░░  rgba(0,0,0,0.04)       → Subtle dark overlay        ║
╚══════════════════════════════════════════════════════════════╝
```

## 6.3 Typography

```
FONT FAMILIES:
  Heading  : "Plus Jakarta Sans" — modern, humanist, readable
  Body     : "Inter" — clean, accessible, versatile
  Numbers  : "Inter" dengan font-variant-numeric: tabular-nums

TYPE SCALE (BESAR — prioritas aksesibilitas lansia):
  ┌─────────────────┬────────┬─────────────────────────────┐
  │ Token           │ Size   │ Usage                       │
  ├─────────────────┼────────┼─────────────────────────────┤
  │ text-display    │ 36px   │ Halaman utama (jarang)      │
  │ text-hero       │ 28px   │ Judul halaman               │
  │ text-heading    │ 22px   │ Section heading             │
  │ text-subheading │ 20px   │ Card title, sub-section     │
  │ text-body-lg    │ 18px   │ Body text utama (lansia)    │
  │ text-body       │ 16px   │ Secondary text, label       │
  │ text-small      │ 14px   │ Caption, hint, badge        │
  └─────────────────┴────────┴─────────────────────────────┘

FONT WEIGHT:
  700 (Bold)     : Heading, angka penting, tombol CTA
  600 (Semibold) : Sub-heading, label aktif, badge
  400 (Regular)  : Body text, deskripsi, placeholder

LINE HEIGHT:
  Heading : 1.3 (tight, impactful)
  Body    : 1.7 (lebar, mudah dibaca)
  Small   : 1.5

LETTER SPACING:
  Heading : -0.02em (tight)
  Body    : 0 (normal)
  Label   : +0.03em (sedikit lebar untuk keterbacaan)
  Badge   : +0.05em (uppercase label)
```

## 6.4 Component Specifications

### Buttons
```
BUTTON VARIANTS & SPECS:

┌─────────────────────────────────────────────────────────────┐
│ PRIMARY (CTA Utama)                                         │
│ bg: gradient(135deg, #3B82F6 → #1E40AF)                    │
│ shadow: 0 4px 15px rgba(59,130,246,0.4),                   │
│         0 2px 4px rgba(0,0,0,0.1),                         │
│         inset 0 1px 0 rgba(255,255,255,0.2)                │
│ border-radius: 16px                                         │
│ min-height: 56px  ← WAJIB untuk lansia                     │
│ font-size: 18px   ← WAJIB untuk lansia                     │
│ font-weight: 700                                            │
│ hover: translateY(-2px) + shadow lebih besar               │
│ active: translateY(0) + scale(0.98)                        │
├─────────────────────────────────────────────────────────────┤
│ SUCCESS / LUNAS                                             │
│ bg: gradient(135deg, #10B981 → #059669)                    │
│ shadow: 0 4px 15px rgba(16,185,129,0.4)                    │
├─────────────────────────────────────────────────────────────┤
│ DANGER / DELETE                                             │
│ bg: gradient(135deg, #EF4444 → #DC2626)                    │
│ shadow: 0 4px 15px rgba(239,68,68,0.35)                    │
├─────────────────────────────────────────────────────────────┤
│ SECONDARY / OUTLINE                                         │
│ bg: white                                                   │
│ border: 2px solid #3B82F6                                   │
│ color: #1E40AF                                              │
│ shadow: 0 2px 8px rgba(0,0,0,0.06)                         │
│ hover: bg #DBEAFE                                           │
├─────────────────────────────────────────────────────────────┤
│ GHOST / TEXT                                                │
│ bg: transparent                                             │
│ color: #6B7280                                              │
│ hover: bg #F3F4F6                                           │
└─────────────────────────────────────────────────────────────┘

ATURAN TOUCH TARGET (WAJIB):
  Semua tombol interaktif: min 48×48px
  Tombol utama: min 56px tinggi, full-width di mobile
  Jarak antar tombol: min 8px (tidak berdempetan)
```

### Cards
```
CARD VARIANTS:

STANDARD CARD:
  bg: rgba(255,255,255,0.95)
  border-radius: 20px
  shadow:
    0 1px 3px rgba(0,0,0,0.06),
    0 8px 24px rgba(0,0,0,0.08),
    0 20px 48px rgba(0,0,0,0.04)
  border: 1px solid rgba(255,255,255,0.8)
  backdrop-filter: blur(10px)
  padding: 24px

STAT CARD (Dashboard):
  bg: gradient berwarna sesuai konteks
  shadow: 0 8px 32px rgba([warna],0.4)
  border-radius: 20px
  overflow: hidden
  ::before decorative circle:
    position: absolute, top: -30px, right: -30px
    size: 120×120px, border-radius: 50%
    bg: rgba(255,255,255,0.1)

PIUTANG CARD:
  gradient: #DC2626 → #EF4444

OMZET CARD:
  gradient: #1E40AF → #3B82F6

LABA CARD:
  gradient: #7C3AED → #8B5CF6

LUNAS CARD:
  gradient: #059669 → #10B981

BONUS NOTIFICATION CARD:
  gradient: #D97706 → #F59E0B
  shadow: 0 8px 32px rgba(217,119,6,0.4)
  animation: pulse-glow 2s infinite
  @keyframes pulse-glow:
    0%,100%: shadow normal
    50%: shadow lebih besar & intens
```

### Form Elements
```
INPUT FIELD:
  height: 56px (lansia-friendly)
  font-size: 18px
  border-radius: 14px
  border: 2px solid #E5E7EB
  bg: #F9FAFB
  padding: 0 20px
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.04)
  transition: all 0.2s ease

  :focus:
    border-color: #3B82F6
    bg: #FFFFFF
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.04),
      0 0 0 4px rgba(59,130,246,0.12)

  :error:
    border-color: #DC2626
    box-shadow:
      inset 0 2px 4px rgba(0,0,0,0.04),
      0 0 0 4px rgba(220,38,38,0.12)

LABEL:
  font-size: 16px
  font-weight: 600
  color: #374151
  margin-bottom: 8px

SELECT / DROPDOWN:
  Sama dengan input, tambah chevron icon kanan
  Custom dropdown: list item height min 48px
  Search field di atas list jika > 5 item

TOOLTIP ICON [?]:
  size: 20×20px
  bg: #E5E7EB (circle)
  color: #6B7280
  font-size: 12px font-weight: 700
  margin-left: 8px
  cursor: pointer
  hover: bg #DBEAFE, color: #1E40AF

BADGES:
  border-radius: 100px
  padding: 6px 16px
  font-weight: 700
  font-size: 14px

  .badge-piutang: bg #FEE2E2, color #DC2626, border #FECACA
  .badge-lunas:   bg #D1FAE5, color #059669, border #A7F3D0
  .badge-bonus:   bg #FDE68A, color #D97706, border #FCD34D
```

### Navigation
```
BOTTOM NAVIGATION (Mobile — prioritas):
  bg: rgba(255,255,255,0.92)
  backdrop-filter: blur(20px)
  border-top: 1px solid rgba(0,0,0,0.06)
  box-shadow: 0 -8px 32px rgba(0,0,0,0.08)
  height: 72px
  padding-bottom: env(safe-area-inset-bottom)

  Nav Item:
    min-width: 60px, min-height: 60px
    border-radius: 16px
    flex-direction: column
    gap: 4px
    font-size: 12px, font-weight: 600

  Nav Item Active:
    bg: rgba(59,130,246,0.12)
    color: #1E40AF
    icon: filled version

  Nav Items (5):
    🏠 Beranda
    👥 Pelanggan
    ➕ Bon Baru (center, lebih besar — floating action style)
    📦 Produk
    📋 Laporan

SIDEBAR (Desktop 1024px+):
  width: 260px
  bg: gradient(180deg, #1E40AF 0%, #1e3a8a 100%)
  shadow: 4px 0 24px rgba(30,64,175,0.25)
  color: white

  Logo area: 72px height, border-bottom rgba(white,0.1)
  Nav items: padding 12px 20px, border-radius 12px
  Active: bg rgba(white,0.15), font-weight 700

HEADER (Mobile):
  height: 64px
  bg: rgba(255,255,255,0.92)
  backdrop-filter: blur(20px)
  box-shadow: 0 2px 16px rgba(0,0,0,0.06)
  Judul halaman: font 20px, bold, center
  Back button kiri (jika sub-page)
  Action button kanan (edit/PDF)
```

## 6.5 Tutorial UI Specifications

### Onboarding Tour Overlay
```
OVERLAY DESIGN:

Backdrop:
  bg: rgba(0,0,0,0.6)
  backdrop-filter: blur(2px)
  z-index: 9000

Spotlight (elemen yang di-highlight):
  Technique: box-shadow inset / clip-path atau
             hole punch menggunakan SVG overlay
  Border radius: sama dengan elemen target + 4px
  Outline: 3px solid rgba(255,255,255,0.8)
  Glow: box-shadow 0 0 0 4px rgba(59,130,246,0.5)
  Animation: pulse 2s infinite pada outline

Tooltip Bubble:
  bg: white
  border-radius: 20px
  padding: 24px
  shadow: 0 20px 60px rgba(0,0,0,0.3)
  max-width: 320px
  arrow: CSS triangle mengarah ke elemen

  Struktur dalam bubble:
  ┌────────────────────────────────┐
  │ 🏠 LANGKAH 2 dari 8           │  ← step indicator (kecil, gray)
  │ ████████░░░░░░░ 25%           │  ← progress bar
  │                               │
  │ [Judul Langkah - 20px Bold]   │
  │                               │
  │ Teks penjelasan dalam bahasa  │
  │ Indonesia yang sederhana dan  │
  │ mudah dipahami. Max 3 kalimat │
  │                               │
  │ [Lewati]        [Lanjut →]   │
  └────────────────────────────────┘

Progress Bar:
  height: 6px
  bg: #E5E7EB (track)
  fill: gradient(90deg, #3B82F6 → #1E40AF)
  border-radius: 100px

Skip Button:
  color: #6B7280
  font-size: 14px
  no background (ghost)

Next Button:
  Primary style, smaller (height 44px)
```

### Tutorial Mode Active State
```
TUTORIAL MODE INDICATOR:

Saat tutorial mode aktif, tampilkan:

  TOP BANNER (sticky):
  ┌────────────────────────────────────────────┐
  │ 📚 Mode Tutorial: TUT-03 Buat Bon Baru    │
  │ Langkah 5 dari 12  [██████░░░░░░]  42%   │
  │                              [Keluar ✕]  │
  └────────────────────────────────────────────┘
  bg: gradient(135deg, #1E40AF → #3B82F6)
  color: white
  height: 56px

Elemen yang tidak aktif:
  opacity: 0.4
  pointer-events: none
  filter: grayscale(0.3)

Elemen yang aktif (diarahkan):
  opacity: 1
  pointer-events: all
  outline: 3px solid #F59E0B (kuning)
  box-shadow: 0 0 0 6px rgba(245,158,11,0.3)
  animation: glow-pulse 1.5s infinite

Instruksi panel (bawah / samping elemen):
  Sama dengan onboarding tooltip bubble
  Tambahkan "Aksi yang perlu dilakukan" dengan ikon panah
```

### Help Center Page
```
LAYOUT HALAMAN BANTUAN:

┌────────────────────────────────────────────────┐
│  HEADER                                        │
│  Pusat Bantuan                                 │
│  "Bingung? Kami siap membantu!"               │
│                                                │
│  [🔍 Cari panduan...              ]  ← P1    │
│                                                │
│  ─────────────────────────────────────────    │
│  TUTORIAL INTERAKTIF                           │
│                                                │
│  📗 DASAR (Pemula)                            │
│  ┌──────────────────────────────────────────┐ │
│  │ ✅ TUT-01: Tambah Pelanggan   [Ulang]    │ │
│  │ ✅ TUT-02: Tambah Produk      [Ulang]    │ │
│  │ ▶️  TUT-03: Buat Bon          [Mulai]    │ │
│  │ ○  TUT-04: Lihat Piutang     [Mulai]    │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  📘 MENENGAH                                  │
│  [collapsed — tap untuk expand]               │
│                                                │
│  📙 LANJUTAN                                  │
│  [collapsed — tap untuk expand]               │
│                                                │
│  ─────────────────────────────────────────    │
│  PERTANYAAN SERING DITANYA (FAQ)              │
│  [Accordion list, expandable]                 │
│                                                │
│  ─────────────────────────────────────────    │
│  GLOSARIUM ISTILAH                            │
│  [Daftar A-Z istilah dengan penjelasan]       │
│                                                │
│  ─────────────────────────────────────────    │
│  [🔄 Ulangi Tur Pengenalan]                  │
│  [📄 Unduh Panduan PDF]  ← P1               │
└────────────────────────────────────────────────┘
```

## 6.6 Animations & Micro-interactions

```
ANIMASI CATALOG:

1. PAGE TRANSITION
   Type: Slide + Fade
   Direction: Slide dari kanan untuk forward navigation
   Duration: 250ms
   Easing: ease-out

2. MODAL / SHEET APPEAR
   Type: Scale + Fade (from 0.95 + opacity 0 → 1 + opacity 1)
   Duration: 200ms
   Backdrop: Fade in 150ms

3. CARD HOVER (desktop)
   Transform: translateY(-4px)
   Shadow: lebih dalam
   Duration: 200ms ease

4. BUTTON PRESS
   Transform: scale(0.96) + translateY(1px)
   Duration: 100ms
   Ripple: radial expand dari titik klik

5. STATUS CHANGE (Piutang → Lunas)
   Badge: color transition merah → hijau 400ms
   Checkmark: stroke animation 300ms
   Optional: confetti micro-animation ✨

6. NUMBER COUNT-UP (Dashboard load)
   Angka stat cards count up dari 0 ke nilai asli
   Duration: 800ms
   Easing: ease-out

7. BONUS PULSE
   Card bonus: glow pulse 2s infinite
   Ikon 🎁: bounce animation 1s infinite (subtle)

8. FORM VALIDATION
   Error: shake animation 400ms (horizontal)
   Success: checkmark icon appear + scale

9. TOOLTIP APPEAR
   Scale: 0.9 → 1 + opacity 0 → 1
   Duration: 150ms

10. SKELETON LOADER
    Shimmer animation (gradient slide)
    Untuk semua loading states

11. TUTORIAL SPOTLIGHT
    Elemen aktif: glow-pulse 1.5s infinite
    Overlay backdrop: fade in 300ms

12. SWIPE TO DISMISS (Mobile)
    Modal bottom sheet bisa di-swipe down untuk tutup

ATURAN ANIMASI:
  ✅ Semua animasi < 400ms (tidak lambat untuk lansia)
  ✅ Ada opsi prefers-reduced-motion (akses)
  ✅ Tidak ada animasi yang loop terus kecuali notifikasi penting
  ✅ Animasi mendukung pemahaman, bukan sekedar dekorasi
```

## 6.7 Responsive Design

```
BREAKPOINTS & LAYOUT:

Mobile (360–767px):
  Layout : Single column, stacked
  Nav    : Bottom navbar (5 item)
  Cards  : Full width, 16px margin kiri-kanan
  Forms  : Full width, single column
  Modals : Bottom sheet (slide up)
  Tables : Card-based view (bukan tabel horizontal)

Tablet (768–1023px):
  Layout : 2 column grid untuk cards
  Nav    : Bottom navbar atau side mini-nav
  Forms  : 2 column untuk beberapa field
  Modals : Center modal

Desktop (1024px+):
  Layout : Sidebar (260px) + Main content
  Nav    : Left sidebar
  Cards  : 3–4 column grid
  Forms  : 2 column
  Modals : Center modal, max-width 560px

TOUCH TARGET WAJIB:
  Minimum  : 48 × 48px untuk semua element interaktif
  Optimal  : 56px tinggi untuk tombol utama
  Jarak    : Minimum 8px antar elemen yang bisa di-tap
  Safe area: iOS home bar — padding-bottom env(safe-area-inset-bottom)
```

---

# BAGIAN 7 — ACCEPTANCE CRITERIA LENGKAP

---

## 7A — Original Acceptance Criteria

*(Dari dokumen klien — semua dipertahankan tanpa perubahan)*

### Section 1: Authentication
- **AC-1.1** App memerlukan login sebelum fitur apapun bisa diakses
- **AC-1.2** Tepat satu akun user; tidak ada alur registrasi mandiri
- **AC-1.3** Kredensial valid → login berhasil → landing di dashboard
- **AC-1.4** Kredensial tidak valid → login ditolak dengan error jelas, tidak ada akses
- **AC-1.5** Sesi persisten hingga logout; opsi logout tersedia

### Section 2: Customer Management
- **AC-2.1** User bisa membuat pelanggan dengan nama (wajib)
- **AC-2.2** User bisa mengedit semua field pelanggan
- **AC-2.3** Menghapus pelanggan = soft-delete: tersembunyi dari pilihan baru, historis tetap ada
- **AC-2.4** Setiap pelanggan punya dua set diskon independen: LM dan BR
- **AC-2.5** Set diskon = ordered list nilai persen (e.g. LM = [20, 20, 10]). Urutan penting
- **AC-2.6** Dalam set diskon, user bisa tambah, edit, hapus step individual
- **AC-2.7** Nilai diskon harus numerik dan antara 0–100; entri tidak valid ditolak
- **AC-2.8** Setiap pelanggan punya bonus eligibility threshold (nominal Rp)
- **AC-2.9** Contoh: B=100, LM[20,20,10] → 100×0.8×0.8×0.9 = 57.6. Efektif 42.4%, BUKAN 50%

### Section 3: Product Management
- **AC-3.1** User bisa create, edit, delete produk
- **AC-3.2** Tipe dibatasi LM atau BR
- **AC-3.3** Harga Modal dan Harga Base numerik dan ≥ 0
- **AC-3.4** Harga Modal hanya untuk kalkulasi profit, tidak pernah ditampilkan sebagai harga pelanggan
- **AC-3.5** Menghapus produk = soft-delete

### Section 4: Transaction (Bon) Management
- **AC-4.1** Field tanggal diisi otomatis dengan tanggal hari ini, bisa diubah
- **AC-4.2** Nomor Bon wajib dan harus unik; duplikat ditolak dengan error jelas
- **AC-4.3** Customer dipilih dari daftar pelanggan yang ada (bukan teks bebas)
- **AC-4.4** Produk dipilih dari katalog produk yang ada (bukan teks bebas)
- **AC-4.5** Transaksi mendukung multi product lines, masing-masing qty ≥ 1
- **AC-4.6** Setiap baris produk: tampilkan tipe (LM/BR) dan harga yang berlaku untuk pelanggan ini
- **AC-4.7** Diskon per baris otomatis dari pelanggan × tipe produk; user tidak input diskon manual
- **AC-4.8** Ongkir numerik ≥ 0, dicatat per transaksi (bukan per baris)
- **AC-4.9** Status default Piutang saat dibuat; user bisa set Lunas nanti
- **AC-4.10** User bisa view, edit, delete transaksi
- **AC-4.10.1** Editing transaksi menghitung ulang omzet, profit, dan total
- **AC-4.11** Transaksi tampilkan: omzet per baris, omzet transaksi (excl. ongkir), ongkir, total = omzet + ongkir

### Section 5: Bonus Logic
- **AC-5.1** Setiap pelanggan punya bonus eligibility threshold
- **AC-5.2** Sistem maintain running accumulated omzet per pelanggan, hitung hanya transaksi Lunas
- **AC-5.3** Bonus stack: jumlah bonus = floor(akumulasi / threshold) - bonus sudah diberikan
- **AC-5.4** Saat pelanggan punya ≥1 bonus, sistem tampilkan flag/notifikasi dan jumlah bonus
- **AC-5.5** Bonus dicatat sebagai transaksi dengan Bonus = on; bisa multi bonus dalam 1 bon
- **AC-5.6** Setiap bonus dikonsumsi menghabiskan 1 threshold; sisa carry over ke siklus berikut
- **AC-5.7** Baris produk bonus gratis: excluded dari omzet, biayanya tidak mengurangi Laba HL
- **AC-5.8** Transaksi bonus jelas dapat dibedakan dari penjualan normal di daftar dan rekap

### Section 6: Customer Detail Page
- **AC-6.1** Halaman list transaksi pelanggan dikelompokkan per bulan (bisa pilih bulan/tahun)
- **AC-6.2** Pilih bulan → tampil: list bon, total piutang, total dibayar, omzet, laba bulan itu
- **AC-6.3** Omzet tampil dengan kolom LM dan BR terpisah (plus total gabungan)
- **AC-6.4** User bisa view dan download (PDF) daftar piutang dan daftar transaksi
- **AC-6.5** Settle bulan: klik "Sudah Lunas" → modal minta tanggal pelunasan → konfirmasi → semua transaksi bulan itu jadi Lunas dengan tanggal itu
- **AC-6.6** Settle 1 bon: buka detail bon → klik "Lunas" → modal tanggal → konfirmasi → hanya bon itu yang jadi Lunas
- **AC-6.7** Settling update total langsung (piutang ↓, dibayar ↑, omzet/laba recognized ↑, bonus accumulator ↑)
- **AC-6.8** Transaksi yang sudah Lunas tidak bisa di-settle ulang, tampil beda visual
- **AC-6.9** Klik bon → detail lengkap (baris, qty, harga, ongkir, omzet, status, tanggal bayar jika ada)

### Section 7: Recap / Reporting
- **AC-7.1** Rekap tersedia per pelanggan
- **AC-7.2** Rekap tersedia per tipe produk (LM / BR)
- **AC-7.3** Rekap tersedia keseluruhan (semua pelanggan)
- **AC-7.4** Setiap rekap bisa difilter/dikelompok per bulan dan per tahun
- **AC-7.5** Setiap rekap minimum: Total Omzet Lunas, Total Laba Lunas, Total Piutang Outstanding, Total Dibayar, breakdown LM vs BR
- **AC-7.6** Rekap overall tampilkan total Laba HL lintas semua pelanggan
- **AC-7.7** Transaksi bonus excluded dari omzet/pendapatan/profit; bisa dilaporkan terpisah sebagai bonus log
- **AC-7.8** Rekap bisa diunduh sebagai PDF

### Section 8: Master Calculation Reference
```
FORMULA (Single Source of Truth):

Discounted Unit Price  = Base × Π(1 - dᵢ/100) per discount steps tipe itu
Line Omzet             = Discounted Unit Price × Qty
Transaction Omzet      = Σ Line Omzet  (ONGKIR EXCLUDED)
Amount Owed (Piutang)  = Transaction Omzet + Ongkir
Line Laba HL           = (Discounted Unit Price - Harga Modal) × Qty
Transaction Laba HL    = Σ Line Laba HL  (ONGKIR EXCLUDED — pass-through)
Recognized Omzet       = Σ Transaction Omzet WHERE status = 'Lunas'
Recognized Laba HL     = Σ Transaction Laba HL WHERE status = 'Lunas'
Total Paid             = Σ (Omzet + Ongkir) WHERE status = 'Lunas'
Total Outstanding      = Σ (Omzet + Ongkir) WHERE status = 'Piutang'
Bonus Accumulator      = Σ Omzet WHERE status = 'Lunas' (per customer)
Bonuses Available      = floor(Bonus Accumulator / Threshold) - Bonuses Already Granted
Bonus Items            = 0 omzet, 0 profit impact
```

### Section 9: Confirmed Decisions
| # | Question | Decision |
|---|----------|----------|
| D1 | Ongkir & profit | Pass-through — shipping adds no profit. Laba = omzet − modal |
| D2 | Receivable vs omzet | Customer owes omzet + ongkir; omzet excludes ongkir |
| D3 | Omzet / eligibility basis | Only Lunas (paid) transactions count → cash basis |
| D4 | Bonus mechanics | Bonuses stack; multiple in one bon; each consumes 1 threshold |
| D5 | Bonus product cost | Ignored in profit — free bonus items do not reduce Laba HL |
| D6 | Deleting items with history | Soft-delete (hide from new use, keep history) |
| D7 | Nomor Bon | Must be unique; duplicates rejected |
| D8 | Export format | PDF |
| D9 | Currency / tax | IDR only, no tax/PPN |

---

## 7B — Tutorial System Acceptance Criteria (Baru)

### Section T1: Onboarding Tour
- **AC-T1.1** Tur onboarding otomatis tampil hanya saat first login (belum pernah complete sebelumnya)
- **AC-T1.2** User bisa skip tur kapan saja; sistem catat sebagai "dismissed"
- **AC-T1.3** Progress "Langkah X dari Y" tampil di setiap step
- **AC-T1.4** Tombol Lanjut dan Kembali tersedia di setiap langkah (kecuali step pertama tidak ada Kembali)
- **AC-T1.5** Overlay gelap menutupi semua area kecuali elemen yang sedang dijelaskan (spotlight)
- **AC-T1.6** Tooltip bubble muncul dengan posisi optimal (tidak menutupi elemen penting)
- **AC-T1.7** Status "tour selesai" disimpan ke database; tidak muncul lagi saat login berikutnya
- **AC-T1.8** User bisa memulai ulang tur dari menu Bantuan
- **AC-T1.9** Jika user skip/tutup di tengah, progress step tersimpan; bisa dilanjut dari menu Bantuan

### Section T2: Contextual Tooltips
- **AC-T2.1** Ikon [?] tersedia di samping setiap field/fitur kompleks (minimum: semua field di daftar 8.2)
- **AC-T2.2** Tap ikon [?] → tooltip bubble muncul dengan penjelasan singkat max 3 kalimat
- **AC-T2.3** Tooltip dapat ditutup dengan tap di luar area tooltip
- **AC-T2.4** Hanya 1 tooltip yang bisa terbuka dalam satu waktu
- **AC-T2.5** Tooltip tidak menghalangi field/tombol yang sedang digunakan
- **AC-T2.6** Konten tooltip: Bahasa Indonesia sederhana, tidak ada jargon teknis
- **AC-T2.7** Tooltip tidak muncul kembali secara paksa setelah ditutup (user yang inisiatif buka)

### Section T3: Tutorial Mode
- **AC-T3.1** Menu "Bantuan" tersedia di navigasi utama di semua halaman
- **AC-T3.2** Halaman Bantuan menampilkan 11 topik tutorial terkelompok (Dasar/Menengah/Lanjutan)
- **AC-T3.3** Setiap tutorial mode menggunakan demo data — tidak menyimpan ke data produksi
- **AC-T3.4** Banner "Mode Tutorial Aktif" tampil saat tutorial mode berjalan (sticky top)
- **AC-T3.5** Selama tutorial aktif, hanya elemen yang diarahkan yang bisa diklik; elemen lain non-interactive
- **AC-T3.6** Progress bar "Langkah X dari Y" tampil di banner tutorial
- **AC-T3.7** Tombol "Keluar Tutorial" tersedia di setiap langkah; konfirmasi sebelum keluar
- **AC-T3.8** Tutorial yang sudah selesai mendapat badge ✓ di daftar topik (P1)
- **AC-T3.9** Tutorial bisa diulang berapa kali pun tanpa batas
- **AC-T3.10** Setelah tutorial selesai, modal muncul dengan opsi "Coba Sekarang" atau "Kembali ke Panduan"

### Section T4: Help Center
- **AC-T4.1** Halaman Bantuan bisa diakses dari navigasi utama
- **AC-T4.2** Daftar semua tutorial dengan status (belum / selesai / sedang)
- **AC-T4.3** Minimum 9 item FAQ tersedia
- **AC-T4.4** Setiap FAQ item menggunakan accordion (tap judul → expand jawaban)
- **AC-T4.5** Glosarium minimum 10 istilah tersedia
- **AC-T4.6** Tombol "Ulangi Tur Pengenalan" tersedia di halaman Bantuan
- **AC-T4.7** Halaman Bantuan bisa diakses tanpa koneksi internet jika sudah pernah dibuka (cache) — P1

---

# BAGIAN 8 — DATABASE SCHEMA

---

```sql
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  DATABASE SCHEMA — HL Manager Pro v2.0
  Engine: PostgreSQL (via Supabase)
  ORM: Prisma
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TABLE: users
─────────────────────────────────────────────
  id               UUID         PK, default gen_random_uuid()
  username         VARCHAR(50)  UNIQUE NOT NULL
  password_hash    VARCHAR(255) NOT NULL
  created_at       TIMESTAMP    DEFAULT now()
  updated_at       TIMESTAMP    DEFAULT now()

TABLE: tutorial_progress
─────────────────────────────────────────────
  id                    UUID         PK
  user_id               UUID         FK → users.id
  onboarding_completed  BOOLEAN      DEFAULT false
  onboarding_last_step  INTEGER      DEFAULT 0
  tutorials_completed   TEXT[]       DEFAULT '{}'  ← array of tutorial_ids
  tutorials_in_progress JSONB        DEFAULT '[]'  ← [{id, last_step}]
  last_updated          TIMESTAMP    DEFAULT now()

TABLE: customers
─────────────────────────────────────────────
  id                UUID         PK
  nama              VARCHAR(100) NOT NULL
  bonus_threshold   BIGINT       DEFAULT 0  ← dalam Rupiah (integer)
  is_deleted        BOOLEAN      DEFAULT false
  created_at        TIMESTAMP    DEFAULT now()
  updated_at        TIMESTAMP    DEFAULT now()

TABLE: customer_discounts
─────────────────────────────────────────────
  id               UUID         PK
  customer_id      UUID         FK → customers.id ON DELETE CASCADE
  product_type     VARCHAR(2)   CHECK (product_type IN ('LM', 'BR'))
  step_order       INTEGER      NOT NULL  ← 1-based, urutan diskon
  percentage       DECIMAL(5,2) NOT NULL  CHECK (percentage >= 0 AND percentage <= 100)
  created_at       TIMESTAMP    DEFAULT now()

  UNIQUE (customer_id, product_type, step_order)

TABLE: products
─────────────────────────────────────────────
  id               UUID         PK
  nama             VARCHAR(100) NOT NULL
  harga_modal      BIGINT       NOT NULL DEFAULT 0  ← dalam Rupiah
  harga_base       BIGINT       NOT NULL DEFAULT 0  ← dalam Rupiah
  tipe             VARCHAR(2)   CHECK (tipe IN ('LM', 'BR'))
  is_deleted       BOOLEAN      DEFAULT false
  created_at       TIMESTAMP    DEFAULT now()
  updated_at       TIMESTAMP    DEFAULT now()

TABLE: transactions
─────────────────────────────────────────────
  id                   UUID         PK
  nomor_bon            VARCHAR(50)  UNIQUE NOT NULL
  tanggal              DATE         NOT NULL DEFAULT CURRENT_DATE
  customer_id          UUID         FK → customers.id
  ongkir               BIGINT       DEFAULT 0
  deskripsi            TEXT
  is_bonus             BOOLEAN      DEFAULT false
  status               VARCHAR(10)  DEFAULT 'Piutang' CHECK (status IN ('Piutang', 'Lunas'))
  tanggal_lunas        DATE
  omzet_total          BIGINT       DEFAULT 0  ← computed, cached
  laba_total           BIGINT       DEFAULT 0  ← computed, cached
  amount_owed          BIGINT       DEFAULT 0  ← omzet_total + ongkir, cached
  created_at           TIMESTAMP    DEFAULT now()
  updated_at           TIMESTAMP    DEFAULT now()

  INDEX: (customer_id, status, tanggal)
  INDEX: (tanggal, status)

TABLE: transaction_items
─────────────────────────────────────────────
  id                       UUID         PK
  transaction_id           UUID         FK → transactions.id ON DELETE CASCADE
  product_id               UUID         FK → products.id
  quantity                 INTEGER      NOT NULL CHECK (quantity >= 1)
  product_type_snapshot    VARCHAR(2)   ← snapshot saat transaksi (LM/BR)
  harga_base_snapshot      BIGINT       ← snapshot harga saat transaksi dibuat
  harga_modal_snapshot     BIGINT       ← snapshot modal saat transaksi dibuat
  discounted_unit_price    BIGINT       ← hasil kalkulasi cascading
  line_omzet               BIGINT       ← discounted_unit_price × quantity
  line_laba                BIGINT       ← (discounted_unit_price - harga_modal_snapshot) × quantity
  is_bonus_item            BOOLEAN      DEFAULT false
  created_at               TIMESTAMP    DEFAULT now()

  ⚠️ PENTING: Snapshot harga disimpan agar edit produk/diskon di masa depan
     tidak mengubah nilai transaksi historis.

TABLE: bonus_grants
─────────────────────────────────────────────
  id                  UUID         PK
  customer_id         UUID         FK → customers.id
  transaction_id      UUID         FK → transactions.id
  bonuses_granted     INTEGER      NOT NULL  ← jumlah bonus dalam 1 bon ini
  omzet_consumed      BIGINT       NOT NULL  ← threshold × bonuses_granted
  granted_at          TIMESTAMP    DEFAULT now()

  INDEX: (customer_id, granted_at)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  COMPUTED/DERIVED (tidak disimpan, dihitung saat query):

  Bonus Accumulator per customer:
    SELECT SUM(omzet_total)
    FROM transactions
    WHERE customer_id = :id AND status = 'Lunas' AND is_bonus = false

  Total Bonus Consumed per customer:
    SELECT SUM(omzet_consumed)
    FROM bonus_grants
    WHERE customer_id = :id

  Bonuses Available:
    floor(Bonus Accumulator / threshold) - SUM(bonuses_granted)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# BAGIAN 9 — API DESIGN

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  REST API ENDPOINTS — HL Manager Pro v2.0
  Auth: JWT Bearer Token (semua endpoint kecuali /auth/login)
  Base URL: /api/v1
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

─── AUTHENTICATION ────────────────────────────────

POST   /auth/login
  Body: { username, password }
  Res : { token: string, user: { id, username } }
  Err : 401 "Username atau password salah"

POST   /auth/logout
  Res : { success: true }

GET    /auth/me
  Res : { user: { id, username } }

─── CUSTOMERS ─────────────────────────────────────

GET    /customers
  Query: ?include_deleted=false
  Res  : { data: Customer[] }

POST   /customers
  Body : { nama, bonus_threshold, discounts_lm[], discounts_br[] }
  Res  : { data: Customer }
  Err  : 422 validasi

GET    /customers/:id
  Res  : { data: Customer with discounts }

PUT    /customers/:id
  Body : { nama?, bonus_threshold? }
  Res  : { data: Customer }

DELETE /customers/:id
  Res  : { success: true }  ← soft-delete

GET    /customers/:id/discounts
  Res  : { lm: DiscountStep[], br: DiscountStep[] }

PUT    /customers/:id/discounts/:type
  Body : { steps: [{ step_order, percentage }] }
  Res  : { data: DiscountStep[] }
  Note : Replaces all steps for that type

GET    /customers/:id/bonus-status
  Res  : {
    accumulator         : number,
    threshold           : number,
    total_consumed      : number,
    bonuses_available   : number,
    bonuses_granted     : number
  }

GET    /customers/:id/transactions
  Query: ?month=1&year=2025&status=Piutang
  Res  : {
    data: Transaction[],
    summary: {
      total_piutang       : number,
      total_lunas         : number,
      omzet_lm_lunas      : number,
      omzet_br_lunas      : number,
      omzet_total_lunas   : number,
      laba_total_lunas    : number
    }
  }

POST   /customers/:id/settle-month
  Body : { month: int, year: int, tanggal_lunas: date }
  Res  : { settled_count: int, transactions: Transaction[] }

─── PRODUCTS ──────────────────────────────────────

GET    /products
  Query: ?tipe=LM&include_deleted=false
  Res  : { data: Product[] }

POST   /products
  Body : { nama, harga_modal, harga_base, tipe }
  Res  : { data: Product }

GET    /products/:id
  Res  : { data: Product }

PUT    /products/:id
  Body : { nama?, harga_modal?, harga_base?, tipe? }
  Res  : { data: Product }

DELETE /products/:id
  Res  : { success: true }  ← soft-delete

─── TRANSACTIONS ──────────────────────────────────

GET    /transactions
  Query: ?status=Piutang&customer_id=X&month=1&year=2025&is_bonus=false
  Res  : { data: Transaction[], total_count: int }

POST   /transactions
  Body : {
    nomor_bon   : string,
    tanggal     : date,
    customer_id : uuid,
    ongkir      : number,
    deskripsi   : string?,
    is_bonus    : boolean,
    items: [{
      product_id : uuid,
      quantity   : int,
      is_bonus_item : boolean
    }]
  }
  Res  : { data: Transaction with items and calculations }
  Err  : 409 "Nomor bon sudah digunakan"
        422 validasi

GET    /transactions/:id
  Res  : { data: Transaction with items, calculations, customer }

PUT    /transactions/:id
  Body : sama dengan POST
  Res  : { data: Transaction recalculated }

DELETE /transactions/:id
  Res  : { success: true }

POST   /transactions/:id/settle
  Body : { tanggal_lunas: date }
  Res  : { data: Transaction (status: Lunas) }
  Err  : 409 "Transaksi sudah lunas"

─── REPORTS ───────────────────────────────────────

GET    /reports/customer/:id
  Query: ?month=1&year=2025
  Res  : {
    customer        : Customer,
    period          : { month, year },
    omzet_lunas     : { lm, br, total },
    laba_lunas      : number,
    piutang_outstanding : number,
    total_paid      : number,
    bonus_log       : BonusGrant[]
  }

GET    /reports/by-type
  Query: ?month=1&year=2025&tipe=LM
  Res  : { tipe, omzet, laba, piutang, paid, by_customer[] }

GET    /reports/overall
  Query: ?month=1&year=2025
  Res  : {
    period                  : { month, year },
    total_omzet_lunas       : { lm, br, total },
    total_laba_lunas        : number,
    total_piutang_outstanding : number,
    total_paid              : number,
    by_customer             : CustomerSummary[],
    bonus_log               : BonusGrant[]
  }

─── PDF EXPORT ────────────────────────────────────

GET    /export/customer/:id/transactions/pdf
  Query: ?month=1&year=2025
  Res  : PDF file (Content-Type: application/pdf)

GET    /export/customer/:id/piutang/pdf
  Query: ?month=1&year=2025
  Res  : PDF file

GET    /export/reports/overall/pdf
  Query: ?month=1&year=2025
  Res  : PDF file

─── UTILITY ───────────────────────────────────────

POST   /calculate/cascading-discount
  Body : { base_price: number, steps: number[] }
  Res  : {
    discounted_price  : number,
    effective_discount_pct : number,
    steps_breakdown   : [{ step, factor, price_after }]
  }

─── TUTORIAL ──────────────────────────────────────

GET    /tutorial/progress
  Res  : { data: TutorialProgress }

PUT    /tutorial/progress
  Body : {
    onboarding_completed?  : boolean,
    onboarding_last_step?  : int,
    tutorial_id?           : string,
    tutorial_status?       : 'completed' | 'in_progress',
    tutorial_last_step?    : int
  }
  Res  : { data: TutorialProgress }

POST   /tutorial/reset-onboarding
  Res  : { success: true }

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ERROR RESPONSE FORMAT (standar semua endpoint):
  {
    error: true,
    code: "ERROR_CODE",
    message: "Pesan error dalam Bahasa Indonesia",
    details: {} (opsional, untuk validasi)
  }

  HTTP Status Codes:
  200 OK           — berhasil
  201 Created      — berhasil buat data baru
  400 Bad Request  — request tidak valid
  401 Unauthorized — tidak ada / token expired
  404 Not Found    — data tidak ditemukan
  409 Conflict     — duplikat (nomor bon, dll)
  422 Unprocessable— validasi gagal
  500 Server Error — error server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

# BAGIAN 10 — IMPLEMENTATION PLAN

---

## 10.1 Tech Stack

```
┌──────────────────────────────────────────────────────────────┐
│                    TECH STACK                                │
│                                                              │
│  FRONTEND                                                    │
│  ├── Framework    : Next.js 14 (App Router)                 │
│  ├── Styling      : TailwindCSS + shadcn/ui                 │
│  ├── Animation    : Framer Motion                           │
│  ├── Form         : React Hook Form + Zod                   │
│  ├── State        : Zustand (client) + React Query (server) │
│  ├── Tutorial     : Custom tutorial engine (React)          │
│  ├── Charts       : Recharts (Fase 2)                       │
│  └── PDF View     : react-pdf/renderer                      │
│                                                              │
│  BACKEND                                                     │
│  ├── Runtime      : Next.js API Routes / Node.js            │
│  ├── Auth         : JWT + bcrypt                            │
│  ├── Validation   : Zod (shared dengan frontend)            │
│  └── PDF Gen      : @react-pdf/renderer atau puppeteer      │
│                                                              │
│  DATABASE                                                    │
│  ├── DB           : PostgreSQL (via Supabase)               │
│  ├── ORM          : Prisma                                  │
│  └── Storage      : Supabase Storage (PDF cache)            │
│                                                              │
│  INFRASTRUCTURE                                             │
│  ├── Hosting      : Vercel (Frontend + Serverless API)      │
│  ├── Database     : Supabase                                │
│  ├── CDN          : Vercel Edge Network                     │
│  └── Domain       : Custom domain (hlmanager.id)           │
└──────────────────────────────────────────────────────────────┘
```

## 10.2 Project Timeline (14 Minggu)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 TIMELINE: 14 MINGGU (termasuk Tutorial System)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SPRINT 0 — MINGGU 1: Foundation
─────────────────────────────────────────────────────────
  □ Setup project: Next.js + Tailwind + shadcn + Prisma
  □ Database schema: semua tabel (termasuk tutorial_progress)
  □ Supabase project setup
  □ Design tokens: warna, tipografi, spacing
  □ Figma: design system + component library
  □ Komponen dasar: Button, Card, Input, Badge
  □ Layout dasar: Sidebar desktop + Bottom nav mobile

DELIVERABLE: Project repo, DB running, design system ready

─────────────────────────────────────────────────────────
SPRINT 1 — MINGGU 2-3: Auth + Onboarding Tour
─────────────────────────────────────────────────────────
  □ Halaman Login (UI + logic + error handling)
  □ JWT session management
  □ Protected routes
  □ Logout
  □ Dashboard layout (skeleton)

  ★ TUTORIAL: Onboarding Tour Engine
  □ Tutorial overlay component (spotlight)
  □ Tooltip bubble component
  □ Onboarding tour: 8 langkah konten
  □ First-login detection logic
  □ Tutorial progress: tabel DB + API
  □ Skip/complete/pause logic
  □ Tombol ulangi tur dari Bantuan

DELIVERABLE: Login + first-time onboarding tour berfungsi

─────────────────────────────────────────────────────────
SPRINT 2 — MINGGU 4-5: Customer Module
─────────────────────────────────────────────────────────
  □ Halaman daftar pelanggan
  □ Form tambah pelanggan
  □ Form edit pelanggan
  □ Soft-delete pelanggan
  □ Komponen diskon bertingkat (add/edit/delete steps)
  □ Preview kalkulasi cascading discount
  □ API: CRUD customers + discounts

  ★ TUTORIAL: Contextual Tooltips (Customer)
  □ Tooltip component global
  □ Tooltip konten: Diskon LM, Diskon BR, Threshold Bonus
  □ Tooltip trigger [?] di semua field kompleks pelanggan

  ★ TUTORIAL: TUT-01 Tambah Pelanggan
  □ Step-by-step guide 7 langkah
  □ Demo mode (tidak simpan ke produksi)

DELIVERABLE: Customer CRUD + tooltip + TUT-01 berfungsi

─────────────────────────────────────────────────────────
SPRINT 3 — MINGGU 6: Product Module
─────────────────────────────────────────────────────────
  □ Halaman daftar produk
  □ Form tambah produk
  □ Form edit produk
  □ Soft-delete produk
  □ Filter tipe LM/BR
  □ API: CRUD products

  ★ TUTORIAL: TUT-02 Tambah Produk
  □ Step-by-step 5 langkah

DELIVERABLE: Product CRUD + TUT-02 berfungsi

─────────────────────────────────────────────────────────
SPRINT 4 — MINGGU 7-8: Transaction Core
─────────────────────────────────────────────────────────
  □ Form buat bon (multi-line)
  □ Dropdown pelanggan + auto-load diskon
  □ Dropdown produk per baris
  □ Kalkulasi real-time (cascading discount per baris)
  □ Kalkulasi omzet, laba, total
  □ Validasi nomor bon unik
  □ Form edit bon (recalculate)
  □ Halaman daftar bon (filter status)
  □ Halaman detail bon
  □ Delete bon
  □ API: CRUD transactions + items

  ★ TUTORIAL: Contextual Tooltips (Bon)
  □ Tooltip: Nomor Bon, Omzet, Ongkir, Status
  □ TUT-03: Buat Bon (12 langkah — tutorial utama)

DELIVERABLE: Bon CRUD + kalkulasi + TUT-03 berfungsi

─────────────────────────────────────────────────────────
SPRINT 5 — MINGGU 9: Settlement + Customer Detail
─────────────────────────────────────────────────────────
  □ Halaman customer detail
  □ Group transaksi per bulan
  □ Summary per bulan (piutang, lunas, omzet LM/BR, laba)
  □ Modal pelunasan 1 bon (tanggal picker)
  □ Modal pelunasan 1 bulan penuh
  □ Update real-time setelah pelunasan
  □ Visual distinkt: Piutang vs Lunas bon
  □ Detail bon lengkap (semua field)
  □ API: settle-single + settle-month

  ★ TUTORIAL: TUT-04, TUT-05, TUT-06
  □ TUT-04: Lihat Piutang (4 langkah)
  □ TUT-05: Lunaskan 1 Bon (5 langkah)
  □ TUT-06: Lunaskan 1 Bulan (5 langkah)

DELIVERABLE: Customer detail + settlement + TUT-04/05/06

─────────────────────────────────────────────────────────
SPRINT 6 — MINGGU 10: Bonus Logic
─────────────────────────────────────────────────────────
  □ Hitung bonus accumulator per pelanggan
  □ Notifikasi bonus di dashboard + customer detail
  □ Bon bonus: form khusus (is_bonus = true)
  □ Item bonus: omzet 0, laba 0
  □ Multiple bonus dalam 1 bon
  □ Carry-over logic
  □ Visual distinkt bon bonus di daftar
  □ API: bonus-status + bonus grants

  ★ TUTORIAL: TUT-07, TUT-09
  □ TUT-07: Atur Diskon Pelanggan (8 langkah)
  □ TUT-09: Buat Bon Bonus (9 langkah)

DELIVERABLE: Bonus system + TUT-07/09 berfungsi

─────────────────────────────────────────────────────────
SPRINT 7 — MINGGU 11: Reporting + PDF
─────────────────────────────────────────────────────────
  □ Halaman rekap per pelanggan
  □ Halaman rekap per tipe LM/BR
  □ Halaman rekap keseluruhan
  □ Filter bulan & tahun
  □ Bonus log terpisah
  □ PDF export: rekap pelanggan
  □ PDF export: daftar piutang
  □ PDF export: rekap keseluruhan

  ★ TUTORIAL: Tooltips Laporan + TUT-08
  □ Tooltip: Omzet, Laba, Bon Bonus (di halaman laporan)
  □ TUT-08: Lihat Laporan & Export PDF (7 langkah)
  □ TUT-10: Memahami Omzet, Laba, Piutang (5 langkah edukasi)
  □ TUT-11: Edit & Hapus Data (6 langkah)

DELIVERABLE: Laporan + PDF + Tutorial Menengah/Lanjutan

─────────────────────────────────────────────────────────
SPRINT 8 — MINGGU 12: Help Center
─────────────────────────────────────────────────────────
  □ Halaman Bantuan + routing dari nav
  □ Daftar 11 tutorial dengan status
  □ FAQ: 9+ pertanyaan (accordion)
  □ Glosarium: 10+ istilah
  □ Tombol "Ulangi Tur Pengenalan"
  □ Tutorial badge sistem (selesai/belum)
  □ Tutorial in-progress indicator

DELIVERABLE: Help Center lengkap + semua tutorial terhubung

─────────────────────────────────────────────────────────
SPRINT 9 — MINGGU 13: Polish + Dashboard
─────────────────────────────────────────────────────────
  □ Dashboard lengkap:
    - Stat cards (piutang, lunas, omzet, laba)
    - Bonus alerts dengan animasi
    - Transaksi terbaru (preview 5)
    - Tombol BON BARU prominent
  □ Framer Motion: semua animasi & transisi
  □ Skeleton loaders semua halaman
  □ Toast notifications (sukses/error/info)
  □ Error boundaries
  □ Responsive audit (mobile, tablet, desktop)
  □ Accessibility audit: font size, contrast, touch target
  □ prefers-reduced-motion support

DELIVERABLE: App polished, animasi lengkap, responsif

─────────────────────────────────────────────────────────
SPRINT 10 — MINGGU 14: Testing + Deployment
─────────────────────────────────────────────────────────
  □ Unit test: semua formula kalkulasi
  □ Integration test: API endpoints kritis
  □ E2E test: user flows utama (Playwright)
  □ UAT dengan user asli (pemilik bisnis HL)
  □ Bug fixing dari UAT
  □ Performance audit (Lighthouse)
  □ Security audit (HTTPS, JWT, input sanitization)
  □ Vercel deployment (production)
  □ Domain + SSL setup
  □ Database migration final
  □ Dokumentasi panduan singkat (PDF, 1 lembar)
  □ Serah terima + training singkat (1 jam)

DELIVERABLE: App live di production, serah terima

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 10.3 Team & Responsibility

```
┌──────────────────────────────────────────────────────────────┐
│                   STRUKTUR TIM                               │
│                                                              │
│  🧑‍💼 PROJECT MANAGER (0.5 FTE)                               │
│     Tanggung jawab:                                          │
│     • Timeline & milestone management                        │
│     • Komunikasi klien                                       │
│     • Sprint planning & review                               │
│     • Risk monitoring                                        │
│                                                              │
│  🎨 UI/UX DESIGNER (1 FTE, Minggu 1-3, lalu 0.25 FTE)      │
│     Tanggung jawab:                                          │
│     • Figma design system                                    │
│     • 20+ halaman mockup (mobile + desktop)                 │
│     • Tutorial overlay & tooltip design                      │
│     • Prototype interaktif untuk UAT                        │
│     • Design review tiap sprint                             │
│                                                              │
│  💻 FRONTEND DEVELOPER (1 FTE)                               │
│     Tanggung jawab:                                          │
│     • Semua halaman React/Next.js                           │
│     • Tutorial engine (overlay, tooltip, step guide)        │
│     • Animasi (Framer Motion)                               │
│     • PDF rendering (client-side)                           │
│     • Responsive implementation                             │
│     • E2E tests (Playwright)                                │
│                                                              │
│  ⚙️ BACKEND DEVELOPER (1 FTE)                                │
│     Tanggung jawab:                                          │
│     • API endpoints (Next.js API Routes)                    │
│     • Prisma ORM + migrations                               │
│     • Kalkulasi engine (cascading, bonus)                   │
│     • Auth (JWT + bcrypt)                                   │
│     • PDF generation (server-side)                          │
│     • Unit & integration tests                              │
│     • Tutorial progress API                                 │
│                                                              │
│  🧪 QA TESTER (0.5 FTE, Minggu 11-14)                       │
│     Tanggung jawab:                                          │
│     • Test plan & test cases                                │
│     • Manual testing semua AC                               │
│     • Regression testing                                    │
│     • UAT fasilitator                                       │
│                                                              │
│  TOTAL: ~3.5 FTE selama 14 minggu                           │
│  (bisa dijalankan 2 fullstack developer + 1 PM + 1 designer)│
└──────────────────────────────────────────────────────────────┘
```

## 10.4 Quality Gates Per Sprint

```
SETIAP SPRINT HARUS LOLOS:

✅ QG-1: Semua AC yang dijadwalkan sprint ini → passed
✅ QG-2: Tidak ada console error di browser
✅ QG-3: Mobile responsive di 360px dan 768px
✅ QG-4: Tombol/link semua berfungsi
✅ QG-5: Loading state ada di setiap aksi async
✅ QG-6: Error handling ada (tidak blank screen)
✅ QG-7: Kalkulasi diverifikasi manual dengan contoh dari AC-2.9
✅ QG-8: Touch target ≥ 48px (mobile)
✅ QG-9: Font body ≥ 16px, heading ≥ 20px
✅ QG-10: Contrast ratio ≥ 4.5:1 (cek dengan Chrome DevTools)
```

---

# BAGIAN 11 — NEXT DEVELOPMENT IDEAS

---

```
ROADMAP FASE 2 (Bulan 4-6 setelah launch):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEA-01: 📊 Dashboard Charts & Visual
  Deskripsi : Grafik batang omzet bulanan, pie LM vs BR,
              trend laba 6 bulan terakhir
  Value     : Business insight lebih mudah dipahami visual
  Effort    : Medium | Impact: High
  Tech      : Recharts library (sudah di tech stack)

IDEA-02: 📱 WhatsApp Tagihan Otomatis
  Deskripsi : Tombol "Kirim Tagihan ke WA" yang generate
              pesan tagihan otomatis ke nomor pelanggan
  Value     : Pelunasan lebih cepat via WA
  Effort    : Low | Impact: High
  Tech      : WhatsApp deep link (wa.me/...?text=...)

IDEA-03: 🌙 Gen Z Mode Toggle
  Deskripsi : Tombol switch di pojok kanan atas.
              Gen Z Mode: dark theme, glassmorphism intens,
              animasi lebih dinamis, typography edgier.
              Default: Senior Mode (current design)
  Value     : Asisten muda pemilik bisnis bisa nyaman pakai
  Effort    : Medium | Impact: Medium
  Tech      : Tailwind dark variant + theme context

IDEA-04: 🎯 Target Omzet Bulanan
  Deskripsi : User set target omzet per bulan,
              dashboard tampil progress bar "XX% dari target"
  Value     : Motivasi & monitoring pencapaian bisnis
  Effort    : Low | Impact: Medium

IDEA-05: 📥 Import Data dari Excel
  Deskripsi : Upload file .xlsx untuk import
              pelanggan & produk secara massal
  Value     : Onboarding lebih cepat dari data lama
  Effort    : High | Impact: Medium
  Tech      : SheetJS (xlsx library)

IDEA-06: ☁️ Backup & Restore Mandiri
  Deskripsi : Export semua data ke JSON / backup ke Google Drive.
              Restore dari file backup.
  Value     : Ketenangan pikiran — data aman di tangan user
  Effort    : Medium | Impact: High

IDEA-07: 📄 Template Bon
  Deskripsi : Simpan kombinasi pelanggan + produk yang sering
              digunakan sebagai template 1-tap
  Value     : Input bon lebih cepat untuk pelanggan langganan
  Effort    : Low | Impact: Medium

IDEA-08: 🔄 PWA + Offline Mode
  Deskripsi : Progressive Web App — bisa install di HP,
              tetap bisa lihat data saat offline,
              sync otomatis saat online
  Value     : Tetap produktif saat koneksi buruk
  Effort    : High | Impact: High
  Tech      : Next.js PWA + Service Worker + IndexedDB

IDEA-09: 🎥 Video Tutorial
  Deskripsi : Video screenrecord 2-3 menit per topik,
              embedded di halaman Bantuan
  Value     : Cara belajar lebih intuitif untuk sebagian user
  Effort    : Medium (konten) | Impact: Medium

IDEA-10: 📊 Advanced Reporting
  Deskripsi : - Laporan produk terlaris
              - Pelanggan dengan omzet tertinggi
              - Tren piutang overdue (> 30 hari)
              - Proyeksi omzet bulan berikutnya
  Value     : Insight bisnis lebih dalam
  Effort    : Medium | Impact: High

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ROADMAP FASE 3 (Bulan 7-12):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDEA-11: 👥 Multi-User + Role-Based Access
  - Owner (full access)
  - Staff (input bon, tidak lihat laba)
  - Viewer (read-only laporan)

IDEA-12: 🤖 AI Assistant (Chat)
  Deskripsi : "Bu HL, bulan ini piutang terbesar dari
              siapa?" — dijawab AI dari data dalam sistem
  Effort    : High | Impact: High (sangat diferensiasi)

IDEA-13: 📱 Native Mobile App
  React Native / Expo untuk iOS & Android
  Push notification untuk bonus & piutang jatuh tempo
```

---

# BAGIAN 12 — BUDGET & DELIVERABLES

---

## 12.1 Deliverables yang Diserahkan ke Klien

```
PAKET SERAH TERIMA:

KODE & APLIKASI:
  ✅ Source code lengkap (Next.js + API + DB)
  ✅ Repository Git (GitHub/GitLab)
  ✅ Aplikasi live di production (Vercel)
  ✅ Database production sudah setup
  ✅ Contoh data demo untuk testing

DESIGN:
  ✅ Figma design file (semua halaman + component)
  ✅ Design system documentation

DOKUMENTASI TEKNIS:
  ✅ Dokumentasi API (Postman collection)
  ✅ Database schema diagram (ERD)
  ✅ Setup guide (README)
  ✅ Environment variables guide

DOKUMENTASI PENGGUNA:
  ✅ Panduan pengguna PDF (Bahasa Indonesia sederhana)
  ✅ Video demo singkat aplikasi (3-5 menit)
  ✅ Panduan 1 lembar (quick reference card)

SUPPORT:
  ✅ 30 hari support bug-fix setelah serah terima
  ✅ 1 sesi training langsung / video call (1-2 jam)
  ✅ Transfer knowledge ke klien
```

## 12.2 Estimasi Biaya

```
BREAKDOWN BIAYA PENGEMBANGAN:

1. UI/UX Design (3 minggu penuh + review)
   • Design system & component library
   • 20+ halaman mockup (mobile + desktop)
   • Tutorial overlay design
   • Prototype interaktif
   Estimasi: Rp 6.000.000 – 10.000.000

2. Frontend Development (10 minggu)
   • Semua halaman + komponen
   • Tutorial engine (onboarding, tooltip, step guide)
   • Animasi (Framer Motion)
   • PDF rendering
   • Responsive & accessibility
   Estimasi: Rp 15.000.000 – 22.000.000

3. Backend + Database (8 minggu)
   • Semua API endpoints
   • Kalkulasi engine (cascading, bonus)
   • Auth + session
   • PDF generation server-side
   • Tutorial progress tracking
   Estimasi: Rp 12.000.000 – 18.000.000

4. QA + Deployment (2 minggu)
   • Testing + bug fix
   • Deployment + domain + SSL
   • UAT facilitation
   Estimasi: Rp 3.000.000 – 5.000.000

5. Konten Tutorial
   • Penulisan konten 11 tutorial
   • FAQ 9+ item
   • Glosarium
   Estimasi: Rp 2.000.000 – 3.000.000

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOTAL ESTIMASI: Rp 38.000.000 – 58.000.000
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BIAYA OPERASIONAL BULANAN (setelah launch):
  Vercel Pro  : ~$20/bulan (~Rp 320.000)
  Supabase    : ~$25/bulan (~Rp 400.000)
  Domain      : ~Rp 150.000/tahun
  TOTAL/BULAN : ~Rp 720.000 – 750.000
```

---

# BAGIAN 13 — RISK REGISTER

---

```
┌──────────────────────────────────────────────────────────────────┐
│ #  │ Risk                    │ Prob │ Impact │ Mitigasi         │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R1 │ User tidak bisa pakai   │ Med  │ High   │ UAT di minggu    │
│    │ app (tech illiteracy)   │      │        │ 2 & 13 dengan    │
│    │                         │      │        │ user asli.       │
│    │                         │      │        │ Tutorial system  │
│    │                         │      │        │ sebagai mitigasi │
│    │                         │      │        │ utama.           │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R2 │ Kalkulasi diskon error  │ Low  │ Crit   │ Unit test semua  │
│    │                         │      │        │ formula dengan   │
│    │                         │      │        │ contoh dari AC.  │
│    │                         │      │        │ Dedicated test   │
│    │                         │      │        │ calculator.      │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R3 │ Data loss               │ Low  │ Crit   │ Supabase daily   │
│    │                         │      │        │ backup. Soft-    │
│    │                         │      │        │ delete semua     │
│    │                         │      │        │ entity.          │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R4 │ Scope creep             │ High │ Med    │ Freeze MVP scope.│
│    │                         │      │        │ Request baru     │
│    │                         │      │        │ masuk roadmap    │
│    │                         │      │        │ Fase 2.          │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R5 │ Tutorial engine kompleks│ Med  │ Med    │ Mulai dari week  │
│    │ melebihi estimasi       │      │        │ 2. Simplifikasi  │
│    │                         │      │        │ jika perlu:      │
│    │                         │      │        │ tooltip dulu,    │
│    │                         │      │        │ tour menyusul.   │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R6 │ PDF export lambat       │ Med  │ Low    │ Server-side PDF  │
│    │                         │      │        │ dengan cache.    │
│    │                         │      │        │ Timeout 30 detik.│
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R7 │ Mobile performance      │ Low  │ Med    │ Lighthouse audit │
│    │ lambat                  │      │        │ setiap sprint.   │
│    │                         │      │        │ Image optimasi.  │
│    │                         │      │        │ Code splitting.  │
├────┼─────────────────────────┼──────┼────────┼──────────────────┤
│ R8 │ User skip tutorial,     │ Med  │ Med    │ Tooltip selalu   │
│    │ lalu bingung            │      │        │ ada (tidak bisa  │
│    │                         │      │        │ di-disable).     │
│    │                         │      │        │ FAQ mudah diakses│
└──────────────────────────────────────────────────────────────────┘
```

---

# PENUTUP

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  HL MANAGER PRO — MASTER PRODUCT DOCUMENT v2.0
  Status: FINAL — READY FOR DEVELOPMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RINGKASAN DOKUMEN:

  ✅ 55+ Acceptance Criteria (original)
  ✅ 30+ Tutorial System Acceptance Criteria (baru)
  ✅ 9 Confirmed Decisions (dari klien)
  ✅ 85+ Functional Requirements
  ✅ 11 Tutorial Topics dengan konten lengkap
  ✅ 9+ FAQ items
  ✅ 10+ Glosarium istilah
  ✅ Complete Database Schema (8 tabel)
  ✅ Complete API Design (40+ endpoints)
  ✅ 14 Minggu Implementation Timeline
  ✅ Design System (color, type, component, animation)
  ✅ 13 Future Development Ideas
  ✅ 8 Risk Items dengan mitigasi

YANG MEMBEDAKAN DOKUMEN INI:
  • Satu-satunya platform manajemen bisnis dengan
    Tutorial System built-in untuk pengguna lansia
  • Design "Warm Premium Depth" — tidak flat, tidak kuno
  • Semua AC klien 100% tercakup + enhanced dengan tutorial
  • Siap langsung dieksekusi oleh tim developer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Prepared for: HL Business — Internal Use
  Document version: 2.0
  Basis: Acceptance Criteria v1.0 + Tutorial System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```