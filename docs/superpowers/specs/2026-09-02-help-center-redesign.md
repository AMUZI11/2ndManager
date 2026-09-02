# Rancang Bangun Upgrade Total Pusat Bantuan & Ruang Latihan Kasir

**Dokumen Spesifikasi Desain (Spec)**
**Tanggal:** 2 September 2026
**Status:** Menunggu Persetujuan Pengguna

---

## 1. Ringkasan & Tujuan Utama

Halaman Bantuan (`/help`) akan dirombak total dari antarmuka lama yang kaku menjadi **Pusat Bantuan Cerdas & Ruang Latihan Kasir** dengan filosofi *Calibrated Calm* dan *Senior-Accessible* yang menyatu dengan estetika Pop-Art Arcade aplikasi.

### Masalah pada Sistem Lama:
1. Teks gelap di atas latar cokelat gelap (`from-[#3D1A0F] to-[#18100A]`) sulit dibaca oleh pengguna lanjut usia.
2. Tutorial interaktif sebelumnya memicu modal popup berulang setiap pergantian rute.
3. Tidak ada ruang latihan aman bagi kasir baru untuk membiasakan *muscle memory* tanpa rasa takut merusak data riil.
4. Akses bantuan darurat tertimbun di bawah halaman.

### Solusi Baru:
1. **The Panic Button (Global SOS)**: Tombol evakuasi darurat Cadmium Red (`#E30022`) yang selalu terlihat untuk terhubung langsung ke WhatsApp CS dengan format kendala terstruktur.
2. **Tabbed Hub 3 Laci**:
   - 📖 **Buku Panduan**: Panduan visual alur kerja kasir, stok, diskon, dan rekap keuangan dalam bahasa Indonesia yang membumi.
   - ❓ **Tanya Jawab (FAQ)**: Pencarian instan dan akordion tanya-jawab masalah umum beserta Glosarium istilah.
   - 🎮 **Ruang Latihan**: *Isolated Memory Sandbox* (100% React Local State tanpa mutasi database) untuk latihan input bon diskon bertingkat, pelunasan kasbon, dan simulasi kalkulator diskon.
3. **Pemberlakuan Solid Ground**: Seluruh area baca teks panjang menggunakan latar putih murni (`bg-white`) berpenegas batas kontras tinggi agar tidak membuat pusing/silau.

---

## 2. Arsitektur Komponen & Navigasi

### A. The Panic Button (Global SOS)
- **Posisi**: Header atas halaman bantuan (dan sticky button yang menonjol).
- **Aksen Visual**: Cadmium Red (`bg-[#E30022] hover:bg-[#c2001d] text-white border-2 border-slate-900 shadow-[3px_3px_0px_#1E293B]`).
- **Aksi Klik**: Membuka dialog konfirmasi darurat dengan pilihan template kendala (misal: "Selisih kasir saat tutup shift", "Printer nota bermasalah", "Salah input bon sudah terlanjur disimpan"), lalu otomatis mengarahkan ke WhatsApp CS resmi dengan pesan prefilled berisi nama toko aktif.

### B. Tab Navigasi (Horizontal Touch Hub)
- **Material**: Glassmorphism terkontrol (`bg-white/70 backdrop-blur-md border-2 border-slate-800 rounded-2xl p-1.5 flex gap-2`).
- **Touch Target**: Tombol tab berukuran besar (tinggi minimal 48px, font-bold 14px uppercase).
- **3 Tab Utama**:
  1. `📖 BUKU PANDUAN`
  2. `❓ TANYA JAWAB (FAQ)`
  3. `🎮 RUANG LATIHAN KASIR`

---

## 3. Detail Setiap Tab

### Tab 1: 📖 Buku Panduan
- **Target Pembaca**: Pemilik warung dan kasir baru.
- **Modul Panduan**:
  1. **Alur Kasir & Nota Bon**: Membuka transaksi, memilih produk, menerapkan diskon bertingkat, dan status Piutang vs Lunas.
  2. **Kelola Pelanggan & Diskon Bertingkat**: Mendaftarkan pelanggan baru, mengatur batas bonus (threshold), dan skema diskon khusus.
  3. **Katalog Produk & Batas Stok**: Menambah produk baru, HPP/harga modal rahasia vs harga jual, dan arti radar stok kritis.
  4. **Tutup Shift & Rekap Keuangan**: Cara membaca Omzet Lunas, Laba Bersih, Outstanding Piutang, dan cara mengunduh laporan PDF.
- **Checklist Harian Kasir**:
  - Pagi (Buka Kasir): Periksa modal kas awal.
  - Siang (Operasional): Catat setiap bon tanpa terkecuali.
  - Malam (Tutup Shift): Samakan uang tunai laci dengan rekap penjualan lunas harian.

### Tab 2: ❓ Tanya Jawab (FAQ) & Glosarium
- **Search Bar Instan**: Kolom pencarian responsif untuk mencari kata kunci kendala.
- **Filter Kategori Cepat**: `SEMUA`, `KASIR & BON`, `PELANGGAN & KASBON`, `STOK PRODUK`, `LAPORAN & LABA`.
- **Akordion Pertanyaan**: Menjawab pertanyaan penting seperti perbedaan cash-basis, logika diskon cascading, cara ubah nota yang salah, dan penanganan retur/void.
- **Glosarium Istilah**: Kartu definisi ringkas istilah penting (*Bon, Omzet, Laba Bersih, Piutang, Lunas, Ongkir, Threshold, Cash Basis*).

### Tab 3: 🎮 Ruang Latihan Kasir (Stateless Sandbox)
- **Prinsip Mutlak**:
  - `ZERO DATABASE MUTATION`: Tidak ada pemanggilan API atau mutasi database Supabase.
  - Seluruh data menggunakan data statis latihan (Mock Catalog, Mock Customer).
- **3 Kasus Latihan (Mini-Games)**:
  1. **Kasus A: Input Bon & Diskon Bertingkat**:
     - Kasir memilih produk latihan (misal: "LM Jeruk Segar @Rp 15.000").
     - Memilih pelanggan latihan dengan skema diskon bertingkat (20% + 10%).
     - Mengamati kalkulasi harga diskon otomatis (bukan 30%, tapi Rp 10.800).
     - Menekan tombol `[ SIMPAN BON LATIHAN ]` dan melihat preview struk thermal virtual di layar (tanpa memicu `window.print()`).
  2. **Kasus B: Pelunasan Kasbon**:
     - Kasir melihat daftar 2 nota piutang latihan yang belum lunas.
     - Klik `[ TERIMA SETORAN LUNAS ]`, masukkan tanggal hari ini.
     - Kartu langsung berubah warna dari Merah `PIUTANG` menjadi Hijau `LUNAS`.
     - Tampilan angka omzet latihan bertambah seketika.
  3. **Kasus C: Kalkulator Logika Diskon**:
     - Slider/input interaktif interaktif untuk mengubah nominal harga dan persentase Diskon Tahap 1 dan Tahap 2.
     - Diagram visual bertingkat yang menunjukkan bagaimana potongan tahap 1 memotong harga, lalu potongan tahap 2 memotong sisanya.
- **Tombol Reset Latihan**:
  - Berwarna Cadmium Red (`bg-[#E30022] text-white`).
  - Mereset seluruh state memori latihan ke kondisi awal dengan satu klik.

---

## 4. Keamanan & Penjaminan Kualitas (QA)

1. **Hardware Safety**: Mock Print hanya menampilkan modal nota virtual (`VirtualReceiptModal`), **DILARANG** memanggil `window.print()` agar kertas thermal kasir tidak terbuang.
2. **Database Isolation**: Modul ruang latihan berdiri sendiri tanpa ketergantungan pada backend, menjamin data toko riil 100% aman dari kesalahan kasir baru.
3. **Accessibility**: Kontras rasio WCAG AAA pada teks instruksi (slate-900 di atas solid white bg), ukuran tombol minimal 48px dengan cursor pointer.
