# 2ndmanager Landing Page Specification

## 1. DNA VISUAL & SISTEM WARNA (Membunuh Dark Mode)
- **The Canvas (Background)**: Titanium White (#FFFFFF) dan Off-White (#F9FAFB). Sangat terang, lapang, dan segar.
- **The Ink (Garis & Teks Utama)**: True Black (#000000). Semua kotak fitur memiliki border hitam 2px dan bayangan solid (Hard Shadow).
- **The Action (Warna Kejut)**: Lime Green / Kuning Stabilo (#CCFF00) dari DNA ProjectOne. Agresif, cepat, taktil.
- **The Status (LED Log)**: Veronese Green (Aman) & Cadmium Red (Bocor).
- **Material Kaca (Uneevo DNA)**: Kaca blur (backdrop-blur-xl) HANYA digunakan di dalam bingkai hitam. Tidak ada kaca yang melayang bebas.

## 2. THE EDITORIAL TYPOGRAPHY
- **Display / H1**: Clash Display (Font Grotesk yang sangat bold dan berkarakter) DICAMPUR dengan Fraunces Italic (Font Serif klasik yang miring).
- **Body Text**: DM Sans (Sangat terbaca, netral).
- **Data & Terminal**: Geist Mono (Hukum mutlak untuk setiap angka, jam, dan nominal uang).

*Font Management*: Gunakan `next/font/google` untuk Fraunces, DM Sans, dan Geist Mono. Unduh `Clash Display` (.woff2) secara lokal menggunakan `next/font/local`.

## 3. ANATOMI HALAMAN (The "Chaos to Order" Flow)

### [SECTION 0] The Tilted Navbar
- Kapsul Kaca berbingkai hitam, melayang di atas.
- Di pojok kapsul ada badge [ 24/7 AUTOPILOT ] warna Lime Green yang dimiringkan -4 derajat (Asimetris terkontrol).

### [SECTION 1] The Hero: "Editorial Confidence"
- **Tipografi Campuran (Kiri)**: WARUNG ANDA, sepenuhnya BERES. (Tulisan 'sepenuhnya' menggunakan Fraunces Italic, sisanya Clash Display tebal).
- **Visual (Kanan)**: Panel kaca transparan berbingkai hitam 2px, menimpa teks secara asimetris. Di dalamnya ada teks Geist Mono berkedip hijau melaporkan: `Laporan Pagi: KLOP`.
- **CTA**: Tombol mekanis Lime Green yang tebal.

### [SECTION 2] The Agitation: "The Chaos"
- **Animasi Teks**: Teks Headline bagian ini awalnya berantakan (scrambled letters), lalu saat di-scroll, huruf-hurufnya tersusun rapi membentuk kalimat: "HENTIKAN KEBOCORAN INI."
- **Layout**: Masonry/Asimetris. Kotak-kotak fitur berantakan seperti bento box yang pecah, melambangkan sistem warung yang kacau sebelum ada 2ndmanager.
- **Isi Kotak**: Log merah aktivitas kasir yang membatalkan struk secara diam-diam.

### [SECTION 3] Interactive ROI Calculator: "The Order"
- Di sinilah sistem mulai menjadi rapi. Tabung kapsul raksasa yang simetris sempurna.
- Terdapat dua "Slider fisik" ala perangkat keras kelas atas (Slider Omset Harian, Slider Jumlah Shift/Karyawan).
- Saat digeser, angka "Kerugian Anda" dihitung live menggunakan font Geist Mono raksasa.
- Formula: Perhitungan berdasarkan jumlah shift dan estimasi kebocoran dari omset.

### [SECTION 4] The Brutal Proof
- Tidak ada kotak, tidak ada kaca. Murni latar putih.
- Angka raksasa `RP 18.500.000` mendominasi layar.
- Di bawahnya, kutipan Koh Afat dengan font Fraunces Italic berukuran sedang, rata tengah, memberikan kesan kesaksian yang otentik.

### [SECTION 5] The Executive Comparison (Tabel Brutal)
- Tabel dua kolom bergaris hitam tegas.
- **Kiri (Abu-abu, Redup)**: CARA LAMA (CCTV pasif, kasir ngeles, laporan coret-coretan).
- **Kanan (Putih Terang, Aksen Lime Green)**: 2NDMANAGER (Sistem melotot 24 jam, langsung blokir curang, laporan PDF otomatis).

### [SECTION 6] Pricing & The Final CTA
- Satu kotak kontrak harga.
- Teks Headline: "Gaji Manajer Paling Masuk Akal."
- Tombol kapsul raksasa berbayang hitam solid. Saat diklik, bayangan menghilang dan tombol tertekan keras (Hard Shadow logic).

## 4. TECH STACK
- Next.js (App Router)
- Tailwind CSS (Konfigurasi custom shadow dan custom color: titanium, offwhite, lime)
- Framer Motion (Untuk interaksi scrambled text dan scroll animation)
