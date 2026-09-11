const prisma = {};

export async function logActivity(operator, action, details) {
  try {
    await prisma.auditLog.create({
      data: {
        operator,
        action,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details),
      },
    });
  } catch (err) {
    console.error('[logActivity] Failed to log activity:', err);
  }
}
