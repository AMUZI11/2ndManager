# Design System: HL Manager Pro

## 1. Visual Theme & Atmosphere
HL Manager Pro utilizes an **Exaggerated Minimalist** and **Technical Finance** atmosphere tailored to senior business owners (age 50–65). The interface balances structural layout precision with large, readable elements, giving it a technical and trustworthy character. The feel is akin to a high-end financial terminal that has been distilled for extreme senior accessibility. It uses high-contrast typography, generous spacing, and smooth transition physics (spring dynamics) to create a premium, calm, and confidence-inspiring workflow.

- **Density:** Daily App Balanced (5/10) — elements are large and readable, with generous padding.
- **Variance:** Structured Offset (4/10) — layouts are structured for readability, with offset information cards to break monotony.
- **Motion:** Fluid CSS & Haptic Spring (5/10) — micro-interactions and transitions simulate real-world weight and dampening.

## 2. Color Palette & Roles
The color palette represents trust, authority, and financial precision with navy and gold.
- **Slate Canvas Background** (`#F8FAFC`) — Primary background surface.
- **Pure Surface** (`#FFFFFF`) — Cards, tables, and container fills.
- **Navy Deep Ink** (`#0F172A`) — Primary text, headings, and high-importance details.
- **Deep Steel** (`#020617`) — Ultimate dark contrast text.
- **Muted Navy** (`#1E3A8A`) — Secondary information, borders, and hover accent states.
- **Rupiah Gold Accent** (`#CA8A04`) — Single CTA accent for key actions, warnings, active states, and highlighting unpaid debt (piutang).
- **Light Navy Tint** (`#EFF6FF`) — Background for active navigation and highlighted information.
- **Whisper Border** (`#E2E8F0`) — Card borders and subtle dividing lines.

## 3. Typography Rules
- **Display & Headlines:** `Fira Code` (Monospace) — Track-tight, weight-driven hierarchy, giving a precise, technical calculator feel. Balanced display letter-spacing floor: `-0.02em`.
- **Body & Controls:** `Fira Sans` (Sans-Serif) — Large size (minimum `16px`/`1rem` for body, `18px`/`1.125rem` for large text), relaxed leading (`1.7` line-height), maximum 70ch line-width to ensure ease of reading for senior users.
- **Mono:** `Fira Code` (Monospace) — Exclusively used for rupiah currency numbers (tabular-nums), transaction codes, phone numbers, and timestamps.
- **Banned:** `Inter`, `Roboto`, `Arial`, `Helvetica`.

## 4. Component Stylings
- **Buttons:** Fully rounded pills (`rounded-full`) or clean rounded rectangles (`rounded-lg`). Primary button features Gold Accent (`#CA8A04`) with white text and a tactile scale-down on click (`active:scale-[0.98]`). Secondary buttons use transparent backgrounds with Navy Deep borders.
- **Cards:** Double-Bezel nested architecture.
  - *Outer Shell:* Subtle background (`bg-black/5` or `bg-white/5`), border (`border-white/10` or `ring-black/5`), padding (`p-1.5` or `p-2`), large outer radius (`rounded-[2rem]`).
  - *Inner Core:* Clean white surface (`bg-white`), inner highlight (`shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)]`), smaller calculated radius (`rounded-[calc(2rem-0.375rem)]`).
- **Inputs:** Label above the input field, error message in red below. Focus ring in Gold Accent. Large click targets (minimum height `48px`).
- **Loaders:** Skeletal shimmer matching the exact card/table dimensions. No generic spinning wheel loaders.
- **Empty States:** Composed illustrations/icons indicating clear actions (e.g., "Mulai tambah pelanggan baru").
- **Error States:** Displayed in red text with a visual shake animation (`animate-shake`).

## 5. Layout Principles
- **No Overlapping:** Elements occupy distinct spatial zones. No absolute stacking that obscures content.
- **Header & Title:** Navigation features a floating glass pill navbar detached from the top (`mx-auto`, `w-max`, `rounded-full`, `mt-6`) for desktop, collapsing to a sticky header on mobile.
- **Mobile-First Collapse:** Below `768px`, all layouts aggressively collapse to a single-column flow (`w-full`, `px-4`, `py-8`) with touch targets expanded to at least `48px` to ensure physical accessibility.
- **Tabular Alignment:** Financial tables must align numerically using monospace fonts.

## 6. Motion & Interaction
- **Haptic Feedback:** Interactive elements translate slightly (`-1px`) and scale down slightly (`active:scale-[0.98]`) on press.
- **Spring Physics Transitions:** All animations use a cubic-bezier transition (`transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]`).
- **Staggered Entry:** Lists and cards slide up and fade in with staggered delays (`delay-100`, `delay-150`, etc.) when loading.

## 7. Anti-Patterns (Banned)
- ❌ No emojis as icons (use precise vector SVGs like Lucide/Phosphor).
- ❌ No `Inter` or `Roboto` font usage.
- ❌ No pure black (`#000000`) for text or backgrounds.
- ❌ No neon purple/blue SaaS gradient flows or outer glows.
- ❌ No symmetrical 3-column Bootstrap grids without whitespace gaps.
- ❌ No text that overflows containers (check all copy at every viewport).
- ❌ No generic placeholder names (e.g., "John Doe" - use Indonesian names like "Budi", "Siti", "Agus").
