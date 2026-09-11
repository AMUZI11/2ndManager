# Design Spec: 4-Tier SaaS Architecture with Psychological UI Triggers, Strict RLS Security & Backend Date Validation

**Date:** 2026-07-27  
**Author:** Antigravity AI  
**Status:** Approved & Revised  

---

## 1. Overview & Tier Matrix

HL Manager Pro enforces a 4-tier pricing model plus Add-On expansion:

| Tier | Price (USD / IDR) | Cashier Quota | Branch Quota | Key Features Included |
|---|---|---|---|---|
| **🟢 FREE** | $0 / Selamanya | 1 Kasir | 1 Cabang | POS Kiosk Lock, Unlimited SKU/Tx, Auto-Scanner, Thermal 58mm Print, Price Override Lock, Negative Stock Handler, Blind Closing Basic |
| **🔵 STARTER** | $9 / bln (Rp 135.000) | 1 Kasir | 1 Cabang | All FREE + Digital WA Receipt, Void Log (Radar Batal), Peak Hours Heatmap, Top 10 Best Sellers, Persistent Kasbon Alert |
| **🟠 PLUS** | $15 / bln (Rp 225.000) | **2 Kasir** | 1 Cabang | All STARTER + 2 Cashiers (Shift Pagi & Malam), Critical Stock Alert, CSV Data Export (Capped at 30 days) |
| **🔴 PRO** | $29 / bln (Rp 435.000) | **2 Kasir** | **2 Cabang** | All PLUS + 2 Branches Included, Immutable Audit Log Total, Unlimited Historical CSV Export, Multi-Branch View |
| **🟡 ADD-ON** | Kasir +$5 (Rp 75k)<br>Cabang +$15 (Rp 225k) | Custom | Custom | Incremental quotas for Cashiers & Branches |

---

## 2. Psychological UI Triggers (Gamified Monetization)

1. **The FOMO Dashboard (FREE Tier)**:
   - Heatmap Jam Sibuk & Top 10 Produk cards rendered with `blur-sm` and a lock icon.
   - Clicking triggers a popup: *"Fitur Eksklusif Paket Starter. Upgrade ke Paket Starter (Rp 135.000/bln) untuk membuka grafik analitik."*

2. **The Pain Point Trigger (STARTER Tier)**:
   - On the Heatmap card for STARTER users, display contextual recommendation banner: *"Warung Anda paling ramai jam 17:00 - 20:00! Butuh kasir ekstra untuk shift sore? Upgrade ke Paket PLUS (Rp 225.000/bln) untuk 2 Akun Kasir."*

3. **Data Hostage Effect & Server Protection (PLUS Tier)**:
   - CSV Export date range selection capped at 30 days back. Selecting dates older than 30 days displays badge: *"Rekap Historis Tahun Lalu Hanya Tersedia di Paket PRO."*
   - **Backend API Enforcer:** `/api/v1/reports/overall` validates `startDate` and `endDate`. If user is not `PRO` and requests > 30 days or requests unlimited CSV export, backend returns `403 Forbidden` (`LIMIT_EXCEEDED`).

4. **Add-On Math Trap (PLUS Tier)**:
   - If a PLUS user attempts to purchase 1 Extra Branch Add-On ($15 / Rp 225.000), total bill would be $15 + $15 = $30. Intercept with banner: *"Hemat Rp 15.000/bln! Upgrade ke Paket PRO (Rp 435.000/bln) sudah mendapatkan 2 Cabang Toko + Audit Log Total (Daripada Rp 450.000 di Paket Plus + Add-on Cabang)."*

5. **Paranoia Marketing (FREE, STARTER, PLUS Tiers)**:
   - When Blind Closing reveals a cash discrepancy (`selisih < 0`), show alert card: *"Ada selisih kas Rp XXX. Curiga harga diubah manual atau ada transaksi tak tercatat? Pantau aktivitas kasir detik demi detik dengan Audit Log di Paket PRO."*

---

## 3. Strict Database Security (RLS) & Technical Edge Case Safeguards

1. **Immutable Audit Logs (RLS Enforcement)**:
   - PostgreSQL table `public.audit_logs` has strict RLS policies permitting ONLY `INSERT` and `SELECT`.
   - `UPDATE` and `DELETE` actions are completely blocked by default-deny RLS for ALL roles (including Boss), preventing any log tampering.
2. **Multi-Tenant Branch Isolation (RLS Enforcement)**:
   - All tenant tables (`products`, `transactions`, `transaction_items`, `customers`, `void_logs`, `audit_logs`, `payment_proofs`) strictly validate `shop_id = public.get_my_shop_id()`.
   - Cashiers logged into Branch A can NEVER query or mutate Branch B data even via browser DevTools or direct REST/Postman calls.
3. **Backend Date Validation (Server-Side Vercel Protection)**:
   - API endpoints `/api/v1/reports/overall` and `/api/v1/transactions` strictly validate requested date range. Non-PRO users attempting to fetch > 30 days receive HTTP 403 `LIMIT_EXCEEDED` error.
4. **Void Log Debounce**: Frontend debounces `POST /api/v1/void-logs` by 500ms and groups identical item voids within 1 minute.
5. **WhatsApp Receipt Fallback**: If `window.open` popup is blocked by browser/adblocker, render a physical fallback button "Lanjutkan ke WhatsApp" with `href` link.
6. **Idempotency Key**: Transaction submission sends `idempotency_key` (UUID per cart) to prevent duplicate transactions & double stock deduction.
7. **Relative Stock Update**: SQL transaction stock deduction uses `UPDATE products SET stock = stock - qty`.
