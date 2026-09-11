# Spesifikasi Teknis: Migrasi Next.js App Router & Penyelarasan Desain Visual HL Manager Pro
**Tanggal:** 2026-06-18
**Status:** Approved oleh User

---

## 1. Tujuan & Latar Belakang
Migrasi frontend HL Manager Pro dari struktur Single Page Application (SPA) berbasis state manual di `page.js` menjadi Next.js App Router subpages. Bersamaan dengan ini, dilakukan penyelarasan desain visual dengan `MASTER.md` untuk meningkatkan aksesibilitas bagi pengguna lansia (Pak/Bu HL, usia 50-65 tahun) tanpa menghilangkan estetika premium.

---

## 2. Struktur Routing Baru (Next.js App Router)
Setiap view yang sebelumnya di-render secara dinamis dalam satu file `page.js` akan didelegasikan ke route mandiri di bawah direktori `src/app/`:

*   `/login` — Halaman masuk (public, non-authenticated).
*   `/(authenticated)` — Route group untuk seluruh halaman yang memerlukan autentikasi. Memiliki layout bersama yang merender `AppShell` (Sidebar desktop / Bottom Nav mobile) dan memvalidasi session token.
    *   `/(authenticated)/dashboard` — Ringkasan keuangan & pengingat bonus.
    *   `/(authenticated)/customers` — Daftar pelanggan & aksi penambahan data.
    *   `/(authenticated)/customers/[id]` — Detail pelanggan, riwayat transaksi bulanan, pelunasan bulanan, dan cetak surat piutang.
    *   `/(authenticated)/products` — Daftar katalog produk modal & harga jual.
    *   `/(authenticated)/transactions/new` — Formulir pembuatan bon penjualan baru.
    *   `/(authenticated)/transactions/[id]/edit` — Formulir koreksi/ubah bon penjualan lama.
    *   `/(authenticated)/reporting` — Laporan omzet, laba kotor, dan rekap cetak bulanan.
    *   `/(authenticated)/help` — Pusat bantuan dan pemicu latihan tutorial mandiri.

---

## 3. Komponen Utama & Integrasi State

### 3.1 Layout Global (`src/app/layout.js`)
*   Mengatur tag `<html lang="id">` untuk kompatibilitas screen reader Bahasa Indonesia.
*   Mengimpor Google Fonts **Fira Code** dan **Fira Sans**.
*   Membungkus seluruh aplikasi dengan `TutorialProvider` agar status tutorial tidak hilang saat berpindah route.
*   Menyediakan `ErrorBoundary` global untuk menangkap runtime crash di sisi klien.

### 3.2 Guard Autentikasi & `AppShell` Layout (`src/app/(authenticated)/layout.js`)
*   Membaca session user secara client-side via `api.getCurrentSession()`.
*   Jika sesi kosong atau berakhir (> 8 jam), pengguna dialihkan ke `/login`.
*   Merender layout responsif:
    *   **Desktop**: Sidebar kiri yang memuat navigasi utama, nama operator aktif, dan tombol Keluar (Logout).
    *   **Mobile**: Header atas minimalis dengan tombol Logout, dan bilah navigasi bawah (Bottom Nav) dengan target sentuh minimal 56px (`h-14`) dan tombol melayang "+" untuk pembuatan bon baru.
*   Menampilkan banner Sticky di bagian atas jika *Mode Latihan/Tutorial* sedang aktif.

### 3.3 Integrasi Tutorial dengan Routing Baru
*   `TutorialProvider` dimodifikasi agar mendeteksi navigasi secara otomatis menggunakan hook `usePathname()` dari `next/navigation`.
*   Ketika `pathname` berubah ke route yang sesuai dengan `targetId` dan `trigger: "click"` pada langkah tutorial aktif, status tutorial akan maju ke langkah berikutnya (`nextTutorialStep()`).
*   Data demo latihan diisolasi di `localStorage` (`hl_demo_customers`, `hl_demo_products`, `hl_demo_transactions`) agar data latihan tidak tercampur dengan database riil.

---

## 4. Desain Visual & Aksesibilitas Lansia

### 4.1 Tipografi & Skala Font
*   **Font Judul & Angka**: `Fira Code` (Monospace premium) untuk semua nilai nominal Rupiah, nomor bon, dan judul tabel demi presisi data yang rapi dan mudah dibaca.
*   **Font Teks/Deskripsi**: `Fira Sans` (Sans-serif bersih) untuk kemudahan membaca petunjuk dan isi form.
*   **Ukuran**: Meningkatkan ukuran dasar teks deskripsi menjadi minimal `text-sm` (14px) dan `text-base` (16px) untuk pembaca lansia.

### 4.2 Palet Warna & Kontras Emas Premium
*   **Primary/Background**: `#F8FAFC` (Slate-50) & `#0F172A` (Slate-900 / Navy Gelap).
*   **Tombol Utama (CTA)**: Latar belakang warna emas premium (`#CA8A04`) dengan **teks berwarna Navy Gelap (`#0F172A`)**. Ini menghasilkan rasio kontras > 4.5:1 untuk keterbacaan tingkat tinggi (WCAG AA).
*   **Notifikasi & Alert**: Kartu piutang merah tua (`#DC2626`) dengan teks putih tebal, kartu lunas hijau mint (`#D1FAE5`) dengan teks hijau gelap (`#059669`).

### 4.3 Target Sentuh & Responsivitas
*   Semua button interaktif, item menu, dan input form memiliki tinggi minimal `h-14` (56px) atau padding tebal agar mudah ditekan jari lansia.
*   Menerapkan spring physics halus (`type: "spring", stiffness: 100, damping: 20` via `motion/react`) saat tombol ditekan untuk memberikan feedback taktil instan.

---

## 5. Rencana Penanganan Bug Fungsionalitas Frontend

1.  **[BUG-001] Login Hint**: Mengubah teks bantuan di `/login` agar mencantumkan password riil dari database seed (`admin123`, bukan `admin`).
2.  **[BUG-004] N+1 Dashboard Alerts**:
    *   Membuat API route baru `/api/v1/customers/bonus-alerts` yang melakukan agregasi database di server dalam 3 query efisien (bukan loop sequential per pelanggan).
    *   Memperbarui Dashboard frontend agar memanggil endpoint baru ini sekali saja saat loading data.
3.  **[ARCH-001] Pembersihan MockDB**:
    *   Menghapus semua sisa file MockDB localStorage yang tidak digunakan (`src/utils/MockDB.js`).
    *   Mengganti seluruh import `MockDB` di views dengan `api` dari `src/utils/api.js`.
4.  **[UX-004] Konfirmasi Logout**:
    *   Mengganti fungsi bawaan `confirm()` browser dengan komponen dialog konfirmasi kustom yang berdesain premium dan serasi dengan tema aplikasi.

---

## 6. Rencana Pengujian & Verifikasi
*   **Verifikasi Fungsional**: Menguji seluruh 11 langkah Guided Tutorial dari langkah 1 sampai akhir untuk memastikan routing baru tidak memutus langkah-langkah latihan.
*   **Verifikasi Responsif**: Memastikan tampilan mobile dan tablet tidak mengalami *overflow* horizontal dan target sentuh navigasi bawah tetap presisi di layar 375px.
*   **Verifikasi Aksesibilitas**: Melakukan audit kontras warna teks dan ukuran font secara visual menggunakan browser subagent.
