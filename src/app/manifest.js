// src/app/manifest.js
// Web App Manifest untuk PWA Klola OS / POS Kasir Standalone

export default function manifest() {
  return {
    name: 'Klola OS - Smart POS & Finance OS',
    short_name: 'Klola POS',
    description: 'Sistem POS Offline-First & Keuangan Warung Autopilot',
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
