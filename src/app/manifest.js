// src/app/manifest.js
// Web App Manifest untuk PWA Klola OS / POS Kasir Standalone

export default function manifest() {
  return {
    name: '2ndManager - OS Kasir Warung Anti-Bocor',
    short_name: '2ndManager',
    description: 'Sistem POS Offline-First & Keuangan Warung Anti-Bocor',
    start_url: '/pos',
    display: 'standalone',
    background_color: '#0B0F17',
    theme_color: '#0B0F17',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable any',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable any',
      },
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
