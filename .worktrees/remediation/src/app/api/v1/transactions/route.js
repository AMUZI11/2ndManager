// GET  /api/v1/transactions   — list transaksi dengan filter
// POST /api/v1/transactions   — buat bon baru
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import {
  calculateCascadingDiscount,
  calculateTransactionTotals,
  formatTransaction,
  getFiveYearsAgoDate,
} from '@/lib/calculations';
import { transactionSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';

export const GET = withAuth(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const customer_id = searchParams.get('customer_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const is_bonus = searchParams.get('is_bonus');

    const fiveYearsAgo = getFiveYearsAgoDate();

    const where = {};
    if (status) where.status = status;
    if (customer_id) where.customer_id = customer_id;
    if (is_bonus) where.is_bonus = is_bonus === 'true';
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      const effectiveStart = startDate > fiveYearsAgo ? startDate : fiveYearsAgo;
      where.tanggal = { gte: effectiveStart, lte: endDate };
    } else {
      where.tanggal = { gte: fiveYearsAgo };
    }

    // Pagination
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('page_size') || '50');
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const transactions = await prisma.transaction.findMany({
      where,
      skip,
      take,
      include: {
        items: { include: { product: true } },
        customer: true,
      },
      orderBy: { tanggal: 'desc' },
    });

    return successResponse(transactions.map(formatTransaction));
  } catch (error) {
    console.error('[GET /transactions]', error);
    return errorResponse('Gagal memuat daftar transaksi.', 'SERVER_ERROR', 500);
  }
});

export const POST = withAuth(async (request, context, user) => {
  try {
    const body = await request.json();
    const parsed = transactionSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, items } = parsed.data;

    // Cek duplikat nomor bon (AC-4.2)
    const existing = await prisma.transaction.findUnique({ where: { nomor_bon: nomor_bon.trim() } });
    if (existing) {
      return errorResponse(`Nomor bon "${nomor_bon}" sudah digunakan. Silakan gunakan nomor lain.`, 'CONFLICT', 409);
    }

    // Ambil customer dan diskonnya
    const customer = await prisma.customer.findUnique({
      where: { id: customer_id, is_deleted: false },
      include: { discounts: true },
    });
    if (!customer) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }

    // Build dynamic discounts map: { [categoryCode]: number[] }
    const discountsMap = {};
    (customer?.discounts || []).forEach(d => {
      if (!discountsMap[d.product_type]) discountsMap[d.product_type] = [];
      discountsMap[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
    });
    for (const code of Object.keys(discountsMap)) {
      discountsMap[code] = discountsMap[code].sort((a, b) => a.step_order - b.step_order).map(s => s.pct);
    }

    // Proses setiap item — kalkulasi harga diskon & snapshot
    const processedItems = await Promise.all(items.map(async (item) => {
      const product = await prisma.product.findUnique({ where: { id: item.product_id } });
      if (!product) throw new Error(`Produk ${item.product_id} tidak ditemukan`);

      const discountSteps = discountsMap[product.tipe] || [];
      const discounted_unit_price = item.is_bonus_item
        ? 0
        : calculateCascadingDiscount(Number(product.harga_base), discountSteps);

      return {
        product_id: product.id,
        quantity: item.quantity,
        product_type_snapshot: product.tipe,
        harga_base_snapshot: product.harga_base,
        harga_modal_snapshot: product.harga_modal,
        discounted_unit_price: BigInt(discounted_unit_price),
        is_bonus_item: item.is_bonus_item || false,
      };
    }));

    // Hitung totals
    const { omzet_total, laba_total, amount_owed, items_with_calcs } = calculateTransactionTotals(
      processedItems.map(i => ({
        ...i,
        discounted_unit_price: Number(i.discounted_unit_price),
        harga_modal_snapshot: Number(i.harga_modal_snapshot),
      })),
      ongkir
    );

    // Simpan transaksi
    const transaction = await prisma.transaction.create({
      data: {
        nomor_bon: nomor_bon.trim(),
        tanggal: tanggal ? new Date(tanggal) : new Date(),
        customer_id: customer_id,
        ongkir: ongkir,
        deskripsi: deskripsi || null,
        is_bonus,
        status: 'Piutang',
        omzet_total: BigInt(omzet_total),
        laba_total: BigInt(laba_total),
        amount_owed: BigInt(amount_owed),
        items: {
          create: items_with_calcs.map(i => ({
            product_id: i.product_id,
            quantity: i.quantity,
            product_type_snapshot: i.product_type_snapshot,
            harga_base_snapshot: BigInt(Number(i.harga_base_snapshot)),
            harga_modal_snapshot: BigInt(Number(i.harga_modal_snapshot)),
            discounted_unit_price: BigInt(i.discounted_unit_price || 0),
            line_omzet: BigInt(i.line_omzet),
            line_laba: BigInt(i.line_laba),
            is_bonus_item: i.is_bonus_item,
          })),
        },
      },
      include: { items: { include: { product: true } }, customer: true },
    });

    // Atomic stock decrement using Prisma
    await Promise.all(items_with_calcs.map(async (item) => {
      if (item.product_id) {
        await prisma.product.update({
          where: { id: item.product_id },
          data: { stock: { decrement: item.quantity } }
        }).catch(err => console.error(`[Stock Decrement Error] product=${item.product_id}`, err));
      }
    }));

    await logActivity(user.username, 'Buat Bon', `Membuat bon "${transaction.nomor_bon}" untuk "${customer.nama}" dengan total tagihan Rp${Number(transaction.amount_owed).toLocaleString('id-ID')}`);

    return successResponse(formatTransaction(transaction), 201);
  } catch (error) {
    console.error('[POST /transactions]', error);
    if (error.code === 'P2002') {
      return errorResponse('Nomor bon sudah digunakan. Silakan gunakan nomor lain.', 'CONFLICT', 409);
    }
    return errorResponse(`Gagal menyimpan bon: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
