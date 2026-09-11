# Spesifikasi Desain: Tahap 1 - Production Hardening, POS Code-Splitting & Zero-Console Hygiene

**Tanggal**: 2026-09-07  
**Status**: Approved by User  
**Target Sistem**: 2ndManager (Next.js 16 App Router, React 19, Supabase)

---

## 1. Latar Belakang & Tujuan
Aplikasi 2ndManager beroperasi pada lingkungan POS kasir nyata yang sering kali menggunakan perangkat tablet berbiaya hemat (RAM 2GB) di warung-warung. Sebelumnya, seluruh komponen modal berat dimuat secara sinkron di bundle inisial `/pos`, berpotensi menyebabkan kehabisan memori atau lambatnya First Contentful Paint (FCP). Selain itu, konfigurasi default framework masih mengekspos jejak Next.js, log internal, dan belum memiliki HTTP Security Headers yang memadai.

Tujuan dari Tahap 1:
1. **Pengerasan Konfigurasi (Production Hardening)**: Menghapus jejak framework (`poweredByHeader: false`), mematikan public browser source maps di produksi, mengaktifkan kompresi, mengoptimalkan pohon dependensi (tree-shaking `lucide-react`, `date-fns`), dan mengaktifkan SWC compiler `removeConsole`.
2. **Penguatan Keamanan HTTP & CSP**: Menerapkan Content Security Policy yang ketat dengan tetap mengizinkan koneksi HTTPS dan WSS real-time ke Supabase (`https://*.supabase.co`, `wss://*.supabase.co`), serta header anti-clickjacking dan MIME-sniffing.
3. **Pemisahan Kode & Pemuatan Dinamis Modal Kasir (Code-Splitting)**: Mengubah 8 modal sekunder di `src/app/pos/page.js` menjadi dynamic imports lazy-loaded dengan `{ ssr: false }`, menggunakan alias `nextDynamic` guna mencegah bentrok nama dengan Next.js segment config (`export const dynamic = 'force-dynamic'`).
4. **Zero-Console Hygiene**: Membersihkan statement `console.log` sensitif (terutama kebocoran `Bearer` auth token di `auth.js`) dan log debug telemetry di client runtime.
5. **Verifikasi Kualitas Mutlak**: Memastikan build produksi (`npm run build`) dan linting (`npx eslint`) lulus 100% tanpa error.

---

## 2. Rincian Teknis Implementasi

### 2.1 Next.js Configuration Hardening (`next.config.mjs`)
- `poweredByHeader: false`: Mengeliminasi header HTTP `X-Powered-By: Next.js`.
- `productionBrowserSourceMaps: false`: Mencegah pembuatan dan eksposur file `.map` di produksi browser.
- `compress: true`: Mengaktifkan kompresi gzip/brotli untuk aset statis dan respons server.
- `compiler.removeConsole`:
  ```javascript
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  }
  ```
- `experimental.optimizePackageImports`: `['lucide-react', 'date-fns']`.
- `async headers()`:
  - `X-Frame-Options`: `DENY`
  - `X-Content-Type-Options`: `nosniff`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
  - `Permissions-Policy`: `camera=(self), microphone=(), geolocation=()`
  - `Content-Security-Policy`:
    `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; frame-ancestors 'none';`

### 2.2 Dynamic Code-Splitting Modal POS (`src/app/pos/page.js`)
Mengganti import statis 8 modal dengan alias `nextDynamic`:
```javascript
import nextDynamic from 'next/dynamic';

const PaywallModal = nextDynamic(() => import('@/components/ui/PaywallModal'), { ssr: false });
const UpgradePromptModal = nextDynamic(() => import('@/components/pos/UpgradePromptModal'), { ssr: false });
const AssetLoanModal = nextDynamic(() => import('@/components/customers/AssetLoanModal'), { ssr: false });
const SmartChangeModal = nextDynamic(() => import('@/components/pos/SmartChangeModal'), { ssr: false });
const NegativeMarginOverrideModal = nextDynamic(() => import('@/components/pos/NegativeMarginOverrideModal'), { ssr: false });
const StartShiftModal = nextDynamic(() => import('@/components/pos/StartShiftModal'), { ssr: false });
const CloseShiftModal = nextDynamic(() => import('@/components/pos/CloseShiftModal'), { ssr: false });
const CashDrawerMovementModal = nextDynamic(() => import('@/components/pos/CashDrawerMovementModal'), { ssr: false });
```
Semua modal ini hanya akan diunduh secara on-demand saat dipicu oleh interaksi kasir.

### 2.3 Zero-Console Hygiene & Sensitive Token Scrubbing
Menghapus `console.log` yang tidak perlu pada:
- `src/lib/auth.js`: Hapus log `authHeader` dan `user` object untuk mencegah kebocoran kredensial JWT pada log server.
- `src/utils/posSyncEngine.js`: Bersihkan log `auto-sync`.
- `src/components/pos/PwaRegister.jsx`: Bersihkan log registrasi Service Worker.
- `src/app/(admin)/admin/panic-dispatch/page.js`: Bersihkan log realtime panic payload.

---

## 3. Rencana Verifikasi & Uji Kualitas
1. **Lint Check**: Jalankan `npx eslint` pada file yang dimodifikasi untuk menjamin kepatuhan gaya kode.
2. **Production Build**: Jalankan `npm run build` untuk memverifikasi bahwa:
   - Tidak ada error syntax atau tabrakan identifier.
   - Route `/pos` terkompilasi dengan bundle size yang lebih ramping.
   - SWC compiler `removeConsole` dan security headers terkonfigurasi dengan benar.
