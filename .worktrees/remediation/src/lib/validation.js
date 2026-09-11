import { z } from 'zod';

export const loginSchema = z.object({
  username: z.string().min(1, 'Username wajib diisi.'),
  password: z.string().min(1, 'Password wajib diisi.'),
});

export const customerSchema = z.object({
  nama: z.string().min(1, 'Nama pelanggan wajib diisi.'),
  bonus_threshold: z.union([z.number(), z.string(), z.bigint()]).transform(val => {
    try {
      return BigInt(val);
    } catch {
      return 0n;
    }
  }),
  // Legacy fields (backward-compatible): LM/BR arrays
  discounts_lm: z.array(z.number().min(0).max(100)).optional().default([]),
  discounts_br: z.array(z.number().min(0).max(100)).optional().default([]),
  // New generic field: { [categoryCode]: number[] } for any custom category
  discounts: z.record(z.string(), z.array(z.number().min(0).max(100))).optional(),
});

export const productSchema = z.object({
  nama: z.string().min(1, 'Nama produk wajib diisi.'),
  harga_modal: z.union([z.number(), z.string()]).transform(val => {
    const num = Number(val);
    if (isNaN(num) || num < 0) throw new Error('Harga modal tidak boleh negatif.');
    return BigInt(Math.round(num));
  }),
  harga_base: z.union([z.number(), z.string()]).transform(val => {
    const num = Number(val);
    if (isNaN(num) || num < 0) throw new Error('Harga jual tidak boleh negatif.');
    return BigInt(Math.round(num));
  }),
  // tipe is now a free-form category code (not limited to LM/BR)
  tipe: z.string().min(1, 'Tipe/kategori produk wajib diisi.').max(50, 'Kode kategori terlalu panjang.').transform(v => v.toUpperCase().trim()),
});

export const categorySchema = z.object({
  code: z.string().min(1, 'Kode kategori wajib diisi.').max(50, 'Kode kategori maksimal 50 karakter.').transform(v => v.toUpperCase().trim()),
  name: z.string().min(1, 'Nama kategori wajib diisi.').max(100, 'Nama kategori maksimal 100 karakter.').transform(v => v.trim()),
});

export const transactionItemSchema = z.object({
  product_id: z.string().uuid('Product ID tidak valid.'),
  quantity: z.number().int().min(1, 'Jumlah produk minimal 1.'),
  is_bonus_item: z.boolean().optional().default(false),
});

export const transactionSchema = z.object({
  nomor_bon: z.string().min(1, 'Nomor bon wajib diisi.'),
  tanggal: z.string().optional().transform(val => val ? new Date(val) : new Date()),
  customer_id: z.string().uuid('Customer ID wajib diisi dan harus valid.'),
  ongkir: z.union([z.number(), z.string()]).transform(val => {
    const num = Number(val);
    if (isNaN(num) || num < 0) return 0n;
    return BigInt(Math.round(num));
  }).optional().default(0),
  deskripsi: z.string().optional().nullable(),
  is_bonus: z.boolean().optional().default(false),
  items: z.array(transactionItemSchema).min(1, 'Transaksi harus memiliki minimal 1 baris produk.'),
});

export const tutorialProgressSchema = z.object({
  onboarding_completed: z.boolean().optional(),
  onboarding_last_step: z.number().int().nonnegative().optional(),
  tutorial_id: z.string().optional(),
  tutorial_status: z.enum(['completed', 'in_progress']).optional(),
  tutorial_last_step: z.number().int().nonnegative().optional(),
});
