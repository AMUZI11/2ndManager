# Spesifikasi Desain: Dual-Archetype Responsive Protocol (Semua Halaman & Semua Sudut)

- **Tanggal**: 2026-09-03
- **Status**: Menunggu Review Pengguna
- **Arsitektur**: Dual-Archetype (Pop-Art Brutalism pada Sisi Toko × The Obsidian Terminal pada Sisi Superadmin)
- **Cakupan Perangkat**: Mobile (360px–428px), Tablet (768px–1024px), Desktop / Layar Lebar (1280px–1920px+)

---

## 1. Design Read & Visual Dials

> **Design Read**: Aplikasi SaaS POS & ERP Retail Warung dua kutub:
> - **Kutub 1 (Sisi Kasir & Toko)**: Pop-Art Neo-Brutalism dengan Glassmorphism terkalibrasi, border tegas 2px zinc-900, bayangan brutal 3-4px #1E293B, aksen neon lime (#CCFF00) dan cadmium red, ramah jempol lansia (touch targets 48px–56px).
> - **Kutub 2 (Sisi Platform Superadmin)**: The Obsidian Terminal, canvas gelap #09090B, panel zinc-900/70, border zinc-800 presisi, tipografi tabular Geist Mono, telemetry cards, dan keyboard-first workflow.

### Konfigurasi Visual Dials
- **DESIGN_VARIANCE: 8** (Karakter visual kuat, kontras tinggi, identitas brand taktil dan ceria di toko, taktis di admin).
- **MOTION_INTENSITY: 5** (Micro-physics taktil .btn-arcade dengan :active:scale-95, transisi drawer mulus, bebas listener scroll berat).
- **VISUAL_DENSITY: 7** (Tabel berdensitas tinggi di desktop admin, layout ergonomis bernapas di mobile kasir).

---

## 2. Arsitektur Kutub 1: Sisi Kasir & Toko (src/app/(authenticated)/*)

### A. Layout Shell & Navigasi Mobile (< 768px)
1. **Ergonomic Floating Bottom Dock**:
   - Fixed di bagian bawah layar: fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)].
   - Latar belakang: bg-white/90 backdrop-blur-xl border-t-2 border-zinc-900 shadow-[0_-4px_16px_rgba(0,0,0,0.08)].
   - **5 Item Ergonomis**:
     1. Beranda (/dashboard)
     2. Produk (/products)
     3. KASIR (HERO) (/pos) — Tombol tengah berukuran lebih besar (56px × 56px), menonjol ke atas (-translate-y-3), berlatar Neon Lime #CCFF00, border hitam 2px, bayangan brutal 3px 3px 0 #1E293B.
     4. Transaksi (/transactions)
     5. Lainnya (Memicu slide-up sheet drawer untuk: Pelanggan, Laporan, Bantuan, Pengaturan, Billing, Keluar).
   - Label teks di bawah ikon: text-[10px] font-bold font-sans tracking-tight text-slate-800.
   - **Keyboard Avoidance**: Otomatis menyembunyikan dock saat input form sedang fokus / virtual keyboard terbuka.
2. **Slide-Up Drawer (Menu Lainnya)**:
   - Menampung navigasi sekunder: Pelanggan (/customers), Laporan (/reporting), Kontrak Langganan (/billing), Bantuan (/help), Pengaturan Toko (/settings), serta Tombol Keluar Sistem.
   - Tombol-tombol drawer berukuran minimal 52px untuk kenyamanan sentuhan jempol.

### B. Halaman Kasir POS (src/app/pos/page.js) Anti-Collision
1. **Pencegahan Tumpukan Layar Bawah**:
   - Daftar keranjang belanja dan formulir kasir diberi padding bawah ekstra pb-28 sm:pb-32 (minimal 112px) sehingga item terbawah tidak terpotong atau tertutup dock.
   - Bar total harga dan tombol "Bayar" mobile berada di atas dock secara ergonomis dengan border pembatas yang jelas.
2. **Katalog Produk Responsif**:
   - Mobile: Grid 2-kolom (grid-cols-2 gap-2.5) dengan kartu produk ramah sentuh (gambar/ikon jelas, tombol + besar).
   - Tablet & Desktop: Multi-kolom (Katalog di sisi kiri fleksibel 3-4 kolom, Keranjang kasir di sisi kanan sticky).
3. **Modal Pembayaran & Kembalian**:
   - Pada layar HP, modal pembayaran mengisi layar penuh (bottom sheet modal) dengan tombol nominal uang pas, 50rb, 100rb yang besar dan mudah ditekan.

### C. Halaman Dashboard (src/views/Dashboard.jsx)
1. **Stat Cards & Shortcut Kasir**:
   - Mobile: Grid 2-kolom ringkas untuk omzet dan transaksi hari ini, tombol cepat "Buka Kasir" menonjol.
   - Tablet & Desktop: Grid 4-kolom lengkap dengan grafik tren penjualan.
2. **Tabel Transaksi Terakhir**:
   - Mobile: Menggunakan tampilan card list bertumpuk (bukan tabel terpotong horizontal), menampilkan nomor bon, status lunas/kasbon, dan nominal yang mudah dibaca.
   - Desktop: Tabel lengkap dengan kolom aksi audit.

### D. Formulir Transaksi & Input Produk
1. **Single-Column Stack pada Layar Sentuh**:
   - Seluruh input form (Nama pelanggan, nominal, diskon bertingkat, ongkir) tersusun vertikal 1-kolom di mobile (< 768px) dengan tinggi input minimal 48px.
   - Di desktop (>= 768px), tersusun rapi dalam 2-kolom grid.
2. **Tombol '🆘 Bantuan Darurat WA'**:
   - Diposisikan mengambang di atas safe area bottom-24 right-4 pada mobile agar tidak bentrok dengan dock bawah atau tombol checkout.

---

## 3. Arsitektur Kutub 2: Sisi Platform Superadmin (src/app/(admin)/*)

### A. Gaya Visual: The Obsidian Terminal
- **Palet Warna**:
  * Canvas: #09090B (Zinc-950)
  * Panel Kartu: bg-zinc-900/70 border border-zinc-800/80 backdrop-blur-xl
  * Tipografi Data: font-mono Geist Mono tabular angka presisi.
  * Aksen Status: Emerald Green #10B981, Cadmium Red #EF4444, Neon Amber #F59E0B.

### B. Penyesuaian Responsif Admin pada Mobile & Tablet (< 1024px)
1. **Tabel Data High-Density dengan Sticky Header & Kolom Pertama**:
   - Di halaman Tenants (/admin/tenants), Payment Proofs (/admin/payment-proofs), Fraud Radar (/admin/fraud-radar), dan Audit Logs (/admin/audit-logs):
   - Tabel dibungkus dalam kontainer overflow-x-auto scrollbar-thin dengan border presisi.
   - Kolom nama toko / ID disetel sticky left-0 bg-zinc-900 z-10 sehingga admin tetap mengetahui baris data saat menggeser tabel ke samping pada layar kecil.
2. **Kartu Telemetri Dashboard Admin**:
   - Mobile (< 640px): 1 kolom tumpuk.
   - Tablet (640px–1023px): 2 kolom grid.
   - Desktop (>= 1024px): 4 kolom penuh dengan telemetry stream real-time.
3. **Command Palette (Cmd+K)**:
   - Tetap dapat dibuka lewat shortcut keyboard pada desktop.
   - Disediakan tombol ikon pencarian terminal di header mobile agar dapat dibuka lewat satu sentuhan di layar sentuh.

---

## 4. Aturan Responsivitas Global & Performa Perangkat

1. **Zero Horizontal Overflow pada Body**:
   - Seluruh elemen pembungkus utama menerapkan max-w-full overflow-x-hidden untuk mencegah bug geser layar putih tidak disengaja.
2. **GPU Optimization & Hemat Daya Layar Kasir**:
   - Elemen ambient blur orbs (blur-[80px]) dinonaktifkan atau diturunkan radiusnya (blur-[32px] opacity-40) pada viewport mobile untuk menghemat GPU dan baterai tablet/HP kasir.
3. **Ukuran Target Sentuh Standar WCAG & Ramah Lansia**:
   - Seluruh tombol utama, opsi pembayaran, dan link navigasi memiliki area klik minimal 44px × 44px hingga 52px × 52px.

---

## 5. Rencana Verifikasi & Uji Mutu (Zero-Tolerance QA)

1. **Uji Breakpoint Faktual**:
   - Mobile Ringkas: 360px × 640px (Galaxy A series / HP murah kasir).
   - Mobile Standar: 390px × 844px (iPhone 12/13/14).
   - Tablet: 768px × 1024px & 820px × 1180px (iPad / POS Android Tablet).
   - Desktop: 1280px × 800px & 1440px × 900px (Laptop).
   - Monitor Kasir: 1920px × 1080px (Layar Kasir Standar).
2. **Kompilasi & Build**:
   - Menjalankan npm run build dengan target 0 error dan 0 warning.
   - Memastikan tidak ada layout shift (CLS) dan tabrakan navigasi.
