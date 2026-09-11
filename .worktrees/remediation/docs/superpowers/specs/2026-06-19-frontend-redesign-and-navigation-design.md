# Spesifikasi Desain: Redesain Frontend dan Optimasi Navigasi HL Manager Pro
**Tanggal:** 2026-06-19
**Topik:** Efisiensi Halaman, Aksesibilitas Lansia, Navigasi Premium, dan Halaman Detail Transaksi Baru

---

## 1. Ringkasan Desain (Executive Summary)
Spesifikasi ini menjelaskan desain ulang visual dan fungsional dari aplikasi HL Manager Pro. Tujuannya adalah untuk meningkatkan efisiensi navigasi, keterbacaan data keuangan, dan kemudahan bagi lansia (pemilik bisnis usia 50–65 tahun), sambil menerapkan standar estetika premium **high-end-visual-design** (Apple/Linear-tier style) dan mematuhi register **product** (desain yang melayani tugas pengguna).

### Perubahan Utama:
1. **Glassmorphism Navigation & Layout:** Sidebar desktop melayang (floating glass panel) dan navigasi bawah mobile yang ergonomis (tombol + Bon Baru melayang di tengah).
2. **Asymmetrical Bento Dashboard:** Tata letak stats dengan Double-Bezel nested cards, visualisasi perbandingan kas (Lunas vs Piutang), progress bar target bonus pelanggan, dan baris daftar bon terbaru yang interaktif.
3. **Dynamic Route Detail Transaksi (`/transactions/[id]`):** Pembuatan halaman baru untuk melihat detail setiap bon, rincian hitung diskon cascading bertahap, tombol lunas instan, dan print layout bersih.
4. **Efisiensi Manajemen Produk & Pelanggan:** Filter tab cepat (SEMUA / LM / BR) pada daftar produk dan indikator status piutang langsung di list pelanggan.

---

## 2. Struktur Desain Visual & Komponen

### A. Skema Warna & Aksesibilitas (WCAG AAA)
- **Background Utama:** Slate Canvas (`#F8FAFC`) untuk nuansa bersih.
- **Card/Container Surface:** Putih murni (`#FFFFFF`) dengan border hairlines tipis (`#E2E8F0`).
- **Typography Deep Ink:** Navy Tua (`#0F172A`) untuk tingkat keterbacaan teks utama yang sangat kontras (contrast ratio &ge; 4.5:1).
- **Aksen Transaksi:** Rupiah Gold (`#CA8A04`) untuk highlight piutang dan tombol aksi penting.
- **Lencana Piutang/Warning:** Merah Rose (`#E11D48` / `#FDA4AF`) untuk menandai bon yang belum dibayar.

### B. Aturan Tipografi
- **Headlines:** `Fira Code` (Monospace) untuk tampilan data presisi dan maskulin.
- **Body & Labels:** `Fira Sans` (Sans-Serif) berukuran besar (minimal 16px/18px) untuk kenyamanan mata lansia.
- **Nominal Rupiah:** `Fira Code` dengan format `tabular-nums` untuk perataan angka yang rapi di tabel keuangan.

### C. Haptic Motion (Spring Physics)
- Semua animasi perpindahan halaman dan interaksi tombol menggunakan transisi spring physics: `transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`.
- Tombol memiliki efek menekan fisik: `active:scale-[0.98]` dan hover translate `-1px`.

---

## 3. Detail Implementasi Halaman demi Halaman

### 3.1 Navigasi Utama (Layout)
- **Desktop Sidebar:**
  - Panel dengan efek glassmorphism melayang (`backdrop-blur-md bg-white/80 border border-gray-200/50 rounded-3xl p-5 shadow-lg`).
  - Lencana operator aktif yang menampilkan status login dengan lampu indikator hijau menyala (`animate-pulse`).
- **Mobile Bottom Navigation:**
  - Menempatkan tombol bulat emas besar bertuliskan **(+)** di tengah untuk mencatat bon baru. Tombol ini diposisikan sedikit naik agar mudah dijangkau oleh jempol tangan kanan/kiri.

### 3.2 Dashboard Utama
- **Asymmetrical Bento Layout:**
  - **Grid Atas:** 3 Kartu double-bezel (Total Piutang, Penjualan Lunas, Keuntungan Bersih).
  - **Grid Tengah:** Pengingat Bonus Pelanggan dengan Progress Bar visual. Menunjukkan persentase kedekatan pembeli dengan batas bonus (misal: "Siti: Rp 8.500.000 / Rp 10.000.000").
  - **Grid Bawah:** Nota Penjualan Terbaru. Tabel transaksi terbaru yang barisnya dapat diklik langsung untuk membuka halaman rincian bon tersebut.

### 3.3 Halaman Baru: Detail Transaksi (`/transactions/[id]`)
- **Fungsi:** Menampilkan visualisasi nota belanja yang dicetak rapi.
- **Visualisasi Cascading:** Menampilkan proses diskon cascading langkah-demi-langkah sehingga lansia dapat memverifikasi perhitungan komputer:
  ```
  Harga Dasar: Rp 100.000
  1. Diskon LM 20%: - Rp 20.000 (Menjadi Rp 80.000)
  2. Diskon LM 10%: - Rp 8.000 (Menjadi Rp 72.000)
  Harga Akhir per Unit: Rp 72.000
  ```
- **Aksi Cepat:** Jika transaksi berstatus "Piutang", sediakan tombol besar **"LUNASKAN SEKARANG"** yang langsung memicu API pelunasan dan menampilkan modal sukses yang menyenangkan.
- **Print Friendly:** Media print CSS menyembunyikan sidebar navigasi, header, dan footer, serta menampilkan format invoice minimalis hitam-putih yang siap dicetak/simpan PDF.

### 3.4 Kelola Pelanggan & Produk
- **Pelanggan:**
  - Daftar pelanggan menampilkan lencana piutang merah nominal di sebelah nama jika mereka memiliki utang aktif.
  - Form edit/tambah pelanggan menampilkan pratinjau kalkulator diskon interaktif secara instan saat diskon bertingkat diinput/diubah.
- **Produk:**
  - Menyediakan filter tab cepat: `SEMUA`, `LM` (Lansia Mandiri), `BR` (Barang Reguler) di atas daftar katalog produk.

---

## 4. Rencana Verifikasi (Verification Plan)

### A. Verifikasi Fungsional & Navigasi
- Memastikan navigasi desktop sidebar dan mobile bottom bar berpindah halaman secara instan tanpa lag.
- Menguji alur pencatatan transaksi baru &rarr; kembali ke dashboard &rarr; klik baris transaksi baru &rarr; masuk ke halaman detail transaksi `/transactions/[id]`.
- Memverifikasi tombol "LUNASKAN SEKARANG" di halaman detail transaksi berhasil memperbarui status database menjadi "Lunas" dan saldo piutang di dashboard langsung berkurang secara real-time.
- Menguji filter produk (Semua, LM, BR) menyaring item dengan benar.

### B. Uji Responsif & Aksesibilitas
- Menguji tampilan pada ukuran 375px (Mobile Portrait), 768px (Tablet), dan 1200px+ (Desktop).
- Memastikan ukuran tombol utama tetap &ge; 48px dan ukuran teks body &ge; 16px.
- Memastikan kontras warna teks (Body text &ge; 4.5:1) menggunakan Chrome DevTools Contrast Checker.
- Menguji cetak halaman (`Ctrl + P`) pada detail transaksi untuk memastikan format cetak tercetak bersih tanpa sidebar navigasi.
