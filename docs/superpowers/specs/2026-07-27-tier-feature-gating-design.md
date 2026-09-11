# Design Spec: Tier-Based Feature Gating & Pricing Alignment

**Date:** 2026-07-27  
**Author:** Antigravity AI  
**Status:** Approved  

---

## 1. Overview & Goal

Align all feature availability, paywall gating, pricing cards, and billing options across **HL Manager Pro** to strictly match the 4 subscription tiers defined by the business:

1. **Paket FREE ($0 / Selamanya)** — "Fase Validasi & Kunci Ketergantungan"
2. **Paket STARTER ($9 / Bulan ~ Rp 135.000)** — "Era Digital & Transparansi"
3. **Paket PRO ($29 / Bulan ~ Rp 435.000)** — "Mode Auto-Pilot & Enterprise"
4. **ADD-ON Expansion** — Ekstra Kasir (+$5 / staf / bulan ~ Rp 75.000) & Ekstra Cabang (+$15 / cabang / bulan ~ Rp 225.000)

---

## 2. Tier Matrix & Feature Gating

### A. Paket FREE ($0)
- **Included Features:**
  - 1 Dashboard Bos (`/dashboard`)
  - 1 Kiosk POS Interface (`/pos` with Strict Cashier Lockout)
  - Default Quota: 1 Branch, 1 Cashier Account
  - Unlimited SKU & Transactions
  - Auto-Scanner System (`barcode` focus trap + `F1` shortcut)
  - Physical Thermal Receipt Printing (58mm)
  - Price Override Lock (locked on POS, recalculated on server)
  - Negative Stock Handler (warning toast without blocking sales)
  - Blind Closing Basic (cash drawer reconciliation)

### B. Paket STARTER ($9 / Mo ~ Rp 135.000)
- **Included Features:**
  - Everything in FREE
  - WhatsApp Digital Receipt (`https://wa.me/{phone}?text=...`)
  - Void Log (Radar Batal)
  - Peak Hours Heatmap Chart
  - Top 10 Best Selling Products Chart
  - Persistent Kasbon Alert Banner on Dashboard

### C. Paket PRO ($29 / Mo ~ Rp 435.000)
- **Included Features:**
  - Everything in STARTER
  - Included Quota: 2 Cashiers, 2 Branches
  - Immutable Audit Log Total (PostgreSQL triggers)
  - Accounting CSV Data Export (max 30 days cap per query)
  - Critical Stock Alert System (reorder threshold badge & alert modal)
  - Multi-Branch View & Consolidated Switcher (`BranchSwitcher.jsx`)

### D. ADD-ON Expansion
- **Ekstra Kasir:** +$5 / staf / bulan (~ Rp 75.000) — Increments `max_cashiers` by 1
- **Ekstra Cabang:** +$15 / cabang / bulan (~ Rp 225.000) — Increments `max_branches` by 1

---

## 3. UI & Gating Changes Required

### 1. Landing Page (`src/components/landing/PricingSection.jsx`)
- Update plans array:
  - FREE ($0 / Selamanya)
  - STARTER (Rp 135.000 / $9 per bulan)
  - PRO (Rp 435.000 / $29 per bulan)
- Add Add-on Expansion banner below pricing cards:
  - Ekstra Kasir: Rp 75.000 / staf / bulan
  - Ekstra Cabang: Rp 225.000 / cabang / bulan

### 2. Billing Page (`src/app/(authenticated)/billing/page.js`)
- Display current subscription status: Plan name (`FREE`, `STARTER`, `PRO`), `max_cashiers`, `max_branches`.
- Pricing card selector for upgrade options (STARTER & PRO) and Add-on options (Ekstra Kasir / Ekstra Cabang).
- Form upload proof of payment with selection for plan requested or add-on requested.

### 3. Reporting View (`src/views/Reporting.jsx`)
- Add Paywall Gating checks:
  - If plan is `FREE`, display paywall badge / overlay on Void Logs, Heatmap Chart, and Top 10 Products.
  - If plan is NOT `PRO`, display paywall badge / overlay on CSV Export button.
  - Enforce max 30-day date filter limit on CSV export to prevent Vercel serverless function timeouts.

---

## 4. Verification Plan

1. Run `npm run build` to ensure static page generation and serverless API handlers compile cleanly.
2. Test feature gating in UI under `FREE`, `STARTER`, and `PRO` simulation states.
