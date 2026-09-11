// src/lib/supabase/server.js
// Server-side Supabase client — gunakan di Server Components, API Routes, Server Actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabaseClient(bearerToken = null) {
  const cookieStore = await cookies();
  const globalHeaders = bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {};

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: globalHeaders },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Jika dipanggil dari Server Component yang tidak bisa set cookie, abaikan
          }
        },
      },
    }
  );
}
