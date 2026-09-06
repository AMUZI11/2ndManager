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

  // Session expired or unauthenticated -> redirect to /login
  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  let json = {};
  if (contentType.includes('application/json')) {
    try {
      json = await res.json();
    } catch {
      json = { message: 'Gagal memproses JSON response.' };
    }
  } else {
    json = { message: 'Server mengembalikan respon non-JSON (HTML/Redirect).' };
  }

  return { ok: res.ok, status: res.status, data: json };
}

// ─── CASCADING DISCOUNT (Iterative Rounding — Anti-Floating Point & Anti-NaN) ─

export function calculateCascadingDiscount(basePrice, discountSteps) {
  if (!discountSteps || !Array.isArray(discountSteps) || discountSteps.length === 0) {
    return Math.round(Number(basePrice) || 0);
  }
  let hargaAkhir = Number(basePrice) || 0;
  for (const diskon of discountSteps) {
    const nilaiDiskon = Number(diskon) || 0;
    // Kalkulasi & pembulatan presisi per tahapan diskon (Anti-Floating Point)
    hargaAkhir = Math.round(hargaAkhir - (hargaAkhir * (nilaiDiskon / 100)));
  }
  return Math.max(0, hargaAkhir);
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
    const currentUser = sessionStorage.getItem('hl_current_user');
    if (currentUser) {
      try { return JSON.parse(currentUser); } catch { }
    }
    // Fallback untuk Supabase Auth session
    return { username: 'Operator', role: 'BOSS' };
  },

  // ── CATEGORIES ────────────────────────────────────────────────────────────

  getCategories: async () => {
    const res = await fetchAPI('/categories');
    return res?.data?.data || [];
  },

  seedDefaultCategories: async () => {
    const res = await fetchAPI('/categories/seed-defaults', { method: 'POST' });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal memuat kategori standar');
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

  getProducts: async (tipe = null) => {
    // Tutorial sandbox: return mock products if tutorial is active
    if (isTutorialSandboxActive()) {
      const products = getSandboxProducts();
      return tipe ? products.filter(p => p.tipe === tipe) : products;
    }
    const query = tipe ? `?tipe=${tipe}` : '';
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

  getCustomers: async () => {
    // Tutorial sandbox: return mock customers if tutorial is active
    if (isTutorialSandboxActive()) {
      return getSandboxCustomers();
    }
    const res = await fetchAPI('/customers');
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

  getCustomerTransactions: async (customerId, { month, year, status } = {}) => {
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

  getTransactions: async ({ status, customer_id, month, year, is_bonus } = {}) => {
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
    return { 
      success: false, 
      status: res?.status,
      code: res?.data?.code,
      limit: res?.data?.limit,
      current: res?.data?.current,
      upgrade_required: Boolean(res?.data?.upgrade_required),
      message: res?.data?.error || res?.data?.message || 'Gagal menyimpan bon',
      raw: res?.data,
    };
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

  logVoid: async (product_name, quantity) => {
    try {
      await fetchAPI('/void-logs', {
        method: 'POST',
        body: JSON.stringify({ product_name, quantity }),
      });
    } catch (e) {
      console.warn('[logVoid] Failed to send void log:', e);
    }
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

  getVoidLogs: async () => {
    const res = await fetchAPI('/void-logs');
    return res?.data?.data || [];
  },

  getBilling: async () => {
    const res = await fetchAPI('/billing');
    return res?.data?.data || null;
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

  getBranches: async () => {
    const res = await fetchAPI('/branches');
    return res?.data?.data || [];
  },

  addBranch: async (name) => {
    const res = await fetchAPI('/branches', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal menambahkan cabang');
  },

  getCashiers: async () => {
    const res = await fetchAPI('/cashiers');
    return res?.data?.data || [];
  },

  addCashier: async (data) => {
    const res = await fetchAPI('/cashiers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal membuat akun kasir');
  },

  getShopProfile: async () => {
    const res = await fetchAPI('/shops/profile');
    return res?.data?.data || null;
  },

  updateShopProfile: async (data) => {
    const res = await fetchAPI('/shops/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res?.ok) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('hl_current_shop_name', data.name);
        window.dispatchEvent(new CustomEvent('hl-shop-changed', { detail: { name: data.name } }));
      }
      return res.data.data;
    }
    throw new Error(res?.data?.message || 'Gagal memperbarui profil toko');
  },

  // ── FASE 1: PRODUCT UNITS (MULTI-TIER CONVERSION) ─────────────────────────

  getProductUnits: async (productId) => {
    const res = await fetchAPI(`/products/${productId}/units`);
    return res?.data?.data || [];
  },

  addProductUnit: async (productId, unitData) => {
    const res = await fetchAPI(`/products/${productId}/units`, {
      method: 'POST',
      body: JSON.stringify(unitData),
    });
    if (res?.ok) return res.data.data;
    if (res?.status === 402) {
      const err = new Error(res.data?.error || 'Batas kuota produk multi-satuan tercapai');
      err.upgradeRequired = true;
      err.code = res.data?.code;
      throw err;
    }
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menambahkan satuan');
  },

  updateProductUnit: async (productId, unitData) => {
    const res = await fetchAPI(`/products/${productId}/units`, {
      method: 'PUT',
      body: JSON.stringify(unitData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal memperbarui satuan');
  },

  deleteProductUnit: async (productId, unitId) => {
    const res = await fetchAPI(`/products/${productId}/units?unit_id=${unitId}`, {
      method: 'DELETE',
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || 'Gagal menghapus satuan');
  },

  // ── FASE 1: QUICK STOCK-IN & MARGIN GUARD ─────────────────────────────────

  createStockIn: async (stockInData) => {
    const res = await fetchAPI('/stock-in', {
      method: 'POST',
      body: JSON.stringify(stockInData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal mencatat kulakan');
  },

  getStockInHistory: async (productId = null, limit = 20) => {
    const url = productId ? `/stock-in?product_id=${productId}&limit=${limit}` : `/stock-in?limit=${limit}`;
    const res = await fetchAPI(url);
    return res?.data?.data || [];
  },

  // ── FASE 1: ASSET LOANS (TABUNG GAS & GALON) ──────────────────────────────

  createAssetLoan: async (loanData) => {
    const res = await fetchAPI('/asset-loans', {
      method: 'POST',
      body: JSON.stringify(loanData),
    });
    if (res?.ok) return res.data.data;
    if (res?.status === 402) {
      const err = new Error(res.data?.error || 'Batas kuota tabung aktif tercapai');
      err.upgradeRequired = true;
      err.code = res.data?.code;
      throw err;
    }
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal mencatat mutasi aset');
  },

  getAssetLoans: async (customerId = null, limit = 50) => {
    const url = customerId ? `/asset-loans?customer_id=${customerId}&limit=${limit}` : `/asset-loans?limit=${limit}`;
    const res = await fetchAPI(url);
    return res?.data?.data || [];
  },

  getAssetLoanSummary: async () => {
    const res = await fetchAPI('/asset-loans?summary=true');
    return res?.data?.data || { asset_summary: {}, total_active_loans: 0, customers_with_loans: [] };
  },

  // ── FASE 2: BUKU KONSINYASI TITIP JUAL ─────────────────────────────────────

  getConsignmentVendors: async () => {
    const res = await fetchAPI('/consignments/vendors');
    return res?.data?.data || [];
  },

  createConsignmentVendor: async (vendorData) => {
    const res = await fetchAPI('/consignments/vendors', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
    if (res?.ok) return res.data.data;
    if (res?.status === 403) {
      const err = new Error(res.data?.error || 'Batas vendor konsinyasi tercapai');
      err.upgradeRequired = true;
      err.code = res.data?.code;
      throw err;
    }
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menambahkan vendor');
  },

  getConsignmentBatches: async ({ status, vendor_id } = {}) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (vendor_id) params.set('vendor_id', vendor_id);
    const query = params.toString() ? `?${params}` : '';
    const res = await fetchAPI(`/consignments/batches${query}`);
    return res?.data?.data || [];
  },

  createConsignmentBatch: async (batchData) => {
    const res = await fetchAPI('/consignments/batches', {
      method: 'POST',
      body: JSON.stringify(batchData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal mencatat penerimaan konsinyasi');
  },

  settleConsignmentBatch: async (batchId, settleData) => {
    const res = await fetchAPI(`/consignments/batches/${batchId}/settle`, {
      method: 'POST',
      body: JSON.stringify(settleData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menyelesaikan settlement konsinyasi');
  },

  // ── FASE 2: CELENGAN & SALDO TABUNGAN PELANGGAN ───────────────────────────

  getCustomerBalance: async (customerId) => {
    const res = await fetchAPI(`/customers/${customerId}/balance`);
    return res?.data?.data || { balance: 0, mutations: [] };
  },

  mutateCustomerBalance: async (customerId, balanceData) => {
    const res = await fetchAPI(`/customers/${customerId}/balance`, {
      method: 'POST',
      body: JSON.stringify(balanceData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal mengubah saldo celengan');
  },

  // ── FASE 3: PIN OWNER & SHIFT KASIR 60 DETIK ─────────────────────────────

  getShopPinStatus: async () => {
    const res = await fetchAPI('/shops/pin');
    return res?.data?.data || { is_pin_configured: false };
  },

  verifyShopPin: async (pin) => {
    const res = await fetchAPI('/shops/pin', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (res?.ok) return res.data.data;
    const err = new Error(res?.data?.message || res?.data?.error || 'PIN salah');
    err.status = res?.status;
    err.code = res?.data?.code;
    err.remainingAttempts = res?.data?.remainingAttempts;
    err.retryAfterMinutes = res?.data?.retryAfterMinutes;
    throw err;
  },

  updateShopPin: async ({ new_pin, current_pin }) => {
    const res = await fetchAPI('/shops/pin', {
      method: 'PUT',
      body: JSON.stringify({ new_pin, current_pin }),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal memperbarui PIN toko');
  },

  getCurrentShift: async () => {
    const res = await fetchAPI('/shifts/current');
    return res?.data?.data?.active_shift || null;
  },

  startShift: async (shiftData) => {
    const res = await fetchAPI('/shifts/start', {
      method: 'POST',
      body: JSON.stringify(shiftData),
    });
    if (res?.ok) return res.data.data;
    const err = new Error(res?.data?.message || res?.data?.error || 'Gagal membuka shift kasir');
    err.code = res?.data?.code;
    err.active_shift = res?.data?.active_shift;
    throw err;
  },

  closeShift: async (closeData) => {
    const res = await fetchAPI('/shifts/close', {
      method: 'POST',
      body: JSON.stringify(closeData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menutup shift kasir');
  },

  getCashDrawerMovements: async (shiftId = null) => {
    const query = shiftId ? `?shift_id=${shiftId}` : '';
    const res = await fetchAPI(`/shifts/movements${query}`);
    return res?.data?.data || [];
  },

  addCashDrawerMovement: async (movementData) => {
    const res = await fetchAPI('/shifts/movements', {
      method: 'POST',
      body: JSON.stringify(movementData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal mencatat mutasi laci');
  },

  // ─── FASE 4: SMART RE-ORDER & SUPPLIERS ────────────────────────────────────
  getSuppliers: async () => {
    const res = await fetchAPI('/suppliers');
    return res?.data?.data || [];
  },

  addSupplier: async (supplierData) => {
    const res = await fetchAPI('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplierData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menambahkan supplier');
  },

  updateSupplier: async (id, supplierData) => {
    const res = await fetchAPI(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(supplierData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal memperbarui supplier');
  },

  deleteSupplier: async (id) => {
    const res = await fetchAPI(`/suppliers/${id}`, {
      method: 'DELETE',
    });
    if (res?.ok) return res.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal menghapus supplier');
  },

  getReorderSuggestions: async () => {
    const res = await fetchAPI('/inventory/reorder-suggestions');
    if (res?.ok) return res.data.data;
    const err = new Error(res?.data?.message || res?.data?.error || 'Gagal memuat rekomendasi belanja');
    err.status = res?.status;
    err.code = res?.data?.code;
    throw err;
  },

  getPurchaseOrders: async (params = {}) => {
    const query = params.status ? `?status=${params.status}` : '';
    const res = await fetchAPI(`/purchase-orders${query}`);
    return res?.data?.data || [];
  },

  createPurchaseOrder: async (poData) => {
    const res = await fetchAPI('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(poData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal membuat Purchase Order');
  },

  updatePurchaseOrder: async (id, updateData) => {
    const res = await fetchAPI(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
    if (res?.ok) return res.data.data;
    throw new Error(res?.data?.message || res?.data?.error || 'Gagal memperbarui Purchase Order');
  },

  triggerMorningBriefing: async (data = {}) => {
    const res = await fetchAPI('/reports/morning-briefing', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res?.ok) return res.data;
    const err = new Error(res?.data?.error || res?.data?.message || 'Gagal menyusun briefing pagi');
    err.status = res?.status;
    err.code = res?.data?.code;
    throw err;
  },
};

// Re-export MockDB alias untuk backwards compatibility (migrasi bertahap)
export const MockDB = api;
