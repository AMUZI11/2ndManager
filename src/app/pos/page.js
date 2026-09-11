"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Barcode, Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2,
  Printer, Send, RefreshCw, LogOut, ArrowLeft, Store, UserCheck,
  AlertTriangle, ShieldCheck, AlertCircle, Sparkles, CreditCard, Wallet,
  Package, Lock, Wifi, WifiOff, PiggyBank, Coins, Monitor, X, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { api, calculateCascadingDiscount } from '@/utils/api';
import { canAccessFeature } from '@/lib/subscription';
import { getTierConfig } from '@/config/tiers';
import nextDynamic from 'next/dynamic';

const PaywallModal = nextDynamic(() => import('@/components/ui/PaywallModal'), { ssr: false });
const UpgradePromptModal = nextDynamic(() => import('@/components/pos/UpgradePromptModal'), { ssr: false });
const AssetLoanModal = nextDynamic(() => import('@/components/customers/AssetLoanModal'), { ssr: false });
const SmartChangeModal = nextDynamic(() => import('@/components/pos/SmartChangeModal'), { ssr: false });
const NegativeMarginOverrideModal = nextDynamic(() => import('@/components/pos/NegativeMarginOverrideModal'), { ssr: false });
const StartShiftModal = nextDynamic(() => import('@/components/pos/StartShiftModal'), { ssr: false });
const CloseShiftModal = nextDynamic(() => import('@/components/pos/CloseShiftModal'), { ssr: false });
const CashDrawerMovementModal = nextDynamic(() => import('@/components/pos/CashDrawerMovementModal'), { ssr: false });
const PrinterSettingsModal = nextDynamic(() => import('@/components/pos/PrinterSettingsModal'), { ssr: false });
const FreezeRegisterOverlay = nextDynamic(() => import('@/components/pos/FreezeRegisterOverlay'), { ssr: false });
const BranchSetupModal = nextDynamic(() => import('@/components/pos/BranchSetupModal'), { ssr: false });
import { printReceiptDirect, kickCashDrawerDirect } from '@/utils/escposPrinter';
import {
  emitStealthMetric,
  evaluateVacHeuristic,
  evaluateCipHeuristic,
  evaluateHemHeuristic,
} from '@/utils/stealthTelemetry';
import { getRegisterId, setRegisterId } from '@/utils/terminalConfig';
import { getAssignedBranchId, getAssignedRegisterName } from '@/utils/branchDeviceGuard';
import { getBranchProductCatalog } from '@/utils/inventoryResolver';
import { attachBarcodeScannerListener } from '@/utils/barcodeScannerListener';
import {
  saveCatalogCache,
  getCatalogCache,
  queueOfflineTransaction,
  mutateLocalCustomerDebtLimit,
  getQueueStats,
} from '@/utils/posOfflineDb';
import { initPosSyncListeners, syncOfflineData } from '@/utils/posSyncEngine';
import { checkAutoUnpackEligibility, applyOptimisticAutoUnpack } from '@/utils/posEngine';

// Web Audio API beep sound for barcode scanner feedback
function playScannerBeep() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, audioCtx.currentTime); // 1.2kHz crisp beep
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.1);
  } catch {
    // Fail silently if audio context disabled
  }
}

// Helper for RFC4122 compliant UUID generation
function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Pure Currency Formatter (Module Scope: Anti-Hoisting)
const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

export default function PosPage() {
  const router = useRouter();
  const supabase = createClient();

  // ── States ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [userPlan, setUserPlan] = useState('MAGANG');
  const [shopName, setShopName] = useState('Toko Saya');

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

  // Device Branch Binding (Tahap 7: Multi-Branch Terminal Guard)
  const [assignedBranchId, setAssignedBranchId] = useState(null);
  const [assignedBranchInfo, setAssignedBranchInfo] = useState(null);
  const [assignedRegisterName, setAssignedRegisterName] = useState('POS-01');
  const [isBranchSetupOpen, setIsBranchSetupOpen] = useState(false);
  const [isBranchRebinding, setIsBranchRebinding] = useState(false);

  // Cart & Idempotency Key
  const cartIdRef = useRef(generateUUID());
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedCart = localStorage.getItem('hl_pos_offline_cart');
        if (savedCart) {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch (e) {
        console.error('[POS Offline Cart Load Error]', e);
      }
    }
    return [];
  });

  // Void log queue & 500ms debouncing (grouped within 1 minute)
  const voidQueueRef = useRef({});
  const voidDebounceTimerRef = useRef(null);

  const queueVoidLog = (productName, quantity) => {
    if (!productName || quantity <= 0) return;
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const existing = voidQueueRef.current[productName];

    if (existing && (now - existing.firstTimestamp < 60000)) {
      existing.quantity += quantity;
    } else {
      voidQueueRef.current[productName] = {
        quantity,
        firstTimestamp: now,
      };
    }

    if (voidDebounceTimerRef.current) {
      clearTimeout(voidDebounceTimerRef.current);
    }

    voidDebounceTimerRef.current = setTimeout(() => {
      const queue = voidQueueRef.current;
      voidQueueRef.current = {};
      voidDebounceTimerRef.current = null;

      Object.entries(queue).forEach(([pName, data]) => {
        api.logVoid(pName, data.quantity);
      });
    }, 500);
  };

  useEffect(() => {
    return () => {
      if (voidDebounceTimerRef.current) {
        clearTimeout(voidDebounceTimerRef.current);
      }
    };
  }, []);

  // WhatsApp popup block detector state
  const [isWaPopupBlocked, setIsWaPopupBlocked] = useState(false);

  const handleOpenWhatsApp = (phone, text) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(text);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedText}`;

    try {
      const popup = window.open(waUrl, '_blank');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        setIsWaPopupBlocked(true);
      } else {
        setIsWaPopupBlocked(false);
      }
    } catch {
      setIsWaPopupBlocked(true);
    }
  };
  const [selectedCustomer, setSelectedCustomer] = useState(null); // null = Non-Pelanggan / Umum
  const [paymentStatus, setPaymentStatus] = useState('Lunas'); // 'Lunas' | 'Piutang'
  const [ongkir, setOngkir] = useState(0);
  const [deskripsi, setDeskripsi] = useState('');
  const [nomorBon, setNomorBon] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Toast notification helper (Declared early for use in initPos)
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Struk Modal
  const [completedTx, setCompletedTx] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Upgrade Limit Modal (#51 Atomic Lock)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  // Phase 3: Shift Kasir & Cash Drawer States
  const [activeShift, setActiveShift] = useState(null);
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isCloseShiftOpen, setIsCloseShiftOpen] = useState(false);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [cashiersList, setCashiersList] = useState([]);

  // Multi-terminal Register Identifier
  const [registerId, setRegisterIdState] = useState('REGISTER_MAIN');
  const [isEditRegisterOpen, setIsEditRegisterOpen] = useState(false);
  const [newRegisterInput, setNewRegisterInput] = useState('');

  // Hardware ESC/POS Printer Modal
  const [isPrinterSettingsOpen, setIsPrinterSettingsOpen] = useState(false);

  // Stealth Telemetry Tracker Refs
  const purgedItemsRef = useRef([]); // tracks { name, line_total, timestamp }
  const barcodeScanHistoryRef = useRef({}); // { [barcode]: count }
  const discountApplicationLogRef = useRef([]); // [{ customer_id, timestamp }]
  const hasEnteredPaymentPhaseRef = useRef(false); // Refinement 3: Tracks if cart entered payment phase for CIP

  // Tactile Keyboard Selection State (Arrow Up / Down Navigation)
  const [selectedCartIndex, setSelectedCartIndex] = useState(-1);

  // Phase 3: Radar Jual Rugi & PIN Override States
  const [isNegativeMarginModalOpen, setIsNegativeMarginModalOpen] = useState(false);
  const [lossItemsForModal, setLossItemsForModal] = useState([]);
  const [ownerPinOverride, setOwnerPinOverride] = useState(null);

  // Paywall Modal
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [paywallConfig, setPaywallConfig] = useState({});

  // Asset Loan Modal (Fase 1: Tabung Rolling Gas & Galon)
  const [isAssetLoanModalOpen, setIsAssetLoanModalOpen] = useState(false);
  const [assetLoanModalMode, setAssetLoanModalMode] = useState('RETURN');

  // Celengan & Smart Change (Fase 2)
  const [isSmartChangeOpen, setIsSmartChangeOpen] = useState(false);
  const [cashTendered, setCashTendered] = useState('');
  const [customerBalance, setCustomerBalance] = useState(0);
  const [customerPiutang, setCustomerPiutang] = useState(0);
  const [useCustomerBalance, setUseCustomerBalance] = useState(0);
  const [customerDebts, setCustomerDebts] = useState([]);

  // Tahap 5: Citadel Freeze & Heuristic Refs
  const [isRegisterFrozen, setIsRegisterFrozen] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const paymentPhaseStartTimeRef = useRef(0);
  const drawerKickLogRef = useRef([]);

  // Auto-scanner barcode ref
  const barcodeInputRef = useRef(null);

  // ── Network Status & Background Sync Engine Listener ───────────────────────
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Inisialisasi background sync engine
      const cleanupSync = initPosSyncListeners();

      const handleSyncStatus = (e) => {
        const { status, pending } = e.detail || {};
        if (status === 'SYNCING') {
          setIsSyncing(true);
        } else {
          setIsSyncing(false);
          if (typeof pending === 'number') {
            setPendingSyncCount(pending);
          }
        }
      };
      window.addEventListener('hl-pos-sync-status', handleSyncStatus);

      // Ambil status antrean lokal terkini
      getQueueStats().then((s) => setPendingSyncCount(s.pending)).catch(() => {});

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('hl-pos-sync-status', handleSyncStatus);
        cleanupSync();
      };
    }
  }, []);

  // ── Offline Resilience (localStorage hl_pos_offline_cart) ──────────────────
  // Save cart to localStorage when cartItems changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (cartItems.length > 0) {
          localStorage.setItem('hl_pos_offline_cart', JSON.stringify(cartItems));
        } else {
          localStorage.removeItem('hl_pos_offline_cart');
        }
      } catch (e) {
        console.error('[POS Offline Cart Save Error]', e);
      }
    }
  }, [cartItems]);

  // ── Init Data ───────────────────────────────────────────────────────────────
  useEffect(() => {
    async function initPos() {
      setLoading(true);
      const { data: { user: currentUser }, error } = await supabase.auth.getUser();

      const isActiveSession = typeof window !== 'undefined' && sessionStorage.getItem('hl_active_session') === 'true';
      if (error || !currentUser || !isActiveSession) {
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Fetch profile & shop info
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      setProfile(userProfile);

      // Ambil shop_id, shop_name & active subscription plan
      let shopId = userProfile?.shop_id;
      let activePlan = userProfile?.subscription_plan || 'MAGANG';

      if (userProfile?.role === 'BOSS') {
        const { data: userShop } = await supabase
          .from('user_shops')
          .select('shop_id, shops(name, subscription_tier)')
          .eq('user_id', currentUser.id)
          .single();
        shopId = userShop?.shop_id;
        if (userShop?.shops?.name) setShopName(userShop.shops.name);
        if (userShop?.shops?.subscription_tier && userShop.shops.subscription_tier !== 'TRIAL') {
          activePlan = userShop.shops.subscription_tier;
        }
      } else if (shopId) {
        const { data: shop } = await supabase
          .from('shops')
          .select('name, subscription_tier')
          .eq('id', shopId)
          .single();
        if (shop?.name) setShopName(shop.name);
        if (shop?.subscription_tier && shop.subscription_tier !== 'TRIAL') {
          activePlan = shop.subscription_tier;
        }
      }

      setUserPlan(activePlan);

      // Initialize Register & Device Branch Binding from localStorage (Tahap 7)
      const currentRegId = getRegisterId();
      setRegisterIdState(currentRegId);

      const currentBranchId = getAssignedBranchId();
      const currentRegName = getAssignedRegisterName();
      setAssignedBranchId(currentBranchId);
      setAssignedRegisterName(currentRegName);

      if (!currentBranchId) {
        setIsBranchSetupOpen(true);
      }

      // Fetch products, customers, categories, active shift, cashiers (Online & Cache Fallback)
      try {
        let prodList = [];
        let custList = [];
        let catList = [];
        let shiftData = null;
        let cashiers = [];

        if (navigator.onLine) {
          let branchProds = [];
          if (currentBranchId) {
            branchProds = await getBranchProductCatalog(supabase, currentBranchId).catch(() => []);
            const { data: bData } = await supabase
              .from('branches')
              .select('id, branch_name, branch_code, is_main_branch')
              .eq('id', currentBranchId)
              .maybeSingle();
            if (bData) setAssignedBranchInfo(bData);
          }

          [prodList, custList, catList, shiftData, cashiers] = await Promise.all([
            branchProds && branchProds.length > 0 ? Promise.resolve(branchProds) : api.getProducts().catch(() => []),
            api.getCustomers().catch(() => []),
            api.getCategories().catch(() => []),
            api.getCurrentShift(currentRegId).catch(() => null),
            api.getCashiers().catch(() => []),
          ]);
        }

        if (prodList && prodList.length > 0) {
          setProducts(prodList);
          setCustomers(custList || []);
          setCategories(catList || []);
          setActiveShift(shiftData || null);
          setCashiersList(cashiers || []);

          // Simpan snapshot katalog ke IndexedDB
          saveCatalogCache({
            products: prodList,
            customers: custList || [],
            categories: catList || [],
            shopId,
          }).catch(() => {});
        } else {
          // Fallback memuat dari IndexedDB lokal
          const cached = await getCatalogCache();
          if (cached && (cached.products?.length || cached.customers?.length)) {
            setProducts(cached.products || []);
            setCustomers(cached.customers || []);
            setCategories(cached.categories || []);
            showToast('[Offline] Memuat data katalog lokal.');
          }
        }
        if (navigator.onLine && shopId) {
          try {
            const { data: regInfo } = await supabase
              .from('registers')
              .select('is_frozen, frozen_reason')
              .eq('shop_id', shopId)
              .eq('register_code', currentRegId)
              .maybeSingle();

            if (regInfo?.is_frozen) {
              setIsRegisterFrozen(true);
              setFreezeReason(regInfo.frozen_reason || 'Kunci keamanan diaktifkan oleh pemilik warung');
              setCartItems([]);
            }
          } catch (e) {
            console.warn('[Register freeze check error]', e);
          }
        }
      } catch (err) {
        console.warn('[POS Init Error - Fallback ke Cache Lokal]', err);
        const cached = await getCatalogCache();
        if (cached && (cached.products?.length || cached.customers?.length)) {
          setProducts(cached.products || []);
          setCustomers(cached.customers || []);
          setCategories(cached.categories || []);
          showToast('[Offline] Memuat data katalog lokal.');
        }
      } finally {
        setLoading(false);
        generateAutoBonNumber();
      }
    }

    initPos();
  }, [router, supabase]);

  // ── Realtime Lockdown & Security Listener (Tahap 5) ─────────────────────────
  useEffect(() => {
    const activeShopId = profile?.shop_id;
    if (!activeShopId) return;

    const channel = supabase
      .channel(`security_radar:${activeShopId}`)
      .on('broadcast', { event: 'FREEZE_REGISTER' }, (payload) => {
        const item = payload?.payload || payload;
        const targetReg = (item?.register_code || 'REGISTER_MAIN').toUpperCase();
        const myReg = (registerId || 'REGISTER_MAIN').toUpperCase();

        if (targetReg === myReg || targetReg === 'ALL') {
          setIsRegisterFrozen(true);
          setFreezeReason(item?.reason || 'Kunci keamanan darurat oleh pemilik warung');
          setCartItems([]);
          setSelectedCartIndex(-1);
          setCashTendered('');
        }
      })
      .on('broadcast', { event: 'UNFREEZE_REGISTER' }, (payload) => {
        const item = payload?.payload || payload;
        const targetReg = (item?.register_code || 'REGISTER_MAIN').toUpperCase();
        const myReg = (registerId || 'REGISTER_MAIN').toUpperCase();

        if (targetReg === myReg || targetReg === 'ALL') {
          setIsRegisterFrozen(false);
          setFreezeReason('');
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.shop_id, registerId, supabase]);

  useEffect(() => {
    const handlePlanUpdate = (e) => {
      if (e.detail?.plan) setUserPlan(e.detail.plan);
    };
    window.addEventListener('hl-plan-changed', handlePlanUpdate);
    return () => window.removeEventListener('hl-plan-changed', handlePlanUpdate);
  }, []);

  // Auto focus ke barcode input saat halaman selesai loading
  useEffect(() => {
    if (!loading && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [loading]);

  // Generate nomor bon otomatis (format: BON-YYYYMMDD-HHMMSS)
  const generateAutoBonNumber = () => {
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '');
    setNomorBon(`BON-${dateStr}-${timeStr}`);
  };

  // ── Load Saldo Celengan & Piutang Pelanggan ──────────────────────────────────
  useEffect(() => {
    async function loadCustomerFinancials() {
      if (!selectedCustomer?.id) {
        setCustomerBalance(0);
        setCustomerPiutang(0);
        setUseCustomerBalance(0);
        setCustomerDebts([]);
        return;
      }
      try {
        const res = await api.getCustomerBalance(selectedCustomer.id);
        if (res) {
          setCustomerBalance(Number(res.balance || 0));
          setCustomerPiutang(Number(res.debt || 0));
        }

        // Ambil riwayat kasbon aktif untuk kalkulasi Smart Change FIFO
        const { data: debts } = await supabase
          .from('transactions')
          .select('id, nomor_bon, tanggal, created_at, amount_owed, total_akhir')
          .eq('customer_id', selectedCustomer.id)
          .eq('status', 'Piutang')
          .gt('amount_owed', 0)
          .order('tanggal', { ascending: true })
          .order('created_at', { ascending: true });

        setCustomerDebts(debts || []);
      } catch (err) {
        console.error('[POS Load Customer Balance Error]', err);
      }
    }
    loadCustomerFinancials();
  }, [selectedCustomer?.id, supabase]);

  // ── Auto-Scanner & Barcode Handler ──────────────────────────────────────────
  const handleBarcodeOrSearchSubmit = (e) => {
    e?.preventDefault();
    if (isRegisterFrozen) return;
    const query = searchQuery.trim();
    if (!query) return;

    // 1. CARI RUJUKAN UTAMA: product_units.barcode (Chokepoint 2)
    let matchedUnit = null;
    let unitProduct = null;

    for (const p of products) {
      if (p.product_units && p.product_units.length > 0) {
        const u = p.product_units.find(
          (u) => u.barcode && u.barcode.toLowerCase() === query.toLowerCase()
        );
        if (u) {
          matchedUnit = u;
          unitProduct = p;
          break;
        }
      }
    }

    if (matchedUnit && unitProduct) {
      addToCart(unitProduct, matchedUnit);
      playScannerBeep();
      setSearchQuery('');
      showToast(`Scanned (${matchedUnit.unit_name}): ${unitProduct.nama}`);
      return;
    }

    // 2. Fallback: Cari di products.barcode
    const barcodeMatch = products.find(
      (p) => p.barcode && p.barcode.toLowerCase() === query.toLowerCase()
    );

    if (barcodeMatch) {
      addToCart(barcodeMatch);
      playScannerBeep();
      setSearchQuery('');
      showToast(`Scanned: ${barcodeMatch.nama}`);
      return;
    }

    // 3. Jika bukan barcode exact match, filter list produk
    const nameMatches = products.filter((p) =>
      p.nama.toLowerCase().includes(query.toLowerCase())
    );

    if (nameMatches.length === 1) {
      addToCart(nameMatches[0]);
      playScannerBeep();
      setSearchQuery('');
      showToast(`Ditambahkan: ${nameMatches[0].nama}`);
    } else if (nameMatches.length === 0) {
      showToast('[Peringatan] Produk / Barcode tidak ditemukan.');
    }
  };

  // ── Logika Diskon & Keranjang ────────────────────────────────────────────────
  // Map diskon pelanggan jika ada pelanggan terdaftar yang dipilih
  const customerDiscountsMap = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.customer_discounts) return {};
    const map = {};
    selectedCustomer.customer_discounts.forEach((d) => {
      if (!map[d.product_type]) map[d.product_type] = [];
      map[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
    });
    for (const code of Object.keys(map)) {
      map[code] = map[code].sort((a, b) => a.step_order - b.step_order).map((s) => s.pct);
    }
    return map;
  }, [selectedCustomer]);

  // Tambah produk ke keranjang (dengan dukungan Multi-Tier Unit)
  const addToCart = (product, specificUnit = null) => {
    // STATE-MACHINE LOCKDOWN GUARD (TAHAP 5 PATCH #1)
    if (isRegisterFrozen) return;

    if (product.stock <= 0) {
      showToast(`[Perhatian] Stok "${product.nama}" 0 (Transaksi Tetap Berjalan)`);
    }

    let unit = specificUnit;
    if (!unit && product.product_units && product.product_units.length > 0) {
      unit = product.product_units.find((u) => u.is_base_unit) || product.product_units[0];
    }

    const unitId = unit?.id || null;
    const unitName = unit?.unit_name || 'Pcs';
    const multiplier = unit?.multiplier_to_base || 1;
    const unitPrice = unit ? Number(unit.price) : Number(product.harga_base);
    const unitCost = Number(product.harga_modal) * multiplier;
    const cartKey = unitId ? `${product.id}_${unitId}` : product.id;

    // Telemetry: Track barcode scan counts for RPC
    const bc = unit?.barcode || product.barcode || product.id;
    if (bc) {
      if (!barcodeScanHistoryRef.current[bc]) {
        // eslint-disable-next-line react-hooks/purity
        barcodeScanHistoryRef.current[bc] = { count: 0, firstScanTime: Date.now() };
      }
      barcodeScanHistoryRef.current[bc].count += 1;
    }

    setCartItems((prevItems) => {
      const existingIndex = prevItems.findIndex(
        (item) => (item.cartKey || item.product_id) === cartKey
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        updated[existingIndex].quantity += 1;
        return updated;
      }

      // Hitung unit price setelah diskon bertingkat (jika ada)
      const discountSteps = customerDiscountsMap[product.tipe] || [];
      const discountedUnitPrice = calculateCascadingDiscount(unitPrice, discountSteps);

      return [
        ...prevItems,
        {
          cartKey,
          product_id: product.id,
          unit_id: unitId,
          unit_name: unitName,
          multiplier_to_base: multiplier,
          nama: unit && !unit.is_base_unit ? `${product.nama} (${unitName})` : product.nama,
          product_name_base: product.nama,
          tipe: product.tipe,
          barcode: unit?.barcode || product.barcode,
          harga_base: unitPrice,
          harga_modal: unitCost,
          discounted_unit_price: discountedUnitPrice,
          discount_steps: discountSteps,
          quantity: 1,
          is_bonus_item: false,
          stock: product.stock,
        },
      ];
    });
  };

  // Update kuantitas item keranjang (Multi-Tier Unit & cartKey aware)
  const updateCartQty = (key, delta) => {
    const targetItem = cartItems.find(
      (i) => (i.cartKey || i.product_id) === key || i.product_id === key
    );

    if (delta < 0 && targetItem) {
      queueVoidLog(targetItem.nama, Math.abs(delta));

      // Telemetry: RPC (Repeated Scan Purge)
      const bc = targetItem.barcode || targetItem.product_id;
      const scanInfo = barcodeScanHistoryRef.current[bc];
      if (scanInfo && scanInfo.count >= 4) {
        emitStealthMetric('RPC', {
          barcode: bc,
          product_name: targetItem.nama,
          scanned_count: scanInfo.count,
          purged_qty: Math.abs(delta),
          cart_total: totals.totalOmzet,
          reason: 'Product scanned 4+ times then decremented'
        });
        delete barcodeScanHistoryRef.current[bc];
      }

      // Telemetry: CIP (Cart Item Purge) tracker
      const unitPrice = targetItem.discounted_unit_price || targetItem.harga_base || 0;
      // eslint-disable-next-line react-hooks/purity
      const currentNow = Date.now();
      purgedItemsRef.current.push({
        nama: targetItem.nama,
        qty: Math.abs(delta),
        line_total: unitPrice * Math.abs(delta),
        timestamp: currentNow,
      });
      const recentPurges = purgedItemsRef.current.filter(p => currentNow - p.timestamp < 180000);
      purgedItemsRef.current = recentPurges;
      const totalPurgedVal = recentPurges.reduce((s, p) => s + p.line_total, 0);
      if (recentPurges.length >= 3 && totalPurgedVal > 30000) {
        emitStealthMetric('CIP', {
          purged_count: recentPurges.length,
          total_purged_value: totalPurgedVal,
          purged_items: recentPurges,
          current_cart_total: totals.totalOmzet
        });
        purgedItemsRef.current = [];
      }
    }

    setCartItems((prevItems) => {
      // Prioritize exact match on cartKey, fallback to product_id
      let targetIdx = prevItems.findIndex((i) => (i.cartKey || i.product_id) === key);
      if (targetIdx === -1) {
        targetIdx = prevItems.findIndex((i) => i.product_id === key);
      }
      if (targetIdx === -1) return prevItems;

      const item = prevItems[targetIdx];
      const newQty = item.quantity + delta;

      if (newQty <= 0) {
        return prevItems.filter((_, idx) => idx !== targetIdx);
      }

      const updated = [...prevItems];
      updated[targetIdx] = { ...item, quantity: newQty };
      return updated;
    });
  };

  // Hapus item dari keranjang
  const removeFromCart = (item) => {
    queueVoidLog(item.nama, item.quantity);

    // Telemetry: RPC (Repeated Scan Purge)
    const bc = item.barcode || item.product_id;
    const scanInfo = barcodeScanHistoryRef.current[bc];
    if (scanInfo && scanInfo.count >= 4) {
      emitStealthMetric('RPC', {
        barcode: bc,
        product_name: item.nama,
        scanned_count: scanInfo.count,
        purged_qty: item.quantity,
        cart_total: totals.totalOmzet,
        reason: 'Product scanned 4+ times then removed completely'
      });
      delete barcodeScanHistoryRef.current[bc];
    }

    // Telemetry: CIP (Cart Item Purge) tracker
    const unitPrice = item.discounted_unit_price || item.harga_base || 0;
    // eslint-disable-next-line react-hooks/purity
    const currentNow = Date.now();
    purgedItemsRef.current.push({
      nama: item.nama,
      qty: item.quantity,
      line_total: unitPrice * item.quantity,
      timestamp: currentNow,
    });
    const recentPurges = purgedItemsRef.current.filter(p => currentNow - p.timestamp < 180000);
    purgedItemsRef.current = recentPurges;
    const totalPurgedVal = recentPurges.reduce((s, p) => s + p.line_total, 0);
    // Refinement 3: Picu telemetri siluman 'CIP' HANYA jika akumulasi >= 3 DAN total nilai > Rp 30.000 DAN sudah pernah masuk fase bayar
    if (recentPurges.length >= 3 && totalPurgedVal > 30000 && hasEnteredPaymentPhaseRef.current) {
      emitStealthMetric('CIP', {
        purged_count: recentPurges.length,
        total_purged_value: totalPurgedVal,
        purged_items: recentPurges,
        current_cart_total: totals.totalOmzet,
        had_entered_payment_phase: true,
      });
      purgedItemsRef.current = [];
    }

    setCartItems((prevItems) =>
      prevItems.filter((i) => (i.cartKey || i.product_id) !== (item.cartKey || item.product_id))
    );
    showToast(`Dibatalkan: ${item.nama}`);
  };

  // Kosongkan keranjang kasir (dengan audit VAC jika nilai keranjang > 50rb)
  const handleClearCart = () => {
    if (cartItems.length === 0) return;
    const currentTotal = totals.totalOmzet;
    const itemCount = cartItems.length;
    const snapshot = [...cartItems];

    evaluateVacHeuristic({
      cartTotal: currentTotal,
      enteredPaymentTime: paymentPhaseStartTimeRef.current,
      itemsSnapshot: snapshot.map((i) => ({ nama: i.nama, qty: i.quantity, harga: i.discounted_unit_price })),
      hadCashTendered: Boolean(cashTendered),
    });

    purgedItemsRef.current = [];
    hasEnteredPaymentPhaseRef.current = false;
    paymentPhaseStartTimeRef.current = 0;
    setSelectedCartIndex(-1);
    setCartItems([]);
    showToast('Keranjang dikosongkan.');
  };

  // Hitung ulang diskon jika pelanggan berubah
  useEffect(() => {
    if (cartItems.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const discountSteps = customerDiscountsMap[item.tipe] || [];
        const discountedUnitPrice = item.is_bonus_item
          ? 0
          : calculateCascadingDiscount(item.harga_base, discountSteps);
        return { ...item, discount_steps: discountSteps, discounted_unit_price: discountedUnitPrice };
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerDiscountsMap]);

  // ── Calculation Totals ──────────────────────────────────────────────────────
  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const totals = useMemo(() => {
    let subtotalOmzet = 0;
    let subtotalLaba = 0;

    cartItems.forEach((item) => {
      const price = item.is_bonus_item ? 0 : item.discounted_unit_price;
      const lineOmzet = price * item.quantity;
      const lineLaba = (price - item.harga_modal) * item.quantity;

      subtotalOmzet += lineOmzet;
      subtotalLaba += lineLaba;
    });

    const totalOmzet = subtotalOmzet + Number(ongkir || 0);
    const totalLaba = subtotalLaba;

    return { subtotalOmzet, subtotalLaba, totalOmzet, totalLaba };
  }, [cartItems, ongkir]);

  // ── Checkout / Submit Bon ────────────────────────────────────────────────────
  const executeTransaction = async (options = {}) => {
    setSubmitting(true);
    setErrorMessage('');

    const targetCustId = options.assignedCustomerId || (selectedCustomer ? selectedCustomer.id : null);
    const netPayable = Math.max(0, totals.totalOmzet - useCustomerBalance);
    const cashNum = cashTendered !== '' ? Number(cashTendered) : netPayable;

    // Deteksi kebutuhan Auto-Unpack Kemasan Induk Bertingkat (Fase 6)
    const autoUnpackActions = [];
    cartItems.forEach((item) => {
      const prod = products.find((p) => p.id === item.product_id);
      if (prod) {
        const evalRes = checkAutoUnpackEligibility(item, prod);
        if (evalRes.needed && evalRes.parentUnit) {
          autoUnpackActions.push({
            product_id: item.product_id,
            required_pcs: item.quantity,
          });
        }
      }
    });

    const payload = {
      nomor_bon: nomorBon.trim(),
      idempotency_key: cartIdRef.current, // Koreksi Kritis #3 (server-side unique validation)
      tanggal: new Date().toISOString().split('T')[0],
      customer_id: targetCustId,
      ongkir: Number(ongkir || 0),
      deskripsi: deskripsi.trim() || null,
      is_bonus: false,
      status: paymentStatus,
      branch_id: assignedBranchId,
      use_customer_balance: useCustomerBalance > 0 ? useCustomerBalance : 0,
      change_allocation: options.changeAllocation || null,
      owner_pin: options.ownerPin || ownerPinOverride || null,
      auto_unpack_actions: autoUnpackActions,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || 'Pcs',
        multiplier_to_base: item.multiplier_to_base || 1,
        quantity: item.quantity,
        is_bonus_item: item.is_bonus_item,
      })),
    };

    const activeCust = targetCustId ? (customers.find(c => c.id === targetCustId) || selectedCustomer) : null;

    // Helper untuk memproses transaksi offline ke IndexedDB
    const processOfflineCheckout = async () => {
      const txId = cartIdRef.current || generateUUID();
      const historicCreatedAt = new Date().toISOString();

      try {
        await queueOfflineTransaction({
          id: txId,
          nomor_bon: nomorBon.trim(),
          tanggal: historicCreatedAt.split('T')[0],
          shift_id: activeShift?.id || null,
          register_id: registerId,
          payload: {
            ...payload,
            auto_unpack_actions: autoUnpackActions,
            idempotency_key: txId,
            shift_id: activeShift?.id || null,
            register_id: registerId,
            created_at: historicCreatedAt,
          },
          created_at: historicCreatedAt,
        });

        // Patch Teknis #2: Mutasi sisa limit kasbon lokal di IndexedDB jika Piutang
        if (paymentStatus === 'Piutang' && targetCustId) {
          await mutateLocalCustomerDebtLimit(targetCustId, totals.totalOmzet);
          setCustomerPiutang((prev) => prev + totals.totalOmzet);
        }

        // Potong stok produk di memori kasir secara optimistik (Patch Teknis #3 Offline Unpack)
        setProducts((prev) => {
          let updated = prev;
          for (const action of autoUnpackActions) {
            const res = applyOptimisticAutoUnpack(updated, action.product_id, action.required_pcs);
            updated = res.updatedProducts;
          }
          return updated.map((p) => {
            const matchCart = cartItems.find((c) => c.product_id === p.id);
            if (matchCart) {
              const qtyToDeduct = matchCart.quantity * (matchCart.multiplier_to_base || 1);
              return { 
                ...p, 
                stock: Math.max(0, (p.stock ?? p.stok_saat_ini ?? 0) - qtyToDeduct),
                stok_saat_ini: Math.max(0, (p.stok_saat_ini ?? p.stock ?? 0) - qtyToDeduct),
              };
            }
            return p;
          });
        });

        setCompletedTx({
          id: txId,
          nomor_bon: nomorBon.trim(),
          is_offline: true,
          cart_snapshot: cartItems,
          customer_name: activeCust ? activeCust.nama : 'Umum (Non-Pelanggan)',
          customer_phone: activeCust ? activeCust.phone : null,
          total_final: totals.totalOmzet,
          net_payable: netPayable,
          use_customer_balance: useCustomerBalance,
          cash_tendered: cashNum,
          change_returned: Math.max(0, cashNum - netPayable),
          change_allocation: options.changeAllocation,
          payment_status: paymentStatus,
          cashier_name: profile?.username || user?.email?.split('@')[0],
          shop_name: shopName,
          tanggal: historicCreatedAt.split('T')[0],
        });

        setPendingSyncCount((prev) => prev + 1);
        if (paymentStatus === 'Lunas') {
          kickCashDrawerDirect().catch(() => {});
        }
        setIsReceiptModalOpen(true);
        showToast('[Offline] Transaksi disimpan lokal. Otomatis sinkron saat online.');
      } catch (offErr) {
        console.error('[Offline Checkout Error]', offErr);
        setErrorMessage('Gagal menyimpan transaksi offline ke penyimpanan lokal.');
      } finally {
        setSubmitting(false);
      }
    };

    // Jika sedang offline, langsung gunakan alur offline
    if (!navigator.onLine || !isOnline) {
      await processOfflineCheckout();
      return;
    }

    // Jika online, coba kirim ke API dengan timeout 3.5 detik (fall back jika lambat / putus di tengah jalan)
    try {
      const apiPromise = api.addTransaction(payload);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('NETWORK_TIMEOUT')), 3500)
      );

      const res = await Promise.race([apiPromise, timeoutPromise]);
      setSubmitting(false);

      if (res.success) {
        setOwnerPinOverride(null);
        setCompletedTx({
          ...res.data,
          cart_snapshot: cartItems,
          customer_name: activeCust ? activeCust.nama : 'Umum (Non-Pelanggan)',
          customer_phone: activeCust ? activeCust.phone : null,
          total_final: totals.totalOmzet,
          net_payable: netPayable,
          use_customer_balance: useCustomerBalance,
          cash_tendered: cashNum,
          change_returned: Math.max(0, cashNum - netPayable),
          change_allocation: options.changeAllocation,
          change_allocation_result: res.data?.change_allocation_result || null,
          payment_status: paymentStatus,
          cashier_name: profile?.username || user?.email?.split('@')[0],
          shop_name: shopName,
        });

        // Update saldo / piutang state locally if mutated
        if (res.data?.change_allocation_result?.current_balance !== undefined) {
          setCustomerBalance(Number(res.data.change_allocation_result.current_balance));
        } else if (useCustomerBalance > 0) {
          setCustomerBalance(prev => Math.max(0, prev - useCustomerBalance));
        }

        if (res.data?.change_allocation_result?.leftover_debt !== undefined) {
          setCustomerPiutang(Number(res.data.change_allocation_result.leftover_debt));
        }

        if (paymentStatus === 'Lunas') {
          kickCashDrawerDirect().catch(() => {});
        }

        setIsReceiptModalOpen(true);
      } else {
        if (res.status === 402 || res.code === 'RECEIPT_LIMIT_REACHED' || res.upgrade_required) {
          setUpgradeModalData({
            limit: res.limit || 50,
            current: res.current || 50,
            message: res.message,
          });
          setIsUpgradeModalOpen(true);
        } else if (res.code === 'NEGATIVE_MARGIN_BLOCKED' || (res.status === 403 && res.loss_items)) {
          const lossList = res.loss_items || cartItems.filter(i => !i.is_bonus_item && Number(i.discounted_unit_price) < Number(i.harga_modal));
          setLossItemsForModal(lossList);
          setIsNegativeMarginModalOpen(true);
        } else {
          setErrorMessage(res.message || 'Gagal menyimpan transaksi. Coba lagi.');
        }
      }
    } catch (netErr) {
      console.warn('[Koneksi terputus saat checkout - Beralih ke Offline Mode]', netErr);
      await processOfflineCheckout();
    }
  };

  const handleCheckout = async (checkoutOpts = {}) => {
    hasEnteredPaymentPhaseRef.current = true;
    if (!paymentPhaseStartTimeRef.current) {
      // eslint-disable-next-line react-hooks/purity
      paymentPhaseStartTimeRef.current = Date.now();
    }
    setErrorMessage('');
    if (cartItems.length === 0) {
      setErrorMessage('Keranjang masih kosong.');
      return;
    }
    if (!nomorBon.trim()) {
      setErrorMessage('Nomor bon wajib diisi.');
      return;
    }
    if (paymentStatus === 'Piutang' && !selectedCustomer) {
      setErrorMessage('Pilih Pelanggan Terdaftar terlebih dahulu untuk transaksi Piutang (Kasbon).');
      return;
    }

    const netPayable = Math.max(0, totals.totalOmzet - useCustomerBalance);
    const cashNum = Number(cashTendered || 0);

    // Validasi uang kurang jika kasir menginput tunai
    if (paymentStatus === 'Lunas' && cashTendered !== '' && cashNum < netPayable) {
      setErrorMessage(`Uang tunai yang diterima (${formatRupiah(cashNum)}) kurang dari sisa tagihan (${formatRupiah(netPayable)}).`);
      return;
    }

    // ── RADAR JUAL RUGI (NEGATIVE MARGIN GUARD) ──
    const lossItems = cartItems.filter(
      (item) => !item.is_bonus_item && Number(item.discounted_unit_price) < Number(item.harga_modal)
    );

    if (lossItems.length > 0 && !ownerPinOverride && !checkoutOpts.confirmedLoss) {
      const tierCfg = getTierConfig(userPlan);
      const marginGuardMode = tierCfg.features?.negative_margin_guard;

      if (marginGuardMode === 'HARD_BLOCK' && profile?.role === 'CASHIER') {
        setLossItemsForModal(lossItems);
        setIsNegativeMarginModalOpen(true);
        return;
      } else if (marginGuardMode === 'CONFIRM_ONLY') {
        setLossItemsForModal(lossItems);
        setIsNegativeMarginModalOpen(true);
        return;
      }
    }

    // Jika ada kembalian dan bayar tunai (Lunas), buka Smart Change Modal
    if (paymentStatus === 'Lunas' && cashTendered !== '' && cashNum > netPayable) {
      setIsSmartChangeOpen(true);
      return;
    }

    // Jika uang pas atau tanpa nominal tunai, langsung proses
    await executeTransaction(checkoutOpts);
  };

  const handleAuthorizeLoss = async ({ pin } = {}) => {
    setIsNegativeMarginModalOpen(false);
    if (pin) {
      setOwnerPinOverride(pin);
      await executeTransaction({ ownerPin: pin, confirmedLoss: true });
    } else {
      await executeTransaction({ confirmedLoss: true });
    }
  };

  const handleSmartChangeAllocation = async (allocation) => {
    setIsSmartChangeOpen(false);
    let assignedCust = selectedCustomer;

    if (allocation.customer && (!selectedCustomer || selectedCustomer.id !== allocation.customer.id)) {
      assignedCust = allocation.customer;
      setSelectedCustomer(allocation.customer);
      setCustomers((prev) => {
        if (!prev.find((c) => c.id === allocation.customer.id)) {
          return [...prev, allocation.customer];
        }
        return prev;
      });
    }

    await executeTransaction({
      changeAllocation: allocation.type !== 'NONE' ? {
        type: allocation.type,
        amount: allocation.amount,
      } : null,
      assignedCustomerId: assignedCust?.id || null,
    });
  };

  // ── Keyboard Shortcuts & Hardware Scanner (F2: Checkout, F4/F1: Search, Esc, Arrows, Delete) ──
  const handleCheckoutRef = useRef(null);
  const cartItemsRef = useRef(cartItems);
  const selectedCartIndexRef = useRef(selectedCartIndex);
  const removeFromCartRef = useRef(removeFromCart);
  const addToCartRef = useRef(addToCart);

  useEffect(() => {
    handleCheckoutRef.current = handleCheckout;
    cartItemsRef.current = cartItems;
    selectedCartIndexRef.current = selectedCartIndex;
    removeFromCartRef.current = removeFromCart;
    addToCartRef.current = addToCart;
  });

  // 1. Hardware Barcode Scanner (HID) Listener
  useEffect(() => {
    const isSensitiveModalOpen = () => {
      return Boolean(
        isRegisterFrozen ||
        isNegativeMarginModalOpen || // Modal PIN Owner
        isReceiptModalOpen ||
        isCloseShiftOpen ||
        isStartShiftOpen ||
        isCashDrawerModalOpen ||
        isPaywallOpen ||
        isAssetLoanModalOpen ||
        isSmartChangeOpen ||
        isUpgradeModalOpen ||
        isEditRegisterOpen
      );
    };

    const cleanupScanner = attachBarcodeScannerListener((scannedCode) => {
      if (isRegisterFrozen) return;
      const query = scannedCode.trim();
      if (!query) return;

      // 1. Cari di product_units.barcode
      let matchedUnit = null;
      let unitProduct = null;

      for (const p of products) {
        if (p.product_units && p.product_units.length > 0) {
          const u = p.product_units.find(
            (u) => u.barcode && u.barcode.toLowerCase() === query.toLowerCase()
          );
          if (u) {
            matchedUnit = u;
            unitProduct = p;
            break;
          }
        }
      }

      if (matchedUnit && unitProduct) {
        addToCartRef.current(unitProduct, matchedUnit);
        playScannerBeep();
        showToast(`[Scan] Barcode Scanned (${matchedUnit.unit_name}): ${unitProduct.nama}`);
        return;
      }

      // 2. Fallback: Cari di products.barcode
      const barcodeMatch = products.find(
        (p) => p.barcode && p.barcode.toLowerCase() === query.toLowerCase()
      );

      if (barcodeMatch) {
        addToCartRef.current(barcodeMatch);
        playScannerBeep();
        showToast(`[Scan] Barcode Scanned: ${barcodeMatch.nama}`);
        return;
      }

      showToast(`[Peringatan] Barcode [${query}] tidak ditemukan di katalog`);
    }, {
      isModalOpen: isSensitiveModalOpen,
      maxInterval: 45,
      minLength: 8,
    });

    return cleanupScanner;
  }, [products, isRegisterFrozen, isNegativeMarginModalOpen, isReceiptModalOpen, isCloseShiftOpen, isStartShiftOpen, isCashDrawerModalOpen, isPaywallOpen, isAssetLoanModalOpen, isSmartChangeOpen, isUpgradeModalOpen, isEditRegisterOpen]);

  // 2. Global Keyboard Navigation & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isRegisterFrozen) return;
      // F4 / F1: Auto-focus search / barcode input
      if (e.key === 'F4' || e.key === 'F1') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input') || barcodeInputRef.current;
        if (searchInput) {
          searchInput.focus();
          searchInput.select?.();
        }
      }
      // F2: Trigger checkout / pay submission
      else if (e.key === 'F2') {
        e.preventDefault();
        if (!submitting && cartItemsRef.current.length > 0) {
          handleCheckoutRef.current();
        }
      }
      // F9: Manual cash drawer kick (DFO - Drawer Forced Open telemetry & HEM heuristic)
      else if (e.key === 'F9') {
        e.preventDefault();
        drawerKickLogRef.current.push(Date.now());
        evaluateHemHeuristic({
          drawerKickTimestamps: drawerKickLogRef.current,
          shiftId: activeShift?.id || null,
          registerId,
        });
        emitStealthMetric('DFO', {
          trigger_method: 'HOTKEY_F9',
          shift_id: activeShift?.id || null,
          register_id: registerId,
          cart_items_count: cartItemsRef.current.length,
          reason: 'Manual cash drawer kick triggered outside completed transaction'
        });
        showToast('[Laci] Perintah Buka Laci Kas Dikirim');
      }
      // Esc: Close active modals or reset selection
      else if (e.key === 'Escape') {
        const hasOpenModal = isReceiptModalOpen || isCloseShiftOpen || isStartShiftOpen ||
          isCashDrawerModalOpen || isNegativeMarginModalOpen || isSmartChangeOpen ||
          isPaywallOpen || isAssetLoanModalOpen || isUpgradeModalOpen || isEditRegisterOpen;

        if (isReceiptModalOpen) setIsReceiptModalOpen(false);
        if (isCloseShiftOpen) setIsCloseShiftOpen(false);
        if (isStartShiftOpen) setIsStartShiftOpen(false);
        if (isCashDrawerModalOpen) setIsCashDrawerModalOpen(false);
        if (isNegativeMarginModalOpen) setIsNegativeMarginModalOpen(false);
        if (isSmartChangeOpen) setIsSmartChangeOpen(false);
        if (isPaywallOpen) setIsPaywallOpen(false);
        if (isAssetLoanModalOpen) setIsAssetLoanModalOpen(false);
        if (isUpgradeModalOpen) setIsUpgradeModalOpen(false);
        if (isEditRegisterOpen) setIsEditRegisterOpen(false);

        if (!hasOpenModal) {
          setSelectedCartIndex(-1);
        }
      }
      // Panah Atas / Bawah & Delete untuk navigasi item keranjang
      else {
        const isEditingInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
        const hasOpenModal = isReceiptModalOpen || isCloseShiftOpen || isStartShiftOpen ||
          isCashDrawerModalOpen || isNegativeMarginModalOpen || isSmartChangeOpen ||
          isPaywallOpen || isAssetLoanModalOpen || isUpgradeModalOpen || isEditRegisterOpen;

        if (!isEditingInput && !hasOpenModal && cartItemsRef.current.length > 0) {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedCartIndex((prev) => (prev < cartItemsRef.current.length - 1 ? prev + 1 : 0));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedCartIndex((prev) => (prev > 0 ? prev - 1 : cartItemsRef.current.length - 1));
          } else if (e.key === 'Delete') {
            const currentIdx = selectedCartIndexRef.current;
            if (currentIdx >= 0 && currentIdx < cartItemsRef.current.length) {
              e.preventDefault();
              const itemToDelete = cartItemsRef.current[currentIdx];
              removeFromCartRef.current(itemToDelete);
              setSelectedCartIndex((prev) => {
                if (prev >= cartItemsRef.current.length - 1) {
                  return Math.max(-1, cartItemsRef.current.length - 2);
                }
                return prev;
              });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, isRegisterFrozen, isReceiptModalOpen, isCloseShiftOpen, isStartShiftOpen, isCashDrawerModalOpen, isNegativeMarginModalOpen, isSmartChangeOpen, isPaywallOpen, isAssetLoanModalOpen, isUpgradeModalOpen, isEditRegisterOpen, activeShift, registerId]);

  // Reset Sesi POS untuk transaksi berikutnya
  const handleResetPos = async () => {
    cartIdRef.current = generateUUID();
    setIsWaPopupBlocked(false);
    purgedItemsRef.current = [];
    hasEnteredPaymentPhaseRef.current = false;
    paymentPhaseStartTimeRef.current = 0;
    setSelectedCartIndex(-1);
    setCartItems([]);
    setSelectedCustomer(null);
    setCustomerBalance(0);
    setCustomerPiutang(0);
    setUseCustomerBalance(0);
    setCashTendered('');
    setPaymentStatus('Lunas');
    setOngkir(0);
    setDeskripsi('');
    setCompletedTx(null);
    setIsReceiptModalOpen(false);
    generateAutoBonNumber();
    if (barcodeInputRef.current) barcodeInputRef.current.focus();

    // Refresh data produk agar stok terbaru muncul
    try {
      if (navigator.onLine) {
        const prodList = await api.getProducts();
        if (prodList) setProducts(prodList);
      } else {
        const cached = await getCatalogCache();
        if (cached?.products) setProducts(cached.products);
      }
    } catch (err) {
      console.error('[POS Reset Refresh Error]', err);
      const cached = await getCatalogCache();
      if (cached?.products) setProducts(cached.products);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategory === 'SEMUA' || p.tipe === selectedCategory;
      const matchSearch =
        !searchQuery.trim() ||
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kw-card flex flex-col items-center justify-center text-kw-text space-y-4 font-sans">
        <RefreshCw className="w-10 h-10 animate-spin text-kw-accent" />
        <p className="text-lg font-bold tracking-widest uppercase font-mono text-kw-text">Memuat Terminal Kasir...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col font-sans text-slate-900 select-none relative z-10">

      {/* ── Toast Notification Banner ── */}
      {toastMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] bg-white border-2 border-slate-800 text-slate-900 px-6 py-3 rounded-2xl shadow-[4px_4px_0px_#1E293B] text-sm font-bold flex items-center gap-3 animate-bounce">
          <Sparkles size={18} className="text-[#CCFF00]" />
          <span className="font-mono">{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER KASIR (Frosted Glass with Refraction) ── */}
      <header className="bg-white/70 backdrop-blur-xl border-b-2 border-slate-800 px-4 md:px-8 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-3 flex-shrink-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
        <div className="flex items-center gap-3 md:gap-4">
          <div className="w-10 h-10 bg-slate-900 text-[#CCFF00] border-2 border-slate-800 rounded-xl hidden md:flex items-center justify-center font-extrabold text-sm font-display shadow-[2px_2px_0px_#1E293B]">
            POS
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight font-display leading-tight flex flex-wrap items-center gap-2 text-slate-900">
              {shopName}
              <span className="bg-[#CCFF00] text-slate-900 border border-slate-800 px-2 py-0.5 rounded font-mono uppercase tracking-wider font-bold text-xs whitespace-nowrap">
                {profile?.role === 'CASHIER' ? 'Kasir Kiosk' : profile?.role === 'BOSS' ? 'Mode Bos' : 'Mode Kasir'}
              </span>
            </h1>
            <p className="text-xs text-slate-600 font-semibold flex flex-wrap items-center gap-2 mt-0.5">
              <span>Kasir: <strong className="text-slate-900 uppercase font-mono">{profile?.username || user?.email?.split('@')[0]}</strong></span>
              <span className="hidden md:inline">•</span>
              <span className="text-emerald-700 flex items-center gap-1 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" /> <span className="hidden md:inline">Auto-Scanner Aktif</span>
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 md:gap-3">
          {/* Network & Background Sync Status Badge */}
          <div className="flex items-center gap-1.5">
            <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${
              isSyncing
                ? 'bg-amber-50 text-amber-900 border-amber-500 shadow-[2px_2px_0px_#D97706]'
                : !isOnline || pendingSyncCount > 0
                ? 'bg-amber-100 text-amber-950 border-amber-600 shadow-[2px_2px_0px_#D97706]'
                : 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-[2px_2px_0px_#059669]'
            }`}>
              {isSyncing ? (
                <>
                  <RefreshCw size={14} className="animate-spin text-amber-700" />
                  <span>Sinkronisasi {pendingSyncCount} Bon...</span>
                </>
              ) : !isOnline ? (
                <>
                  <WifiOff size={14} className="text-amber-800" />
                  <span>Offline ({pendingSyncCount} Bon Tersimpan)</span>
                </>
              ) : pendingSyncCount > 0 ? (
                <>
                  <RefreshCw size={14} className="text-amber-800" />
                  <span>{pendingSyncCount} Bon Belum Tersinkron</span>
                </>
              ) : (
                <>
                  <Wifi size={14} className="text-emerald-700" />
                  <span className="hidden md:inline">Online Cloud</span>
                </>
              )}
            </div>

            {/* Tombol Manual Sync jika ada pending antrean saat online */}
            {pendingSyncCount > 0 && isOnline && !isSyncing && (
              <button
                type="button"
                onClick={() => syncOfflineData()}
                className="btn-arcade flex items-center gap-1 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold px-2.5 py-1.5 rounded-xl cursor-pointer"
                title="Klik untuk Sinkronkan Transaksi Offline Sekarang"
              >
                <RefreshCw size={12} /> Sync
              </button>
            )}
          </div>

          {/* Badge Cabang Terkunci (Tahap 7: Device Branch Binding) */}
          <button
            type="button"
            onClick={() => {
              setIsBranchRebinding(true);
              setIsBranchSetupOpen(true);
            }}
            className="btn-arcade flex items-center gap-1.5 bg-[#0B0F17] hover:bg-slate-900 text-amber-400 border-2 border-amber-400 shadow-[2px_2px_0px_#F59E0B] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Klik untuk memindahkan terminal ke cabang lain (Butuh PIN Owner)"
          >
            <Store size={14} className="text-amber-400 shrink-0" strokeWidth={2.5} />
            <span>[ 📍 {assignedBranchInfo?.branch_name || assignedBranchInfo?.name || 'CABANG UTAMA'} ({assignedRegisterName || 'POS-01'}) 🔒 ]</span>
          </button>

          {/* Terminal / Register Identifier Badge */}
          <button
            type="button"
            onClick={() => {
                if (profile?.role === 'BOSS' || profile?.role === 'ADMIN') {
                setNewRegisterInput(registerId);
                setIsEditRegisterOpen(true);
              } else {
                showToast(`Terminal: ${registerId} (Terkunci oleh Admin)`);
              }
            }}
            className={`btn-arcade flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-2 rounded-xl border-2 transition-all cursor-pointer ${
              profile?.role === 'BOSS' || profile?.role === 'ADMIN'
                ? 'bg-slate-900 text-[#CCFF00] border-slate-800 shadow-[2px_2px_0px_#1E293B] hover:bg-slate-800'
                : 'bg-white text-slate-900 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
            }`}
            title={profile?.role === 'BOSS' || profile?.role === 'ADMIN' ? 'Klik untuk Mengganti ID Terminal Kasir' : `Terminal: ${registerId}`}
          >
            <Monitor size={14} className={profile?.role === 'BOSS' || profile?.role === 'ADMIN' ? 'text-[#CCFF00]' : 'text-slate-700'} />
            <span>Kasir: <strong className="font-mono">{registerId}</strong></span>
          </button>

          {/* Printer Thermal Settings Button */}
          <button
            type="button"
            onClick={() => setIsPrinterSettingsOpen(true)}
            className="btn-arcade flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Konfigurasi Printer Thermal (Bluetooth / USB Serial)"
          >
            <Printer size={14} /> <span className="hidden xl:inline">Printer</span>
          </button>

          {/* Laci Kas Masuk/Keluar Button */}
          <button
            onClick={() => setIsCashDrawerModalOpen(true)}
            className="btn-arcade flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Catat Kas Masuk / Keluar Laci"
          >
            <Coins size={14} /> <span className="hidden xl:inline">Laci Kas</span>
          </button>

          {/* Shift Status & Handover Button */}
          {activeShift ? (
            <button
              onClick={() => setIsCloseShiftOpen(true)}
              className="btn-arcade flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-2 border-emerald-600 shadow-[2px_2px_0px_#059669] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Shift Aktif - Klik untuk Tutup Shift (Blind Closing)"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <span>Shift #{activeShift.shift_number}</span>
              <span className="hidden xl:inline text-emerald-700">| Tutup</span>
            </button>
          ) : (
            <button
              onClick={() => setIsStartShiftOpen(true)}
              className="btn-arcade flex items-center gap-1.5 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-black px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Buka Shift Kasir Baru"
            >
              <Lock size={14} /> <span>Buka Shift</span>
            </button>
          )}

          {profile?.role === 'BOSS' && (
            <button
              onClick={() => router.push('/dashboard')}
              className="btn-arcade flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Ke Dashboard"
            >
              <Store size={14} /> <span className="hidden xl:inline">Dashboard</span>
            </button>
          )}

          <button
            onClick={async () => {
              sessionStorage.removeItem('hl_active_session');
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="btn-arcade flex items-center gap-1.5 bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-900 border-2 border-rose-600 shadow-[2px_2px_0px_#E11D48] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
            title="Keluar"
          >
            <LogOut size={14} /> <span className="hidden xl:inline">Keluar</span>
          </button>
        </div>
      </header>

      {/* ── BODY UTAMA (Kiri: Katalog & Scanner | Kanan: Keranjang) ── */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">

        {/* ─────────────────────────────────────────────────────────────
            SISI KIRI (7-8 cols): Auto-Scanner Barcode & Katalog Produk
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 xl:col-span-8 p-4 md:p-6 flex flex-col space-y-4 overflow-y-auto max-h-none lg:max-h-[calc(100vh-64px)]">

          {/* Barcode Auto-Scanner Bar (Solid Ground) */}
          <form onSubmit={handleBarcodeOrSearchSubmit} className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500">
              <Barcode size={22} className="text-slate-800" />
            </div>
            <input
              ref={barcodeInputRef}
              id="pos-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tembak Barcode / Cari nama produk [F4] (Tekan Enter)..."
              className="w-full h-14 bg-white border-2 border-slate-800 focus:border-slate-800 focus:ring-2 focus:ring-[#CCFF00] rounded-2xl pl-13 pr-32 text-base font-sans font-semibold text-slate-900 outline-none shadow-[3px_3px_0px_#1E293B] transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="btn-arcade absolute right-2.5 top-1/2 -translate-y-1/2 bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B] font-mono font-bold text-xs uppercase px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Search size={14} /> Cari [Enter]
            </button>
          </form>

          {/* Filter Kategori Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('SEMUA')}
              className={`btn-arcade px-4 h-10 flex items-center justify-center rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === 'SEMUA'
                  ? 'bg-slate-900 text-[#CCFF00] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                  : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-800'
              }`}
            >
              Semua ({products.length})
            </button>
            {categories.map((cat) => {
              const count = products.filter((p) => p.tipe === cat.code).length;
              return (
                <button
                  key={cat.code}
                  onClick={() => setSelectedCategory(cat.code)}
                  className={`btn-arcade px-4 h-10 flex items-center justify-center rounded-xl text-xs font-mono font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.code
                      ? 'bg-slate-900 text-[#CCFF00] border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                      : 'bg-white text-slate-700 border-2 border-slate-300 hover:border-slate-800'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          {/* Grid Katalog Produk (Solid White Cards) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredProducts.map((product) => {
              const isStockOut = product.stock <= 0;
              const isStockLow = product.stock <= (product.reorder_threshold || 5);

              return (
                <div
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className={`btn-arcade bg-white border-2 rounded-2xl p-3.5 text-left flex flex-col justify-between min-h-[150px] transition-all duration-150 cursor-pointer relative overflow-hidden group shadow-[3px_3px_0px_#1E293B] hover:-translate-y-1 hover:shadow-[5px_5px_0px_#1E293B] ${
                    isStockOut
                      ? 'border-slate-300 opacity-60 bg-slate-50'
                      : isStockLow
                      ? 'border-amber-500 hover:border-slate-800'
                      : 'border-slate-800 hover:border-slate-900'
                  }`}
                >
                  {/* Category badge */}
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                      {product.tipe}
                    </span>
                    {product.barcode && (
                      <span className="text-[10px] text-slate-500 font-mono flex items-center gap-0.5">
                        <Barcode size={12} /> {product.barcode.slice(-4)}
                      </span>
                    )}
                  </div>

                  {/* Name */}
                  <div className="my-1.5">
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-tight group-hover:text-slate-900 transition-colors font-sans">
                      {product.nama}
                    </h3>

                    {/* Segmented Pills for Multi-Tier Units */}
                    {product.product_units && product.product_units.length > 1 && (
                      <div className="flex flex-wrap gap-1 mt-1.5" onClick={(e) => e.stopPropagation()}>
                        {[...product.product_units]
                          .sort((a, b) => b.multiplier_to_base - a.multiplier_to_base)
                          .map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(product, u);
                                playScannerBeep();
                                showToast(`+1 ${u.unit_name}: ${product.nama}`);
                              }}
                              className="px-1.5 py-0.5 text-[9px] font-mono font-black uppercase bg-amber-200 hover:bg-amber-300 text-slate-900 border border-slate-800 rounded shadow-[1px_1px_0px_#1E293B] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all"
                              title={`Tambah 1 ${u.unit_name} (Rp ${Number(u.price).toLocaleString('id-ID')})`}
                            >
                              {u.unit_name} ({u.multiplier_to_base})
                            </button>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* Price & Stock Badge */}
                  <div className="flex items-end justify-between w-full pt-1.5 border-t border-slate-200 mt-auto">
                    <div>
                      <span className="text-[10px] text-slate-500 font-mono block">
                        {product.product_units && product.product_units.length > 1 ? 'Eceran' : 'Harga Base'}
                      </span>
                      <span className="font-extrabold text-sm text-slate-900 font-mono">
                        {formatRupiah(product.harga_base)}
                      </span>
                    </div>

                    {/* Stock Alert Badge */}
                    <div>
                      {isStockOut ? (
                        <span className="bg-rose-100 text-rose-800 border border-rose-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-0.5">
                          Habis
                        </span>
                      ) : isStockLow ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded flex items-center gap-0.5" title="Stok Kritis">
                          <AlertTriangle size={11} /> {product.stock}
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] font-mono font-semibold px-2 py-0.5 rounded">
                          Stok: {product.stock}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredProducts.length === 0 && (
            <div className="bg-white border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center text-slate-500 space-y-2">
              <Package size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-base text-slate-800">Tidak ada produk ditemukan.</p>
              <p className="text-xs font-sans">Coba ganti kata kunci pencarian atau kategori.</p>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SISI KANAN (4-5 cols): Keranjang Kasir & Ringkasan Checkout (Zona Mesin)
            ───────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 xl:col-span-4 bg-white border-t-2 lg:border-t-0 lg:border-l-2 border-slate-800 p-4 md:p-6 pb-24 sm:pb-28 lg:pb-6 flex flex-col justify-between max-h-none lg:max-h-[calc(100vh-64px)] shadow-lg relative z-20">

          <div className="space-y-4 flex-1 overflow-y-auto pr-1">

            {/* Title, Passive Nomor Bon & Clear Cart */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <ShoppingBag size={20} className="text-slate-900" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900 font-display">Keranjang Kasir</h2>
                    <span className="bg-slate-900 text-[#CCFF00] text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                      {cartItems.reduce((sum, i) => sum + i.quantity, 0)} item
                    </span>
                  </div>
                  {nomorBon && (
                    <span className="text-[11px] font-mono text-slate-500 block">No. Bon: {nomorBon}</span>
                  )}
                </div>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="text-xs font-mono font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Kosongkan
                </button>
              )}
            </div>

            {/* Pilih Pelanggan (Umum vs Pelanggan Terdaftar) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                <span>Pelanggan</span>
                {selectedCustomer && (
                  <span className="text-emerald-700 font-bold flex items-center gap-1 font-mono text-[11px]">
                    <UserCheck size={12} /> Diskon Aktif
                  </span>
                )}
              </label>

              <select
                value={selectedCustomer ? selectedCustomer.id : ''}
                onChange={(e) => {
                  const cust = customers.find((c) => c.id === e.target.value);
                  setSelectedCustomer(cust || null);

                  // Telemetry: SDC (Suspicious Discount Clustering)
                  if (cust && cust.customer_discounts && cust.customer_discounts.length > 0) {
                    const now = Date.now();
                    discountApplicationLogRef.current.push({ customer_id: cust.id, timestamp: now });
                    const recentDiscounts = discountApplicationLogRef.current.filter(d => now - d.timestamp < 3600000);
                    discountApplicationLogRef.current = recentDiscounts;
                    const uniqueCustomers = new Set(recentDiscounts.map(d => d.customer_id));
                    if (recentDiscounts.length >= 3 && uniqueCustomers.size >= 2) {
                      emitStealthMetric('SDC', {
                        total_applications: recentDiscounts.length,
                        unique_customers_count: uniqueCustomers.size,
                        timeframe_minutes: 60,
                        reason: 'Frequent discount applications to multiple customers within 60 minutes'
                      });
                    }
                  }
                }}
                className="w-full h-12 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-sans font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all cursor-pointer"
              >
                <option value="">-- Umum (Non-Pelanggan / Harga Standar) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nama} {c.phone ? `(${c.phone})` : ''}
                  </option>
                ))}
              </select>

              {/* Status Pinjaman Tabung / Galon Pelanggan (Fase 1) */}
              {selectedCustomer && (
                <div className="p-2.5 bg-amber-50 border-2 border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1E293B]">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-mono font-bold uppercase text-slate-600">
                      Tabung &amp; Galon Pelanggan
                    </div>
                    {(() => {
                      const activeLoans = Object.entries(selectedCustomer.loaned_assets || {})
                        .filter(([_, qty]) => parseInt(qty, 10) > 0);
                      if (activeLoans.length === 0) {
                        return <span className="text-xs font-semibold text-slate-700">Tidak ada pinjaman aktif</span>;
                      }
                      return (
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {activeLoans.map(([t, qty]) => (
                            <span key={t} className="px-1.5 py-0.5 bg-amber-200 border border-slate-800 text-[10px] font-mono font-black text-slate-900 rounded flex items-center gap-1">
                              <AlertTriangle size={11} strokeWidth={2.5} className="text-amber-800 shrink-0" />
                              <span>{qty}× {t}</span>
                            </span>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAssetLoanModalMode('RETURN');
                        setIsAssetLoanModalOpen(true);
                      }}
                      className="px-2 py-1 bg-emerald-400 hover:bg-emerald-300 text-slate-900 font-mono font-bold text-[10px] uppercase border border-slate-800 rounded shadow-[1px_1px_0px_#1E293B] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                    >
                      Terima
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAssetLoanModalMode('LOAN');
                        setIsAssetLoanModalOpen(true);
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-900 font-mono font-bold text-[10px] uppercase border border-slate-800 rounded shadow-[1px_1px_0px_#1E293B] cursor-pointer active:translate-x-0.5 active:translate-y-0.5"
                    >
                      Pinjam
                    </button>
                  </div>
                </div>
              )}

              {/* Celengan & Tabungan Pelanggan (Fase 2) */}
              {selectedCustomer && (
                <div className="space-y-1.5 pt-1">
                  {customerBalance > 0 && (
                    <div className="p-2.5 bg-emerald-50 border-2 border-slate-800 rounded-xl flex items-center justify-between gap-2 shadow-[2px_2px_0px_#1E293B]">
                      <div className="flex items-center gap-2">
                        <PiggyBank size={18} className="text-emerald-700 shrink-0" />
                        <div>
                          <div className="text-[10px] font-mono font-bold uppercase text-slate-600">Saldo Celengan</div>
                          <div className="text-xs font-mono font-black text-emerald-800">{formatRupiah(customerBalance)}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (useCustomerBalance > 0) {
                            setUseCustomerBalance(0);
                          } else {
                            setUseCustomerBalance(Math.min(customerBalance, totals.totalOmzet));
                          }
                        }}
                        className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase border border-slate-800 rounded shadow-[1px_1px_0px_#1E293B] cursor-pointer active:translate-x-0.5 active:translate-y-0.5 transition-all ${
                          useCustomerBalance > 0
                            ? 'bg-rose-500 text-white hover:bg-rose-600'
                            : 'bg-[#CCFF00] text-slate-900 hover:bg-[#bbf000]'
                        }`}
                      >
                        {useCustomerBalance > 0 ? 'Batal Pakai' : 'Pakai Saldo'}
                      </button>
                    </div>
                  )}

                  {customerPiutang > 0 && (
                    <div className="px-2.5 py-1.5 bg-rose-50 border border-slate-400 rounded-lg flex items-center justify-between text-[11px] font-mono">
                      <span className="text-rose-800 font-bold flex items-center gap-1">
                        <AlertTriangle size={12} className="text-rose-600" /> Ada Kasbon:
                      </span>
                      <span className="text-rose-900 font-black">{formatRupiah(customerPiutang)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Item Keranjang List (Zero Zebra Stripes - Pure Clean Line Dividers) */}
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {cartItems.map((item, index) => {
                const itemPrice = item.is_bonus_item ? 0 : item.discounted_unit_price;
                const hasDiscount = item.discounted_unit_price < item.harga_base && !item.is_bonus_item;
                const isLoss = !item.is_bonus_item && Number(item.discounted_unit_price) < Number(item.harga_modal);
                const lossPerUnit = isLoss ? Number(item.harga_modal) - Number(item.discounted_unit_price) : 0;
                const isSelected = index === selectedCartIndex;

                return (
                  <div
                    key={item.cartKey || item.product_id}
                    onClick={() => setSelectedCartIndex(index)}
                    className={`rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 text-sm transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-amber-50/90 border-2 border-[#0B0F17] shadow-[3px_3px_0px_#0B0F17] ring-2 ring-amber-400 -translate-y-[1px]'
                        : isLoss
                        ? 'bg-red-50/90 border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
                        : 'bg-slate-50 border border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate font-sans text-sm">{item.nama}</span>
                        {isSelected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0B0F17] text-amber-400 font-mono font-black text-[10px] uppercase tracking-wider border border-amber-400 rounded">
                            <Trash2 className="w-3 h-3 stroke-[2.5]" />
                            [DEL] HAPUS
                          </span>
                        )}
                        <span className="text-[9px] font-mono font-bold uppercase bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">
                          {item.tipe}
                        </span>
                        {item.unit_name && item.unit_name !== 'Pcs' && (
                          <span className="text-[9px] font-mono font-bold uppercase bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded border border-amber-300">
                            {item.unit_name}
                          </span>
                        )}
                        {isLoss && (
                          <span className="text-[9px] font-mono font-black uppercase bg-red-600 text-white px-1.5 py-0.5 rounded shadow-[1px_1px_0px_#991B1B] flex items-center gap-1">
                            <AlertTriangle size={10} strokeWidth={2.5} className="shrink-0" />
                            <span>RUGI: -{formatRupiah(lossPerUnit)}</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs mt-0.5 font-mono">
                        {hasDiscount ? (
                          <>
                            <span className="line-through text-slate-400">{formatRupiah(item.harga_base)}</span>
                            <span className={`font-bold ${isLoss ? 'text-red-600' : 'text-emerald-700'}`}>
                              {formatRupiah(item.discounted_unit_price)}
                            </span>
                          </>
                        ) : (
                          <span className={`font-bold ${isLoss ? 'text-red-600' : 'text-slate-700'}`}>
                            {formatRupiah(item.harga_base)}
                          </span>
                        )}
                        {isLoss && (
                          <span className="text-[10px] text-slate-500 font-sans">
                            (Modal: {formatRupiah(item.harga_modal)})
                          </span>
                        )}
                      </div>

                      {/* Auto-Unpack Soft Badge (Tahap 6: Arcade Brutalist) */}
                      {(() => {
                        const prodMaster = products.find((p) => p.id === item.product_id);
                        const unpackEval = checkAutoUnpackEligibility(item, prodMaster);
                        if (unpackEval.needed && unpackEval.parentUnit) {
                          return (
                            <div className="mt-1 flex items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-950 font-mono font-black text-[9px] uppercase tracking-wider border-2 border-slate-900 rounded-md shadow-[2px_2px_0px_#0B0F17]">
                                <Zap size={10} className="text-amber-700 shrink-0 fill-amber-500" strokeWidth={2.5} />
                                <span>{unpackEval.badgeText}</span>
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Controls Qty */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.cartKey || item.product_id, -1)}
                        className="btn-arcade w-8 h-8 bg-white border border-slate-800 hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-900 shadow-[1px_1px_0px_#1E293B] cursor-pointer"
                        title="Kurangi Kuantitas"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="w-6 text-center font-mono font-bold text-sm text-slate-900">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.cartKey || item.product_id, 1)}
                        className="btn-arcade w-8 h-8 bg-white border border-slate-800 hover:bg-slate-100 rounded-lg flex items-center justify-center font-bold text-slate-900 shadow-[1px_1px_0px_#1E293B] cursor-pointer"
                        title="Tambah Kuantitas"
                      >
                        <Plus size={12} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item)}
                        className="btn-arcade w-8 h-8 bg-rose-50 border border-rose-500 text-rose-700 hover:bg-rose-600 hover:text-white rounded-lg flex items-center justify-center ml-1 transition-colors cursor-pointer"
                        title="Hapus (Void Log)"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Empty State Keranjang */}
              {cartItems.length === 0 && (
                <div className="py-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-4 text-center space-y-2">
                  <div className="w-12 h-12 bg-white border border-slate-300 rounded-xl flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                    <ShoppingBag size={22} />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-sm font-bold text-slate-800 font-display">Keranjang Kasir Kosong</p>
                    <p className="text-xs text-slate-500 max-w-xs mx-auto font-sans">Scan barcode atau klik item produk di sebelah kiri.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Inputs: Ongkir & Status Pembayaran */}
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase mb-1">
                  Ongkos Kirim (Rp)
                </label>
                <input
                  type="number"
                  value={ongkir}
                  onChange={(e) => setOngkir(e.target.value)}
                  className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  placeholder="0"
                />
              </div>

              {/* Status Pembayaran Toggle: LUNAS vs PIUTANG */}
              <div className="space-y-1">
                <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                  Status Pembayaran
                </label>
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-300 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus('Lunas')}
                    className={`btn-arcade flex-1 h-11 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentStatus === 'Lunas'
                        ? 'bg-[#CCFF00] text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                        : 'bg-transparent text-slate-700 hover:bg-white border-2 border-transparent'
                    }`}
                  >
                    <CreditCard size={14} /> Lunas (Tunai/QRIS)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canAccessFeature(userPlan, 'allow_kasbon')) {
                        setPaywallConfig({
                          title: "Buka Fitur Kasbon Digital",
                          message: "Hentikan Lupa Catat Hutang. Buka fitur Buku Kasbon Digital sekarang mulai dari Rp 60rb/bulan.",
                          targetPlan: "Starter",
                          priceLabel: "Rp 60rb/bulan"
                        });
                        setIsPaywallOpen(true);
                        return;
                      }
                      setPaymentStatus('Piutang');
                    }}
                    className={`btn-arcade flex-1 h-11 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      paymentStatus === 'Piutang'
                        ? 'bg-amber-400 text-slate-900 border-2 border-slate-800 shadow-[2px_2px_0px_#1E293B]'
                        : 'bg-transparent text-slate-700 hover:bg-white border-2 border-transparent'
                    }`}
                  >
                    <Wallet size={14} /> Piutang (Kasbon)
                  </button>
                </div>
              </div>

              {/* Input Uang Tunai Diterima (Smart Change Readiness) */}
              {paymentStatus === 'Lunas' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-mono font-bold text-slate-700 uppercase">
                      Uang Diterima / Tunai (Rp)
                    </label>
                    {cashTendered !== '' && Number(cashTendered) > Math.max(0, totals.totalOmzet - useCustomerBalance) && (
                      <span className="text-[11px] font-mono font-bold text-emerald-700 flex items-center gap-1">
                        <Coins size={12} /> Kembalian: {formatRupiah(Number(cashTendered) - Math.max(0, totals.totalOmzet - useCustomerBalance))}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder={`Uang Pas (${formatRupiah(Math.max(0, totals.totalOmzet - useCustomerBalance))})`}
                    className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-mono font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-[#CCFF00] outline-none transition-all"
                  />
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => setCashTendered(String(Math.max(0, totals.totalOmzet - useCustomerBalance)))}
                      className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-mono font-bold rounded border border-slate-400 cursor-pointer"
                    >
                      Uang Pas
                    </button>
                    {[10000, 20000, 50000, 100000].map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => {
                          const cur = Number(cashTendered || 0);
                          setCashTendered(String(cur + amt));
                        }}
                        className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-800 text-[10px] font-mono font-bold rounded border border-slate-400 cursor-pointer shadow-xs"
                      >
                        +{amt / 1000}rb
                      </button>
                    ))}
                    {cashTendered !== '' && (
                      <button
                        type="button"
                        onClick={() => setCashTendered('')}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-mono font-bold rounded border border-rose-300 cursor-pointer ml-auto"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ringkasan Total & Tombol Checkout Tactile */}
          <div className="pt-3 border-t-2 border-slate-800 space-y-3 mt-auto">
            {errorMessage && (
              <div className="bg-rose-50 border-2 border-rose-500 text-rose-900 p-2.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2">
                <AlertCircle size={14} className="flex-shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="space-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-300">
              <div className="flex justify-between text-xs font-mono text-slate-600">
                <span>Subtotal Penjualan</span>
                <span>{formatRupiah(totals.subtotalOmzet)}</span>
              </div>

              {Number(ongkir) > 0 && (
                <div className="flex justify-between text-xs font-mono text-slate-600">
                  <span>Ongkos Kirim</span>
                  <span>{formatRupiah(ongkir)}</span>
                </div>
              )}

              {useCustomerBalance > 0 && (
                <div className="flex justify-between text-xs font-mono font-bold text-emerald-700">
                  <span>Potongan Saldo Celengan</span>
                  <span>- {formatRupiah(useCustomerBalance)}</span>
                </div>
              )}

              {/* Tampilkan Laba HANYA jika role = BOSS (kerahasiaan margin untuk CASHIER) */}
              {profile?.role === 'BOSS' && (
                <div className="flex justify-between text-xs font-mono font-bold text-emerald-800 pt-1 border-t border-dashed border-slate-300">
                  <span>Estimasi Laba Bersih</span>
                  <span>{formatRupiah(totals.totalLaba)}</span>
                </div>
              )}

              {/* TOTAL HARGA: Geist Mono Figures */}
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-300">
                <span className="text-xs font-mono font-bold text-slate-800 uppercase">
                  {useCustomerBalance > 0 ? 'SISA DIBAYAR' : 'TOTAL PEMBAYARAN'}
                </span>
                <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-tight text-slate-900">
                  {formatRupiah(Math.max(0, totals.totalOmzet - useCustomerBalance))}
                </span>
              </div>
            </div>

            {/* Tombol Checkout Arcade Feedback (F2 Key) */}
            <button
              onClick={handleCheckout}
              disabled={submitting || cartItems.length === 0}
              className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-slate-900 font-extrabold h-14 text-sm font-mono uppercase shadow-[4px_4px_0_#1E293B] active:translate-y-0.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer border-2 border-slate-800 tracking-wider"
            >
              {submitting ? (
                <>
                  <RefreshCw size={18} className="animate-spin text-slate-900" /> MENYIMPAN BON...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} className="text-slate-900" /> PROSES &amp; CETAK STRUK <span className="bg-slate-900 text-[#CCFF00] text-xs px-2 py-0.5 rounded font-mono font-bold">[F2]</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL STRUK KASIR DIGITAL / THERMAL (Pop-Art Glass)
          ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
      {isReceiptModalOpen && completedTx && (
        <motion.div 
          key="receipt-modal-backdrop"
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[10000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans"
        >
          <motion.div 
            initial={{ scale: 0.95, y: 20, opacity: 0 }} 
            animate={{ scale: 1, y: 0, opacity: 1 }} 
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-2xl max-w-sm w-full shadow-[8px_8px_0px_#1E293B] overflow-hidden border-2 border-slate-800 flex flex-col"
          >

            {/* Modal Header */}
            <div className="bg-slate-900 text-[#CCFF00] p-4 text-center space-y-1">
              <h3 className="font-extrabold text-base font-display tracking-wide flex items-center justify-center gap-2">
                <CheckCircle2 className="text-[#CCFF00]" size={18} /> Transaksi Sukses!
              </h3>
              <p className="text-xs text-white/80 font-sans">Struk siap dicetak atau dikirim ke WhatsApp.</p>
            </div>

            {/* Thermal Receipt Preview Area */}
            <div className="p-6 bg-slate-50 text-slate-900 font-mono text-xs space-y-3 border-b border-dashed border-slate-300">
              <div className="text-center space-y-0.5">
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">{completedTx.shop_name}</h4>
                <p className="text-[10px] text-slate-500">Struk Pembayaran Kasir</p>
                <div className="border-b border-dashed border-slate-300 my-2" />
              </div>

              <div className="space-y-1 text-xs">
                <div className="flex justify-between"><span>No. Bon:</span><strong className="text-slate-900">{completedTx.nomor_bon}</strong></div>
                <div className="flex justify-between"><span>Tanggal:</span><span>{new Date().toLocaleDateString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Kasir:</span><span>{completedTx.cashier_name}</span></div>
                <div className="flex justify-between"><span>Pelanggan:</span><strong className="text-slate-900">{completedTx.customer_name}</strong></div>
                <div className="flex justify-between"><span>Status:</span><span className="font-bold uppercase text-slate-900 bg-[#CCFF00] px-1.5 py-0.2 rounded border border-slate-800">{completedTx.payment_status}</span></div>
                {completedTx.is_offline && (
                  <div className="bg-amber-100 border border-amber-400 text-amber-950 text-[10px] font-mono font-bold px-2 py-1 rounded text-center my-1 flex items-center justify-center gap-1.5">
                    <Zap size={12} strokeWidth={2.5} className="text-amber-700 fill-amber-700" />
                    <span>MODE OFFLINE - TERSIMPAN DI PERANGKAT (MENUNGGU SINKRONISASI)</span>
                  </div>
                )}
              </div>

              <div className="border-b border-dashed border-slate-300 my-2" />

              {/* Items list */}
              <div className="space-y-1.5 text-xs">
                {completedTx.cart_snapshot.map((item, idx) => (
                  <div key={idx} className="space-y-0.5">
                    <div className="font-bold text-slate-900">{item.nama}</div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>{item.quantity} x {formatRupiah(item.discounted_unit_price)}</span>
                      <span className="font-bold text-slate-900">{formatRupiah(item.discounted_unit_price * item.quantity)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-slate-300 my-2" />

              {/* Totals */}
              <div className="space-y-1 text-xs">
                {Number(completedTx.ongkir || 0) > 0 && (
                  <div className="flex justify-between text-slate-600"><span>Ongkir:</span><span>{formatRupiah(completedTx.ongkir)}</span></div>
                )}
                <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(completedTx.total_final)}</span>
                </div>
                {Number(completedTx.use_customer_balance || 0) > 0 && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Celengan:</span>
                    <span>- {formatRupiah(completedTx.use_customer_balance)}</span>
                  </div>
                )}
                {Number(completedTx.cash_tendered || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tunai Diterima:</span>
                    <span>{formatRupiah(completedTx.cash_tendered)}</span>
                  </div>
                )}
                {Number(completedTx.change_returned || 0) > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Kembalian:</span>
                    <span>{formatRupiah(completedTx.change_returned)}</span>
                  </div>
                )}
                {completedTx.change_allocation && (
                  <div className="flex justify-between text-emerald-700 font-bold border-t border-dashed border-slate-300 pt-1">
                    <span>
                      {completedTx.change_allocation.type === 'KASBON' ? 'Alokasi ke Kasbon:' : 'Masuk Celengan:'}
                    </span>
                    <span>{formatRupiah(completedTx.change_allocation.amount)}</span>
                  </div>
                )}
              </div>

              <div className="text-center pt-2 text-[10px] text-slate-500">
                --- Terima Kasih atas Kunjungan Anda ---
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-white space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    const printRes = await printReceiptDirect(completedTx);
                    if (!printRes.success && printRes.error !== 'FALLBACK_WINDOW_PRINT') {
                      window.print();
                    }
                  }}
                  className="btn-arcade bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 font-mono text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                >
                  <Printer size={14} /> Cetak Struk
                </button>

                {completedTx.customer_phone ? (
                  <button
                    onClick={() => {
                      if (!canAccessFeature(userPlan, 'wa_tagihan')) {
                        setPaywallConfig({
                          title: "Buka Fitur WhatsApp Tagihan",
                          message: "Tingkatkan profesionalisme warung dengan kirim struk & tagihan otomatis via WhatsApp. Buka fitur ini sekarang.",
                          targetPlan: "Plus",
                          priceLabel: "Rp 150rb/bulan"
                        });
                        setIsPaywallOpen(true);
                        return;
                      }

                      let changeDetail = '';
                      if (Number(completedTx.use_customer_balance || 0) > 0) {
                        changeDetail += `Pakai Saldo Celengan: -${formatRupiah(completedTx.use_customer_balance)}\n`;
                      }
                      if (completedTx.change_allocation) {
                        changeDetail += completedTx.change_allocation.type === 'KASBON'
                          ? `Kembalian dipotongkan Kasbon: ${formatRupiah(completedTx.change_allocation.amount)}\n`
                          : `Kembalian disimpan ke Celengan: ${formatRupiah(completedTx.change_allocation.amount)}\n`;
                      }

                      const waText =
                        `*STRUK PENJUALAN ${completedTx.shop_name}*\n` +
                        `No Bon: ${completedTx.nomor_bon}\n` +
                        `Pelanggan: ${completedTx.customer_name}\n` +
                        `Total: ${formatRupiah(completedTx.total_final)}\n` +
                        changeDetail +
                        `Status: ${completedTx.payment_status}\n\n` +
                        `Terima kasih sudah berbelanja!`;
                      handleOpenWhatsApp(completedTx.customer_phone, waText);
                    }}
                    className="btn-arcade bg-emerald-600 hover:bg-emerald-700 text-white border-2 border-slate-800 font-mono text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                  >
                    <Send size={14} /> WhatsApp
                  </button>
                ) : (
                  <button
                    disabled
                    className="bg-slate-100 text-slate-400 border border-slate-300 font-mono text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-not-allowed"
                    title="Nomor HP Pelanggan tidak tersedia"
                  >
                    <Send size={14} /> No WA (-)
                  </button>
                )}
              </div>

              <button
                onClick={handleResetPos}
                className="btn-arcade w-full bg-[#CCFF00] hover:bg-[#b3e600] text-slate-900 font-mono font-bold text-xs uppercase py-3 rounded-xl flex items-center justify-center gap-1.5 shadow-[2px_2px_0px_#1E293B] border-2 border-slate-800 transition-all cursor-pointer mt-1"
              >
                <RefreshCw size={14} /> Transaksi Baru
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      {/* ── MODAL RADAR JUAL RUGI (NEGATIVE MARGIN OVERRIDE) ── */}
      {isNegativeMarginModalOpen && (
        <NegativeMarginOverrideModal
          key="negative-margin-modal"
          isOpen={isNegativeMarginModalOpen}
          onClose={() => setIsNegativeMarginModalOpen(false)}
          lossItems={lossItemsForModal}
          mode={getTierConfig(userPlan).features?.negative_margin_guard === 'CONFIRM_ONLY' ? 'CONFIRM_ONLY' : 'HARD_BLOCK'}
          onAuthorize={handleAuthorizeLoss}
        />
      )}

      {/* ── MODAL BUKA SHIFT KASIR (START SHIFT) ── */}
      {isStartShiftOpen && (
        <StartShiftModal
          key="start-shift-modal"
          isOpen={isStartShiftOpen}
          onClose={() => setIsStartShiftOpen(false)}
          cashierName={profile?.username || user?.email?.split('@')[0] || 'Kasir'}
          onShiftStarted={(newShift) => {
            setActiveShift(newShift);
            showToast(`Shift #${newShift.shift_number} berhasil dibuka!`);
          }}
        />
      )}

      {/* ── MODAL SERAH TERIMA SHIFT ESTAFET & SKIM SETORAN BOS (BLIND CLOSING) ── */}
      {isCloseShiftOpen && (
        <CloseShiftModal
          key="close-shift-modal"
          isOpen={isCloseShiftOpen}
          onClose={() => setIsCloseShiftOpen(false)}
          activeShift={activeShift}
          cashiers={cashiersList}
          tierFeatures={getTierConfig(userPlan).features || {}}
          onShiftClosed={() => {
            setActiveShift(null);
            showToast('Shift kasir berhasil ditutup dan direkonsiliasi!');
          }}
          onShiftHandover={(newShift, newCashier) => {
            setActiveShift(newShift);
            if (newCashier) {
              setProfile((prev) => ({
                ...prev,
                id: newCashier.id,
                username: newCashier.username,
                full_name: newCashier.full_name,
                role: newCashier.role,
              }));
            }
            handleResetPos();
            setIsCloseShiftOpen(false);
            showToast(`Serah terima berhasil! Kasir aktif: ${newCashier?.username || 'Kasir Pengganti'}`);
          }}
        />
      )}

      {/* ── MODAL GANTI ID TERMINAL KASIR (MULTI-TERMINAL) ── */}
      {isEditRegisterOpen && (
        <div className="fixed inset-0 z-[11000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 border-2 border-slate-800 shadow-[6px_6px_0px_#1E293B] space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h3 className="font-display font-black text-base text-slate-900 flex items-center gap-2">
                <Monitor size={18} /> Ganti ID Terminal
              </h3>
              <button
                onClick={() => setIsEditRegisterOpen(false)}
                className="text-slate-500 hover:text-slate-800 p-1 cursor-pointer"
                aria-label="Tutup edit ID terminal"
              >
                <X size={16} strokeWidth={2.5} />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              ID Terminal memisahkan pembukuan laci kas jika toko memiliki lebih dari 1 komputer kasir (contoh: REGISTER_01, REGISTER_02).
            </p>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-700 mb-1">
                Nama / ID Terminal
              </label>
              <input
                type="text"
                value={newRegisterInput}
                onChange={(e) => setNewRegisterInput(e.target.value.toUpperCase())}
                className="w-full h-11 bg-slate-50 border-2 border-slate-800 rounded-xl px-3 text-sm font-mono font-bold text-slate-900 outline-none uppercase focus:ring-2 focus:ring-[#CCFF00]"
                placeholder="REGISTER_MAIN"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditRegisterOpen(false)}
                className="btn-arcade flex-1 py-2.5 rounded-xl border-2 border-slate-800 bg-white hover:bg-slate-100 font-mono font-bold text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  const val = newRegisterInput.trim() || 'REGISTER_MAIN';
                  setRegisterId(val);
                  setRegisterIdState(val);
                  setIsEditRegisterOpen(false);
                  showToast(`Terminal dialihkan ke: ${val}`);
                  // Refresh active shift for the new register ID
                  api.getCurrentShift(val).then((sh) => setActiveShift(sh || null)).catch(() => {});
                }}
                className="btn-arcade flex-1 py-2.5 rounded-xl border-2 border-slate-800 bg-[#CCFF00] hover:bg-[#b3e600] font-mono font-black text-xs cursor-pointer shadow-[2px_2px_0px_#1E293B]"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL MUTASI KAS MASUK / KELUAR LACI ── */}
      {isCashDrawerModalOpen && (
        <CashDrawerMovementModal
          key="cash-drawer-modal"
          isOpen={isCashDrawerModalOpen}
          onClose={() => setIsCashDrawerModalOpen(false)}
          activeShift={activeShift}
          onMovementAdded={(mov) => {
            showToast(`Kas ${mov.movement_type === 'CASH_IN' ? 'Masuk' : 'Keluar'} Rp ${mov.amount?.toLocaleString('id-ID')} dicatat.`);
          }}
        />
      )}

      {/* ── MODAL PAYWALL ── */}
      {isPaywallOpen && (
        <PaywallModal 
          isOpen={isPaywallOpen}
          onClose={() => setIsPaywallOpen(false)}
          title={paywallConfig.title}
          message={paywallConfig.message}
          targetPlan={paywallConfig.targetPlan}
          priceLabel={paywallConfig.priceLabel}
        />
      )}

      {/* ── MODAL UPGRADE KONTRAK (#51 ATOMIC LOCK) ── */}
      {isUpgradeModalOpen && (
        <UpgradePromptModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          errorData={upgradeModalData}
        />
      )}

      {/* ── MODAL PELACAK TABUNG & GALON (FASE 1) ── */}
      {selectedCustomer && isAssetLoanModalOpen && (
        <AssetLoanModal
          customer={selectedCustomer}
          isOpen={isAssetLoanModalOpen}
          initialMode={assetLoanModalMode}
          onClose={() => setIsAssetLoanModalOpen(false)}
          onSuccess={async (res) => {
            // Update customer data in local state
            if (res?.updated_loaned_assets) {
              const updatedCust = {
                ...selectedCustomer,
                loaned_assets: res.updated_loaned_assets,
              };
              setSelectedCustomer(updatedCust);
              setCustomers((prev) =>
                prev.map((c) => (c.id === selectedCustomer.id ? updatedCust : c))
              );
            }
          }}
        />
      )}

      {/* ── MODAL SMART CHANGE (FASE 2: CELENGAN & KEMBALIAN) ── */}
      {isSmartChangeOpen && (
        <SmartChangeModal
          isOpen={isSmartChangeOpen}
          onClose={() => setIsSmartChangeOpen(false)}
          totalOmzet={Math.max(0, totals.totalOmzet - useCustomerBalance)}
          cashReceived={Number(cashTendered || 0)}
          selectedCustomer={selectedCustomer}
          customerPiutang={customerPiutang}
          customerBalance={customerBalance}
          customerDebts={customerDebts}
          onConfirmAllocation={handleSmartChangeAllocation}
        />
      )}

      {/* ── MODAL KONFIGURASI PRINTER THERMAL (ESC/POS) ── */}
      {isPrinterSettingsOpen && (
        <PrinterSettingsModal
          key="printer-settings-modal"
          isOpen={isPrinterSettingsOpen}
          onClose={() => setIsPrinterSettingsOpen(false)}
        />
      )}

      {/* ── MODAL SETUP IDENTITAS CABANG KASIR (TAHAP 7) ── */}
      <BranchSetupModal
        isOpen={isBranchSetupOpen}
        isRebinding={isBranchRebinding}
        onClose={() => {
          setIsBranchSetupOpen(false);
          setIsBranchRebinding(false);
        }}
        onSuccess={async (res) => {
          setAssignedBranchId(res.branchId);
          setAssignedBranchInfo(res.branch);
          setAssignedRegisterName(res.registerName);
          setIsBranchSetupOpen(false);
          setIsBranchRebinding(false);

          // Reload produk terikat cabang
          try {
            const bProds = await getBranchProductCatalog(supabase, res.branchId);
            if (bProds && bProds.length > 0) {
              setProducts(bProds);
            }
          } catch (loadErr) {
            console.warn('[POS Reload Branch Prods Error]', loadErr);
          }
          showToast(`Terminal kasir terikat ke Cabang: ${res.branch?.branch_name || res.branch?.name || 'Utama'}`);
        }}
      />

      {/* ── OVERLAY LOCKDOWN TERMINAL DIBEKUKAN (TAHAP 5 CITADEL) ── */}
      <FreezeRegisterOverlay
        isFrozen={isRegisterFrozen}
        registerCode={registerId}
        freezeReason={freezeReason}
        onUnfreezeSuccess={() => {
          setIsRegisterFrozen(false);
          setFreezeReason('');
          api.toggleFreezeRegister({ register_code: registerId, is_frozen: false }).catch(() => {});
          showToast('Kunci keamanan terminal kasir berhasil dibuka!');
        }}
      />

    </div>
  );
}
