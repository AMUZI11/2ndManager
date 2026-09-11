# Setup Wizard & Database Reset Implementation Spec

This specification outlines the design and architecture for the database reset feature and the elderly-friendly (lansia) setup wizard in HL Manager Pro.

## User Review Required

> [!IMPORTANT]
> The database reset option will permanently delete all transactions, products, customers, and custom categories. The system admin user (`admin` / `admin123`) and default categories (`LM` and `BR`) will be kept.
> A two-click confirmation modal will be used to prevent accidental clicks.

## Proposed Changes

### Backend Components

#### [NEW] [route.js (Reset API)](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/api/v1/admin/reset/route.js)
*   Expose a secure POST endpoint `/api/v1/admin/reset` protected by `withAuth`.
*   Perform a database transaction to delete records in the following order:
    1. `BonusGrant`
    2. `TransactionItem`
    3. `Transaction`
    4. `CustomerDiscount`
    5. `Customer`
    6. `Product`
    7. `ProductCategory` where `code` is NOT in `['LM', 'BR']`.
*   Reset `TutorialProgress` for the authenticated user to onboarding step 0 and empty completion arrays.

### Frontend Components

#### [MODIFY] [api.js](file:///c:/Users/USER/Desktop/Project/project%20hl/src/utils/api.js)
*   Add `resetAllSystemData()` calling `POST /api/v1/admin/reset`.

#### [NEW] [SetupWizard.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/components/SetupWizard.jsx)
*   A full-screen onboarding component with large fonts, high-contrast buttons, and simplified Indonesian copy.
*   **Step 1: Welcome**
    *   Friendly greeting and overview of setup steps.
    *   "Mulai Sekarang" button to proceed.
    *   "Lewati Panduan" link to skip setup.
*   **Step 2: Categories**
    *   Display default `LM` and `BR` categories.
    *   Provide a simple form to add a custom category (Code & Name).
*   **Step 3: Add Product**
    *   Simple, large inputs: Nama Barang, Kelompok (Dropdown), Harga Jual, Harga Modal.
    *   Requires adding at least 1 product before proceeding.
*   **Step 4: Add Customer**
    *   Simple, large inputs: Nama Pelanggan, Batas Target Bonus, Diskon per kategori.
    *   Requires adding at least 1 customer before proceeding.
*   **Step 5: Finish**
    *   Success message and direct action button: "Buat Bon Penjualan Pertama".

#### [MODIFY] [HelpCenter.jsx](file:///c:/Users/USER/Desktop/Project/project%20hl/src/views/HelpCenter.jsx)
*   Add a prominent card section at the bottom for "Pengaturan Awal & Reset Data".
*   Clicking triggers a large pop-up with a two-stage warning/confirmation.
*   On confirmation: calls `api.resetAllSystemData()`, clears `hl_wizard_dismissed` in `localStorage`, dispatches `open-setup-wizard` event, and redirects to Dashboard.

#### [MODIFY] [layout.js](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/%28authenticated%29/layout.js)
*   Check products length on mount. If empty and not dismissed, show `<SetupWizard />`.
*   Listen to `open-setup-wizard` custom event to open the wizard immediately on reset.

---

## Verification Plan

### Automated Tests
*   `npx prisma db push` to verify no schema changes are broken.
*   Validate reset route returns 200 and database is cleared.

### Manual Verification
*   Go to Help page, click reset data, confirm.
*   Verify dashboard is empty.
*   Verify Setup Wizard starts automatically.
*   Complete all steps in the wizard and verify real data is stored in the database.
