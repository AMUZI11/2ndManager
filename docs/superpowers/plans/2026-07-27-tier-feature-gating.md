# Tier Feature Gating & Pricing Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enforce tier-based feature gating (FREE $0, STARTER $9/mo, PRO $29/mo, ADD-ONs) across UI components, billing page, landing page, and reporting views.

**Architecture:** Update pricing arrays in `PricingSection.jsx` and `Billing.jsx` to reflect exact $0, $9, $29 tiers + Add-ons. Wrap tier-restricted UI widgets in `Reporting.jsx` with plan checks (`FREE` -> paywall banner/badge, `STARTER` -> Starter features unlocked, `PRO` -> Pro features unlocked including CSV Export).

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, Lucide React Icons.

---

### Task 1: Update Landing Page Pricing Section

**Files:**
- Modify: `src/components/landing/PricingSection.jsx:9-65`

- [ ] **Step 1: Update pricing plans in `PricingSection.jsx`**
Update the `plans` array to match:
- `FREE`: Rp 0 / Selamanya — "Fase Validasi & Kunci Ketergantungan"
- `STARTER`: Rp 135.000 / bulan ($9) — "Era Digital & Transparansi"
- `PRO`: Rp 435.000 / bulan ($29) — "Mode Auto-Pilot & Enterprise"
Add an **Add-On Expansion** section below the cards for Ekstra Kasir (Rp 75.000/staf/bln) and Ekstra Cabang (Rp 225.000/cabang/bln).

- [ ] **Step 2: Verify component rendering**
Run syntax check on `PricingSection.jsx`.

- [ ] **Step 3: Commit**
`git add src/components/landing/PricingSection.jsx`
`git commit -m "feat(pricing): update landing page pricing section with official tiers and add-ons"`

---

### Task 2: Update Billing Page Pricing & Add-on Selection

**Files:**
- Modify: `src/app/(authenticated)/billing/page.js:103-360`

- [ ] **Step 1: Update plans array & add Add-on selection in `billing/page.js`**
Update pricing cards for `FREE` (Rp 0), `STARTER` (Rp 135.000 / $9), and `PRO` (Rp 435.000 / $29).
Add an **Add-On Selection Card** allowing users to select:
- Ekstra Kasir (+$5 / Rp 75.000 per staf / bulan)
- Ekstra Cabang (+$15 / Rp 225.000 per cabang / bulan)
Update proof submission form select options to handle plan & add-on requests.

- [ ] **Step 2: Verify component build**
Run syntax check on `src/app/(authenticated)/billing/page.js`.

- [ ] **Step 3: Commit**
`git add src/app/(authenticated)/billing/page.js`
`git commit -m "feat(billing): update billing page with official tiers, add-on expansion, and proof submission"`

---

### Task 3: Feature Paywall Gating in Reporting View

**Files:**
- Modify: `src/views/Reporting.jsx`

- [ ] **Step 1: Add plan checking logic to `src/views/Reporting.jsx`**
Read active subscription `plan` from user session / API.
- If `plan === 'FREE'`, render paywall overlay/badge for Void Logs, Heatmap Jam Sibuk, and Top 10 Best Sellers.
- If `plan !== 'PRO'`, render paywall badge on CSV Export button.
- Cap date filter for CSV Export to maximum 30 days to prevent server timeouts.

- [ ] **Step 2: Verify component syntax**
Run node check on `src/views/Reporting.jsx`.

- [ ] **Step 3: Commit**
`git add src/views/Reporting.jsx`
`git commit -m "feat(gating): implement plan tier feature gating in reporting view"`

---

### Task 4: End-to-End Build Verification

**Files:**
- Verification only

- [ ] **Step 1: Run Next.js Production Build**
Run command: `npm run build`
Expected result: `✓ Compiled successfully` with static & dynamic routes generated.

- [ ] **Step 2: Commit any final adjustments**
`git commit -m "chore: verified tier gating and pricing alignment"`
