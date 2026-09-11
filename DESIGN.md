# Design System Universe: KlolaWarung

This document defines the comprehensive Design System Universe for HL Manager Pro, strictly adhering to the Master Design Brief.

## 04. Archetype & Personality
- **Archetype**: Magician x Creator
- **Personality**: Senior-Friendly Technical Finance
- **Vibe**: The interface balances precision and trustworthiness with a premium, accessible feel designed specifically for senior business owners. It acts as an authoritative financial terminal that performs complex logic effortlessly behind a clean, readable surface.

## 05. The Foundational Systems

### Spatial System (Base Unit: 4px)
To ensure rhythm and predictable senior-friendly touch targets, we use a strict 4px grid.
- `xs` = 4px
- `sm` = 8px
- `md` = 16px
- `lg` = 24px
- `xl` = 32px
- `2xl` = 48px
- `3xl` = 64px

### Typography Universe
Typography is engineered for maximum legibility and financial accuracy.
- **Primary Font**: `Fira Sans` (Sans-Serif) – Optimized for screen readability and relaxed pacing.
- **Heading & Monospace Font**: `Fira Code` (Monospace) – Used for headings to give a technical calculator feel and tabular financial data.
- **Banned Fonts**: `Inter`, `Roboto`, `Arial`, `Helvetica`.

**Type Scale (in rem)**:
- `display`: 3rem (Line Height: 1.1)
- `h1`: 2.25rem (Line Height: 1.2)
- `h2`: 1.75rem (Line Height: 1.3)
- `h3`: 1.375rem (Line Height: 1.35)
- `h4`: 1.125rem (Line Height: 1.4)
- `body-lg`: 1rem (Line Height: 1.7)
- `body`: 0.875rem (Line Height: 1.7 for senior accessibility, equivalent to 1rem visual weight)
- `caption`: 0.75rem (Line Height: 1.5)
- `micro`: 0.625rem (Line Height: 1.4)

### Color Universe Tokens
The color palette represents trust, authority, and financial precision with deep earthy tones and golds.

**Signature Scale:**
- Deep Slate Brown (`#3D1A0F`) & Rupiah Gold (`#C97B1A`)
- Tokens range from `signature-50` to `signature-900`.
  - `signature-900`: `#3D1A0F`
  - `signature-500`: `#C97B1A`
  - *Note: Exact scale steps are derived from these base colors in implementation.*

**Foundation Neutral Scale:**
- Extends from pure surface to deep ink.
- `neutral-0`: `#FFFFFF`
- `neutral-950`: `#0F172A`

**Semantic Tokens:**
- `Success`: `#059669`
- `Warning`: `#D97706`
- `Danger`: `#E11D48`
- `Info`: `#2563EB`

### Motion Universe
Motion must feel physical, purposeful, and never dizzying.
- **Timing Scale** (Max 700ms):
  - `instant`: 0ms
  - `micro`: 150ms
  - `fast`: 250ms
  - `normal`: 350ms
  - `slow`: 500ms
  - `deliberate`: 700ms
- **Easing**: Spring easing using `cubic-bezier(0.16, 1, 0.3, 1)`.
- **Accessibility**: Mandatory reduced-motion guidelines. If OS settings request reduced motion, animations must fallback to `instant` (0ms) or simple opacities to prevent nausea and cognitive overload.

## 06. Component Design System

### Architecture & Touch Targets
- **Double-Bezel Card Architecture**: Cards utilize a nested dual-layer border system (outer shell + inner core) to provide depth without heavy shadows.
- **Accessibility Minimums**: All interactive elements (buttons, links, inputs) MUST have a minimum touch target area of `44px` by `44px` to ensure physical accessibility for senior users.
- **Financial Precision**: All currency values and numeric codes must use Tabular Numbers (`tabular-nums font-mono`) to ensure vertical alignment of digits.

### State Completeness
Every component must explicitly handle the following states:
1. **Default**: Standard interactive state.
2. **Empty**: Clear illustration/copy indicating no data.
3. **Loading**: Skeletal shimmer or layout-aware placeholders (no generic spinners).
4. **Error**: Clear, contrasting error feedback (e.g., inline red text, shake animations).
5. **Success**: Positive confirmation (e.g., emerald green highlighting).
6. **Disabled**: Visually distinct, non-interactive state that maintains WCAG contrast minimums.
