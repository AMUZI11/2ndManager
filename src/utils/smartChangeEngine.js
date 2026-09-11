// src/utils/smartChangeEngine.js
// Mesin Rekonsiliasi Kembalian Cerdas FIFO (First-In, First-Out Kasbon)

/**
 * Format angka nominal ke standar mata uang Rupiah
 */
export function formatRupiah(num) {
  return `Rp ${Number(num || 0).toLocaleString('id-ID')}`;
}

/**
 * Alokasikan uang kembalian secara FIFO untuk melunasi nota kasbon tertua pelanggan
 * @param {number} changeAmount - Total uang kembalian dari pembayaran belanja
 * @param {Array} activeDebts - Daftar transaksi kasbon aktif milik pelanggan
 * @returns {Object} Rincian alokasi per nota dan sisa uang
 */
export function calculateFifoDebtDeduction(changeAmount = 0, activeDebts = []) {
  const change = Math.max(0, Math.floor(Number(changeAmount) || 0));
  if (change <= 0 || !Array.isArray(activeDebts) || activeDebts.length === 0) {
    return {
      totalDeducted: 0,
      leftoverChange: change,
      allocations: [],
      hasDebts: Array.isArray(activeDebts) && activeDebts.length > 0,
    };
  }

  // 1. Urutkan kasbon berdasarkan tanggal tertua (FIFO)
  const sortedDebts = [...activeDebts].sort((a, b) => {
    const timeA = new Date(a.tanggal || a.created_at || 0).getTime();
    const timeB = new Date(b.tanggal || b.created_at || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.id || '').localeCompare(b.id || '');
  });

  let remainingChange = change;
  let totalDeducted = 0;
  const allocations = [];

  // 2. Potong kasbon secara berurutan
  for (const debt of sortedDebts) {
    if (remainingChange <= 0) break;

    const owed = Math.max(0, Number(debt.amount_owed || debt.sisa_piutang || debt.total_akhir || 0));
    if (owed <= 0) continue;

    const deduct = Math.min(remainingChange, owed);
    const remainingOwed = owed - deduct;
    const isSettled = remainingOwed === 0;

    allocations.push({
      debtId: debt.id,
      bonNumber: debt.nomor_bon || `BON-${String(debt.id).slice(0, 6).toUpperCase()}`,
      debtDate: debt.tanggal || debt.created_at || new Date().toISOString().split('T')[0],
      originalOwed: owed,
      deductedAmount: deduct,
      remainingOwed,
      isSettled,
    });

    remainingChange -= deduct;
    totalDeducted += deduct;
  }

  return {
    totalDeducted,
    leftoverChange: remainingChange,
    allocations,
    hasDebts: true,
  };
}
