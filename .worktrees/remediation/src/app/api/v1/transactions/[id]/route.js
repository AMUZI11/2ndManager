// GET    /api/v1/transactions/[id]  — detail bon
// PUT    /api/v1/transactions/[id]  — edit bon (recalculate)
// DELETE /api/v1/transactions/[id]  — hapus bon
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import {
  calculateCascadingDiscount,
  calculateTransactionTotals,
  formatTransaction,
} from '@/lib/calculations';
import { transactionSchema } from '@/lib/validation';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, customer: { include: { discounts: true } } },
    });
    if (!tx) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(formatTransaction(tx));
  } catch (error) {
    console.error('[GET /transactions/:id]', error);
    return errorResponse('Gagal memuat detail transaksi.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = transactionSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { nomor_bon, tanggal, customer_id, ongkir, deskripsi, is_bonus, items } = parsed.data;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);

    // Cek duplikat nomor bon jika diubah
    if (nomor_bon && nomor_bon.trim() !== existing.nomor_bon) {
      const dup = await prisma.transaction.findUnique({ where: { nomor_bon: nomor_bon.trim() } });
      if (dup) {
        return errorResponse(`Nomor bon "${nomor_bon}" sudah digunakan.`, 'CONFLICT', 409);
      }
    }

    // Jika items dikirim, recalculate
    let updateData = {};
    if (nomor_bon !== undefined) updateData.nomor_bon = nomor_bon.trim();
    if (tanggal !== undefined) updateData.tanggal = new Date(tanggal);
    if (customer_id !== undefined) updateData.customer_id = customer_id;
    if (deskripsi !== undefined) updateData.deskripsi = deskripsi;
    if (is_bonus !== undefined) updateData.is_bonus = is_bonus;

    let items_with_calcs = null;
    let omzet_total, laba_total, amount_owed;

    if (items !== undefined) {
      const effectiveCustomerId = customer_id || existing.customer_id;
      const customer = effectiveCustomerId ? await prisma.customer.findUnique({
        where: { id: effectiveCustomerId },
        include: { discounts: true },
      }) : null;

      // Build dynamic discounts map: { [categoryCode]: number[] }
      const discountsMap = {};
      (customer?.discounts || []).forEach(d => {
        if (!discountsMap[d.product_type]) discountsMap[d.product_type] = [];
        discountsMap[d.product_type].push({ step_order: d.step_order, pct: Number(d.percentage) });
      });
      for (const code of Object.keys(discountsMap)) {
        discountsMap[code] = discountsMap[code].sort((a, b) => a.step_order - b.step_order).map(s => s.pct);
      }

      const processedItems = await Promise.all(items.map(async (item) => {
        const product = await prisma.product.findUnique({ where: { id: item.product_id } });
        const discountSteps = discountsMap[product.tipe] || [];
        const discounted_unit_price = item.is_bonus_item
          ? 0
          : calculateCascadingDiscount(Number(product.harga_base), discountSteps);
        return {
          product_id: product.id,
          quantity: item.quantity,
          product_type_snapshot: product.tipe,
          harga_base_snapshot: Number(product.harga_base),
          harga_modal_snapshot: Number(product.harga_modal),
          discounted_unit_price,
          is_bonus_item: item.is_bonus_item || false,
        };
      }));

      const effectiveOngkir = ongkir !== undefined ? Number(ongkir) : Number(existing.ongkir);
      const totals = calculateTransactionTotals(processedItems, effectiveOngkir);
      items_with_calcs = totals.items_with_calcs;
      omzet_total = totals.omzet_total;
      laba_total = totals.laba_total;
      amount_owed = totals.amount_owed;
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (items !== undefined && items_with_calcs) {
        // Hapus items lama dan buat baru
        await tx.transactionItem.deleteMany({ where: { transaction_id: id } });
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

        updateData.omzet_total = BigInt(omzet_total);
        updateData.laba_total = BigInt(laba_total);
        updateData.amount_owed = BigInt(amount_owed);
      }

      if (ongkir !== undefined) updateData.ongkir = ongkir;

      return tx.transaction.update({
        where: { id },
        data: updateData,
        include: { items: { include: { product: true } }, customer: true },
      });
    });

    return successResponse(formatTransaction(updated));
  } catch (error) {
    console.error('[PUT /transactions/:id]', error);
    return errorResponse('Gagal mengubah transaksi.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) return errorResponse('Transaksi tidak ditemukan.', 'NOT_FOUND', 404);
    await prisma.transaction.delete({ where: { id } });
    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /transactions/:id]', error);
    return errorResponse('Gagal menghapus transaksi.', 'SERVER_ERROR', 500);
  }
});
