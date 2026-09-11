// src/lib/supabase/client.js
// Browser-side Supabase client — gunakan di Client Components ('use client')
import { createBrowserClient } from '@supabase/ssr';

let clientInstance = null;

export function createClient() {
  if (clientInstance) return clientInstance;
  clientInstance = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return clientInstance;
}

export const supabase = createClient();
