# Interactive Tutorial Refinement Design Spec

This document details the design and changes required to fix, refine, and optimize the Interactive Tutorial System (`TutorialEngine` and onboarding mode) to make it visually cleaner, fully responsive, and function correctly with real database entries.

## 1. Problem Statement
The current interactive tutorial system has several deficiencies:
- **Navigation failure**: When starting a tutorial from `/help`, the user is not redirected to the appropriate target page. As a result, the tutorial is stuck, the backdrop blocks all user interaction, and the spotlight highlights nothing because the target elements do not exist on the `/help` page.
- **Unlinked events**: View components such as `CustomerManagement`, `ProductManagement`, `CustomerDetail`, and `Reporting` do not import the `useTutorial` hook or register user action triggers via `registerTrigger`. Therefore, interactive steps requiring clicks or input entries never advance.
- **Unstable database seed IDs**: The tutorial configurations rely on hardcoded customer and transaction IDs (e.g. `cust-detail-btn-c-1` and `cust-detail-settle-btn-t-2`). Since the database seeding process lets Prisma auto-generate UUIDs for transactions, the spotlight fails to target the correct elements.
- **Backdrop compatibility**: The CSS backdrop filters lack the `-webkit` vendor prefix, which may cause rendering issues on Safari iOS.

## 2. Proposed Solution & Changes

### A. Navigation Redirect Support
We will update the route mapping in the help center page entry point so that selecting a tutorial redirects the user immediately to the correct target page:
- `dashboard` ➔ `/dashboard`
- `customers` ➔ `/customers`
- `products` ➔ `/products`
- `transaction-form` ➔ `/transactions/new`
- `reporting` ➔ `/reporting`

### B. Stable Database Seeding
Update [seed.js](file:///c:/Users/USER/Desktop/Project/project%20hl/prisma/seed.js) to set deterministic IDs for seeded transactions:
- Transaksi 1 (Lunas) ➔ `id: "tx-seed-1"`
- Transaksi 2 (Piutang) ➔ `id: "tx-seed-2"`
- Transaksi 3 (Lunas) ➔ `id: "tx-seed-3"`

### C. Step Configuration Alignment
Update the steps in [TutorialEngine.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/components/TutorialEngine.jsx) to target the deterministic IDs:
- `cust-detail-btn-c-1` ➔ `cust-detail-btn-cust-seed-1`
- `cust-edit-btn-c-1` ➔ `cust-edit-btn-cust-seed-1`
- `cust-detail-settle-btn-t-2` ➔ `cust-detail-settle-btn-tx-seed-2`
- `cust-detail-edit-btn-t-2` ➔ `cust-detail-edit-btn-tx-seed-2`

### D. Trigger Registrations in Views
Import `useTutorial` and register step triggers inside these key files:
- [CustomerManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/CustomerManagement.jsx)
  - `cust-add-btn` (click)
  - `cust-name-input` (input)
  - `cust-threshold-input` (input)
  - `cust-add-lm-step-btn` (click)
  - `cust-lm-discount-1` (input)
  - `cust-save-btn` (click)
  - `cust-edit-btn-cust-seed-1` (click)
  - `cust-detail-btn-cust-seed-1` (click)
- [ProductManagement.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/ProductManagement.jsx)
  - `prod-add-btn` (click)
  - `prod-name-input` (input)
  - `prod-base-price-input` (input)
  - `prod-modal-price-input` (input)
  - `prod-save-btn` (click)
- [CustomerDetail.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/CustomerDetail.jsx)
  - `cust-detail-month-select` (change)
  - `cust-detail-settle-month-btn` (click)
  - `cust-detail-print-piutang-btn` (click)
  - `cust-detail-settle-btn-tx-seed-2` (click)
  - `cust-detail-edit-btn-tx-seed-2` (click)
- [Reporting.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/Reporting.jsx)
  - `report-pdf-btn` (click)

### E. Styling & Responsive Optimizations
- Add `WebkitBackdropFilter: 'blur(1.5px)'` to the backdrop divs in `TutorialEngine.jsx`.
- Clean up styles of buttons within the onboarding flow to use `bg-cta hover:bg-cta/90 text-primary font-mono` for contrast and premium look.
- Support scroll offsets or padding on mobile bottom sheets so elements don't get trapped.

## 3. Verification Plan
- **Database Re-seed**: Run `npm run db:push` and `npm run db:seed` to verify database status.
- **Tutorial TUT-01 (Tambah Pelanggan)**: Verify user is redirected to `/customers`, modal is opened, name/threshold inputs can be typed into, and form can be saved, advancing each step correctly.
- **Tutorial TUT-03 (Buat Bon Baru)**: Verify form works, prices auto-calculate, and invoice is simulated correctly.
- **Tutorial TUT-05 (Settle Lunas)**: Verify the piutang settle single flow can be completed on customer detail view.
- **Responsive Emulation**: Run test in viewport sizes matching desktop (1280px) and mobile (375px) to verify bottom sheet layout.
