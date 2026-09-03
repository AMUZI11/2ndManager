# Spesifikasi Desain: Landing Page & Mobile Dock Responsif (Semua Ukuran Layar)

- **Tanggal**: 2026-09-03
- **Status**: Disetujui Pengguna (Opsi 1: Fluid Pop-Art Scale + Ergonomic Floating Bottom Dock)
- **Komponen Utama**:
  1. src/app/page.js (Landing Page Utama)
  2. src/components/landing/LandingNavbar.jsx (Navbar Landing)
  3. src/app/(authenticated)/layout.js (Bottom Dock 5-Item Sisi Kasir)
- **Target Breakpoint**:
  * Ponsel Ringkas: 360px – 390px (Galaxy A, iPhone SE/Mini)
  * Ponsel Standar: 390px – 430px (iPhone 12/13/14/15/Pro Max)
  * Tablet: 768px – 1024px (iPad, Tablet POS Android)
  * Desktop: 1280px – 1440px+ (Laptop, Monitor Kasir)

---

## 1. Landing Page (src/app/page.js & LandingNavbar.jsx)

### A. Hero Section & Typography Clamping
- **Container**: min-h-[100dvh] flex items-center pt-28 sm:pt-32 pb-16 px-4 max-w-full overflow-x-hidden.
- **Badge**: 	ext-[11px] font-mono-custom font-bold px-3 py-1 (dibuat tidak meluber di layar 360px).
- **Headline**: 	ext-4xl sm:text-6xl md:text-7xl lg:text-[80px] font-black tracking-tight leading-[0.92] (kata 'sepenuhnya' menggunakan 	ext-3xl sm:text-5xl md:text-6xl agar tidak memotong layar).
- **CTA Buttons**: Di mobile berupa tumpukan vertikal dengan lebar penuh w-full sm:w-auto berukuran sentuh 52px.
- **Hero Mockup**:
  * Lebar maksimum proporsional max-w-md lg:max-w-lg w-full mx-auto.
  * Di layar < 640px: Rotasi 3D dinormalkan ke otate-0 dan stiker diposisikan di dalam batas kotak agar tidak memicu horizontal scrollbar.
  * Teks live telemetry dan bar chart disesuaikan dengan padding responsif p-4 sm:p-6.

### B. The Chaos Section (Tabel Masalah Warung Bocor)
- **Stiker Mengambang**:
  * Stiker diposisikan dengan aman menggunakan persentase dan hidden sm:block untuk stiker sekunder agar tidak keluar dari tepi layar ponsel.
- **Tabel Responsif**:
  * Di desktop (>= 768px): Tabel 4-kolom klasik (No, Masalah, Keterangan, Status).
  * Di mobile (< 768px): Berubah menjadi *card list* bertumpuk dengan header ringkas, tag status di kanan atas, dan teks penjelasan yang mudah dibaca.

### C. The Grid Section (Mesin Anti-Bocor)
- **Grid Layout**: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8.
- Setiap kartu memiliki tinggi fleksibel, teks monospace tidak terpotong, dan visual preview mini yang responsif.

### D. Struktur Kontrak Gaji Manajer (Popcorn Pricing)
- **4-Tier Pricing Grid**:
  * grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6.
  * Tier 3 (Eksekutif) callout banner: disesuaikan w-[90%] sm:w-auto text-[8.5px] sm:text-[9px] px-2.5 py-1 text-center truncate agar tidak meluap di layar 360px.
- **Add-On Facture Table**:
  * Tersusun rapi dalam 1 kolom pada ponsel, 2 kolom pada tablet/desktop.

### E. Landing Footer Brutalist
- Menambahkan footer lengkap penutup halaman dengan logo 2M, tautan navigasi, deklarasi hak cipta, dan jalur bantuan darurat.

---

## 2. Sisi Kasir Toko: Ergonomic Floating Bottom Dock (src/app/(authenticated)/layout.js)

### A. Struktur 5 Item Dock
1. 📊 **Beranda** (/dashboard)
2. 📦 **Produk** (/products)
3. ⚡ **KASIR (HERO)** (/pos) — Tombol tengah melayang (-translate-y-3), ukuran w-14 h-14 (56px), warna Neon Lime #CCFF00, border hitam 2px, bayangan brutal 3px 3px 0 #1E293B, animasi detak lembut.
4. 🧾 **Transaksi** (/transactions)
5. ☰ **Lainnya** — Membuka Slide-Up Sheet Drawer untuk: Pelanggan (/customers), Laporan (/reporting), Kontrak (/billing), Bantuan (/help), Pengaturan (/settings), dan Keluar.

### B. Anti-Collision & Keyboard Avoidance
- Posisi: ixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)].
- Deteksi Keyboard: Menggunakan event listener resize / focus form untuk menyembunyikan dock otomatis saat virtual keyboard ponsel aktif.
- Halaman POS & Form: Diberikan bottom padding pb-28 sm:pb-32 (min 112px) agar konten tidak tertutup dock.
- Tombol WA Darurat: Melayang di ottom-24 right-4 di mobile.
