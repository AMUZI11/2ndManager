const prisma = {};
import { withSuperAdminOnly, errorResponse, successResponse } from '@/lib/auth-helpers';
import { logActivity } from '@/lib/audit';

export const POST = withSuperAdminOnly(async (request, context, user) => {
  try {
    const payload = await request.json();
    if (!payload || !payload.data) {
      return errorResponse('Berkas cadangan tidak valid atau data kosong.', 'VALIDATION_ERROR', 422);
    }

    const { productCategory, customer, customerDiscount, product, transaction, transactionItem, bonusGrant } = payload.data;

    // Run delete and insert inside a single database transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all existing records in reverse foreign key order
      await tx.transactionItem.deleteMany({});
      await tx.bonusGrant.deleteMany({});
      await tx.transaction.deleteMany({});
      await tx.customerDiscount.deleteMany({});
      await tx.customer.deleteMany({});
      await tx.product.deleteMany({});
      await tx.productCategory.deleteMany({
        where: {
          code: {
            notIn: ['LM', 'BR']
          }
        }
      });

      // 2. Insert ProductCategory (skip default ones to avoid conflicts)
      if (Array.isArray(productCategory)) {
        const customCategories = productCategory.filter(c => !['LM', 'BR'].includes(c.code));
        for (const cat of customCategories) {
          await tx.productCategory.create({
            data: {
              code: cat.code,
              name: cat.name,
              created_at: cat.created_at ? new Date(cat.created_at) : undefined,
            }
          });
        }
      }

      // 3. Insert Product
      if (Array.isArray(product)) {
        for (const p of product) {
          await tx.product.create({
            data: {
              id: p.id,
              nama: p.nama,
              harga_modal: BigInt(p.harga_modal || 0),
              harga_base: BigInt(p.harga_base || 0),
              tipe: p.tipe,
              is_deleted: p.is_deleted || false,
              created_at: p.created_at ? new Date(p.created_at) : undefined,
            }
          });
        }
      }

      // 4. Insert Customer
      if (Array.isArray(customer)) {
        for (const c of customer) {
          await tx.customer.create({
            data: {
              id: c.id,
              nama: c.nama,
              bonus_threshold: BigInt(c.bonus_threshold || 0),
              is_deleted: c.is_deleted || false,
              created_at: c.created_at ? new Date(c.created_at) : undefined,
            }
          });
        }
      }

      // 5. Insert CustomerDiscount
      if (Array.isArray(customerDiscount)) {
        for (const cd of customerDiscount) {
          await tx.customerDiscount.create({
            data: {
              id: cd.id,
              customer_id: cd.customer_id,
              product_type: cd.product_type,
              step_order: cd.step_order,
              percentage: cd.percentage,
              created_at: cd.created_at ? new Date(cd.created_at) : undefined,
            }
          });
        }
      }

      // 6. Insert Transaction
      if (Array.isArray(transaction)) {
        for (const t of transaction) {
          await tx.transaction.create({
            data: {
              id: t.id,
              nomor_bon: t.nomor_bon,
              tanggal: new Date(t.tanggal),
              customer_id: t.customer_id || null,
              ongkir: BigInt(t.ongkir || 0),
              deskripsi: t.deskripsi || null,
              is_bonus: t.is_bonus || false,
              status: t.status,
              tanggal_lunas: t.tanggal_lunas ? new Date(t.tanggal_lunas) : null,
              omzet_total: BigInt(t.omzet_total || 0),
              laba_total: BigInt(t.laba_total || 0),
              amount_owed: BigInt(t.amount_owed || 0),
              created_at: t.created_at ? new Date(t.created_at) : undefined,
            }
          });
        }
      }

      // 7. Insert TransactionItem
      if (Array.isArray(transactionItem)) {
        for (const ti of transactionItem) {
          await tx.transactionItem.create({
            data: {
              id: ti.id,
              transaction_id: ti.transaction_id,
              product_id: ti.product_id || null,
              quantity: ti.quantity,
              product_type_snapshot: ti.product_type_snapshot,
              harga_base_snapshot: BigInt(ti.harga_base_snapshot || 0),
              harga_modal_snapshot: BigInt(ti.harga_modal_snapshot || 0),
              discounted_unit_price: BigInt(ti.discounted_unit_price || 0),
              line_omzet: BigInt(ti.line_omzet || 0),
              line_laba: BigInt(ti.line_laba || 0),
              is_bonus_item: ti.is_bonus_item || false,
              created_at: ti.created_at ? new Date(ti.created_at) : undefined,
            }
          });
        }
      }

      // 8. Insert BonusGrant
      if (Array.isArray(bonusGrant)) {
        for (const bg of bonusGrant) {
          await tx.bonusGrant.create({
            data: {
              id: bg.id,
              customer_id: bg.customer_id,
              transaction_id: bg.transaction_id,
              bonuses_granted: bg.bonuses_granted,
              omzet_consumed: BigInt(bg.omzet_consumed || 0),
              granted_at: bg.granted_at ? new Date(bg.granted_at) : undefined,
            }
          });
        }
      }
    }, {
      timeout: 30000 // 30 seconds transaction timeout for remote db network safety
    });

    await logActivity(user.username, 'Pemulihan Data', `Berhasil memulihkan seluruh data sistem dari berkas cadangan oleh ${payload.backup_by || 'Operator'}`);

    return successResponse({ message: 'Seluruh data sistem berhasil dipulihkan.' });
  } catch (error) {
    console.error('[POST /admin/restore]', error);
    return errorResponse(`Gagal memulihkan data cadangan: ${error.message}`, 'SERVER_ERROR', 500);
  }
});
