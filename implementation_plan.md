# Implementation Plan

[Overview]
Menyelaraskan color palette dark mode sisi user (authenticated app) dengan palet landing page, dengan sentuhan lebih mewah yang didominasi warna terracotta.

Landing page sudah memakai bahasa visual "kiln-fired luxury": gradasi radial terracotta gelap (`#54180E → #3D140D → #1A0F0A`), aksen emas (`#C5A059`, `#D4AF37`), dan merah bata (`#8C2818`, `#9B2C2C`). Sisi user sudah punya kerangka theming berbasis CSS custom properties `--kw-*` di `src/app/globals.css` (dipetakan ke Tailwind lewat `tailwind.config.mjs` sebagai warna `kw-*`) dan dikendalikan `next-themes` (`attribute="class"`, `defaultTheme="dark"`). Namun implementasinya bocor: `.bento-card` selalu `bg-white`, `<main>`, header mobile, bottom nav, dan quick-action sheet di `src/app/(authenticated)/layout.js` memakai `bg-white` / `border-[#1A0F0A]` literal, sehingga dark mode tampak putih dan terputus dari identitas landing page.

Pendekatan: (1) definisikan ulang token `.dark` di `globals.css` menjadi palet "Terracotta Luxe" baru (surface gelap hangat, border umber, aksen emas, terracotta sebagai warna dominan), termasuk ambient radial gradient pada `body` yang meniru landing page; (2) tambahkan token baru ke mapping Tailwind; (3) tokenisasi class komponen bersama (`.bento-card`, `.bento-border`, `.btn-stamp-primary`, `.btn-stamp-secondary`, `.badge-gold`); (4) ganti hardcode putih/gelap di chrome aplikasi (`(authenticated)/layout.js`) dengan token `kw-*`; (5) swap minimal warna hardcoded di `src/views/Dashboard.jsx` yang akan menjadi tidak terbaca begitu kartu menjadi gelap. View lain (Pelanggan, Produk, Laporan, POS, Billing, dst.) mengikuti otomatis lewat token; pembersihan hardcode per-view di luar scope dan bisa menjadi follow-up.

[Types]
Tidak ada perubahan type system (proyek JavaScript/JSX); perubahan berupa kontrak design-token CSS dan mapping warna Tailwind.

Token CSS baru/diubah di `src/app/globals.css` dalam `@layer base`:

- `:root` (light — TIDAK diubah, tetap):
  - `--kw-bg: #F4F1E9`, `--kw-card: #FFFFFF`, `--kw-text: #1A0F0A`, `--kw-text-muted: #3D140D`, `--kw-border: #8C2818`, `--kw-accent: #C5A059`, `--kw-accent-hover: #A85F10`
  - Tambahan token struktural agar komponen bisa dtokenisasi penuh (nilai sama dengan kondisi saat ini, non-breaking):
    - `--kw-ink: #1A0F0A` (border tegas stamp-button & aksen gelap)
    - `--kw-cream: #F4F1E9` (teks di atas tombol terracotta/gelap)
    - `--kw-terra: #8C2818` (terracotta utama)
    - `--kw-terra-bright: #9B2C2C` (terracotta aksen landing)
    - `--kw-gold: #C5A059`
- `.dark` (BARU — "Terracotta Luxe", didominasi terracotta):
  - `--kw-bg: #160C07` (espresso-brown paling dalam, senada ujung gradien landing `#1A0F0A`)
  - `--kw-card: #26130C` (surface terracotta gelap, turunan `#3D140D` yang diredam)
  - `--kw-card-strong: #33190E` (surface elevated/hover)
  - `--kw-text: #F4F1E9` (krim — sama seperti landing)
  - `--kw-text-muted: #C7B299` (pasir hangat, pengganti muted yang sebelumnya salah diset sama dengan `--kw-text`)
  - `--kw-border: #5A2E1B` (umber terracotta, terlihat mewah di atas surface gelap)
  - `--kw-accent: #C5A059` (emas signature — konsisten dengan landing)
  - `--kw-accent-hover: #D9B36C` (emas lebih terang untuk hover di atas gelap)
  - `--kw-ink: #0D0503` (bayangan/border tegas di dark)
  - `--kw-cream: #F4F1E9`
  - `--kw-terra: #9B2C2C` (terracotta aksen, sama dengan landing)
  - `--kw-terra-bright: #C24E33` (terracotta terang untuk indikator/gradient stops)
  - `--kw-gold: #D4AF37` (emas metalik landing untuk highlight CTA)

Ambient background dark (di `@layer base`, selector `.dark body`): `background-color: var(--kw-bg)` + `background-image: radial-gradient(ellipse at top, #4A160C 0%, #2E1009 45%, #160C07 100%)` dengan `background-attachment: fixed` — meniru radial gradient landing page (`#54180E → #3D140D → #1A0F0A`) namun sedikit lebih dalam agar kartu tetap kontras.

Mapping Tailwind baru di `tailwind.config.mjs` di bawah `theme.extend.colors.kw` (semua merujuk var di atas): `'card-strong': 'var(--kw-card-strong)'`, `ink: 'var(--kw-ink)'`, `cream: 'var(--kw-cream)'`, `terra: 'var(--kw-terra)'`, `'terra-bright': 'var(--kw-terra-bright)'`, `gold: 'var(--kw-gold)'`. Entri `kw` yang ada (`bg`, `card`, `text`, `text-muted`, `border`, `accent`, `accent-hover`) tidak berubah nama — nilai dark-nya berubah otomatis via token.

[Files]
Satu file konfigurasi CSS, satu file konfigurasi Tailwind, satu layout aplikasi, satu view utama, dan satu dokumen desain yang dimodifikasi.

- `src/app/globals.css` (modified):
  - Tambahkan token struktural `--kw-ink`, `--kw-cream`, `--kw-terra`, `--kw-terra-bright`, `--kw-gold`, `--kw-card-strong` ke `:root`.
  - Tulis ulang blok `.dark` dengan palet Terracotta Luxe di atas.
  - Tambahkan aturan `.dark body { background-image: radial-gradient(...); background-attachment: fixed; }`.
  - `@layer components`:
    - `.bento-card`: `@apply bg-white border-2 border-[#1A0F0A] rounded-2xl` → `bg-kw-card border-2 border-kw-border rounded-2xl` (+ `shadow-sm` opsional). Ini adalah perbaikan terpenting — semua kartu di seluruh view ikut token.
    - `.bento-border`: `border-[#1A0F0A]/20` → `border-kw-border/40`.
    - `.btn-stamp-primary`: ganti literal `bg-[#8C2818] text-[#F4F1E9] ... border-[#1A0F0A] hover:bg-[#7a2215]` menjadi memakai token (`bg-kw-terra text-kw-cream border-kw-ink`), hover tetap terracotta lebih gelap (definisikan lewat token atau `brightness(0.9)`).
    - `.btn-stamp-secondary`: `text-[#1A0F0A] border-[#1A0F0A] hover:bg-[#1A0F0A] hover:text-[#F4F1E9]` → `text-kw-text border-kw-border hover:bg-kw-ink hover:text-kw-cream`.
    - `.badge-gold`: ganti literal `#C5A059` → token `kw-accent`.
- `tailwind.config.mjs` (modified): tambah entri `kw` baru (`card-strong`, `ink`, `cream`, `terra`, `terra-bright`, `gold`) sesuai bagian [Types]. Tidak ada perubahan warna lain.
- `src/app/(authenticated)/layout.js` (modified) — hanya swap class warna, tanpa perubahan logika:
  - Loading gate (baris ~205): `bg-kw-card` → `bg-kw-bg` (layar validasi sesi menyatu dengan ambient background).
  - `<main>` container (baris ~438): `bg-white border-2 border-[#1A0F0A]` → `bg-kw-card border-2 border-kw-border`.
  - Mobile header (baris ~302): `bg-white border-b-2 border-[#1A0F0A]` → `bg-kw-card border-b-2 border-kw-border`; tombol hamburger `border-white/15` → `border-kw-border/40`.
  - Mobile bottom nav (baris ~460): `bg-white border-2 border-[#1A0F0A]` → `bg-kw-card border-2 border-kw-border`.
  - Quick-action bottom sheet (baris ~514): `bg-[#F4F1E9] border-2 border-[#1A0F0A]` → `bg-kw-card border-2 border-kw-border`.
  - Sidebar sudah memakai `.bento-card` → otomatis terperbaiki via perubahan CSS di atas; tombol Superadmin & FAB quick-action yang memakai `bg-[#8C2818]`/`border-[#1A0F0A]` diganti ke `bg-kw-terra`/`border-kw-ink` agar konsisten.
- `src/views/Dashboard.jsx` (modified) — swap minimal yang diperlukan agar konten tetap terbaca di atas kartu gelap (bukan redesign):
  - Tiga kartu metrik: `text-[#1A0F0A]` → `text-kw-text`, dot merah `bg-[#8C2818]` tetap, badge "Bebas Pajak" `bg-white border-[#1A0F0A]` → `bg-kw-card-strong border-kw-border text-kw-text`, garis pemisah `border-[#1A0F0A]` → `border-kw-border`.
  - Tiga tombol quick action & ikon: `bg-white ... border-[#1A0F0A] hover:bg-[#1A0F0A] hover:text-[#F4F1E9]` → `bg-kw-card-strong border-kw-border hover:bg-kw-ink hover:text-kw-cream`.
  - Paranoia banner: `bg-[#F4F1E9] border-[#8C2818] text-[#8C2818]` → `bg-kw-terra/10 border-kw-terra text-kw-terra-bright` (CTA override `!bg-[#C5A059] !text-[#1A0F0A] !border-[#1A0F0A]` → `!bg-kw-accent !text-kw-ink !border-kw-ink`).
  - Overlay lock FREE tier: `bg-white/85 hover:bg-white/95` → `bg-kw-card/85 hover:bg-kw-card/95`; ikon lock `bg-white ... border-[#1A0F0A]` → `bg-kw-card-strong border-kw-border`.
  - Menu Cepat icons: `bg-white border-[#1A0F0A] group-hover:bg-[#1A0F0A] group-hover:text-[#F4F1E9]` → `bg-kw-card-strong border-kw-border group-hover:bg-kw-ink group-hover:text-kw-cream`.
  - Status badge Lunas/Piutang: biarkan (emerald/rose semantic sudah cocok di dark).
  - Judul/teks lain yang sudah `text-kw-text` tidak disentuh. Hardcode di view lain sengaja dibiarkan (follow-up opsional).
- `DESIGN.md` (modified): tambahkan sub-bagian singkat di bawah "Color Universe Tokens" berjudul "Dark Mode: Terracotta Luxe" berisi tabel token `.dark` final + catatan ambient radial gradient, agar sistem desain terdokumentasi.

Tidak ada file baru, tidak ada file dihapus, tidak ada perubahan `package.json`.

[Functions]
Tidak ada fungsi JavaScript yang dibuat, diubah, atau dihapus — seluruh perubahan bersifat deklaratif (CSS custom properties, class Tailwind pada JSX).

- Komponen React yang className-nya diedit (tanpa mengubah logika/props/state): `AuthenticatedLayout` di `src/app/(authenticated)/layout.js` dan `Dashboard` di `src/views/Dashboard.jsx`.
- Tidak ada perubahan pada `ThemeProvider` (`src/components/ThemeProvider.jsx`) dan `ThemeToggle` (`src/components/ThemeToggle.jsx`) — keduanya sudah benar memakai `next-themes` + token `kw-*`.

[Classes]
Tidak ada perubahan class JavaScript/OOP; yang dimodifikasi adalah utility-class komponen CSS di `@layer components` pada `src/app/globals.css`.

- Modified: `.bento-card` — dari `bg-white border-[#1A0F0A]` menjadi berbasis token `bg-kw-card border-kw-border` (berdampak global ke semua view yang memakainya).
- Modified: `.bento-border` — dari `border-[#1A0F0A]/20` menjadi `border-kw-border/40`.
- Modified: `.btn-stamp-primary` — literal terracotta/ink diganti token `kw-terra`/`kw-cream`/`kw-ink` (tampilan light identik, dark menjadi terracotta mewah).
- Modified: `.btn-stamp-secondary` — literal ink/cream diganti token `kw-text`/`kw-border`/`kw-ink`/`kw-cream`.
- Modified: `.badge-gold` — literal `#C5A059` diganti token `kw-accent`.
- New: aturan `.dark body` untuk ambient radial gradient terracotta.

[Dependencies]
Tidak ada penambahan, penghapusan, atau perubahan versi dependency — theming sepenuhnya memakai `next-themes` + Tailwind v4 yang sudah terpasang.

[Testing]
Tidak ada test otomatis di proyek ini; validasi dilakukan secara visual dan statis lewat dev server yang sedang berjalan.

- Visual verification (manual, via browser ke `http://localhost:3000`):
  - Toggle tema lewat `ThemeToggle` di sidebar: light mode harus identik dengan tampilan sekarang (regresi nol), dark mode menampilkan gradasi terracotta gelap dengan kartu `#26130C`, border umber, aksen emas.
  - Halaman yang dicek: `/login`, `/dashboard` (termasuk overlay lock FREE tier, paranoia banner, menu cepat), navigasi mobile (header sticky, bottom nav, quick-action sheet — cek via viewport < 768px), dan satu halaman view lain (mis. `/customers`) untuk memastikan `.bento-card` global ikut gelap.
  - Kontras: teks krim `#F4F1E9` di atas kartu `#26130C` (ratio > 12:1, jauh di atas WCAG AA), muted `#C7B299` di atas `#26130C` (~7:1), emas `#C5A059` di atas gelap tetap untuk aksen non-teks-kecil.
- Static verification: jalankan `npm run lint` (eslint) untuk memastikan tidak ada error akibat edit JSX; dev server harus tetap compile tanpa error (`GET /dashboard 200`).
- Edge case: user dengan `localStorage` tema `light` tersimpan — pastikan light mode tidak berubah sama sekali karena `:root` tidak disentuh.

[Implementation Order]
Kerjakan dari fondasi ke permukaan agar setiap langkah bisa langsung diverifikasi di browser tanpa state rusak di antaranya.

1. Update `src/app/globals.css`: tambah token struktural di `:root`, tulis ulang blok `.dark` dengan palet Terracotta Luxe, tambah aturan `.dark body` radial gradient. (Belum ada perubahan visual komponen — kartu masih putih.)
2. Update `tailwind.config.mjs`: tambahkan mapping `kw.card-strong/ink/cream/terra/terra-bright/gold`.
3. Tokenisasi `@layer components` di `globals.css` (`.bento-card`, `.bento-border`, `.btn-stamp-primary`, `.btn-stamp-secondary`, `.badge-gold`) — setelah langkah ini seluruh kartu aplikasi langsung gelap di dark mode; verifikasi visual cepat.
4. Edit `src/app/(authenticated)/layout.js`: ganti hardcode `bg-white`/`bg-[#F4F1E9]`/`border-[#1A0F0A]` pada main container, mobile header, bottom nav, quick-action sheet, dan tombol Superadmin/FAB ke token `kw-*`.
5. Edit `src/views/Dashboard.jsx`: swap minimal hardcode warna pada kartu metrik, quick actions, paranoia banner, lock overlay, dan menu cepat agar terbaca di atas surface gelap.
6. Dokumentasikan palet dark final di `DESIGN.md`.
7. Verifikasi: cek light mode tidak berubah, cek dark mode di dashboard + mobile viewport + satu view lain, jalankan `npm run lint`, dan pastikan dev server tetap 200.
