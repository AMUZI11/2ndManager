// src/lib/supabase/admin.js
// Service Role client — HANYA digunakan di server-side (API routes, Server Actions)
// JANGAN ekspos ke client! Client ini mem-bypass seluruh RLS.
import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('FATAL: SUPABASE_SERVICE_ROLE_KEY is missing.');
}

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
