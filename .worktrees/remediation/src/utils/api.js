// src/utils/api.js — Frontend API Client
// Menggantikan MockDB.js (localStorage) dengan calls ke REST API backend
// Semua signature fungsi kompatibel dengan MockDB untuk kemudahan migrasi

const BASE = '/api/v1';

// ─── AUTH TOKEN MANAGEMENT ──────────────────────────────────────────────────

function getToken() {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('hl_jwt_token');
}

function setToken(token) {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('hl_jwt_token', token);
    sessionStorage.setItem('hl_session_time', Date.now().toString());
  }
}

function clearToken() {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('hl_jwt_token');
    sessionStorage.removeItem('hl_session_time');
    sessionStorage.removeItem('hl_current_user');
  }
}

// ─── TUTORIAL SANDBOX HELPERS ────────────────────────────────────────────────
// When a tutorial is active, certain read operations run against localStorage
// sandbox instead of the live API. This keeps tutorials 100% isolated.

function isTutorialSandboxActive() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('hl_tutorial_active') === 'true';
}

function getSandboxProducts() {
  try {
    return JSON.parse(localStorage.getItem('hl_demo_products') || '[]');
  } catch { return []; }
}

function getSandboxCustomers() {
  try {
    return JSON.parse(localStorage.getItem('hl_demo_customers') || '[]');
  } catch { return []; }
}

function getSandboxTransactions() {
  try {
    return JSON.parse(localStorage.getItem('hl_demo_transactions') || '[]');
  } catch { return []; }
}

// ─── HTTP HELPERS ────────────────────────────────────────────────────────────

async function fetchAPI(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  // Session expired
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.reload();
    }
    return null;
  }

  const json = await res.json();
  return { ok: res.ok, status: res.status, data: json };
}

// ─── CASCADING DISCOUNT (client-side fallback — tetap akurat) ────────────────

export function calculateCascadingDiscount(basePrice, discountSteps) {
  if (!discountSteps || discountSteps.length === 0) return Math.round(basePrice);
  let price = Number(basePrice);
  for (const pct of discountSteps) {
    price = price * (1 - Number(pct) / 100);
  }
  return Math.round(price);
}

// ─── API CLIENT OBJECT ───────────────────────────────────────────────────────

export const api = {
  // ── AUTH ──────────────────────────────────────────────────────────────────

  login: async (username, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (res.ok && json.token) {
      setToken(json.token);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('hl_current_user', JSON.stringify(json.user));
      }
      return { success: true, user: json.user };
    }
    return { success: false, message: json.message || 'Username atau password salah.' };
  },

  logout: async () => {
    clearToken();
    return { success: true };
  },

  getCurrentSession: () => {
    if (typeof window === 'undefined') return null;
    const token = getToken();
    if (!token) return null;
    // Cek timeout 8 jam (AC-1, FR-1.6)
    const sessionTime = sessionStorage.getItem('hl_session_time');
    if (sessionTime) {
      const elapsed = Date.now() - parseInt(sessionTime);
      const EIGHT_HOURS = 8 * 60 * 60 * 1000;
      if (elapsed > EIGHT_HOURS) {
        clearToken();
        return null;
      }
    }
    return JSON.parse(sessionStorage.getItem('hl_current_user') || 'null');
  },

  // ── CATEGORIES ────────────────────────────────────────────────────────────

  getCategories: async () => {
    const res = await fetchAPI('/categories');
    return res?.data?.data || [];
  },

  addCategory: async (code, name) => {
    const res = await fetchAPI('/categories', {
      method: 'POST',
      body: JSON.stringify({ code, name }),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal menambahkan kategori');
  },

  deleteCategory: async (code) => {
    const res = await fetchAPI(`/categories/${code}`, { method: 'DELETE' });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal menghapus kategori');
  },

  // ── PRODUCTS ──────────────────────────────────────────────────────────────

  getProducts: async (tipe = null, { page, page_size } = {}) => {
    // Tutorial sandbox: return mock products if tutorial is active
    if (isTutorialSandboxActive()) {
      const products = getSandboxProducts();
      return tipe ? products.filter(p => p.tipe === tipe) : products;
    }
    const params = new URLSearchParams();
    if (tipe) params.set('tipe', tipe);
    if (page) params.set('page', page);
    if (page_size) params.set('page_size', page_size);
    
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/products${query}`);
    return res?.data?.data || [];
  },

  addProduct: async (product) => {
    // In tutorial mode, write to sandbox
    if (isTutorialSandboxActive()) {
      const products = getSandboxProducts();
      const newProduct = {
        id: `demo-prod-${Date.now()}`,
        ...product,
        is_deleted: false,
        harga_modal: Number(product.harga_modal),
        harga_base: Number(product.harga_base),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('hl_demo_products', JSON.stringify([...products, newProduct]));
      return newProduct;
    }
    const res = await fetchAPI('/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal menambahkan produk');
  },

  updateProduct: async (id, updatedFields) => {
    const res = await fetchAPI(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedFields),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal mengubah produk');
  },

  deleteProduct: async (id) => {
    const res = await fetchAPI(`/products/${id}`, { method: 'DELETE' });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal menghapus produk');
  },

  // ── CUSTOMERS ─────────────────────────────────────────────────────────────

  getCustomers: async ({ page, page_size } = {}) => {
    // Tutorial sandbox: return mock customers if tutorial is active
    if (isTutorialSandboxActive()) {
      return getSandboxCustomers();
    }
    const params = new URLSearchParams();
    if (page) params.set('page', page);
    if (page_size) params.set('page_size', page_size);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/customers${query}`);
    return res?.data?.data || [];
  },

  getCustomerById: async (id) => {
    if (isTutorialSandboxActive()) {
      return getSandboxCustomers().find(c => c.id === id) || null;
    }
    const res = await fetchAPI(`/customers/${id}`);
    return res?.data?.data || null;
  },

  addCustomer: async (customer) => {
    // In tutorial mode, write to sandbox
    if (isTutorialSandboxActive()) {
      const customers = getSandboxCustomers();
      const newCustomer = {
        id: `demo-cust-${Date.now()}`,
        ...customer,
        is_deleted: false,
        discounts: customer.discounts || {},
        discounts_lm: customer.discounts_lm || [],
        discounts_br: customer.discounts_br || [],
        bonus_threshold: Number(customer.bonus_threshold) || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('hl_demo_customers', JSON.stringify([...customers, newCustomer]));
      return newCustomer;
    }
    const res = await fetchAPI('/customers', {
      method: 'POST',
      body: JSON.stringify(customer),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal menambahkan pelanggan');
  },

  updateCustomer: async (id, updatedFields) => {
    const res = await fetchAPI(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedFields),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal mengubah pelanggan');
  },

  deleteCustomer: async (id) => {
    const res = await fetchAPI(`/customers/${id}`, { method: 'DELETE' });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal menghapus pelanggan');
  },

  getCustomerBonusStatus: async (customerId) => {
    const res = await fetchAPI(`/customers/${customerId}/bonus-status`);
    return res?.data?.data || { accumulator: 0, threshold: 0, total_consumed: 0, bonuses_available: 0, bonuses_granted: 0 };
  },

  getBonusAlerts: async () => {
    if (isTutorialSandboxActive()) return [];
    const res = await fetchAPI('/customers/bonus-alerts');
    return res?.data?.data || [];
  },

  getCustomerTransactions: async (customerId, { month, year, status, page, page_size } = {}) => {
    if (isTutorialSandboxActive()) {
      let txs = getSandboxTransactions().filter(t => t.customer_id === customerId);
      if (status) txs = txs.filter(t => t.status === status);
      if (month && year) {
        txs = txs.filter(t => {
          const d = new Date(t.tanggal);
          return d.getMonth() + 1 === parseInt(month) && d.getFullYear() === parseInt(year);
        });
      }
      return { data: txs, summary: {} };
    }
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    if (status) params.set('status', status);
    if (page) params.set('page', page);
    if (page_size) params.set('page_size', page_size);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/customers/${customerId}/transactions${query}`);
    return res?.data?.data || { data: [], summary: {} };
  },

  settleMonth: async (customerId, year, month, tanggal_lunas) => {
    const res = await fetchAPI(`/customers/${customerId}/settle-month`, {
      method: 'POST',
      body: JSON.stringify({ month, year, tanggal_lunas }),
    });
    if (res?.ok) return res.data.data.settled_count;
    throw new Error(res?.data?.message || 'Gagal melunaskan bulan');
  },

  // ── TRANSACTIONS ──────────────────────────────────────────────────────────

  getTransactions: async ({ status, customer_id, month, year, is_bonus, page, page_size } = {}) => {
    if (isTutorialSandboxActive()) {
      let txs = getSandboxTransactions();
      if (status) txs = txs.filter(t => t.status === status);
      if (customer_id) txs = txs.filter(t => t.customer_id === customer_id);
      if (is_bonus !== undefined) txs = txs.filter(t => t.is_bonus === (is_bonus === true || is_bonus === 'true'));
      return txs;
    }
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (customer_id) params.set('customer_id', customer_id);
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    if (is_bonus !== undefined) params.set('is_bonus', is_bonus);
    if (page) params.set('page', page);
    if (page_size) params.set('page_size', page_size);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/transactions${query}`);
    return res?.data?.data || [];
  },

  getTransactionById: async (id) => {
    if (isTutorialSandboxActive()) {
      return getSandboxTransactions().find(t => t.id === id) || null;
    }
    const res = await fetchAPI(`/transactions/${id}`);
    return res?.data?.data || null;
  },

  addTransaction: async (tx) => {
    // In tutorial mode, store in sandbox without hitting the database
    if (isTutorialSandboxActive()) {
      const txs = getSandboxTransactions();
      const newTx = {
        id: `demo-tx-${Date.now()}`,
        ...tx,
        status: tx.status || 'Piutang',
        items: tx.items || [],
        omzet_total: 0,
        laba_total: 0,
        amount_owed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      localStorage.setItem('hl_demo_transactions', JSON.stringify([...txs, newTx]));
      return { success: true, data: newTx };
    }
    const res = await fetchAPI('/transactions', {
      method: 'POST',
      body: JSON.stringify(tx),
    });
    if (res?.ok) return { success: true, data: res.data.data };
    return { success: false, message: res?.data?.message || 'Gagal menyimpan bon' };
  },

  updateTransaction: async (id, updatedFields) => {
    const res = await fetchAPI(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedFields),
    });
    if (res?.ok) return { success: true, data: res.data.data };
    return { success: false, message: res?.data?.message || 'Gagal mengubah bon' };
  },

  deleteTransaction: async (id) => {
    const res = await fetchAPI(`/transactions/${id}`, { method: 'DELETE' });
    if (res?.ok) return { success: true };
    return { success: false, message: res?.data?.message || 'Gagal menghapus bon' };
  },

  settleTransaction: async (id, tanggal_lunas) => {
    // In tutorial mode: mark the sandbox transaction as Lunas
    if (isTutorialSandboxActive()) {
      const txs = getSandboxTransactions().map(t =>
        t.id === id ? { ...t, status: 'Lunas', tanggal_lunas } : t
      );
      localStorage.setItem('hl_demo_transactions', JSON.stringify(txs));
      return { success: true, data: txs.find(t => t.id === id) };
    }
    const res = await fetchAPI(`/transactions/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify({ tanggal_lunas }),
    });
    if (res?.ok) return { success: true, data: res.data.data };
    return { success: false, message: res?.data?.message || 'Gagal melunaskan bon' };
  },

  // ── REPORTS ───────────────────────────────────────────────────────────────

  getOverallReport: async ({ month, year } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/reports/overall${query}`);
    return res?.data?.data || null;
  },

  getCustomerReport: async (id, { month, year } = {}) => {
    const params = new URLSearchParams();
    if (month) params.set('month', month);
    if (year) params.set('year', year);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/reports/customer/${id}${query}`);
    return res?.data?.data || null;
  },

  // ── TUTORIAL PROGRESS ─────────────────────────────────────────────────────

  getTutorialProgress: async () => {
    const res = await fetchAPI('/tutorial/progress');
    return res?.data?.data || null;
  },

  updateTutorialProgress: async (fields) => {
    const res = await fetchAPI('/tutorial/progress', {
      method: 'PUT',
      body: JSON.stringify(fields),
    });
    return res?.data?.data || null;
  },

  completeTutorial: async (tutorialId) => {
    return api.updateTutorialProgress({
      tutorial_id: tutorialId,
      tutorial_status: 'completed',
    });
  },

  resetOnboarding: async () => {
    const res = await fetchAPI('/tutorial/reset-onboarding', { method: 'POST' });
    return res?.ok ? { success: true } : { success: false };
  },

  resetAllSystemData: async () => {
    const res = await fetchAPI('/admin/reset', { method: 'POST' });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal mereset data sistem');
  },

  changePassword: async (oldPassword, newPassword) => {
    const res = await fetchAPI('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal mengubah kata sandi');
  },

  changeUsername: async (newUsername) => {
    const res = await fetchAPI('/auth/change-username', {
      method: 'POST',
      body: JSON.stringify({ newUsername }),
    });
    if (res?.ok) {
      if (typeof window !== 'undefined') {
        const userJson = sessionStorage.getItem('hl_current_user');
        if (userJson) {
          const userObj = JSON.parse(userJson);
          userObj.username = newUsername;
          sessionStorage.setItem('hl_current_user', JSON.stringify(userObj));
        }
      }
      return { success: true };
    }
    throw new Error(res?.data?.message || 'Gagal mengubah username');
  },

  getAuditLogs: async () => {
    const res = await fetchAPI('/logs');
    return res?.data?.data || [];
  },

  backupData: async () => {
    const res = await fetchAPI('/admin/backup');
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal mengekspor data cadangan.');
  },

  restoreData: async (payload) => {
    const res = await fetchAPI('/admin/restore', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res?.ok) return { success: true };
    throw new Error(res?.data?.message || 'Gagal memulihkan data cadangan.');
  },
};

// Re-export MockDB alias untuk backwards compatibility (migrasi bertahap)
export const MockDB = api;
