# Backend Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the backend of HL Manager Pro to fix security flaws, data integrity issues, performance issues, and business logic gaps.

**Architecture:** Use Approach 1 (Incremental API Refinement) to update existing API route handlers, configure the Prisma PG connection pool limits, implement an in-memory Map-based login rate limiter, define centralized Zod validation schemas, wrap database writes in Prisma transactions, and optimize reports with SQL aggregate queries.

**Tech Stack:** Next.js (App Router), Prisma ORM, PostgreSQL, jsonwebtoken, bcryptjs, Zod.

---

### Task 1: Configure Connection Pool Limits

**Files:**
- Modify: `src/lib/prisma.js`

- [ ] **Step 1: Edit `src/lib/prisma.js` to configure Pool limits**
  Update the `createPrismaClient` function to pass `max: 5`, `idleTimeoutMillis: 30000`, and `connectionTimeoutMillis: 10000` to the `pg.Pool` constructor.
  
  Code to implement:
  ```javascript
  function createPrismaClient() {
    const pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });
  }
  ```

- [ ] **Step 2: Verify compiling and Prisma generation**
  Run the Prisma compiler check:
  Run: `npx prisma generate`
  Expected: Generated Prisma Client successfully.

---

### Task 2: Insecure JWT Fallback and Startup Validation

**Files:**
- Modify: `src/lib/auth.js`

- [ ] **Step 1: Validate environment variables on file load**
  Modify `src/lib/auth.js` to throw an explicit error on load if `JWT_SECRET` is missing. Remove the fallback string.

  Code to implement:
  ```javascript
  if (!process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is missing. Application cannot start securely.');
  }
  const JWT_SECRET = process.env.JWT_SECRET;
  const JWT_EXPIRES_IN = '8h';
  ```

- [ ] **Step 2: Verify server starts and throws if secret missing**
  Run a test command with missing env:
  Run: `node -e "process.env.JWT_SECRET=''; require('./src/lib/auth.js')"`
  Expected: Exit code 1 / Exception "FATAL: JWT_SECRET environment variable is missing."

---

### Task 3: IP-Based Login Rate Limiting

**Files:**
- Modify: `src/app/api/v1/auth/login/route.js`

- [ ] **Step 1: Implement in-memory Map rate limiter in login route**
  Add a rate-limiter Map tracker at the top of `src/app/api/v1/auth/login/route.js`. Check client IP address on each POST request. Allow maximum 5 attempts per 15 minutes.
  
  Code to implement:
  ```javascript
  const loginAttempts = new Map();
  const WINDOW_MS = 15 * 60 * 1000;
  const MAX_ATTEMPTS = 5;

  function getIp(request) {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return '127.0.0.1';
  }

  function isRateLimited(ip) {
    const now = Date.now();
    const records = loginAttempts.get(ip) || [];
    // Clean old records
    const validRecords = records.filter(timestamp => now - timestamp < WINDOW_MS);
    
    if (validRecords.length >= MAX_ATTEMPTS) {
      loginAttempts.set(ip, validRecords);
      return true;
    }
    
    validRecords.push(now);
    loginAttempts.set(ip, validRecords);
    return false;
  }
  ```

- [ ] **Step 2: Add rate limit check in `POST` handler**
  At the beginning of `POST` function:
  ```javascript
  const ip = getIp(request);
  if (isRateLimited(ip)) {
    return errorResponse('Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.', 'TOO_MANY_REQUESTS', 429);
  }
  ```

---

### Task 4: Centralized CORS Middleware

**Files:**
- Create: `src/middleware.js`

- [ ] **Step 1: Create `src/middleware.js`**
  Implement Next.js middleware to handle CORS preflight and append CORS headers to all API response headers.

  Code to implement:
  ```javascript
  import { NextResponse } from 'next/server';

  export function middleware(request) {
    // Only intercept /api routes
    if (request.nextUrl.pathname.startsWith('/api')) {
      const response = request.method === 'OPTIONS' 
        ? new NextResponse(null, { status: 204 })
        : NextResponse.next();

      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      return response;
    }
    return NextResponse.next();
  }

  export const config = {
    matcher: '/api/:path*',
  };
  ```

---

### Task 5: Centralized Zod Validation Schemas

**Files:**
- Create: `src/lib/validation.js`

- [ ] **Step 1: Create `src/lib/validation.js`**
  Import Zod and define validation schemas for Login, Customer, Product, and Transaction payloads.

  Code to implement:
  ```javascript
  import { z } from 'zod';

  export const loginSchema = z.object({
    username: z.string().min(1, 'Username wajib diisi.'),
    password: z.string().min(1, 'Password wajib diisi.'),
  });

  export const customerSchema = z.object({
    nama: z.string().min(1, 'Nama pelanggan wajib diisi.'),
    bonus_threshold: z.union([z.number(), z.string(), z.bigint()]).transform(val => {
      try {
        return BigInt(val);
      } catch {
        return 0n;
      }
    }),
    discounts_lm: z.array(z.number().min(0).max(100)).optional().default([]),
    discounts_br: z.array(z.number().min(0).max(100)).optional().default([]),
  });

  export const productSchema = z.object({
    nama: z.string().min(1, 'Nama produk wajib diisi.'),
    harga_modal: z.number().min(0, 'Harga modal tidak boleh negatif.'),
    harga_base: z.number().min(0, 'Harga jual tidak boleh negatif.'),
    tipe: z.enum(['LM', 'BR'], { errorMap: () => ({ message: 'Tipe produk harus LM atau BR.' }) }),
  });

  export const transactionItemSchema = z.object({
    product_id: z.string().uuid('Product ID tidak valid.'),
    quantity: z.number().int().min(1, 'Jumlah produk minimal 1.'),
    is_bonus_item: z.boolean().optional().default(false),
  });

  export const transactionSchema = z.object({
    nomor_bon: z.string().min(1, 'Nomor bon wajib diisi.'),
    tanggal: z.string().optional().transform(val => val ? new Date(val) : new Date()),
    customer_id: z.string().uuid('Customer ID wajib diisi dan harus valid.'),
    ongkir: z.number().min(0).optional().default(0),
    deskripsi: z.string().optional().nullable(),
    is_bonus: z.boolean().optional().default(false),
    items: z.array(transactionItemSchema).min(1, 'Transaksi harus memiliki minimal 1 baris produk.'),
  });
  ```

---

### Task 6: Apply Zod Validation to Authentication, Customer, and Product Routes

**Files:**
- Modify: `src/app/api/v1/auth/login/route.js`
- Modify: `src/app/api/v1/customers/route.js`
- Modify: `src/app/api/v1/customers/[id]/route.js`
- Modify: `src/app/api/v1/products/route.js`

- [ ] **Step 1: Validate payload in `auth/login` route**
  Import `loginSchema` and validate body. Return 422 if invalid.
  ```javascript
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

- [ ] **Step 2: Validate payload in `customers` POST route**
  Import `customerSchema` and validate body.
  ```javascript
  const parsed = customerSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

- [ ] **Step 3: Validate payload in `customers/[id]` PUT route**
  Import `customerSchema` and parse partially.
  ```javascript
  const parsed = customerSchema.partial().safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

- [ ] **Step 4: Validate payload in `products` POST route**
  Import `productSchema` and validate body.
  ```javascript
  const parsed = productSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

- [ ] **Step 5: Validate payload in `products/[id]` PUT route**
  Import `productSchema` and parse partially.
  ```javascript
  const parsed = productSchema.partial().safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

---

### Task 7: Apply Zod Validation and Simplify Filtering in Transaction Routes

**Files:**
- Modify: `src/app/api/v1/transactions/route.js`
- Modify: `src/app/api/v1/transactions/[id]/route.js`

- [ ] **Step 1: Validate payload in `transactions` POST route**
  Validate the body using `transactionSchema`. Since `customer_id` is mandatory for all transactions, Zod will enforce this. Return 422 if invalid.
  
- [ ] **Step 2: Simplify `is_bonus` parse logic in `transactions` GET route**
  Change query parsing in GET handler:
  ```javascript
  if (is_bonus) where.is_bonus = is_bonus === 'true';
  ```

- [ ] **Step 3: Validate payload in `transactions/[id]` PUT route**
  Import `transactionSchema` and parse partially.
  ```javascript
  const parsed = transactionSchema.partial().safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
  }
  ```

---

### Task 8: Wrap Transaction PUT in Database Transaction

**Files:**
- Modify: `src/app/api/v1/transactions/[id]/route.js`

- [ ] **Step 1: Wrap DB operations in a transaction block**
  Inside the PUT handler, wrap the deletion of old transaction items, the creation of new transaction items, and the update of the transaction totals within `prisma.$transaction`.
  
  Code to implement:
  ```javascript
  const updated = await prisma.$transaction(async (tx) => {
    // 1. Delete old items
    await tx.transactionItem.deleteMany({ where: { transaction_id: id } });
    
    // 2. Create new items
    await tx.transactionItem.createMany({
      data: items_with_calcs.map(i => ({
        transaction_id: id,
        product_id: i.product_id,
        quantity: i.quantity,
        product_type_snapshot: i.product_type_snapshot,
        harga_base_snapshot: BigInt(i.harga_base_snapshot),
        harga_modal_snapshot: BigInt(i.harga_modal_snapshot),
        discounted_unit_price: BigInt(i.discounted_unit_price || 0),
        line_omzet: BigInt(i.line_omzet),
        line_laba: BigInt(i.line_laba),
        is_bonus_item: i.is_bonus_item,
      })),
    });

    // 3. Update main transaction
    return tx.transaction.update({
      where: { id },
      data: updateData,
      include: { items: { include: { product: true } }, customer: true },
    });
  });
  ```

---

### Task 9: Implement Automatic Bonus System on Settlement

**Files:**
- Modify: `src/lib/calculations.js`
- Modify: `src/app/api/v1/transactions/[id]/settle/route.js`
- Modify: `src/app/api/v1/customers/[id]/settle-month/route.js`

- [ ] **Step 1: Add `checkAndGrantBonuses` in `src/lib/calculations.js`**
  Implement the automatic check and create logic for `BonusGrant` records. Ignore 0% discount steps in cascading discount calculation.
  
  Code to implement:
  ```javascript
  // Filter out 0% steps in calculateCascadingDiscount
  export function calculateCascadingDiscount(basePrice, discountSteps) {
    const steps = (discountSteps || []).filter(pct => Number(pct) > 0);
    if (steps.length === 0) return Math.round(basePrice);
    let price = Number(basePrice);
    for (const pct of steps) {
      price = price * (1 - Number(pct) / 100);
    }
    return Math.round(price);
  }

  export async function checkAndGrantBonuses(customerId, transactionId, prismaClient) {
    const customer = await prismaClient.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer || !customer.bonus_threshold || customer.bonus_threshold <= 0n) {
      return null;
    }

    // Calculate current bonus status before granting new ones
    const status = await calculateBonusStatus(customerId, prismaClient);
    
    if (status.bonuses_available > 0) {
      // Create a new BonusGrant record
      const newGrant = await prismaClient.bonusGrant.create({
        data: {
          customer_id: customerId,
          transaction_id: transactionId,
          bonuses_granted: status.bonuses_available,
          omzet_consumed: BigInt(status.bonuses_available) * customer.bonus_threshold,
        },
      });
      return newGrant;
    }
    return null;
  }
  ```

- [ ] **Step 2: Trigger hook in `transactions/[id]/settle` route**
  In the transaction settle handler, run the check after transaction is marked as Lunas.
  ```javascript
  const updated = await prisma.transaction.update({
    where: { id },
    data: { status: 'Lunas', tanggal_lunas: new Date(tanggal_lunas) },
    include: { items: { include: { product: true } }, customer: true },
  });

  if (updated.customer_id) {
    await checkAndGrantBonuses(updated.customer_id, updated.id, prisma);
  }
  ```

- [ ] **Step 3: Trigger hook in `customers/[id]/settle-month` route**
  In the settle month handler, trigger the check on the customer's last settled transaction.
  ```javascript
  await prisma.transaction.updateMany({
    where: { id: { in: toSettle.map(t => t.id) } },
    data: { status: 'Lunas', tanggal_lunas: tanggalLunasDate },
  });

  const lastSettleId = toSettle[toSettle.length - 1].id;
  await checkAndGrantBonuses(id, lastSettleId, prisma);
  ```

---

### Task 10: Optimize Overall Reports Query Performance

**Files:**
- Modify: `src/app/api/v1/reports/overall/route.js`

- [ ] **Step 1: Rewrite overall report to use Prisma aggregation and grouping**
  Replace in-memory aggregation loops with SQL grouping. Apply date parameters to the `bonusGrants` query.

  Code to implement:
  ```javascript
  // 1. Setup date ranges
  const where = {};
  const bonusWhere = {};
  if (month && year) {
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    where.tanggal = { gte: startDate, lte: endDate };
    bonusWhere.granted_at = { gte: startDate, lte: endDate };
  }

  // 2. Aggregate transactions
  const lunasAgg = await prisma.transaction.aggregate({
    where: { ...where, status: 'Lunas', is_bonus: false },
    _sum: { omzet_total: true, laba_total: true, amount_owed: true }
  });

  const piutangAgg = await prisma.transaction.aggregate({
    where: { ...where, status: 'Piutang' },
    _sum: { amount_owed: true }
  });

  // 3. Aggregate line item omzet grouped by product type (LM vs BR)
  const itemsAgg = await prisma.transactionItem.groupBy({
    by: ['product_type_snapshot'],
    where: {
      transaction: { ...where, status: 'Lunas', is_bonus: false },
      is_bonus_item: false,
    },
    _sum: { line_omzet: true }
  });

  const omzet_lm = Number(itemsAgg.find(i => i.product_type_snapshot === 'LM')?._sum?.line_omzet || 0n);
  const omzet_br = Number(itemsAgg.find(i => i.product_type_snapshot === 'BR')?._sum?.line_omzet || 0n);

  // 4. Calculate stats per customer
  const customerLunas = await prisma.transaction.groupBy({
    by: ['customer_id'],
    where: { ...where, status: 'Lunas', is_bonus: false, customer_id: { not: null } },
    _sum: { omzet_total: true, laba_total: true, amount_owed: true }
  });

  const customerPiutang = await prisma.transaction.groupBy({
    by: ['customer_id'],
    where: { ...where, status: 'Piutang', customer_id: { not: null } },
    _sum: { amount_owed: true }
  });

  const customers = await prisma.customer.findMany({
    where: { is_deleted: false },
    select: { id: true, nama: true }
  });

  const lunasMap = Object.fromEntries(customerLunas.map(c => [c.customer_id, c._sum]));
  const piutangMap = Object.fromEntries(customerPiutang.map(c => [c.customer_id, c._sum]));

  const by_customer = customers.map(c => {
    const lSum = lunasMap[c.id] || { omzet_total: 0n, laba_total: 0n, amount_owed: 0n };
    const pSum = piutangMap[c.id] || { amount_owed: 0n };

    return {
      customer_id: c.id,
      nama: c.nama,
      omzet_lunas: Number(lSum.omzet_total || 0n),
      laba_lunas: Number(lSum.laba_total || 0n),
      piutang: Number(pSum.amount_owed || 0n),
      paid: Number(lSum.amount_owed || 0n),
    };
  }).filter(c => c.omzet_lunas > 0 || c.piutang > 0);

  // 5. Fetch bonus log with date constraints
  const bonusGrants = await prisma.bonusGrant.findMany({
    where: bonusWhere,
    include: { customer: true, transaction: true },
    orderBy: { granted_at: 'desc' },
  });
  ```
