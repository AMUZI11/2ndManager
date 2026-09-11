// POST /api/v1/auth/login
const prisma = {};
import { comparePassword, signToken, errorResponse } from '@/lib/auth-helpers';
import { loginSchema } from '@/lib/validation';
import { logActivity } from '@/lib/audit';

const loginAttempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function getIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return '127.0.0.1';
}

function isRateLimited(ip) {
  const now = Date.now();
  const records = loginAttempts.get(ip) || [];
  // Clean old records
  const validRecords = records.filter(timestamp => now - timestamp < WINDOW_MS);
  
  if (validRecords.length >= MAX_ATTEMPTS) {
    loginAttempts.set(ip, validRecords);
    return true;
  }
  
  validRecords.push(now);
  loginAttempts.set(ip, validRecords);
  return false;
}

export async function POST(request) {
  try {
    const ip = getIp(request);
    if (isRateLimited(ip)) {
      return errorResponse('Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.', 'TOO_MANY_REQUESTS', 429);
    }
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(parsed.error.errors[0].message, 'VALIDATION_ERROR', 422, parsed.error.format());
    }
    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return errorResponse('Username atau password salah. Silakan coba lagi.', 'INVALID_CREDENTIALS', 401);
    }

    const isValid = await comparePassword(password, user.password_hash);
    if (!isValid) {
      return errorResponse('Username atau password salah. Silakan coba lagi.', 'INVALID_CREDENTIALS', 401);
    }

    // Buat atau ambil tutorial progress
    await prisma.tutorialProgress.upsert({
      where: { user_id: user.id },
      update: {},
      create: {
        user_id: user.id,
        onboarding_completed: false,
        onboarding_last_step: 0,
        tutorials_completed: [],
        tutorials_in_progress: [],
      },
    });

    const token = signToken({ id: user.id, username: user.username });

    await logActivity(user.username, 'Login', 'Berhasil masuk ke sistem');

    return Response.json({
      token,
      user: { id: user.id, username: user.username },
    }, { status: 200 });
  } catch (error) {
    console.error('[POST /auth/login]', error);
    return errorResponse('Terjadi kesalahan server. Silakan coba lagi.', 'SERVER_ERROR', 500);
  }
}
