# Spec: Redesain Visual "Terrakota Ledger" & Optimasi Keterbacaan Lansia

Rencana peningkatan identitas visual dan perbaikan tata letak halaman untuk kenyamanan penggunaan lansia tanpa scrolling berlebih. Menggunakan pendekatan hybrid "Terrakota Ledger" (Keindahan Terrakota Gelap + Kertas Krem hangat).

---

## 🎯 Tujuan Desain
1. **Redesain Halaman Login:** Meningkatkan kreativitas desain login dengan konsep visual "Buku Kas Terbuka" (Open Ledger) untuk menghilangkan kesan "template SaaS generik".
2. **Skema Warna Warm (Terrakota Ledger):** Menerapkan kombinasi warna terrakota cokelat tua (`#3D1A0F`) pada sidebar dan background login, krem hangat (`#F6F3EA`) pada area kerja utama, arang hitam (`#1C1009`) untuk teks, dan emas hangat (`#C97B1A`) untuk CTA utama.
3. **Efisien Scroll (Ramah Lansia):** Mengurangi tinggi kontainer, padding berlebih, dan tinggi kartu agar seluruh informasi utama muat dalam satu halaman layar tanpa harus scroll ke bawah.

---

## 🎨 Peran Warna & Token Baru

| Elemen | Token Warna | Kegunaan |
|---|---|---|
| **Background Halaman** | `#F6F3EA` (Krem hangat / Ivory) | Menggantikan Slate Gray dingin. Ramah di mata lansia. |
| **Sidebar / Header / Login BG** | `#3D1A0F` (Terrakota Cokelat Tua) | Warna struktural yang memberikan depth premium dan berkarakter. |
| **Card / Panel Utama** | `#FFFFFF` (Putih bersih) | Area isi kartu agar visual double-bezel terlihat pop. |
| **Card Sekunder** | `#FAF7F0` (Krem sangat muda) | Fills untuk elemen list atau form. |
| **Aksen / CTA Utama** | `#C97B1A` (Amber Gold) | Tombol aksi utama, active states, dan highlight piutang. |
| **Aksen Hover** | `#A85F10` (Amber gelap) | Feedback state tombol saat hover. |
| **Teks Utama** | `#1C1009` (Tinta arang gelap) | Menggantikan Deep Steel. Menawarkan kontras tinggi di atas krem. |
| **Teks Sekunder** | `#6B4F3A` (Cokelat medium) | Penjelasan, teks deskriptif, dan meta-labels. |
| **Status Lunas** | `#2D6A4F` (Hijau tua / Earthy) | Penanda transaksi berstatus lunas. |
| **Status Piutang** | `#C0392B` (Merah brick) | Penanda transaksi berstatus piutang. |
| **Border / Divider** | `#E8DCC8` (Krem garis halus) | Garis pembatas kartu atau tabel. |
| **Highlight Spesial** | `#F59E0B` (Gold cerah) | Lencana bonus atau penunjuk latihan. |

---

## 📐 Proposed Changes

### 1. Global Styles & Theme Configuration
#### [MODIFY] [globals.css](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/globals.css)
- Ubah definisi `@theme` untuk menerapkan warna-warna baru:
  ```css
  @theme {
    --color-primary: #3D1A0F;
    --color-secondary: #6B4F3A;
    --color-cta: #C97B1A;
    --color-background: #F6F3EA;
    --color-text: #1C1009;
    /* Custom new color palette properties */
    --color-nav-active: #C97B1A;
    --color-border-beige: #E8DCC8;
    --color-card-white: #FFFFFF;
    --color-card-beige: #FAF7F0;
  }
  ```
- Perbarui `.nav-active-item` agar menggunakan highlight emas hangat dengan latar belakang krem yang serasi:
  ```css
  .nav-active-item {
    background-color: #FAF7F0 !important;
    color: #3D1A0F !important;
    border: 1px solid #E8DCC8 !important;
  }
  ```

### 2. Login Page Redesign
#### [MODIFY] [Login.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/Login.jsx)
- Ubah background container menjadi terrakota gelap (`bg-[#3D1A0F]`).
- Pada layar desktop, tampilkan layout "Buku Kas Terbuka" (Open Ledger) di tengah layar.
  - **Sisi Kiri (Halaman Buku Kiri):** Berisi info keunggulan sistem ("HL Sales & Receivables", "Catat Bon dengan Rapi") dengan layout kertas krem `#F6F3EA` dan teks arang `#1C1009`.
  - **Sisi Kanan (Halaman Buku Kanan):** Berisi form login aman yang dikemas secara estetik.
- Pada layar mobile, tampilkan form login terpusat dalam satu kartu krem hangat (`bg-[#F6F3EA]`) yang nyaman diakses.
- Target klik minimal 48px untuk input dan button.

### 3. Navigation Layout Polish
#### [MODIFY] [layout.js](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/(authenticated)/layout.js)
- Ubah sidebar desktop & header/bottom-nav mobile agar menggunakan warna terrakota cokelat tua `#3D1A0F` dan teks putih gading.
- Navigasi aktif menggunakan warna emas aksen `#C97B1A` dengan transisi hover yang halus.

### 4. Spacing & Scroll Reduction Optimizations
#### [MODIFY] [Dashboard.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/Dashboard.jsx)
- Perkecil padding banner sambutan (`p-6` menggantikan `p-8`) dan tingginya agar hemat layar.
- Batasi daftar nota penjualan terbaru menjadi **3 transaksi** saja (sebelumnya 5) untuk menghemat ruang vertikal agar tidak memaksa lansia scroll jauh ke bawah.
- Perkecil padding bento grid dan stats card.

#### [MODIFY] [CustomerManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/CustomerManagement.jsx)
- Kurangi padding atas/bawah pada card list pelanggan.
- Optimalkan modal popup tambah/edit agar tidak overflow layar dan nyaman diklik.

#### [MODIFY] [ProductManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/ProductManagement.jsx)
- Perkecil tinggi card list produk agar grid muat lebih banyak item dalam satu layar.

---

## 🧪 Rencana Pengujian
1. **Verifikasi Kompilasi:** Jalankan `npm run build` untuk memvalidasi tidak ada error static rendering/Next.js.
2. **ESLint:** Jalankan `npm run lint` untuk memastikan kebersihan penulisan kode.
3. **Pemeriksaan Visual:** Gunakan browser untuk memverifikasi bahwa skema warna terintegrasi sempurna di halaman login dan dashboard halaman dalam.
