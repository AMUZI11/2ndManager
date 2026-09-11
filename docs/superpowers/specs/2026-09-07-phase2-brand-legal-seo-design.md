# Spesifikasi Desain: Tahap 2 - Brand Legitimacy, Legal Kit (UU PDP), Technical SEO & AI Engine Discovery

**Tanggal**: 2026-09-07  
**Status**: Approved by User  
**Target Sistem**: 2ndManager (https://2ndmanager.com, Next.js 16 App Router)

---

## 1. Latar Belakang & Tujuan
Tahap 2 berfokus pada pembangunan legitimasi brand resmi, kepatuhan hukum Indonesia terhadap UU Perlindungan Data Pribadi (UU PDP No. 27 Tahun 2022), penguatan technical SEO agar halaman publik terindeks sempurna tanpa membocorkan rute internal operasional kasir atau API, penyediaan dokumen discovery AI (`llms.txt`), dan penyediaan antarmuka penanganan error bertema Arcade Brutalist.

Tujuan Utama:
1. **Metadata & OpenGraph**: Menghadirkan pratinjau kartu WhatsApp/Twitter/Facebook yang profesional dan kredibel dengan canonical `https://2ndmanager.com` serta schema `SoftwareApplication` JSON-LD.
2. **Technical SEO Ketat**: `robots.txt` melarang perayapan direktori operasional kasir (`/pos/`, `/api/`, `/admin/`, `/dashboard/`, dll.) dan `sitemap.xml` mendaftarkan 6 rute publik resmi.
3. **AI Engine Discovery**: `public/llms.txt` terstruktur agar mesin pencari AI (ChatGPT, Perplexity, Claude, SearchGPT) dapat langsung memahami nilai jual unik 2ndManager.
4. **Legal & Trust Suite (UU PDP No. 27/2022)**: Menyediakan halaman Kebijakan Privasi (`/privacy`), Syarat & Ketentuan (`/terms`), dan Kebijakan Pengembalian Dana Garansi 7 Hari 100% (`/refund`).
5. **Halaman Publik Harga & Fitur**: Menyediakan rute mandiri `/pricing` (matriks 4 tier) dan `/features` (8 pemecah masalah) dengan tema Arcade Brutalist.
6. **Shared Public Layout**: Menyatukan sticky navbar taktil dan footer trust ke dalam `src/app/(public)/layout.js`.
7. **Brand Visual Assets**: Membangkitkan aset grafis biner PNG tajam melalui Sharp: `og-image.png` (1200x630), `icon.png`, `apple-touch-icon.png`, dan `favicon.ico`.
8. **Arcade Brutalist 404 & Error Boundary**: Halaman 404 "Rak Kosong" dan Client Error Boundary "Gangguan pada Rak Sistem" dengan pemulihan interaktif.

---

## 2. Rincian Arsitektur & Berkas

### 2.1 Metadata Root & OpenGraph (`src/app/layout.js`)
- `metadataBase`: `new URL('https://2ndmanager.com')`
- `title`: `{ template: '%s | 2ndManager - OS Kasir Warung Anti-Bocor', default: '2ndManager | Software Kasir & Operasional Warung Kelontong Anti-Bocor' }`
- `description`: Deskripsi lengkap fokus operasional warung anti-bocor.
- `keywords`: Kata kunci relevan ritel warung Indonesia.
- `openGraph` & `twitter`: Format `summary_large_image` dengan gambar `/og-image.png`.
- `icons`: Favicon dan touch icon.
- `Structured Data (JSON-LD)`: Skema `SoftwareApplication` dengan kategori `BusinessApplication` dan penawaran gratis (Rp 0).

### 2.2 Technical SEO (`src/app/robots.js` & `src/app/sitemap.js`)
- `robots.js`:
  - `allow`: `['/', '/pricing', '/features', '/privacy', '/terms', '/refund']`
  - `disallow`: `['/api/', '/pos/', '/dashboard/', '/products/', '/reorder/', '/consignments/', '/customers/', '/settings/', '/billing/', '/panic-dispatch/', '/admin/', '/superadmin/']`
  - `sitemap`: `'https://2ndmanager.com/sitemap.xml'`
- `sitemap.js`:
  - Array URL publik dengan `lastModified: new Date()`, prioritas, dan frekuensi perubahan yang sesuai.

### 2.3 Dokumen Discovery AI (`public/llms.txt`)
- Berkas teks markdown terstandarisasi untuk parser LLM yang merangkum nilai jual, arsitektur offline-first, pencegah fraud kasir, 4 tier harga, dan info kontak resmi.

### 2.4 Layout & Halaman Publik (`src/app/(public)/`)
- `src/app/(public)/layout.js`:
  - Sticky navbar dengan logo 2ndManager, tautan ke `/features`, `/pricing`, tombol login, dan tombol Arcade kuning amber `[ 🚀 Buka Kasir Gratis ]`.
  - Footer komprehensif memuat rincian bisnis, kontak WhatsApp bantuan, link legal, dan badge UU PDP No. 27/2022.
- `src/app/(public)/privacy/page.js`: Kebijakan Privasi kepatuhan UU PDP No. 27/2022, kepemilikan data toko 100%, proteksi utang bon & nomor WA warga.
- `src/app/(public)/terms/page.js`: Ketentuan Layanan, batasan tanggung jawab audit uang laci, garansi SLA 99.5% offline-first.
- `src/app/(public)/refund/page.js`: Kebijakan Garansi 7 Hari Uang Kembali 100%, pencairan transfer bank/QRIS maksimal 2x24 jam kerja.
- `src/app/(public)/pricing/page.js`: Matriks transparan 4 tier (Magang, Supervisor, Manajer, Eksekutif) dan FAQ warung.
- `src/app/(public)/features/page.js`: 8 fitur kunci anti-kebocoran kas & pelacak aset fisik.

### 2.5 Pembangkit Aset Brand Biner (`scratch/generate_brand_assets.cjs`)
- Menggunakan `sharp` untuk merasterisasi SVG grafis Arcade Brutalist berlatar `#0B0F17` menjadi:
  - `public/og-image.png` (1200 x 630 px, resolusi tajam, ukuran optimal < 250 KB)
  - `public/icon.png` (512 x 512 px)
  - `public/apple-touch-icon.png` (180 x 180 px)
  - `public/favicon.ico` (32 x 32 px PNG raster)

### 2.6 Error Handling (`src/app/not-found.js` & `src/app/error.js`)
- `not-found.js`: Badge retro merah `[ ERROR 404 • RAK KOSONG ]`, teks "BARANG TIDAK DITEMUKAN!", tombol kembali ke kasir atau beranda.
- `error.js`: Tangkap runtime error tanpa white screen of death, tombol `reset()` untuk memuat ulang segmen.

---

## 3. Rencana Verifikasi
Skrip otomatis `scratch/verify_phase2_brand_seo.cjs`:
1. Uji `GET /robots.txt` -> pastikan aturan allow/disallow dan header Content-Type text/plain valid.
2. Uji `GET /sitemap.xml` -> pastikan struktur XML valid memuat 6 URL.
3. Uji `GET /llms.txt` -> pastikan memuat ringkasan fitur anti-bocor.
4. Uji HTTP status 200 pada `/privacy`, `/terms`, `/refund`, `/pricing`, `/features`.
5. Uji rendering kustom `/not-found`.
6. Eksekusi `npx eslint` pada seluruh berkas baru.
7. Eksekusi `npm run build` untuk memverifikasi kompilasi 100% rute tanpa warning/error.
