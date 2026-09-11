"use client";

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then(() => {
            // Service Worker terdaftar tanpa log di production
          })
          .catch((err) => {
            console.warn('[PWA] Pendaftaran Service Worker gagal:', err);
          });
      });
    }
  }, []);

  return null;
}
