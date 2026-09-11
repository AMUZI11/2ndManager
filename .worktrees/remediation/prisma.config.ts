// prisma.config.ts — Konfigurasi Prisma 7
// Dibutuhkan di Prisma v7+ untuk menggantikan datasource di schema.prisma

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: './prisma/schema.prisma',
  migrations: {
    seed: 'node prisma/seed.js',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
