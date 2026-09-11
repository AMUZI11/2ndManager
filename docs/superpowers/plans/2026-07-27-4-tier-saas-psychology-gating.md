# 4-Tier SaaS Architecture with Psychological UI Triggers & Strict RLS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete 4-tier SaaS model (FREE $0, STARTER $9, PLUS $15, PRO $29) + Add-ons, psychological UI monetization triggers (FOMO Dashboard, Pain Point Trigger, Data Hostage Effect, Add-On Math Trap, Paranoia Marketing), strict Supabase RLS security (immutable audit logs & tenant branch isolation), and server-side backend date validation (30-day cap enforcement).

**Architecture:** Update `docs/supabase-migration.sql` for the `'PLUS'` plan type and RLS policy locks, update `PricingSection.jsx` and `billing/page.js` to present all 4 tiers + Add-on Math Trap, wrap reporting/dashboard cards with psychological paywall overlays in `Dashboard.jsx` and `Reporting.jsx`, enforce server-side date validation in `/api/v1/reports/overall`, and reinforce `/pos` with debounced void logs and WA pop-up fallbacks.

**Tech Stack:** Next.js 16 (App Router), React, Supabase PostgreSQL RLS, Tailwind CSS, Lucide Icons.

---

### Task 1: Database Migration Schema & Strict RLS Policy Lockdown

**Files:**
- Modify: `docs/supabase-migration.sql`

- [ ] **Step 1: Update `subscriptions` plan CHECK constraint in `docs/supabase-migration.sql`**
Ensure `plan` constraint permits `'PLUS'`:
```sql
plan TEXT NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'STARTER', 'PLUS', 'PRO'))
```

- [ ] **Step 2: Explicitly verify RLS Policy Lockdown for Immutable Audit Logs & Branch Isolation**
In `docs/supabase-migration.sql`:
- Verify `audit_logs` has policies ONLY for `INSERT` (`audit_insert`) and `SELECT` (`boss_read_audit`). Confirm `UPDATE` and `DELETE` are completely omitted so PostgreSQL RLS default-deny blocks any log tampering.
- Verify RLS policies on `products`, `transactions`, `transaction_items`, `customers`, `customer_discounts`, `void_logs`, `audit_logs`, `payment_proofs` enforce `shop_id = public.get_my_shop_id()` or `user_shops` junction check.

- [ ] **Step 3: Commit**
`git add docs/supabase-migration.sql`
`git commit -m "db: update subscription check constraint for PLUS tier and document immutable RLS policies"`

---

### Task 2: Landing Page 4-Tier Pricing Section

**Files:**
- Modify: `src/components/landing/PricingSection.jsx`

- [ ] **Step 1: Update `plans` array in `PricingSection.jsx`**
Define 4 cards:
- `FREE`: Rp 0 / Selamanya — "Fase Validasi & Kunci Ketergantungan"
- `STARTER`: Rp 135.000 / bln ($9) — "Era Digital & Transparansi"
- `PLUS`: Rp 225.000 / bln ($15) — "The Sweet Spot (The Decoy)"
- `PRO`: Rp 435.000 / bln ($29) — "Mode Auto-Pilot & Enterprise"

- [ ] **Step 2: Render Add-On Expansion banner**
Add banner for Ekstra Kasir (+$5 / Rp 75.000) and Ekstra Cabang (+$15 / Rp 225.000).

- [ ] **Step 3: Commit**
`git add src/components/landing/PricingSection.jsx`
`git commit -m "feat(pricing): render 4-tier pricing model and add-on expansion on landing page"`

---

### Task 3: Billing Page & Add-On Math Trap Upsell

**Files:**
- Modify: `src/app/(authenticated)/billing/page.js`

- [ ] **Step 1: Update 4-tier plans array & quota display**
Render cards for FREE, STARTER, PLUS (2 Kasir, 1 Cabang), and PRO (2 Kasir, 2 Cabang).

- [ ] **Step 2: Implement Add-On Math Trap Interceptor**
If a user on `PLUS` tier requests an Extra Branch Add-On ($15 / Rp 225k), display an interceptor modal:
*"Hemat Rp 15.000/bln! Upgrade ke Paket PRO (Rp 435.000/bln) sudah mendapatkan 2 Cabang Toko + Audit Log Total (Daripada Rp 450.000 di Paket Plus + Add-on Cabang)."*

- [ ] **Step 3: Commit**
`git add src/app/(authenticated)/billing/page.js`
`git commit -m "feat(billing): add 4-tier billing, add-on selector, and Add-On Math Trap upsell modal"`

---

### Task 4: FOMO Dashboard, Pain Point Triggers & Paranoia Marketing

**Files:**
- Modify: `src/views/Dashboard.jsx`

- [ ] **Step 1: Implement FOMO Dashboard (FREE Tier)**
On `Dashboard.jsx`, wrap Heatmap & Top 10 Product cards with `blur-sm` and a lock icon for `FREE` tier users, linking to upgrade.

- [ ] **Step 2: Implement Pain Point Trigger (STARTER Tier)**
Display recommendation banner on Heatmap for STARTER users: *"Warung Anda paling ramai jam 17:00 - 20:00! Butuh kasir ekstra untuk shift sore? Upgrade ke Paket PLUS (Rp 225.000/bln) untuk 2 Akun Kasir."*

- [ ] **Step 3: Implement Paranoia Marketing on Blind Closing Discrepancy**
When Blind Closing reveals negative cash discrepancy (`selisih < 0`), render alert card: *"Ada selisih kas Rp XXX. Curiga harga diubah manual? Pantau detail aktivitas kasir detik demi detik dengan Audit Log di Paket PRO."*

- [ ] **Step 4: Commit**
`git add src/views/Dashboard.jsx`
`git commit -m "feat(dashboard): implement FOMO Dashboard, Pain Point Trigger, and Paranoia Marketing alerts"`

---

### Task 5: Backend API Date Range Validation & Reporting Gating

**Files:**
- Modify: `src/app/api/v1/reports/overall/route.js`
- Modify: `src/views/Reporting.jsx`

- [ ] **Step 1: Enforce Server-Side Backend Date Range Validation in `/api/v1/reports/overall`**
In `src/app/api/v1/reports/overall/route.js`:
Fetch user subscription plan from `subscriptions` table for `userShop.shop_id`.
If `plan !== 'PRO'` (e.g. `FREE`, `STARTER`, `PLUS`):
- Check if date range `(new Date(endDate) - new Date(startDate)) / (1000 * 3600 * 24) > 30`:
  Return `errorResponse('Rentang tanggal maksimal 30 hari untuk Paket Plus / Starter. Upgrade ke Paket PRO untuk laporan historis tanpa batas.', 'LIMIT_EXCEEDED', 403)`.
- Check if `export === 'csv'` and `plan !== 'PRO'`:
  Return `errorResponse('Fitur Ekspor CSV Historis Tanpa Batas hanya tersedia untuk Paket PRO. Silakan upgrade paket Anda.', 'LIMIT_EXCEEDED', 403)`.

- [ ] **Step 2: Gate Void Log, Heatmap, and Top 10 to STARTER+ in `Reporting.jsx`**
Show Paywall Gating overlay on `Reporting.jsx` for FREE tier users.

- [ ] **Step 3: Implement Data Hostage Effect UI on CSV Export**
For `PLUS` users, cap UI date range selector to maximum 30 days (`max_days <= 30`). Disable dates older than 30 days with tooltip: *"Rekap Historis Tahun Lalu Hanya Tersedia di Paket PRO."*

- [ ] **Step 4: Commit**
`git add src/app/api/v1/reports/overall/route.js src/views/Reporting.jsx`
`git commit -m "security(api): enforce server-side 30-day date cap and PRO export requirement in backend API and reporting view"`

---

### Task 6: POS Resilience & Edge Case Mitigations

**Files:**
- Modify: `src/app/pos/page.js`

- [ ] **Step 1: Add 500ms Debounce to Void Log API calls**
In `addToCart` / `updateCartQty` / `removeFromCart`, debounce `POST /api/v1/void-logs` by 500ms and group identical item voids within 1 minute.

- [ ] **Step 2: Add WhatsApp Pop-Up Fallback Button**
If `window.open` is blocked, render a direct fallback button "Lanjutkan ke WhatsApp" with `href={`https://wa.me/${phone}?text=${encoded}`}`.

- [ ] **Step 3: Verify Idempotency Key & Relative Stock Deductions**
Ensure transaction POST sends `idempotency_key` (UUID per cart) and backend uses `UPDATE products SET stock = stock - qty`.

- [ ] **Step 4: Commit**
`git add src/app/pos/page.js`
`git commit -m "feat(pos): add 500ms debounced void logs, WA fallback link, and idempotency protection"`

---

### Task 7: Production Build & Verification

**Files:**
- Verification only

- [ ] **Step 1: Execute `npm run build`**
Verify Next.js production build completes with 0 errors.

- [ ] **Step 2: Commit final verification**
`git commit -m "chore: verified 4-tier SaaS architecture, RLS security, and server-side date validation"`
