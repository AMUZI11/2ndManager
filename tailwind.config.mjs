/** @type {import('tailwindcss').Config} */
const tailwindConfig = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/views/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Landing Page Neon Accents
        neon: {
          DEFAULT: '#CCFF00',
          hover: '#b3e600',
          light: '#e2ff3d',
        },
        // Warm Depth Palette
        navy: {
          light: '#EFF6FF',
          ice: '#DBEAFE',
          bright: '#3B82F6',
          deep: '#1E40AF',
          dark: '#1e3a8a',
        },
        amber: {
          cream: '#FFFBEB',
          soft: '#FDE68A',
          gold: '#F59E0B',
          deep: '#D97706',
        },
        emerald: {
          mint: '#D1FAE5',
          medium: '#10B981',
          deep: '#059669',
        },
        rose: {
          light: '#FEE2E2',
          medium: '#EF4444',
          deep: '#DC2626',
        },
        charcoal: {
          light: '#6B7280',
          medium: '#374151',
          dark: '#1F2937',
          black: '#111827',
        },
        // Canvas & Ambient Pop-Art System
        canvas: '#F8F9FA',
        offwhite: '#F8F9FA',
        titanium: '#FFFFFF',
        ink: '#18181B', // Zinc-900 (Ergonomic ink)
        'slate-brutal': '#1E293B', // Slate-800
        ambient: {
          orange: '#F97316',
          purple: '#7C3AED',
        },
        // Functional Execution & Status Tokens
        exec: {
          DEFAULT: '#CCFF00',
          hover: '#b3e600',
        },
        lime: {
          DEFAULT: '#CCFF00',
          hover: '#b3e600',
        },
        veronese: '#009B7D', // Success
        cadmium: '#E30022', // Danger / Bocor
      },
      fontFamily: {
        sans: ['var(--font-satoshi)', 'sans-serif'],
        display: ['var(--font-clash)', 'sans-serif'],
        heading: ['var(--font-clash)', 'var(--font-satoshi)', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        'mono-custom': ['var(--font-geist-mono)', 'monospace'],
        'serif-italic': ['Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
      boxShadow: {
        'brutal-sm': '2px 2px 0 0 #000000',
        'brutal': '4px 4px 0 0 #000000',
        'brutal-lg': '8px 8px 0 0 #000000',
        'brutal-none': '0 0 0 0 #000000',
        'brutal-hover': '0 0 0 0 #000000',
        'arcade': '4px 4px 0 0 #1E293B',
        'glass-inset': 'inset 0 1px 0 rgba(255, 255, 255, 0.6)',
      },
    },
  },
  plugins: [],
};

export default tailwindConfig;
