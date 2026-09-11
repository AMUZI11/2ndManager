import localFont from "next/font/local";
import "./globals.css";
import PwaRegister from "@/components/pos/PwaRegister";

// Supreme Typography Trinity: 100% Self-Hosted & Zero Layout Shift
const satoshi = localFont({
  src: [
    {
      path: "../../public/fonts/Satoshi-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/Satoshi-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

const clashDisplay = localFont({
  src: [
    {
      path: "../../public/fonts/ClashDisplay-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashDisplay-Semibold.woff2",
      weight: "600",
      style: "normal",
    },
    {
      path: "../../public/fonts/ClashDisplay-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-clash",
  display: "swap",
});

const geistMono = localFont({
  src: [
    {
      path: "../../public/fonts/GeistMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/GeistMono-Bold.woff2",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-geist-mono",
  display: "swap",
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0B0F17',
};

export const metadata = {
  metadataBase: new URL('https://2ndmanager.com'),
  title: {
    template: '%s | 2ndManager - OS Kasir Warung Anti-Bocor',
    default: '2ndManager | Software Kasir & Operasional Warung Kelontong Anti-Bocor',
  },
  description: 'Sistem POS warung kelontong anti-bocor: pelacak tabung gas rolling, konsinyasi kue basah, celengan kembalian kasbon, serah terima shift blind estafet, dan radar belanja pasar subuh otomatis.',
  keywords: ['aplikasi kasir warung', 'software pos kelontong', 'aplikasi toko sembako', 'pos anti maling', '2ndmanager', 'kasir offline warung'],
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '2ndManager POS',
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  openGraph: {
    title: '2ndManager - Kelola Warung Tanpa Kebocoran Kas',
    description: 'Amankan uang laci kasir dan otomatisasi kulakan pasar subuh. Tanpa biaya API WhatsApp.',
    url: 'https://2ndmanager.com',
    siteName: '2ndManager',
    locale: 'id_ID',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: '2ndManager Arcade Brutalist POS',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '2ndManager - OS Kasir Warung Anti-Bocor',
    description: 'Cegah uang kas tekor dan kelola operasional warung dengan tenang.',
    images: ['/og-image.png'],
  },
};

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '2ndManager',
  operatingSystem: 'Web, Android, iOS, Windows',
  applicationCategory: 'BusinessApplication',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'IDR',
  },
  featureList: [
    'Multi-Tier Units',
    'Double-Blind Estafet Handover',
    'Asset Loan Tracker',
    'Pasar Subuh Reorder',
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="id" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){function s(){var r=document.getElementById('rss-app');if(r){if(r.innerHTML.indexOf('__next_metadata_boundary__')!==-1||r.querySelector('template[data-dgst]')){r.removeAttribute('id');r.setAttribute('hidden','');}else if(r.parentNode===document.body&&r.previousSibling===null){r.remove();}}}try{s();if(typeof MutationObserver!=='undefined'){var o=new MutationObserver(s);o.observe(document.documentElement,{childList:true,subtree:true,attributes:true});window.addEventListener('load',function(){setTimeout(function(){o.disconnect();},2500);});}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${satoshi.variable} ${clashDisplay.variable} ${geistMono.variable} font-sans bg-canvas text-ink antialiased relative min-h-screen selection:bg-[#CCFF00] selection:text-slate-900`}
      >
        <PwaRegister />
        {/* The Static Ambient Canvas Orbs (GPU Force-Locked & Zero Repaint) */}
        <div
          aria-hidden="true"
          className="ambient-canvas fixed inset-0 z-0 pointer-events-none overflow-hidden transform-gpu translate-z-0"
        >
          {/* Orange Ambient Glow (Top Right) */}
          <div className="absolute -top-36 -right-36 w-[550px] h-[550px] rounded-full bg-gradient-to-br from-orange-500/25 to-amber-500/15 blur-[120px] transform-gpu translate-z-0" />
          {/* Purple Ambient Glow (Bottom Left) */}
          <div className="absolute -bottom-36 -left-36 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-600/20 to-indigo-600/10 blur-[130px] transform-gpu translate-z-0" />
        </div>

        {/* Root Content Container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}

