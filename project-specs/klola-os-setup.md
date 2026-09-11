# Klola OS - The Obsidian Terracotta Vault
## Project Specification

### 1. Brand Identity & Strict Color Tokens
- **Aesthetic:** "Old Money Terracotta Vault". Exudes generational wealth, absolute privacy, and heavy mechanical precision. Not flat, not AI slop.
- **Backgrounds (Environment):** Midnight Terracotta `#140503`, Deep Oxblood `#2A0A06`, Dark Mahogany `#3D140D`.
- **Accents (The Value):** Aged Gold `#C5A059`.
- **Typography (The Truth):** Solid Parchment/Cream `#F4F1E9`.
- **CTAs (The Action):** Heavy Brick-Terracotta `#B33622` to `#822012`.
- **Font:** Cabinet Grotesk (must be used for headings to give a heavy, vintage mechanical feel).

### 2. Advanced Design System
- **Aurora Embers:** Absolute-positioned, heavily blurred blobs (`blur-[150px] opacity-25`) of Aged Gold and Oxblood behind main containers.
- **Tinted Smoked Glass Bento:** Physical depth using `bg-[#2A0A06]/60 backdrop-blur-2xl border border-[#C5A059]/25 shadow-[inset_0_1px_1px_rgba(197,160,89,0.3),_0_25px_50px_rgba(0,0,0,0.95)]`.
- **Physical Film Grain:** Subtle SVG noise overlay (`mix-blend-overlay opacity-[0.12]`) across the entire `<body>`.
- **Tactile Mechanical Buttons (Fat UI):** `min-h-[64px] bg-gradient-to-b from-[#B33622] to-[#822012] text-[#F4F1E9] font-black text-xl px-8 rounded-xl border-t border-[#FF9985]/30 border-b-[6px] border-[#3D0A05] shadow-[0_10px_25px_rgba(0,0,0,0.8)] active:translate-y-[4px] active:border-b-[2px] transition-all flex items-center justify-center gap-3`.

### 3. Architecture & Requirements (5 Sections)
All animations MUST use Framer Motion or GSAP. GSAP preferred for scroll triggers.

#### Section 1: The Hook & The Vault (Hero)
- **Layout:** Full viewport height. Deep radial gradient background. Cinematic Center layout.
- **Rule:** Ultra-wide container for H1 (`max-w-5xl` or `max-w-6xl`) to guarantee 2-3 lines max. 
- **Copy:** 
  - Headline: "Berapa Juta Keuntungan Anda Menguap Hari Ini?"
  - Subhead: "Hentikan kebocoran. Amankan margin Anda dengan Sistem Operasi Retail berdesain Brankas Privasi."
- **Visual:** A massive, 3D-tilted Smoked Glass widget floating in the center, showing a glowing gold metric counting up: "Rp 12.450.000,00 Diselamatkan".
- **CTA:** Massive Mechanical Button: "Buka Brankas Anda (Gratis)".

#### Section 2: The Agitation (Asymmetrical Pain Points)
- **Layout:** 3-column asymmetrical CSS grid (Bento Box). MUST use `grid-flow-dense` to ensure zero empty spaces.
- **Cards (Smoked Glass):**
  1. *Kasbon Macet:* Highlight social friction of collecting debt.
  2. *Stok Selisih:* Highlight employee errors/theft.
  3. *Harga Modal Bocor:* Highlight the fear of competitors knowing base prices.
- **Interaction:** On hover, rim lighting of glass cards glows bright gold (`hover:border-[#C5A059]/70`).

#### Section 3: The Arsenal (Sticky Scroll Feature Showcase)
- **Layout:** Sticky scroll (text on the left, dynamic UI mockups on the right).
- **Showcase 1 (Zero-Mistake POS):** Highlight Fat UI buttons for high-stress cashier environments.
- **Showcase 2 (Blind-Margin Protection):** Locked/hidden base price element in the UI.
- **Showcase 3 (Strict Opname Protocol):** Cashier Draft -> Boss Approval workflow.

#### Section 4: The Concierge (WhatsApp Automation VIP Room)
- **Layout:** Floating Isometric Device.
- **Visual:** A highly polished, tilted 3D smartphone mockup displaying the "WhatsApp Daily Digest" and "Automated Debt Collector". Surrounded by blurred gold aurora glows and floating glass notifications.
- **Copy:** "Asisten pribadi Anda. Melaporkan omzet dan menagih utang otomatis via WhatsApp, setiap malam."

#### Section 5: The Vault Door (Hormozi Decoy Pricing)
- **Layout:** 3 Pricing Tiers (Starter, Plus, PRO).
- **Tier 1 & 2:** Elegant but muted. Transparent dark glass, thin borders.
- **Tier 3 (PRO):** Scaled up (`scale-105`), intense gold inner/outer glow, gem-like "PALING POPULER" badge (`bg-[#C5A059]/20 border border-[#C5A059]/60 text-[#C5A059] px-4 py-1.5 rounded-full text-xs uppercase tracking-widest`), features the massive Terracotta CTA button.

### 4. Technical Constraints
- Built in Next.js (App Router).
- Use `tailwind.config.mjs` for tokens (extend colors).
- Use GSAP for advanced animations (ScrollTrigger).
- No standard AI labels ("SECTION 01").
- Gapless grids.
- Ensure proper accessibility and contrast.
