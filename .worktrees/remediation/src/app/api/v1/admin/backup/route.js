const prisma = {};
import { withSuperAdminOnly, errorResponse, successResponse } from '@/lib/auth-helpers';

// Helper to convert BigInt to Number
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return Number(obj);
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    const newObj = {};
    for (const [key, value] of Object.entries(obj)) {
      newObj[key] = serializeBigInt(value);
    }
    return newObj;
  }
  return obj;
}

export const GET = withSuperAdminOnly(async (request, context, user) => {
  try {
    const [categories, customers, discounts, products, transactions, items, bonusGrants] = await Promise.all([
      prisma.productCategory.findMany(),
      prisma.customer.findMany(),
      prisma.customerDiscount.findMany(),
      prisma.product.findMany(),
      prisma.transaction.findMany(),
      prisma.transactionItem.findMany(),
      prisma.bonusGrant.findMany(),
    ]);

    const backupData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      backup_by: user.username,
      data: {
        productCategory: categories,
        customer: customers,
        customerDiscount: discounts,
        product: products,
        transaction: transactions,
        transactionItem: items,
        bonusGrant: bonusGrants,
      }
    };

    return successResponse(serializeBigInt(backupData));
  } catch (error) {
    console.error('[GET /admin/backup]', error);
    return errorResponse('Gagal mengekspor data cadangan.', 'SERVER_ERROR', 500);
  }
});
