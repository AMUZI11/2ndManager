"use client";
export const dynamic = 'force-dynamic';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Barcode, Search, ShoppingBag, Plus, Minus, Trash2, CheckCircle2,
  Printer, Send, RefreshCw, LogOut, ArrowLeft, Store, UserCheck,
  AlertTriangle, ShieldCheck, AlertCircle, Sparkles, CreditCard, Wallet,
  Package, Lock, Wifi, WifiOff, PiggyBank, Coins
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { api, calculateCascadingDiscount } from '@/utils/api';
import { canAccessFeature } from '@/lib/subscription';
import { getTierConfig } from '@/config/tiers';
import PaywallModal from '@/components/ui/PaywallModal';
import UpgradePromptModal from '@/components/pos/UpgradePromptModal';
import AssetLoanModal from '@/components/customers/AssetLoanModal';
import SmartChangeModal from '@/components/pos/SmartChangeModal';
import NegativeMarginOverrideModal from '@/components/pos/NegativeMarginOverrideModal';
import StartShiftModal from '@/components/pos/StartShiftModal';
import ShiftHandoverModal from '@/components/pos/ShiftHandoverModal';
import CashDrawerMovementModal from '@/components/pos/CashDrawerMovementModal';

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

export default function PosPage() {
  const router = useRouter();
  const supabase = createClient();

  // ── States ──────────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [userPlan, setUserPlan] = useState('MAGANG');
  const [shopName, setShopName] = useState('Toko Saya');

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState('SEMUA');
  const [searchQuery, setSearchQuery] = useState('');

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

  // Struk Modal
  const [completedTx, setCompletedTx] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Upgrade Limit Modal (#51 Atomic Lock)
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeModalData, setUpgradeModalData] = useState(null);

  // Phase 3: Shift Kasir & Cash Drawer States
  const [activeShift, setActiveShift] = useState(null);
  const [isStartShiftOpen, setIsStartShiftOpen] = useState(false);
  const [isShiftHandoverOpen, setIsShiftHandoverOpen] = useState(false);
  const [isCashDrawerModalOpen, setIsCashDrawerModalOpen] = useState(false);
  const [cashiersList, setCashiersList] = useState([]);

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

  // Auto-scanner barcode ref
  const barcodeInputRef = useRef(null);

  // ── Network Status Monitor ──────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => typeof window !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
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

      // Fetch products, customers, categories, active shift, cashiers
      try {
        const [prodList, custList, catList, shiftData, cashiers] = await Promise.all([
          api.getProducts(),
          api.getCustomers(),
          api.getCategories(),
          api.getCurrentShift().catch(() => null),
          api.getCashiers().catch(() => []),
        ]);
        setProducts(prodList || []);
        setCustomers(custList || []);
        setCategories(catList || []);
        setActiveShift(shiftData || null);
        setCashiersList(cashiers || []);
      } catch (err) {
        console.error('[POS Init Error]', err);
      } finally {
        setLoading(false);
        generateAutoBonNumber();
      }
    }

    initPos();
  }, [router, supabase]);

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

  // Toast notification helper
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // ── Load Saldo Celengan & Piutang Pelanggan ──────────────────────────────────
  useEffect(() => {
    async function loadCustomerFinancials() {
      if (!selectedCustomer?.id) {
        setCustomerBalance(0);
        setCustomerPiutang(0);
        setUseCustomerBalance(0);
        return;
      }
      try {
        const res = await api.getCustomerBalance(selectedCustomer.id);
        if (res) {
          setCustomerBalance(Number(res.balance || 0));
          setCustomerPiutang(Number(res.debt || 0));
        }
      } catch (err) {
        console.error('[POS Load Customer Balance Error]', err);
      }
    }
    loadCustomerFinancials();
  }, [selectedCustomer?.id]);

  // ── Auto-Scanner & Barcode Handler ──────────────────────────────────────────
  const handleBarcodeOrSearchSubmit = (e) => {
    e?.preventDefault();
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
      showToast('⚠️ Produk / Barcode tidak ditemukan.');
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
    if (product.stock <= 0) {
      showToast(`⚠️ Stok "${product.nama}" 0 (Transaksi Tetap Berjalan)`);
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
    if (delta < 0) {
      const targetItem = cartItems.find(
        (i) => (i.cartKey || i.product_id) === key || i.product_id === key
      );
      if (targetItem) {
        queueVoidLog(targetItem.nama, Math.abs(delta));
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
    setCartItems((prevItems) =>
      prevItems.filter((i) => (i.cartKey || i.product_id) !== (item.cartKey || item.product_id))
    );
    showToast(`Dibatalkan: ${item.nama}`);
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

    const payload = {
      nomor_bon: nomorBon.trim(),
      idempotency_key: cartIdRef.current, // Koreksi Kritis #3 (server-side unique validation)
      tanggal: new Date().toISOString().split('T')[0],
      customer_id: targetCustId,
      ongkir: Number(ongkir || 0),
      deskripsi: deskripsi.trim() || null,
      is_bonus: false,
      status: paymentStatus,
      use_customer_balance: useCustomerBalance > 0 ? useCustomerBalance : 0,
      change_allocation: options.changeAllocation || null,
      owner_pin: options.ownerPin || ownerPinOverride || null,
      items: cartItems.map((item) => ({
        product_id: item.product_id,
        unit_id: item.unit_id || null,
        unit_name: item.unit_name || 'Pcs',
        multiplier_to_base: item.multiplier_to_base || 1,
        quantity: item.quantity,
        is_bonus_item: item.is_bonus_item,
      })),
    };

    const res = await api.addTransaction(payload);
    setSubmitting(false);

    if (res.success) {
      setOwnerPinOverride(null);
      const activeCust = targetCustId ? (customers.find(c => c.id === targetCustId) || selectedCustomer) : null;
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
  };

  const handleCheckout = async (checkoutOpts = {}) => {
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

  // ── Keyboard Shortcuts (F1: Search, F2: Checkout, Esc: Close Modals) ───────
  const handleCheckoutRef = useRef(handleCheckout);
  useEffect(() => {
    handleCheckoutRef.current = handleCheckout;
  }, [handleCheckout]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // F1: Auto-focus search / barcode input
      if (e.key === 'F1') {
        e.preventDefault();
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
          barcodeInputRef.current.select?.();
        }
      }
      // F2: Trigger checkout / pay submission
      else if (e.key === 'F2') {
        e.preventDefault();
        if (!submitting && cartItems.length > 0) {
          handleCheckoutRef.current();
        }
      }
      // Esc: Close receipt / phase 3 modals
      else if (e.key === 'Escape') {
        if (isReceiptModalOpen) {
          setIsReceiptModalOpen(false);
        }
        if (isShiftHandoverOpen) {
          setIsShiftHandoverOpen(false);
        }
        if (isStartShiftOpen) {
          setIsStartShiftOpen(false);
        }
        if (isCashDrawerModalOpen) {
          setIsCashDrawerModalOpen(false);
        }
        if (isNegativeMarginModalOpen) {
          setIsNegativeMarginModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [submitting, cartItems.length, isReceiptModalOpen, isShiftHandoverOpen, isStartShiftOpen, isCashDrawerModalOpen, isNegativeMarginModalOpen]);

  // Reset Sesi POS untuk transaksi berikutnya
  const handleResetPos = async () => {
    cartIdRef.current = generateUUID();
    setIsWaPopupBlocked(false);
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
      const prodList = await api.getProducts();
      if (prodList) setProducts(prodList);
    } catch (err) {
      console.error('[POS Reset Refresh Error]', err);
    }
  };

  // Formatter Rupiah
  const formatRupiah = (val) => `Rp ${Number(val || 0).toLocaleString('id-ID')}`;

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
          {/* Network Status Indicator (Online/Offline) */}
          <div className={`flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1.5 rounded-xl border-2 transition-all ${
            isOnline
              ? 'bg-emerald-50 text-emerald-900 border-emerald-500 shadow-[2px_2px_0px_#059669]'
              : 'bg-rose-50 text-rose-900 border-rose-500 shadow-[2px_2px_0px_#E11D48] animate-pulse'
          }`}>
            {isOnline ? (
              <>
                <Wifi size={14} className="text-emerald-700" />
                <span className="hidden md:inline">Online Cloud</span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="text-rose-700" />
                <span className="hidden md:inline">Offline Mode</span>
              </>
            )}
          </div>

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
              onClick={() => setIsShiftHandoverOpen(true)}
              className="btn-arcade flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border-2 border-emerald-600 shadow-[2px_2px_0px_#059669] text-xs font-mono font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Shift Aktif — Klik untuk Tutup Shift (Blind Closing)"
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
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tembak Barcode / Cari nama produk [F1] (Tekan Enter)..."
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
                  onClick={() => setCartItems([])}
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
                            <span key={t} className="px-1.5 py-0.5 bg-amber-200 border border-slate-800 text-[10px] font-mono font-black text-slate-900 rounded">
                              ⚠️ {qty}× {t}
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
              {cartItems.map((item) => {
                const itemPrice = item.is_bonus_item ? 0 : item.discounted_unit_price;
                const hasDiscount = item.discounted_unit_price < item.harga_base && !item.is_bonus_item;
                const isLoss = !item.is_bonus_item && Number(item.discounted_unit_price) < Number(item.harga_modal);
                const lossPerUnit = isLoss ? Number(item.harga_modal) - Number(item.discounted_unit_price) : 0;

                return (
                  <div
                    key={item.cartKey || item.product_id}
                    className={`rounded-xl px-3.5 py-3 flex items-center justify-between gap-3 text-sm transition-all ${
                      isLoss
                        ? 'bg-red-50/90 border-2 border-red-500 shadow-[0_0_12px_rgba(239,68,68,0.25)] animate-pulse'
                        : 'bg-slate-50 border border-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 truncate font-sans text-sm">{item.nama}</span>
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
                            ⚠️ RUGI: -{formatRupiah(lossPerUnit)}
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
                  onClick={() => window.print()}
                  className="btn-arcade bg-white hover:bg-slate-100 text-slate-900 border-2 border-slate-800 font-mono text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[2px_2px_0px_#1E293B]"
                >
                  <Printer size={14} /> Cetak
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
      <NegativeMarginOverrideModal
        key="negative-margin-modal"
        isOpen={isNegativeMarginModalOpen}
        onClose={() => setIsNegativeMarginModalOpen(false)}
        lossItems={lossItemsForModal}
        mode={getTierConfig(userPlan).features?.negative_margin_guard === 'CONFIRM_ONLY' ? 'CONFIRM_ONLY' : 'HARD_BLOCK'}
        onAuthorize={handleAuthorizeLoss}
      />

      {/* ── MODAL BUKA SHIFT KASIR (START SHIFT) ── */}
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

      {/* ── MODAL SERAH TERIMA SHIFT 60 DETIK (BLIND CLOSING) ── */}
      <ShiftHandoverModal
        key="shift-handover-modal"
        isOpen={isShiftHandoverOpen}
        onClose={() => setIsShiftHandoverOpen(false)}
        activeShift={activeShift}
        cashiers={cashiersList}
        tierFeatures={getTierConfig(userPlan).features || {}}
        onShiftClosed={(res) => {
          setActiveShift(null);
          showToast('Shift kasir berhasil ditutup dan direkonsiliasi!');
        }}
      />

      {/* ── MODAL MUTASI KAS MASUK / KELUAR LACI ── */}
      <CashDrawerMovementModal
        key="cash-drawer-modal"
        isOpen={isCashDrawerModalOpen}
        onClose={() => setIsCashDrawerModalOpen(false)}
        activeShift={activeShift}
        onMovementAdded={(mov) => {
          showToast(`Kas ${mov.movement_type === 'CASH_IN' ? 'Masuk' : 'Keluar'} Rp ${mov.amount?.toLocaleString('id-ID')} dicatat.`);
        }}
      />

      {/* ── MODAL PAYWALL ── */}
      <PaywallModal 
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        title={paywallConfig.title}
        message={paywallConfig.message}
        targetPlan={paywallConfig.targetPlan}
        priceLabel={paywallConfig.priceLabel}
      />

      {/* ── MODAL UPGRADE KONTRAK (#51 ATOMIC LOCK) ── */}
      <UpgradePromptModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        errorData={upgradeModalData}
      />

      {/* ── MODAL PELACAK TABUNG & GALON (FASE 1) ── */}
      {selectedCustomer && (
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
      <SmartChangeModal
        isOpen={isSmartChangeOpen}
        onClose={() => setIsSmartChangeOpen(false)}
        totalOmzet={Math.max(0, totals.totalOmzet - useCustomerBalance)}
        cashReceived={Number(cashTendered || 0)}
        selectedCustomer={selectedCustomer}
        customerPiutang={customerPiutang}
        customerBalance={customerBalance}
        onConfirmAllocation={handleSmartChangeAllocation}
      />

    </div>
  );
}
