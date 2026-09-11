// GET    /api/v1/customers/[id]   — detail pelanggan
// PUT    /api/v1/customers/[id]   — update pelanggan
// DELETE /api/v1/customers/[id]   — soft-delete pelanggan
const prisma = {};
import { withAuth, errorResponse, successResponse } from '@/lib/auth-helpers';
import { formatCustomer } from '@/lib/calculations';
import { customerSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';

export const GET = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id, is_deleted: false },
      include: { discounts: true },
    });
    if (!customer) return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    return successResponse(formatCustomer(customer));
  } catch (error) {
    console.error('[GET /customers/:id]', error);
    return errorResponse('Gagal memuat data pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const PUT = withAuth(async (request, { params }, user) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = customerSchema.partial().safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { nama, bonus_threshold, discounts_lm, discounts_br, discounts } = parsed.data;

    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }

    const updateData = {};
    if (nama !== undefined) updateData.nama = nama.trim();
    if (bonus_threshold !== undefined) updateData.bonus_threshold = bonus_threshold;

    // Determine which category types are being updated
    const hasDiscountUpdate = discounts_lm !== undefined || discounts_br !== undefined || discounts !== undefined;

    const updated = await prisma.$transaction(async (tx) => {
      if (hasDiscountUpdate) {
        // Build a unified map of category -> steps from all provided inputs
        const incomingMap = {};

        if (discounts_lm !== undefined) {
          incomingMap['LM'] = discounts_lm.filter(v => v >= 0 && v <= 100);
        }
        if (discounts_br !== undefined) {
          incomingMap['BR'] = discounts_br.filter(v => v >= 0 && v <= 100);
        }
        if (discounts) {
          for (const [catCode, steps] of Object.entries(discounts)) {
            incomingMap[catCode.toUpperCase()] = steps.filter(v => v >= 0 && v <= 100);
          }
        }

        const typesToDelete = Object.keys(incomingMap);

        // Delete old discounts only for categories being updated
        await tx.customerDiscount.deleteMany({
          where: { customer_id: id, product_type: { in: typesToDelete } },
        });

        // Create new discount rows
        const newDiscounts = [];
        for (const [code, steps] of Object.entries(incomingMap)) {
          steps.forEach((pct, i) => {
            newDiscounts.push({ customer_id: id, product_type: code, step_order: i + 1, percentage: pct });
          });
        }

        if (newDiscounts.length > 0) {
          await tx.customerDiscount.createMany({ data: newDiscounts });
        }
      }

      return tx.customer.update({
        where: { id },
        data: updateData,
        include: { discounts: true },
      });
    });

    await logActivity(user.username, 'Ubah Pelanggan', `Mengubah data pelanggan "${existing.nama}" (Batas Bonus: Rp${Number(existing.bonus_threshold).toLocaleString('id-ID')} -> Rp${Number(updated.bonus_threshold).toLocaleString('id-ID')})`);

    return successResponse(formatCustomer(updated));
  } catch (error) {
    console.error('[PUT /customers/:id]', error);
    return errorResponse('Gagal mengubah data pelanggan.', 'SERVER_ERROR', 500);
  }
});

export const DELETE = withAuth(async (request, { params }, user) => {
  try {
    const { id } = await params;
    const existing = await prisma.customer.findUnique({ where: { id } });
    if (!existing || existing.is_deleted) {
      return errorResponse('Pelanggan tidak ditemukan.', 'NOT_FOUND', 404);
    }
    // Soft-delete — data historis tetap ada (AC-2.3)
    await prisma.customer.update({ where: { id }, data: { is_deleted: true } });

    await logActivity(user.username, 'Hapus Pelanggan', `Menghapus pelanggan "${existing.nama}"`);

    return Response.json({ success: true });
  } catch (error) {
    console.error('[DELETE /customers/:id]', error);
    return errorResponse('Gagal menghapus pelanggan.', 'SERVER_ERROR', 500);
  }
});
