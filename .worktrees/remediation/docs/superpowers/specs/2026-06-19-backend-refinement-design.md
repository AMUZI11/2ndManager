# Design Specification: Backend Refinement (HL Manager Pro)
Date: 2026-06-19

## 1. Goal Description
Refine and harden the backend of HL Manager Pro to address security vulnerabilities, data integrity bugs, performance bottlenecks, and architectural gaps. This specification builds on the findings of the Omega Audit Report v2.0 and aligns on key design choices made during the system interview.

## 2. Proposed Changes

### 2.1 Security Hardening & Environment Controls
*   **Startup Env Validation (`src/lib/auth.js`):** (Implemented) Verify that `JWT_SECRET` exists on initialization, throwing a fatal error if missing.
*   **IP-Based Rate Limiting (`src/app/api/v1/auth/login/route.js`):** (Implemented) In-memory sliding window rate limiter tracking client IP. Limit login attempts to 5 per 15 minutes.
*   **Centralized CORS Configuration (`src/middleware.js`):** Restrict `Access-Control-Allow-Origin` dynamically. Instead of a wildcard `*`, read an environment variable `ALLOWED_ORIGINS` (comma-separated origins). If the request origin matches the allowed list, set the header. Otherwise, fall back to same-origin.
*   **Tutorial Progress Input Sanitization:**
    *   Add validation schema `tutorialProgressSchema` in `src/lib/validation.js`.
    *   Apply `tutorialProgressSchema.safeParse` in `src/app/api/v1/tutorial/progress/route.js` (PUT).

### 2.2 Zod Schema Additions (`src/lib/validation.js`)
Introduce a new schema to validate tutorial progress modifications:
*   **Tutorial Progress Schema:**
    *   `onboarding_completed`: Boolean (optional)
    *   `onboarding_last_step`: Integer >= 0 (optional)
    *   `tutorial_id`: String (optional)
    *   `tutorial_status`: Enum 'completed' | 'in_progress' (optional)
    *   `tutorial_last_step`: Integer >= 0 (optional)

### 2.3 Data Integrity & Transactional Consistency
*   **Customer PUT Transaction (`src/app/api/v1/customers/[id]/route.js`):** Wrap customer update, discounts deletion, and discounts insertion operations in a single `prisma.$transaction()` block. If any step fails (e.g. database error, constraint violation), the entire database state rolls back.
*   **Transactions PUT Transaction (`src/app/api/v1/transactions/[id]/route.js`):** (Implemented) Encapsulate delete old items, create new items, and update transaction totals in a prisma transaction.
*   **Bonus Grant Hook (`src/lib/calculations.js`, Settle Routes):** (Implemented) Recalculate bonus eligibility and write to `BonusGrant` atomically upon transaction and monthly settlements.

### 2.4 Performance & Query Optimizations
*   **Connection Pooling (`src/lib/prisma.js`):** (Implemented) Configure Pool connection limits (`max: 5`, etc.) to prevent Supabase connection exhaustion.
*   **Reports Overall Optimization (`src/app/api/v1/reports/overall/route.js`):** (Implemented) Query aggregates at the database level instead of in JS memory.
*   **Reports Customer Optimization (`src/app/api/v1/reports/customer/[id]/route.js`):** Refactor per-customer report handler to aggregate and group database queries at the Prisma level (similar to overall reports) rather than loading all transactions and items for the customer into JS memory.
    *   Aggregate `omzet_total`, `laba_total`, and `amount_owed` using `prisma.transaction.aggregate`.
    *   Group transaction items by product type using `prisma.transactionItem.groupBy` to calculate LM vs BR sales.

### 2.5 Clean-Up & Script Organization
*   Move scratch and test files in the project root (`find-region.js`, `scratch-test-db.js`, `scratch-test-regions.js`, `test-aws-index.js`, `test-ports.js`, `test-seoul.js`, etc.) into a new `scripts/` directory.
*   Update `.gitignore` to ignore the `scripts/` directory to prevent accidental commits of local testing setups.

## 3. Verification Plan

### 3.1 Automated Verification
*   Execute validation scripts to check input parsing.
*   Verify Prisma transactional rollbacks on Customer PUT database failures.

### 3.2 Manual Verification
*   Test CORS rules using cross-origin curl requests or postman.
*   Verify that customer reports compute identical summary values before and after database-level aggregation refactoring.
