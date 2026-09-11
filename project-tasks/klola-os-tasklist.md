# Klola OS - The Obsidian Terracotta Vault Development Tasks

## Specification Summary
**Original Requirements**: "Old Money Terracotta Vault". Exudes generational wealth, absolute privacy, and heavy mechanical precision. Not flat, not AI slop.
**Technical Stack**: Next.js (App Router), Tailwind CSS (tailwind.config.mjs), GSAP (ScrollTrigger), Framer Motion
**Target Timeline**: Standard development cycle (Not specified in spec)

## Development Tasks

### [ ] Task 1: CSS & Tokens Setup
**Description**: Implement strict color tokens and core global styles.
**Acceptance Criteria**: 
- `tailwind.config.mjs` extended with Backgrounds (Midnight Terracotta `#140503`, Deep Oxblood `#2A0A06`, Dark Mahogany `#3D140D`), Accents (Aged Gold `#C5A059`), Typography (Solid Parchment/Cream `#F4F1E9`), CTAs (Heavy Brick-Terracotta `#B33622` to `#822012`).
- Global CSS includes Cabinet Grotesk font for headings.
- Global `<body>` physical film grain SVG noise overlay (`mix-blend-overlay opacity-[0.12]`) applied.
- Aurora Embers base classes available (`blur-[150px] opacity-25` of Aged Gold and Oxblood).

**Files to Create/Edit**:
- `tailwind.config.mjs`
- `app/globals.css`
- `app/layout.tsx`

**Reference**: Section 1 & 2 of specification

### [ ] Task 2: Base Components (Button, GlassCard)
**Description**: Build reusable tactile mechanical buttons and smoked glass bento components.
**Acceptance Criteria**:
- Button Component: Tactile Mechanical Button (Fat UI) with `min-h-[64px] bg-gradient-to-b from-[#B33622] to-[#822012] text-[#F4F1E9] font-black text-xl px-8 rounded-xl border-t border-[#FF9985]/30 border-b-[6px] border-[#3D0A05] shadow-[0_10px_25px_rgba(0,0,0,0.8)] active:translate-y-[4px] active:border-b-[2px] transition-all flex items-center justify-center gap-3`.
- GlassCard Component: Tinted Smoked Glass Bento with `bg-[#2A0A06]/60 backdrop-blur-2xl border border-[#C5A059]/25 shadow-[inset_0_1px_1px_rgba(197,160,89,0.3),_0_25px_50px_rgba(0,0,0,0.95)]`.
- GlassCard Hover State: On hover, rim lighting glows bright gold (`hover:border-[#C5A059]/70`).

**Files to Create/Edit**:
- `components/ui/Button.tsx`
- `components/ui/GlassCard.tsx`

**Reference**: Section 2 of specification

### [ ] Task 3: Hero Section (The Hook & The Vault)
**Description**: Implement the cinematic center hero layout with floating 3D glass widget.
**Acceptance Criteria**:
- Full viewport height with deep radial gradient background.
- Ultra-wide container for H1 (`max-w-5xl` or `max-w-6xl`) to guarantee 2-3 lines max.
- Copy: Headline "Berapa Juta Keuntungan Anda Menguap Hari Ini?" and exact subhead.
- Visual: Massive, 3D-tilted Smoked Glass widget showing a glowing gold metric: "Rp 12.450.000,00 Diselamatkan".
- CTA: Massive Mechanical Button "Buka Brankas Anda (Gratis)".
- Aurora Embers absolute-positioned behind main containers.

**Files to Create/Edit**:
- `components/sections/HeroSection.tsx`

**Reference**: Section 3 (Section 1) of specification

### [ ] Task 4: Agitation Bento (Asymmetrical Pain Points)
**Description**: Build a gapless 3-column asymmetrical CSS grid for pain points.
**Acceptance Criteria**:
- 3-column asymmetrical CSS grid (Bento Box) using `grid-flow-dense` to ensure zero empty spaces.
- 3 GlassCards showing: "Kasbon Macet", "Stok Selisih", "Harga Modal Bocor" with respective highlights from spec.
- Hover states functional based on the GlassCard component rim lighting.

**Files to Create/Edit**:
- `components/sections/AgitationSection.tsx`

**Reference**: Section 3 (Section 2) of specification

### [ ] Task 5: Arsenal Sticky Scroll (Feature Showcase)
**Description**: Implement sticky scroll interaction with text left and UI mockups right.
**Acceptance Criteria**:
- Sticky scroll layout (text on left, mockups on right) using GSAP ScrollTrigger.
- Showcase 1: "Zero-Mistake POS" highlighting Fat UI buttons.
- Showcase 2: "Blind-Margin Protection" showing locked/hidden base price element.
- Showcase 3: "Strict Opname Protocol" displaying Cashier Draft -> Boss Approval workflow.

**Files to Create/Edit**:
- `components/sections/ArsenalSection.tsx`

**Reference**: Section 3 (Section 3) of specification

### [ ] Task 6: Concierge Isometric Phone (WhatsApp Automation)
**Description**: Create a floating isometric device section showcasing the WhatsApp bot.
**Acceptance Criteria**:
- Floating Isometric Device layout.
- Highly polished, tilted 3D smartphone mockup displaying "WhatsApp Daily Digest" and "Automated Debt Collector".
- Surrounded by blurred gold aurora glows and floating glass notifications.
- Copy: "Asisten pribadi Anda. Melaporkan omzet dan menagih utang otomatis via WhatsApp, setiap malam."

**Files to Create/Edit**:
- `components/sections/ConciergeSection.tsx`

**Reference**: Section 3 (Section 4) of specification

### [ ] Task 7: Vault Door Pricing (Hormozi Decoy Pricing)
**Description**: Implement the 3-tier pricing table with a highlighted PRO tier.
**Acceptance Criteria**:
- 3 Pricing Tiers layout (Starter, Plus, PRO).
- Tier 1 & 2: Elegant but muted. Transparent dark glass, thin borders.
- Tier 3 (PRO): Scaled up (`scale-105`), intense gold inner/outer glow.
- PRO Tier badge: "PALING POPULER" (`bg-[#C5A059]/20 border border-[#C5A059]/60 text-[#C5A059] px-4 py-1.5 rounded-full text-xs uppercase tracking-widest`).
- PRO Tier uses the massive Terracotta CTA button.

**Files to Create/Edit**:
- `components/sections/PricingSection.tsx`

**Reference**: Section 3 (Section 5) of specification

## Quality Requirements
- [ ] No standard AI labels ("SECTION 01").
- [ ] Gapless grids enforced throughout.
- [ ] Proper accessibility and contrast maintained.
- [ ] All animations MUST use Framer Motion or GSAP. GSAP preferred for scroll triggers.

## Technical Notes
**Development Stack**: Next.js (App Router), Tailwind CSS, GSAP/Framer Motion
**Special Instructions**: Focus strictly on functional requirements first. Implement the exact heavy mechanical and glassbento styles described in the spec.
**Timeline Expectations**: Tasks are scoped realistically; basic implementations without scope creep.
