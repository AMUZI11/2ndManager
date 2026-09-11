# Interactive Tutorial Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor and fix the interactive tutorial engine so that it redirects users to the correct page when starting a tutorial, aligns target IDs with seeded database records, and accurately captures trigger events across all frontend views.

**Architecture:** Use client-side Next.js route mapping in `/help`, stabilize transaction IDs in `prisma/seed.js` to deterministic values, and register event listeners via `registerTrigger` in view components to advance steps.

**Tech Stack:** Next.js (App Router), React Context, Prisma (PostgreSQL), TailwindCSS.

---

### Task 1: Update Help Center Page Navigation

**Files:**
- Modify: `src/app/(authenticated)/help/page.js`

- [ ] **Step 1: Modify redirection handler**
  Update `handleSetView` in [page.js](file:///c:/Users/USER/Desktop/Project/project%20hl/src/app/(authenticated)/help/page.js) to support all tutorial target view routes.
  
  ```javascript
  const handleSetView = (view) => {
    if (view === 'dashboard') {
      router.push('/dashboard');
    } else if (view === 'customers') {
      router.push('/customers');
    } else if (view === 'products') {
      router.push('/products');
    } else if (view === 'transaction-form') {
      router.push('/transactions/new');
    } else if (view === 'reporting') {
      router.push('/reporting');
    }
  };
  ```

---

### Task 2: Stabilize Database Seed Transaction IDs

**Files:**
- Modify: `prisma/seed.js`

- [ ] **Step 1: Set deterministic transaction IDs in the seed script**
  Modify [seed.js](file:///c:/Users/USER/Desktop/Project/project%20hl/prisma/seed.js) to explicitly pass stable IDs for seed transactions.
  
  Replace Transaction 1 seed:
  ```javascript
  const tx1 = await prisma.transaction.upsert({
    where: { nomor_bon: 'BON-2026-001' },
    update: {},
    create: {
      id: 'tx-seed-1',
      nomor_bon: 'BON-2026-001',
      ...
  ```

  Replace Transaction 2 seed:
  ```javascript
  await prisma.transaction.upsert({
    where: { nomor_bon: 'BON-2026-002' },
    update: {},
    create: {
      id: 'tx-seed-2',
      nomor_bon: 'BON-2026-002',
      ...
  ```

  Replace Transaction 3 seed:
  ```javascript
  await prisma.transaction.upsert({
    where: { nomor_bon: 'BON-2026-003' },
    update: {},
    create: {
      id: 'tx-seed-3',
      nomor_bon: 'BON-2026-003',
      ...
  ```

- [ ] **Step 2: Run DB push and seed**
  Run commands to apply database schema and re-run seed.
  Run: `npx prisma db push --force-reset`
  Run: `npm run db:seed`
  Expected: Command outputs "Seed selesai! Silakan login dengan: admin / admin123"

---

### Task 3: Align Tutorial Step IDs and Refine Backdrop Styling

**Files:**
- Modify: `src/components/TutorialEngine.jsx`

- [ ] **Step 1: Replace hardcoded mockup IDs with seeded database IDs**
  Update configurations in `TutorialEngine.jsx` for `TUT04`, `TUT05`, `TUT06`, `TUT07`, and `TUT11` to target stable customer and transaction IDs.
  
  ```javascript
  // For TUT04
  const TUT04_STEPS = [
    {
      targetId: "cust-detail-btn-cust-seed-1",
      title: "Langkah 1/4: Buka Detail Transaksi",
      content: "Cari pelanggan 'Toko Kelontong Bu Retno', lalu klik tombol [Transaksi ➔] untuk melihat riwayat pembukuannya.",
      trigger: "click"
    },
    ...
  
  // For TUT05
  const TUT05_STEPS = [
    {
      targetId: "cust-detail-btn-cust-seed-1",
      title: "Langkah 1/5: Buka Transaksi Pelanggan",
      ...
    },
    {
      targetId: "cust-detail-settle-btn-tx-seed-2",
      title: "Langkah 2/5: Pilih Bon untuk Dilunaskan",
      ...
    },
    ...
  
  // For TUT06
  const TUT06_STEPS = [
    {
      targetId: "cust-detail-btn-cust-seed-1",
      title: "Langkah 1/4: Buka Transaksi Pelanggan",
      ...
    },
    ...

  // For TUT07
  const TUT07_STEPS = [
    {
      targetId: "cust-edit-btn-cust-seed-1",
      title: "Langkah 1/3: Ubah Data Pelanggan",
      ...
    },
    ...

  // For TUT11
  const TUT11_STEPS = [
    {
      targetId: "cust-detail-btn-cust-seed-1",
      title: "Langkah 1/5: Buka Detail Transaksi",
      ...
    },
    {
      targetId: "cust-detail-edit-btn-tx-seed-2",
      title: "Langkah 2/5: Klik Ubah Nota Bon",
      ...
    },
    ...
  ```

- [ ] **Step 2: Add Webkit vendor prefix for backdrop filters**
  In `TutorialEngine.jsx`, find the CSS styles of backdrops and add `WebkitBackdropFilter: 'blur(1.5px)'` next to `backdropFilter: 'blur(1.5px)'`.
  
  Example:
  ```javascript
  backgroundColor: 'rgba(15, 23, 42, 0.65)',
  backdropFilter: 'blur(1.5px)',
  WebkitBackdropFilter: 'blur(1.5px)',
  ```

---

### Task 4: Integrate Triggers in CustomerManagement

**Files:**
- Modify: `src/views/CustomerManagement.jsx`

- [ ] **Step 1: Import hook and register click/input triggers**
  Import `useTutorial` and call `registerTrigger` for form actions, text inputs, and table detail/edit actions.
  
  ```javascript
  import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
  
  export default function CustomerManagement({ setView, setSelectedCustomerId }) {
    const { registerTrigger } = useTutorial();
    ...
  ```

  - For customer name input:
    ```javascript
    onChange={(e) => {
      setNama(e.target.value);
      registerTrigger("cust-name-input", "input");
    }}
    ```

  - For threshold input:
    ```javascript
    onChange={(e) => {
      setBonusThreshold(e.target.value);
      registerTrigger("cust-threshold-input", "input");
    }}
    ```

  - For step discount additions/inputs:
    - Add LM: Call `registerTrigger("cust-add-lm-step-btn", "click")` in `addStep('LM')`.
    - Edit LM discount step value: Call `registerTrigger("cust-lm-discount-1", "input")` when updating step at index 1.
  
  - For edit modal save:
    ```javascript
    const handleSave = async (e) => {
      ...
      registerTrigger("cust-save-btn", "click");
    ```

  - For card buttons:
    - Click Transaksi detail: `registerTrigger("cust-detail-btn-" + c.id, "click")` inside the onClick handler.
    - Click Edit customer: `registerTrigger("cust-edit-btn-" + c.id, "click")` inside the onClick handler.

---

### Task 5: Integrate Triggers in ProductManagement

**Files:**
- Modify: `src/views/ProductManagement.jsx`

- [ ] **Step 1: Import hook and register product triggers**
  Import `useTutorial` and register triggers for adding a product, inputting details, and submitting the form.
  
  ```javascript
  import { useTutorial, ContextualTooltip } from '../components/TutorialEngine';
  
  export default function ProductManagement() {
    const { registerTrigger } = useTutorial();
    ...
  ```

  - In `openAddModal`: Call `registerTrigger("prod-add-btn", "click")`.
  - For product name input: Call `registerTrigger("prod-name-input", "input")` in `onChange`.
  - For basic price: Call `registerTrigger("prod-base-price-input", "input")` in `onChange`.
  - For modal price: Call `registerTrigger("prod-modal-price-input", "input")` in `onChange`.
  - In `handleSave`: Call `registerTrigger("prod-save-btn", "click")`.

---

### Task 6: Integrate Triggers in CustomerDetail

**Files:**
- Modify: `src/views/CustomerDetail.jsx`

- [ ] **Step 1: Import hook and register customer detail triggers**
  Import `useTutorial` and call `registerTrigger` for month select, month settlement, printing piutang, individual settlement, and editing transaction.
  
  ```javascript
  import { useTutorial } from '../components/TutorialEngine';
  
  export default function CustomerDetail({ customerId, setView, setEditTransactionId }) {
    const { registerTrigger } = useTutorial();
    ...
  ```

  - For month selector dropdown:
    ```javascript
    onChange={(e) => {
      setSelectedMonth(e.target.value);
      registerTrigger("cust-detail-month-select", "change");
    }}
    ```

  - For settle month button: Call `registerTrigger("cust-detail-settle-month-btn", "click")` in `handleOpenSettleMonth`.
  - For print piutang button: Call `registerTrigger("cust-detail-print-piutang-btn", "click")` inside its onClick.
  - For settle single button: Call `registerTrigger("cust-detail-settle-btn-" + t.id, "click")` in `handleOpenSettleSingle`.
  - For edit transaction button: Call `registerTrigger("cust-detail-edit-btn-" + t.id, "click")` inside the onClick.

---

### Task 7: Integrate Triggers in Reporting

**Files:**
- Modify: `src/views/Reporting.jsx`

- [ ] **Step 1: Import hook and register reporting triggers**
  Import `useTutorial` and call `registerTrigger` for PDF rekap print button.
  
  ```javascript
  import { useTutorial } from '../components/TutorialEngine';
  
  export default function Reporting() {
    const { registerTrigger } = useTutorial();
    ...
  ```

  - In `handlePrintOverall` or onClick of `report-pdf-btn`: Call `registerTrigger("report-pdf-btn", "click")`.

---

### Task 8: Verification

- [ ] **Step 1: Build check**
  Run: `npm run build`
  Expected: Successful compilation without TS/lint errors.
