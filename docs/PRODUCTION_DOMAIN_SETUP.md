# Production Domain & SSL Architecture: 2ndManager

Dokumentasi arsitektur konfigurasi domain resmi, DNS records, SSL/TLS hardening, dan CORS security policy untuk platform **2ndManager** (https://2ndmanager.com) pada repositori Next.js 16 (App Router).

---

## 1. Topologi Domain & Routing

| Hostname | Fungsi Utama | Aksesibilitas |
| :--- | :--- | :--- |
| `2ndmanager.vercel.app` | Domain default deployment production Vercel | Publik / Live |
| `2ndmanager.com` | Landing page, SEO, Legal Kit (UU PDP), Autentikasi | Publik |
| `www.2ndmanager.com` | Redirect 301 permanen ke apex `2ndmanager.com` | Publik |
| `*.2ndmanager.com` | Subdomain opsional (misal: `pos.2ndmanager.com`, `admin.2ndmanager.com`) | Terproteksi / Publik |
| `localhost:3000` | Lingkungan development lokal pengembang | Lokal (Dev Only) |

---

## 2. Konfigurasi DNS Records (Cloudflare / Vercel DNS)

Untuk mengarahkan domain `2ndmanager.com` ke Next.js 16 edge infrastructure:

### A. Apex Record (Root Domain)
- **Type**: `A`
- **Name**: `@` (atau `2ndmanager.com`)
- **Value**: `76.76.21.21` (Vercel Anycast IP)
- **TTL**: Auto / 3600
- **Proxy Status**: DNS Only (jika menggunakan sertifikat edge Vercel) atau Proxied (Cloudflare Full Strict)

### B. Subdomain WWW
- **Type**: `CNAME`
- **Name**: `www`
- **Value**: `cname.vercel-dns.com`
- **TTL**: Auto / 3600

### C. Wildcard API / POS Subdomain (Opsional)
- **Type**: `CNAME`
- **Name**: `*`
- **Value**: `cname.vercel-dns.com`
- **TTL**: Auto / 3600

---

## 3. Protokol Keamanan SSL/TLS & Edge Hardening

Sistem mewajibkan enkripsi end-to-end dengan parameter:
1. **TLS Version**: Minimal TLS 1.2, direkomendasikan TLS 1.3.
2. **HSTS (HTTP Strict Transport Security)**:
   - Header: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
3. **HTTP ke HTTPS Redirection**:
   - Status: 308 Permanent Redirect otomatis di edge proxy.

---

## 4. Kebijakan CORS & Origin Guard (`src/proxy.js`)

Semua endpoint API pada `/api/v1/*` dilindungi oleh Origin Guard di `src/proxy.js`:

```javascript
function isAllowedOrigin(origin) {
  if (!origin) return true; // Direct same-origin request
  try {
    const url = new URL(origin);
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host === '2ndmanager.com' || host.endsWith('.2ndmanager.com')) return true;
    return false;
  } catch {
    return false;
  }
}
```

### Karakteristik Respons CORS:
- **Origin Valid**: Header `Access-Control-Allow-Origin: <origin>` & `Access-Control-Allow-Credentials: true` disematkan.
- **Origin Tidak Sah**: HTTP 403 Forbidden dengan payload JSON:
  ```json
  {
    "error": true,
    "code": "CORS_FORBIDDEN",
    "message": "Akses API ditolak: Domain origin tidak sah."
  }
  ```
- **Preflight (OPTIONS)**: HTTP 204 No Content dengan `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`.

---

## 5. Environment Variables Produksi (Production Checklist)

Pastikan variabel berikut terpasang di platform deployment (Vercel / Docker):

```ini
# Supabase Edge Integration
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Hak Akses Superadmin (RBAC)
SUPERADMIN_EMAILS=owner@2ndmanager.com,admin@2ndmanager.com
ADMIN_EMAIL=owner@2ndmanager.com

# Node Runtime
NODE_ENV=production
```

---

## 6. Audit Kepatuhan Regulasi & Privasi (UU PDP No. 27/2022)

1. Banner persetujuan kuki (`CookieConsentBar.jsx`) terpasang eksklusif pada rute publik (`src/app/(public)/layout.js`).
2. Terminal kasir (`/pos`) dan dashboard internal bebas dari kuki tracking pihak ketiga (Google Analytics, Meta Pixel, dsb).
3. Data kasbon warga dilindungi hak Right to be Forgotten dan Data Portability sesuai Pasal 5-13 UU PDP.
