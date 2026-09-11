# Multi-Role, Multi-Branch & Strict Cashier Lockout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a robust Multi-Role, Multi-Branch system with Next.js Server-Side Middleware lockout for Cashiers, Keyboard-First POS shortcuts, and Branch management for Boss Warung.

**Architecture:** 
- Next.js Server-Side Middleware (`src/middleware.js`) performs server-level role evaluation and instantly redirects Cashiers away from management routes to `/pos`.
- Backend API (`/api/v1/cashiers`) uses Supabase Admin Service Role API on the server to register Cashier accounts directly for a specific branch.
- Dedicated Kiosk POS layout in `(authenticated)/layout.js` hides management sidebars for Cashier role, with `F1`/`F2`/`Esc` keyboard shortcuts and online/offline status indicators.

**Tech Stack:** Next.js 16 (App Router, Middleware, Server Actions), Supabase (Auth, Admin API, RLS), Tailwind CSS, Lucide Icons.

---

### Task 1: Skema Database & RLS Update (PostgreSQL Migration)

**Files:**
- Modify: `docs/supabase-migration.sql`

- [ ] **Step 1: Update Migration SQL with `is_active` and Branch Parent hierarchy**

Add `is_active` column to `products` and update RLS policies for strict tenant isolation.

```sql
-- Ensure is_active column on products for Soft-Delete (dilarang Hapus Fisik)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- Index for active product queries per shop
CREATE INDEX IF NOT EXISTS idx_products_shop_active ON public.products(shop_id, is_active);
```

- [ ] **Step 2: Verify SQL syntax and migration completeness**

Check `docs/supabase-migration.sql` to ensure all RLS policies for `profiles`, `shops`, `products`, `transactions`, `void_logs`, and `subscriptions` enforce `shop_id = public.get_my_shop_id()`.

- [ ] **Step 3: Commit migration document changes**

```bash
git add docs/supabase-migration.sql
git commit -m "db: update migration schema for soft-delete and cashier branch isolation"
```

---

### Task 2: Next.js Server-Side Middleware Guard (`src/middleware.js`)

**Files:**
- Create: `src/middleware.js`

- [ ] **Step 1: Write `src/middleware.js` with role-based route guard**

Create Next.js middleware that checks Supabase session & user profile role. If role is `CASHIER` and target path is any management route (`/dashboard`, `/reporting`, `/products`, `/customers`, `/billing`, `/settings`, `/superadmin`), perform immediate 307 Redirect to `/pos`.

```javascript
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // Bypass public, static, and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname === '/login' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // If not logged in and trying to access protected route, redirect to /login
    if (pathname !== '/login') {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      return NextResponse.redirect(url);
    }
    return response;
  }

  // Fetch profile role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, shop_id')
    .eq('id', user.id)
    .single();

  if (profile?.role === 'CASHIER') {
    // CASHIER is strictly locked to /pos
    if (pathname !== '/pos') {
      const url = request.nextUrl.clone();
      url.pathname = '/pos';
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

- [ ] **Step 2: Commit Next.js Middleware**

```bash
git add src/middleware.js
git commit -m "feat(security): add server-side Next.js middleware for strict cashier lockout"
```

---

### Task 3: Backend API: Pendaftaran Akun Kasir & Manajemen Cabang (`/api/v1/cashiers` & `/api/v1/branches`)

**Files:**
- Create: `src/app/api/v1/cashiers/route.js`
- Create: `src/app/api/v1/branches/route.js`
- Modify: `src/utils/api.js`

- [ ] **Step 1: Implement `src/app/api/v1/cashiers/route.js`**

Endpoint `POST /api/v1/cashiers` for Boss to register cashier accounts directly without email verification loops, validating `max_cashiers` limits.

```javascript
import { withBossOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { createClient } from '@supabase/supabase-js';

export const POST = withBossOnly(async (request, context, { user, profile, supabase }) => {
  try {
    const body = await request.json();
    const { username, email, password, branch_id, cashier_name } = body;

    if (!email || !password || !branch_id || !cashier_name) {
      return errorResponse('Email, password, cabang, dan nama kasir wajib diisi.', 'VALIDATION_ERROR', 422);
    }

    // Check subscription max_cashiers limit
    const { data: userShop } = await supabase
      .from('user_shops')
      .select('shop_id')
      .eq('user_id', user.id)
      .single();

    if (!userShop) return errorResponse('Toko tidak ditemukan.', 'NOT_FOUND', 404);

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('max_cashiers')
      .eq('shop_id', userShop.shop_id)
      .single();

    const maxCashiers = sub?.max_cashiers || 1;

    // Count existing cashiers created by this boss
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'CASHIER')
      .eq('shop_id', branch_id);

    if ((count || 0) >= maxCashiers) {
      return errorResponse(`Kuota akun kasir telah mencapai batas maksimal (${maxCashiers} akun). Tingkatkan paket langganan Anda.`, 'LIMIT_EXCEEDED', 403);
    }

    // Initialize Supabase Admin Service Role Client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Create auth user
    const { data: newUser, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cashier_name, shop_name: 'Cabang Kasir' },
    });

    if (createErr) throw createErr;

    // Upsert profile for cashier
    await supabaseAdmin.from('profiles').upsert({
      id: newUser.user.id,
      username: cashier_name,
      role: 'CASHIER',
      shop_id: branch_id,
    });

    // Insert user_shops junction
    await supabaseAdmin.from('user_shops').upsert({
      user_id: newUser.user.id,
      shop_id: branch_id,
    });

    return successResponse({ success: true, user: newUser.user }, 201);
  } catch (error) {
    console.error('[POST /cashiers]', error);
    return errorResponse(`Gagal mendaftarkan kasir: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
```

- [ ] **Step 2: Add API client methods to `src/utils/api.js`**

Add `api.addCashier` and `api.getBranches` methods.

```javascript
  addCashier: async (data) => {
    const res = await fetchAPI('/cashiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal membuat akun kasir');
  },
```

- [ ] **Step 3: Commit Cashier API and helper updates**

```bash
git add src/app/api/v1/cashiers/route.js src/utils/api.js
git commit -m "feat(api): add server-side cashier registration endpoint with quota checks"
```

---

### Task 4: Layout Isolation & Branch Switcher Dropdown (`(authenticated)/layout.js` & `@/components/BranchSwitcher.jsx`)

**Files:**
- Create: `src/components/BranchSwitcher.jsx`
- Modify: `src/app/(authenticated)/layout.js`

- [ ] **Step 1: Build `BranchSwitcher.jsx` component**

Branch Switcher dropdown for Boss Warung to toggle between branches or overall consolidated view.

```jsx
"use client";
import React from 'react';
import { Store, ChevronDown } from 'lucide-react';

export default function BranchSwitcher({ shops, currentShopId, onSelectShop }) {
  if (!shops || shops.length === 0) return null;

  return (
    <div className="relative inline-block text-left">
      <div className="flex items-center gap-2 bg-amber-950/60 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-amber-100 font-bold">
        <Store size={14} className="text-[#C97B1A]" />
        <select
          value={currentShopId || ''}
          onChange={(e) => onSelectShop(e.target.value)}
          className="bg-transparent text-white font-extrabold outline-none cursor-pointer pr-2"
        >
          <option value="ALL" className="bg-[#3D1A0F] text-white">Semua Cabang (Konsolidasi)</option>
          {shops.map((s) => (
            <option key={s.id} value={s.id} className="bg-[#3D1A0F] text-white">
              {s.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update `src/app/(authenticated)/layout.js` for Dedicated Kiosk POS Layout**

Hide sidebar navigation when `session.profile.role === 'CASHIER'`.

```jsx
  // In AuthenticatedLayout:
  const isCashier = session?.profile?.role === 'CASHIER';

  if (isCashier) {
    return (
      <main className="min-h-screen bg-background p-0">
        {children}
      </main>
    );
  }
```

- [ ] **Step 3: Commit layout isolation & branch switcher**

```bash
git add src/components/BranchSwitcher.jsx src/app/(authenticated)/layout.js
git commit -m "feat(ui): isolate cashier layout in kiosk mode and add branch switcher for boss"
```

---

### Task 5: POS Keyboard-First Shortcuts & Offline Resilience (`src/app/pos/page.js`)

**Files:**
- Modify: `src/app/pos/page.js`

- [ ] **Step 1: Add Keyboard Shortcuts (`F1`, `F2`, `Esc`) in `pos/page.js`**

Add event listener for `F1` (focus scanner input), `F2` (trigger checkout modal), `Esc` (clear modal/cart).

```javascript
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'F1') {
        e.preventDefault();
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        if (cartItems.length > 0 && !submitting) {
          handleCheckout();
        }
      } else if (e.key === 'Escape') {
        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isBlindClosingOpen) setIsBlindClosingOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, submitting, isReceiptModalOpen, isBlindClosingOpen]);
```

- [ ] **Step 2: Add Network Online/Offline Status Indicator & Cart Persistence**

Add `isOnline` state and header signal indicator. Store `cartItems` in `localStorage` when offline.

```javascript
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
```

- [ ] **Step 3: Hide "Mode Bos" / "Kembali ke Dashboard" button when role is `CASHIER`**

In `src/app/pos/page.js`, conditionally render management buttons only if `profile?.role === 'BOSS'`.

- [ ] **Step 4: Commit POS Keyboard Shortcuts & Offline Resilience**

```bash
git add src/app/pos/page.js
git commit -m "feat(pos): implement F1/F2/Esc keyboard shortcuts, network indicator, and offline resilience"
```

---

### Task 6: Verification & End-to-End Build Test

**Files:**
- All modified files

- [ ] **Step 1: Run production build verification**

Run `npm run build` and ensure Next.js compiles cleanly with 0 errors.

- [ ] **Step 2: Final Commit & Clean State**

```bash
git status
git commit -m "chore: complete multi-role multi-branch cashier lockout system"
```
