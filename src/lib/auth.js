// src/lib/auth.js — JWT Authentication Utilities
// Mengelola JWT token, verifikasi, dan password hashing

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

if (!process.env.JWT_SECRET) {
  throw new Error('FATAL: JWT_SECRET environment variable is missing. Application cannot start securely.');
}
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '8h'; // Session timeout 8 jam sesuai AC-1 petunjuk.md

/**
 * Membuat JWT token untuk user yang berhasil login
 */
export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Memverifikasi JWT token
 * @returns decoded payload atau null jika tidak valid / expired
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Hash password menggunakan bcrypt
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, 10);
}

/**
 * Bandingkan password plain dengan hash
 */
export async function comparePassword(plainPassword, hash) {
  return bcrypt.compare(plainPassword, hash);
}

/**
 * Middleware helper — ekstrak dan verifikasi token dari request header
 * Mengembalikan { user } atau melempar Response 401
 */
export function getAuthUser(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7);
  const user = verifyToken(token);
  return user;
}

/**
 * Wrapper higher-order untuk proteksi endpoint dengan JWT
 * Penggunaan: export const GET = withAuth(async (req, context, user) => { ... })
 */
export function withAuth(handler) {
  return async function (request, context) {
    const user = getAuthUser(request);
    if (!user) {
      return Response.json(
        { error: true, code: 'UNAUTHORIZED', message: 'Sesi tidak valid. Silakan masuk kembali.' },
        { status: 401 }
      );
    }
    return handler(request, context, user);
  };
}

/**
 * Format error response standar (sesuai petunjuk.md Bagian 9)
 */
export function errorResponse(message, code = 'ERROR', status = 400, details = null) {
  return Response.json(
    { error: true, code, message, ...(details && { details }) },
    { status }
  );
}

/**
 * Format success response standar
 */
export function successResponse(data, status = 200) {
  return Response.json({ data }, { status });
}
