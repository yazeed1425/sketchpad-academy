# Discover UI — Design System
**Source:** Figma file — PLACEHOLDER DS (`eqhoHsnDM5HRX4nTiA09J8`) + Discover UI (`mnhCLJo89QJuvWeOLWOk3m`)
**Themes:** Light mode (default) · Dark mode
**Brand variants:** Placeholder · DGA (separate primitive palettes per brand)
**Context:** This file governs the Discover UI — the consumer/researcher-facing product. It shares the same base design system tokens and component library as the Admin UI, with specific overrides and page patterns documented in Sections 9–13. Always load this file at the start of any Discover UI design session. Do NOT use the Admin DS file for Discover work.

---

## 1. Brand Identity

PLACEHOLDER is a B2B SaaS product (part of Naseej) with a professional, trust-driven visual language. The design system is built on top of a structured token architecture: **Primitives → Semantic tokens → Component tokens**.

- **Primary font:** Inter (all weights)
- **Direction:** LTR-first, RTL-aware
- **Grid:** 8px base unit
- **Design tool:** Figma (with Variables & Styles)

---

## 2. Color System

### 2.1 Primitive Colors — Brand (Placeholder)

| Token | Hex | Usage |
|---|---|---|
| Brand/25 | `#F2F5FA` | Lightest tint backgrounds |
| Brand/50 | `#E9EFF8` | Subtle hover backgrounds |
| Brand/100 | `#D0DCEF` | Light accents, tags |
| Brand/200 | `#B4C8E6` | Borders on brand surfaces |
| Brand/300 | `#93B1DD` | Disabled brand states, secondary-color button border |
| Brand/400 | `#6898D4` | Secondary brand elements |
| Brand/500 | `#0079CA` | **Primary brand color** |
| Brand/600 | `#006FB8` | Hover on primary; Admin primary button bg |
| Brand/700 | `#0063A5` | Pressed states; secondary-color button text |
| Brand/800 | `#005690` | Dark brand surfaces |
| Brand/900 | `#004675` | Darkest brand text/icons; book title color |
| Brand/950 | `#003052` | Ultra-dark brand backgrounds |

### 2.2 Blue Dark Scale (Discover primary CTA)

| Token | Hex | Usage |
|---|---|---|
| utility-blue-dark-50 | `#EFF4FF` | Selected state highlight (tree item) |
| utility-blue-dark-300 | `#84ADFF` | **Metric card (CTA) border** |
| utility-blue-dark-600 | `#155EEF` | **Primary button background** (Discover), active tab bg |
| utility-blue-dark-700 | `#004EEB` | Due date text, batch selection "Clear Selection" link |

### 2.3 Primitive Colors — Neutral Gray (Placeholder, Light Mode)

| Token | Hex | Usage |
|---|---|---|
| Gray/25 | `#FCFCFC` | Page canvas |
| Gray/50 | `#FAFAFA` | Active tab bg, badge bg, utility-gray-50 |
| Gray/100 | `#F5F5F5` | **Discover viewport/sidebar background** |
| Gray/200 | `#E9EAEB` | Dividers, borders, badge borders |
| Gray/300 | `#D6D8DC` | Subtle borders |
| Gray/400 | `#A4A7AE` | Placeholder, disabled text |
| Gray/500 | `#717680` | Tertiary text, nav subheadings, table header text |
| Gray/600 | `#535862` | Secondary text, date/metadata values |
| Gray/700 | `#414651` | Body text, nav labels, table cell primary text |
| Gray/800 | `#252B37` | Heading text, active nav item text |
| Gray/900 | `#181D27` | **Primary text**, page titles, table row titles |
| Gray/950 | `#0A0D12` | Highest contrast |

### 2.4 Semantic Status Colors

| Category | 500 (Default) | 600 (Text/Border) | Hex 500 |
|---|---|---|---|
| **Error** | Error/500 | Error/600 | `#F04438` |
| **Warning** | Warning/500 | Warning/600 | `#F79009` — Overdue text |
| **Success** | Success/500 | Success/600 | `#17B26A` |

### 2.5 Utility Color Scales

| Token | Hex | Usage |
|---|---|---|
| utility-blue-50 | `#EFF8FF` | Filter badge bg |
| utility-blue-200 | `#B2DDFF` | Filter badge border |
| utility-blue-700 | `#175CD3` | Filter badge text |
| utility-blue-light-50 | `#F0F9FF` | Filter badge variant bg |
| utility-blue-light-200 | `#B9E6FE` | Filter badge variant border |
| utility-green-50 | `#EDFCF2` | Metric card icon bg (green) |
| utility-green-400 | `#47CD89` | ILS source badge icon bg |
| utility-fuchsia-50 | `#FDF4FF` | Metric card icon bg (fuchsia) |
| utility-purple-50 | `#F4F3FF` | Personalization icon bg |
| brand-50 | `#E9EEF7` | Tag/badge bg (brand) |
| brand-200 | `#B4C8E6` | Tag/badge border (brand) |
| brand-700 | `#0063A5` | Tag/badge text (brand) |
| utility-blue-dark-50 | `#EFF4FF` | Batch selection header bg |

### 2.6 Semantic Color Tokens

#### Text
| Token | Light Mode |
|---|---|
| `text-primary (900)` | `#181D27` |
| `text-secondary (700)` | `#414651` |
| `text-tertiary (600)` | `#535862` |
| `text-quaternary (500)` | `#717680` |
| `text-brand-primary (900)` | `#004675` (Brand/900) |
| `text-secondary_hover` | `#252B37` (Gray/800) — active nav item |

#### Borders
| Token | Light Mode |
|---|---|
| `border-primary` | `#D5D7DA` |
| `border-secondary` | `#E9EAEB` |
| `border-tertiary` | `#F5F5F5` |
| `border-brand` | Brand/500 |
| `border-error` | Error/500 |

#### Discover-specific: AI Input Border
| Token | Value | Use |
|---|---|---|
| AI input border | `#5EFCE8` (teal) | AI chat input box border only |

#### Component Button Colors (Discover overrides)
| Token | Value |
|---|---|
| `button-primary-bg` (Discover) | `#155EEF` |
| `button-primary-bg_hover` | `#1649C0` |
| `button-primary-fg` | White |
| `button-secondary-color-bg` | White |
| `button-secondary-color-border` | `#93B1DD` (Brand/300) |
| `button-secondary-color-fg` | `#0063A5` (Brand/700) |
| `button-secondary-bg` | White |
| `button-secondary-fg` | `#414651` (Gray/700) |
| `button-secondary-border` | `#D5D7DA` |

---

## 3. Typography

**Font family:** `Inter` (all styles)

### 3.1 Display Scale

| Style | Size | Line Height | Weight |
|---|---|---|---|
| Display 2xl | 72px | 90px | Regular, Medium, Semibold, Bold |
| Display xl | 60px | 72px | Regular, Medium, Semibold, Bold |
| Display lg | 48px | 60px | Regular, Medium, Semibold, Bold |
| Display md | 36px | 44px | Regular, Medium, Semibold, Bold |
| Display sm | 30px | 38px | Regular, Medium, Semibold, Bold |
| Display xs | 24px | 32px | Regular, Medium, Semibold, **Bold** — page/KB title |

### 3.2 Text Scale

| Style | Size | Line Height | Weights |
|---|---|---|---|
| Text xl | 20px | 30px | Regular, Medium, Semibold, Bold |
| Text lg | 18px | 28px | Regular, Medium, Semibold, Bold |
| Text md | 16px | 24px | Regular, Medium, Semibold, Bold |
| Text sm | 14px | 20px | Regular, Medium, Semibold, Bold |
| Text xs | 12px | 18px | Regular, Medium, Semibold, Bold |

### 3.3 Discover-Specific Typography Usage

| Element | Style | Size | Weight | Color |
|---|---|---|---|---|
| Page title (My Discover) | Display xs | 24px | Semibold | `#181D27` |
| Knowledge Base title | Display xs | 24px | **Bold** | `#181D27` |
| Hero heading | Display md | 36px, tracking -0.72px | Semibold | `#181D27` |
| Hero subheading | Text lg | 18px | Medium | `#717680` |
| Tab labels (primary nav tabs) | Text md | 16px | Semibold | Active: white or `#414651`; Inactive: `#717680` |
| Tab labels (sub-tabs w/ badge) | Text md (active) / Text sm (inactive) | 16px / 14px | Semibold | Active: `#414651`; Inactive: `#717680` |
| Card header subtext | Text sm | 14px | Regular | `#535862` |
| Metric card label | Text xs | 12px | Medium | `#535862` |
| Metric card value | Display sm / Text lg | 18–24px | Semibold | `#181D27` |
| Borrowed card title | Text md | 16px | Medium | `#004675` (Brand/900) |
| Borrowed card authors | Text xs | 12px | Regular | `#414651` |
| Borrowed card dates | Text xs | 12px | Regular | Loan date: `#414651`; Due date: `#004EEB` |
| Overdue badge text | Text xs | 12px | Medium | `#DC6803` (Warning/600) |
| Table header | Text xs | 12px | Semibold | `#717680` |
| Table cell primary | Text sm | 14px | Medium | `#181D27` |
| Table cell secondary/date | Text sm | 14px | Regular | `#535862` |
| Table file subtype | Text sm | 14px | Regular | `#535862` |
| Source/filter badge text | Text xs | 12px | Medium | `#414651` |
| Batch selection count | Text md | 16px | Medium | `#414651` |
| Batch selection action link | Text md | 16px | Semibold | `#004EEB` |
| "Load more items" button | Text sm | 14px | Semibold | `#0063A5` |
| Nav item labels (primary) | Text sm | 14px | Semibold | `#252B37` (active) / `#414651` (inactive) |
| Nav section subheadings | Text xs | 12px | Medium | `#717680` |
| Modal titles | Text lg | 18px | Semibold | `#181D27` |

---

## 4. Spacing

| Token | Value | Common Use |
|---|---|---|
| `spacing-none` | 0px | — |
| `spacing-xxs` | 2px | Micro gaps, badge py, checkbox inner offset |
| `spacing-xs` | 4px | Icon-text gaps, filter badge py |
| `spacing-sm` | 6px | Badge px (small), nav item inner py (sub-items), tab badge px |
| `spacing-md` | 8px | **Base unit** — icon-text gap, btn py, table header py |
| `spacing-lg` | 12px | Nav item px, card padding tight, table header py, btn px |
| `spacing-xl` | 16px | Default padding, table cell py, metric card p, section gaps |
| `spacing-2xl` | 20px | Nav header padding |
| `spacing-3xl` | 24px | Modal padding, table cell px, card padding |
| `spacing-4xl` | 32px | Section spacing |
| `spacing-5xl` | 40px | Page section padding |
| `spacing-6xl` | 48px | Large section gaps |
| `spacing-7xl` | 64px | Hero / major section spacing |

---

## 5. Border Radius

| Token | Value | Use |
|---|---|---|
| `radius-none` | 0px | Square elements |
| `radius-xxs` | 2px | PDF badge label on file icon |
| `radius-xs` | 4px | Small chips, keyboard shortcut badge |
| `radius-sm` | 6px | Inactive nav items, inputs, table rows, checkbox, filter section tabs |
| `radius-md` | 8px | Cards (default), dropdowns, admin buttons, pagination btn, search input, table container |
| `radius-lg` | 10px | — |
| `radius-xl` | 12px | Table container, account card |
| `radius-2xl` | 16px | Discover modals, chat history modal |
| `radius-3xl` | 20px | Featured cards |
| `radius-4xl` | 24px | **Main floating card**, AI input, **active nav item**, metric cards, borrowed card container, search history table container, primary tabs |
| `radius-full` | 9999px | **Primary/secondary CTA buttons**, avatars, mode switcher, source badges, filter badges, tag badges, batch delete button |

---

## 6. Elevation / Shadows

| Token | Description | Use |
|---|---|---|
| `shadow-xs` | `0px 1px 2px rgba(10,13,18,0.05)` | Subtle lift — inputs, badges, metric cards, account card, buttons |
| `shadow-sm` | `0px 1px 3px rgba(10,13,18,0.1), 0px 1px 2px -1px rgba(10,13,18,0.1)` | Toggle button pill |
| `shadow-md` | 4–6px blur | Dropdowns, mode switcher |
| `shadow-lg` | 2–16px blur | Menus, tooltips |
| `shadow-xl` | 3–24px blur | Modals |

**Discover-specific:**
- Viewport/sidebar = `#F5F5F5`, floating card = white → elevation from color contrast, no shadow needed on the card
- AI chat input: `drop-shadow: 0px 20px 12px rgba(133,186,255,0.08)` — blue glow
- Modals: `0px 10px 7.5px rgba(0,0,0,0.1), 0px 4px 3px rgba(0,0,0,0.1)`
- Mode switcher: `shadow-md`

---

## 7. Widths & Containers

| Token | Value | Use |
|---|---|---|
| `width-md` | 560px | Chat History modal, Add to KB modal |
| `width-sm` | 480px | Default modal |
| `paragraph-max-width` | 720px | Readable line cap |
| `container-padding-desktop` | 32px | — |

---

## 8. Component Library

> **Global rules:** `DS: Placeholder` · `Breakpoint: Desktop` (default) · `RTL: False` (default)

The full base component library is inherited from the PLACEHOLDER Design System. Refer to `Placeholder-Design-System.md` for the full spec.

### Buttons (Discover overrides)
All primary and secondary CTAs use **`radius-full`** (pill). Non-negotiable.

| Type | Bg | Border | Text | Radius |
|---|---|---|---|---|
| Primary | `#155EEF` | None | White | `radius-full` |
| Secondary outlined | White | `#93B1DD` (Brand/300) | `#0063A5` | `radius-full` |
| Secondary gray | White | `#D5D7DA` | `#414651` | `radius-full` |
| Tertiary color | Transparent | None | `#0063A5` | — |
| Admin-style (KB page only) | `#006FB8` | None | White | `radius-md` (8px) |

> **Note:** The Knowledge Base page header uses Admin-style buttons (`radius-md`, `#006FB8` bg) — not pill buttons. This is a context-specific exception for the KB management area.

### Horizontal Tabs (Discover variants)

**Pill tabs (hero/My Discover):** Each tab is a standalone pill, `radius-4xl` (24px).
- Active: `bg: #155EEF`, white text, Text md / Semibold, 16px, `px:12px py:8px`, height 44px
- Inactive: transparent bg, `#717680` text, same sizing

**Underline tabs (Borrowed/Holds, etc.):** Bottom-border style.
- Active: `border-bottom: 2px solid #155EEF`, text `#414651`, Text md / Semibold, 16px, height 36px, `pb:12px`
- Inactive: no border, `#717680` text, `px:16px pb:12px`

**Segmented tabs with badge count (Knowledge Base filters bar):** Compact pill segments.
- Container: `bg: #FAFAFA`, `border: #E9EAEB`, `radius-md` (8px), `gap: 2px`
- Active segment: white bg, `border: #D5D7DA`, `shadow-xs`, `radius-md`, `px:12px py:8px`, height 36px
- Badge inside tab: `bg: #FAFAFA`, `border: #E9EAEB`, `radius-sm` (6px), Text xs / Medium, `px:6px py:2px`
- Active tab text: Text md / Semibold, 16px, `#414651`; Inactive: Text sm / Semibold, 14px, `#717680`

---

## 9. Design Principles & Discover-Specific Usage Rules

### Do's
- Use `radius-full` for all primary and secondary action buttons (except KB page admin-style buttons)
- Use the floating card layout — main content 12px inset from all edges including sidebar
- Use radial gradient backgrounds for hero/landing sections
- Use teal border (`#5EFCE8`) exclusively on the AI input component
- Use `#F5F5F5` (Gray/100) as viewport AND sidebar background — same color, no border on sidebar
- Use `radius-4xl` for the main floating card, AI input, active nav item, metric cards
- Use pill-shaped CTAs in all modal footers
- Use `border-radius: 9999px` for source badges, filter badges, tag badges

### Don'ts
- Don't use `radius-sm` or `radius-md` for primary/secondary action buttons (except KB admin area)
- Don't give the sidebar a border, shadow, or background color different from the viewport
- Don't use the Admin edge-to-edge layout in Discover
- Don't use right-anchored full-height overlay panels in Discover
- Don't use square/rectangular button shapes for user-facing CTAs

---

## 10. RTL & Arabic Notes

- Always plan for RTL layout mirroring
- Flip directional icons (arrows, chevrons, back buttons) in RTL
- Text alignment: `right` in RTL — never use `left` as default
- Spacing and padding values remain the same but flip horizontally

---

## 11. Quick Reference — Most Used Values

```
Primary CTA (Discover):         #155EEF  (utility-blue-dark-600)
Brand primary (Admin):          #0079CA  (Brand/500)
Admin button bg:                #006FB8  (Brand/600)
Text primary:                   #181D27  (Gray/900)
Text secondary / nav labels:    #414651  (Gray/700)
Text tertiary / dates:          #535862  (Gray/600)
Table header text:              #717680  (Gray/500)
Brand/title text:               #004675  (Brand/900)
Due date text:                  #004EEB  (utility-blue-dark-700)
Overdue text:                   #DC6803  (Warning/600)
Viewport/sidebar background:    #F5F5F5  (Gray/100)
Floating card background:       #FFFFFF
AI input border:                #5EFCE8  (teal)
Border default:                 #D5D7DA

Font: Inter
Base spacing: 8px
CTA button radius (Discover): 9999px (full pill)
Admin-area button radius: 8px (radius-md)
Active nav item radius: 24px (radius-4xl)
Metric card radius: 24px (radius-4xl)
Modal radius: 16px (radius-2xl)
Main card radius: 24px (radius-4xl)
Table container radius: 12–24px (radius-xl to radius-4xl)
```

---

## 12. Discover UI — Page Layout & Patterns

**Source:** Figma file — Discover UI (`mnhCLJo89QJuvWeOLWOk3m`)
**Canvas size:** 1620×997px (desktop viewport)

---

### 12.1 The Two-Layer Mental Model

Discover UI is structured as two visual layers:

**Layer 1 (background):** Viewport + sidebar — both `#F5F5F5` (Gray/100). Same color. Sidebar has no border, no shadow, no radius. They read as one continuous background plane.

**Layer 2 (foreground):** Main white card — `#FFFFFF`, `radius-4xl` (24px), 12px gap from all edges including the sidebar edge. Pops as a floating surface purely through color contrast.

```
Layer 1 (Gray/100 = #F5F5F5) — viewport background + sidebar, same color, no border
  ┌────────────────────────────────────────────────────────────────┐
  │  [Sidebar — Gray/100, no border, no shadow, full height]       │
  │             ┌──────────────────────────────────────────┐       │
  │             │  Layer 2 — White card (radius-4xl)       │       │
  │             │  12px gap from ALL edges including       │       │
  │             │  sidebar edge                            │       │
  │             └──────────────────────────────────────────┘       │
  └────────────────────────────────────────────────────────────────┘
```

**Rule:** Sidebar and viewport background MUST be the same color at all times.

---

### 12.2 Floating Card — Exact Measurements

| Zone | Value |
|---|---|
| Total canvas | 1620×997px |
| Sidebar (`NavigationDiscover`) | 243px wide, 997px tall, x:0, y:0 |
| Gap (sidebar → card) | 12px |
| Gap (top, right, bottom) | 12px each |
| Main floating card (`Frame 22167`) | 1353×985px, starts at x:255, y:12 |
| Card background | White |
| Card border-radius | `radius-4xl` (24–25px) |
| Card border | None |
| Card shadow | None |
| Inner content start (x offset from card) | 261.5px → content column 830px wide |

---

### 12.3 NavigationDiscover — Full Specification

**Background:** `#F5F5F5` (same as viewport) · **No border** · **No shadow** · **No radius**
**Width:** 243px · **Height:** 997px

**Structure:**
```
NavigationDiscover (243×997px, Gray/100 bg, no border)
  ├── Header (20px padding all sides)
  │     ├── Hamburger/collapse button (40×40px, radius-md)
  │     └── PLACEHOLDER horizontal logo (109px wide)
  │
  ├── Navigation (16px horizontal padding)
  │     ├── Primary nav items: Home, Library, E-Resources, Scholars, Writer
  │     ├── [16px Divider spacer]
  │     ├── Projects subheading (20px h-padding, text-quaternary + add icon)
  │     ├── Projects items: New project, Discover Project, Research Project
  │     ├── [16px Divider spacer]
  │     └── Chats subheading (text-quaternary + search icon)
  │           └── Chat history items (text only, truncated)
  │
  └── Footer (16px padding)
        ├── Notifications (text-md/Semibold 16px, badge)
        ├── Settings (text-md/Semibold 16px)
        ├── Accessibility (text-md/Semibold 16px)
        └── Account card
```

**Nav item states:**
| State | Background | Radius | Text |
|---|---|---|---|
| Active | White (`bg-primary`) | `radius-4xl` (24px) — large pill | `#252B37` (text-secondary_hover) |
| Inactive | Transparent | `radius-sm` (6px) | `#414651` |
| Hover | `#FAFAFA` | `radius-sm` (6px) | `#414651` |

**Nav item spacing:**
- Outer row `py`: `spacing-xxs` (2px)
- Inner content `px`: `spacing-lg` (12px) · `py`: `spacing-md` (8px) primary / `spacing-sm` (6px) sub-items
- Icon → text gap: `spacing-md` (8px) · Icon size: 20×20px · Icon wrapper `pr`: 2px

**Account card:**
`border: #E9EAEB · shadow-xs · radius-xl (12px) · p: 12px`
Avatar: 40×40px, `radius-full`, online indicator: `#17B26A`, 10px, 1.5px white border
Name: Text sm / Semibold, `#181D27` · Email: Text sm / Regular, `#535862`

---

## 13. My Discover Page — Main Section Patterns

**Figma source:** Frames `16818:197296`, `16825:198433`, `16825:199781` in `mnhCLJo89QJuvWeOLWOk3m`

The main content column is 830px wide, centered within the floating card at x:261.5, with 24px top padding.

---

### 13.1 Page Header

```
Header section (830px wide, pt: 28px)
  └── Container (gap: 20px, flex-col)
        ├── Page header (830×32px)
        │     └── Title: Display xs / Semibold, 24px, #181D27 — e.g. "My Discover"
        ├── Alert / Personalization banner (optional, see 13.2)
        └── Horizontal tabs (44px height, pill style — see Section 8)
```

The page header has no actions area, no breadcrumbs — just the title text and the gap to the alert/tabs below.

---

### 13.2 Personalization Alert Banner

A dismissible card that sits between the page title and the tabs.

```
Alert banner (830×140px)
├── Background: white + radial gradient overlay (green→blue→pink→white at 30% opacity)
├── Border: 1px solid #AD00FE (purple-ish gradient border)
├── Border-radius: radius-4xl (24px)
├── Padding: 24px (spacing-3xl)
├── Gap between icon and content: 16px
│
├── Featured icon (left)
│     └── 40×40px, radius-full, bg: utility-purple-50 (#F4F3FF)
│           └── Star/sparkle icon (20×20px, purple)
│
├── Content (flex-col, gap: 12px)
│     ├── Heading: "Let's personalize your Discover feed"
│     │     — Text sm / Semibold, 24px line-height, #252B37
│     ├── Subtext: "Tell us what you're into..."
│     │     — Text sm / Regular, 14px, #414651
│     └── Action: "Personalize Now"
│           — Tertiary link style, Text sm / Semibold, #155EEF, no bg, no border
│
└── Close button (✕)
      — Absolute, top-right (7.5px from edge), 36×36px, radius-4xl (24px)
```

---

### 13.3 Metric Cards Row

A horizontal row of 4 cards, equally spaced, filling 830px with 12px gaps.

```
Metric group (830×138px, flex-row, gap: 12px)
  └── 4 × Metric card (198.5px wide each, flex-1)
```

**Standard Metric Card (info display):**
```
Metric card (198.5×138px)
├── Background: white
├── Border: 1px solid #E9EAEB (border-secondary)
├── Border-radius: radius-4xl (24px)
├── Shadow: shadow-xs
├── Padding: 16px (spacing-xl) all sides
├── Internal gap: 12px (spacing-lg)
│
├── Featured icon (top)
│     └── 48×48px, radius-full
│           Colored bg per card:
│           — Total Balance Due: utility-green-50 (#EDFCF2), green icon
│           — Overdue Items: utility-fuchsia-50 (#FDF4FF), fuchsia clock icon
│           — Membership Type: utility-purple-50 (#F4F3FF), purple user icon
│
└── Heading and number (flex-col, no gap)
      ├── Label: Text xs / Medium, 12px, #535862 (text-tertiary)
      └── Value: Display sm / Semibold, 18px, #181D27 (text-primary)
```

**CTA Metric Card (clickable, "Digital ID"):**
Same as above but:
- Border: `1px solid #84ADFF` (utility-blue-dark-300) — blue border
- Background: white (bg-primary_alt)
- Cursor: pointer
- Has arrow-expand icon (16×16px) in top-right corner
- Icon bg: `#EFF4FF` (utility-blue-dark-50) — blue tinted
- Label: "View Details" (Text xs / Medium, 12px, `#535862`)
- Value: "Digital ID" (Text lg / Semibold, 18px, `#181D27`)

---

### 13.4 Tab Bar with Underline (Borrowed/Holds)

```
Tab bar (830×36px, border-bottom: 1px solid #E9EAEB)
  └── Tabs row (gap: 12px, items-start)
        ├── Active tab: e.g. "Borrowed" with book-download icon (20×20px)
        │     — border-bottom: 2px solid #155EEF, pb: 12px
        │     — Text md / Semibold, 16px, #414651
        │     — Height: 36px
        └── Inactive tab: e.g. "Holds" with library icon
              — No border, px:16px pb:12px
              — Text md / Semibold, 16px, #717680
```

---

### 13.5 Content Card Container (Borrowed Items List)

Wraps the list of borrowed books/items.

```
Card container (830×580px)
├── Background: white
├── Border: 1px solid #E9EAEB
├── Border-radius: radius-4xl (24px)
├── Padding: px:12px py:24px
├── Internal gap: 12px
│
├── Cards list (full width, flex-col)
│     └── N × Borrowed Item Card (see 13.6)
│
└── "Load more items" button
      — Secondary-color pill button
      — White bg, border: #93B1DD (Brand/300), text: #0063A5
      — radius-full, px:14px py:10px, shadow-xs
      — Text sm / Semibold, trailing arrow-down icon (20×20px)
      — Centered, 169px wide
```

---

### 13.6 Borrowed Item Card

Each borrowed item is a horizontal row card with a book cover thumbnail.

```
Borrowed Item Card (830×160px, border-bottom: 1px solid #E9EAEB)
├── Padding: 16px (spacing-xl) all sides
├── Layout: flex-row, gap: 12px, align: items-start
│
├── Left zone: Content (flex-1, gap: 8px, flex-col)
│     │
│     ├── Header row (flex-row, gap: 8px)
│     │     ├── Checkbox (20×20px, unchecked: border #D5D7DA, radius-sm 6px)
│     │     └── Book title
│     │           — Text md / Medium, 16px, #004675 (Brand/900 = brand-title color)
│     │           — Truncated with ellipsis, flex-1
│     │
│     ├── Body (px: 28px — aligns below checkbox, gap: 0)
│     │     └── Authors: Text xs / Regular, 12px, #414651
│     │           comma-separated author names
│     │
│     └── Footer (px: 28px, flex-row, justify-between, flex-wrap, gap-y: 4px)
│           ├── Dates group (flex-row, gap: 32px)
│           │     ├── Loan Date: calendar icon (16×16) + "Loan Date: DD - MM - YYYY"
│           │     │     — Text xs / Regular, 12px, #414651
│           │     └── Due Date: calendar icon (16×16) + "Due Date: DD - MM - YYYY"
│           │           — Text xs / Regular, 12px, #004EEB (utility-blue-dark-700)
│           │
│           └── Status indicator (166px wide, flex-row, gap: 8px)
│                 Normal: clock icon (16×16) + "N Days remaining"
│                       — Text xs / Regular, 12px, #414651
│                 Overdue: alert icon (16×16) + "Overdue"
│                       — Text xs / Medium, 12px, #DC6803 (Warning/600)
│
└── Right zone: Book cover image
      ├── Container: 89×128px, border: 1px solid rgba(0,0,0,0.08)
      ├── Border-radius: radius-md (8px)
      └── Image: object-cover, rounded
```

**Checkbox state:** Unchecked = `border: #D5D7DA, border-solid, radius-sm (6px), 20×20px`
**Checked state:** `bg: #006FB8 (bg-brand-solid), overflow-clip, radius-sm, 20×20px` with white checkmark

---

### 13.7 Card Header Row (above content card)

Appears above the card container when there's a search/sort option.

```
Card header row (830×40px, flex-row, justify-between, items-center)
├── Left: Supporting text
│     — Text sm / Regular, 14px, #535862, truncated
│     — e.g. "Search history will be cleared every 30 days."
│
└── Right: Search input (320×40px)
      ├── Background: white
      ├── Border: 1px solid #D5D7DA
      ├── Border-radius: radius-4xl (24px)
      ├── Shadow: shadow-xs
      ├── Padding: px:12px py:8px
      ├── Left: search-lg icon (20×20px, gray)
      ├── Center: placeholder "Search" (Text md / Regular, 16px, #717680)
      └── Right: keyboard shortcut badge "⌘K"
            — border: #E9EAEB, radius-xs (4px), px:4px py:1px
            — Text xs / Medium, 12px, #717680
```

---

### 13.8 Search History Table

The search history is displayed as a bordered table within a white rounded card.

```
Table container (830×680px)
├── Background: white
├── Border: 1px solid #E9EAEB
├── Border-radius: radius-4xl (24px)
├── Overflow: hidden (clip)
├── Padding: pt:0 pb:16px px:0
│
├── Batch Selection Header (830×60px) — shown when items selected
│     ├── Background: utility-blue-50 (#EFF8FF)
│     ├── Padding: px:24px py:12px
│     ├── Left: Count text + "Clear Selection" link
│     │     Count: Text md / Medium, 16px, #414651 — "N Item(s) Selected"
│     │     Clear: Text md / Semibold, 16px, #004EEB
│     └── Right: "Delete Selected" button
│           — Secondary gray pill, radius-full, px:12px py:8px
│           — Leading trash icon (20×20px)
│           — Text sm / Semibold, 14px, #414651
│
├── Table content (flex-row, 4 columns)
│     ├── Column 1 — Keywords (255px wide)
│     │     Header cell: checkbox + "Keywords" label
│     │     Data cells: checkbox + keyword text (Text sm / Medium, 14px, #181D27)
│     │
│     ├── Column 2 — Source (130px wide)
│     │     Header cell: "Source"
│     │     Data cells: Source badge (see 13.9)
│     │
│     ├── Column 3 — Filters (311px wide)
│     │     Header cell: "Filters"
│     │     Data cells: row of filter badges (see 13.10)
│     │
│     └── Column 4 — Date (134px wide, sortable)
│           Header cell: "Date" + sort arrow (12×12px, arrow-down icon)
│           Data cells: "DD Jan YYYY" (Text sm / Regular, 14px, #535862)
│
└── Table footer
      └── "Load more items" button (centered, same style as 13.5)
```

**Table header cells:**
- Height: 44px · bg: white · border-bottom: 1px solid #E9EAEB
- Padding: px:24px py:12px
- Text: Text xs / Semibold, 12px, `#717680`
- First column has checkbox leading

**Table data cells:**
- Height: 72px · border-bottom: 1px solid #E9EAEB
- Padding: px:24px py:16px

---

### 13.9 Source Badge

Used in table Source column to identify content origin.

```
Source badge (pill)
├── Background: #FAFAFA (utility-gray-50)
├── Border: 1px solid #E9EAEB (utility-gray-200)
├── Border-radius: radius-full (9999px)
├── Padding: pl:3px pr:8px py:2px
├── Gap: 4px
│
├── Source dot icon (16×16px, radius-full)
│     Summon: bg: #155EEF (utility-blue-dark-600) + lightbulb/idea icon (white)
│     ILS: bg: #47CD89 (utility-success-400) + small bookmark element (white)
│
└── Label text: Text xs / Medium, 12px, #414651
      "Summon" or "ILS"
```

---

### 13.10 Filter Badge

Used in Filters column and also as active filter chips.

```
Filter badge (pill)
├── Background: varies by type (see below)
├── Border: varies
├── Border-radius: radius-full
├── Padding: px:8px py:2px
└── Text: Text xs / Medium, 12px, #175CD3 (for blue variants) or #414651 (for gray)
```

**Filter badge color variants:**
| Type | Background | Border | Text color |
|---|---|---|---|
| Default active filter | `#EFF8FF` (utility-blue-50) | `#B2DDFF` (utility-blue-200) | `#175CD3` (utility-blue-700) |
| Language / full-text | `#F0F9FF` (utility-blue-light-50) | `#B2DDFF` | `#175CD3` |
| Peer reviewed | `#F0F9FF` | `#B2DDFF` | `#175CD3` |
| Topic / subject | `#EFF8FF` | `#B2DDFF` | `#175CD3` |
| Overflow (+N more) | `#FAFAFA` | `#E9EAEB` | `#414651` |

---

### 13.11 Knowledge Base Page Layout

A different view within the Discover product — more admin-like, managing a personal knowledge base.

```
Knowledge Base page (830×917px)
├── Header (69px, border-bottom: 1px solid #E5E7EB, pb:1px pt:16px)
│     ├── Left: sidebar-toggle button (40×40px) + KB title + lock icon
│     │     Title: Display xs / Bold, 24px, #181D27 — note BOLD not Semibold
│     │     Lock icon: square-lock-01 (20×20px), gray
│     └── Right: action buttons (flex-row, gap: 8px)
│           ├── "Add" primary button: bg: #006FB8 (Admin blue), radius-md (8px), px:12px py:8px
│           │     — Leading plus icon (20×20px) + "Add" Text sm / Semibold, white
│           ├── Share icon button: secondary, radius-md, p:8px, 36×36px (user-group icon)
│           └── More options button: secondary, radius-md, p:8px, 36×36px (more-vertical icon)
│
└── Main Content (pt:24px)
      ├── Filters bar (830×36px, gap:16px) — see 13.12
      └── Table (see 13.13)
```

> **Important:** The KB page uses **Admin-style buttons** (`radius-md`, `#006FB8`) — not pill buttons. This is intentional for the admin-flavored KB management context.

---

### 13.12 Knowledge Base Filters Bar

```
Filters bar (830×36px, flex-row, justify-between, gap:16px)
│
├── Left: Segmented type tabs (All / Papers / Citations with count badges)
│     Container: bg: #FAFAFA, border: #E9EAEB, radius-md (8px), gap: 2px
│     Active tab: bg: white, border: #D5D7DA, shadow-xs, radius-md, px:16px py:8px
│           Text md / Semibold, 16px, #414651
│     Inactive tab: no bg/border, px:12px py:8px
│           Text sm / Semibold, 14px, #717680
│     Badge count: bg: #FAFAFA, border: #E9EAEB, radius-sm (6px), px:6px py:2px
│           Text xs / Medium, 12px, #414651
│
└── Right: Controls row (flex-row, gap:8px, items-center)
      ├── Toggle + label ("Missing Files")
      │     Toggle on: bg: #006FB8, radius-full, 36×20px
      │     Label: Text sm / Medium, 14px, #414651
      ├── Search icon button: secondary, radius-md, p:8px, 36×36px
      ├── Tag/label icon button: secondary, radius-md, p:8px, 36×36px
      └── View switcher (list/grid toggle)
            Container: bg: #FAFAFA, border: #E9EAEB, radius-md (8px), gap:2px
            Active view: bg: white, border: #D5D7DA, shadow-xs, radius-md, px:12px py:8px
            Inactive: no bg, px:12px py:8px
```

---

### 13.13 Knowledge Base Table

```
Table (830px wide)
├── Container: white bg, border: #E9EAEB, radius-xl (12px), shadow-xs, overflow: hidden
│
├── Table content (flex-row, 4 columns)
│     ├── Column 1 — Item Name (464px, flex-1)
│     │     Header: checkbox + "Item Name" + sort arrow
│     │     Each row: checkbox (20×20px) + file type icon (40×40px) + text
│     │           File name: Text sm / Medium, 14px, #181D27
│     │           File subtype: Text sm / Regular, 14px, #535862
│     │           e.g. "PDF file", "Note", "Article", "Book. Missing file"
│     │
│     ├── Column 2 — Tags (184px)
│     │     Header: "Tags"
│     │     Each row: 2 tag badges + "+N" overflow badge
│     │           Brand badge: bg: #E9EEF7, border: #B4C8E6, text: #0063A5
│     │           Blue badge: bg: #EFF8FF, border: #B2DDFF, text: #175CD3
│     │           Gray overflow: bg: #FAFAFA, border: #E9EAEB, text: #414651
│     │
│     ├── Column 3 — Added (118px)
│     │     Header: "Added"
│     │     Each row: "DD Mon YY" (Text sm / Regular, 14px, #535862)
│     │
│     └── Column 4 — Actions (64px)
│           Header: empty
│           Each row: more-vertical icon button (radius-sm, p:8px)
│
└── Pagination / Load More button (centered)
      — Secondary gray, radius-md, px:12px py:8px
      — "Load More" Text sm / Semibold, 14px, #414651
```

**File type icons (40×40px):**
- **PDF:** Page icon + red label badge (`bg: #D92D20`, rounded-xxs, "PDF", white 10px bold text)
- **Note/Article:** Page icon + small note icon overlay in center
- **Book (missing file):** Page icon with warning (alert-02) icon overlay
- All icons use the DS `File type icon` component

---

### 13.14 Vertical Tabs + Content Pane (Frame 1 layout)

In the first "My Discover" frame, the bottom section uses a vertical tab layout for a secondary data panel:

```
Table section (830×576px)
├── Padding: 16px
└── Content (798×544px)
      ├── Vertical tabs (200px wide, 544px tall) — left side
      │     Standard DS vertical tab component
      └── Container (582×544px) — right side, separated by 16px gap
            ├── Cards area (582×480px)
            │     └── N × Card Container (582×160px each)
            │           Same structure as Borrowed card but narrower (582px vs 830px)
            └── Footer (582×64px)
                  └── Centered action button
```

This pattern is used for displaying items within a vertical category selection (e.g., navigating between different data views via a left-side category list).

---

### 13.15 Hero / Landing Page Layout

```
Canvas (1620×1009px)
  ├── NavigationDiscover (243px, Gray/100)
  └── Floating card (1353×985px, white, radius-4xl, 12px inset)
        └── Center column (980px, offset 186.5px from left of card)
              ├── [108px top padding]
              ├── Hero heading: Display md / Semibold, 36px, tracking -0.72px, centered
              ├── Hero subheading: Text lg / Medium, 18px, centered
              ├── Mode switcher pill (340px, centered) — see 13.16
              └── AI Chat input box (780px, centered) — see 13.17
```

**Background:** Floating card may use a soft radial gradient (green→blue→white at low opacity).

---

### 13.16 Mode Switcher Pill

| Property | Value |
|---|---|
| Width | 340px |
| Container bg | `rgba(255,255,255,0.2)` |
| Container border | `1px solid rgba(255,255,255,0.4)` |
| Container radius | `radius-full` |
| Container shadow | `shadow-md` |
| Active tab bg | `#155EEF` · radius-full · shadow-sm |
| Active tab text | White, Text md / Semibold, 16px |
| Inactive tab bg | Transparent |
| Inactive tab text | `rgba(0,0,0,0.4)`, Text md / Semibold, 16px |

---

### 13.17 AI Chat Input Box

| Property | Value |
|---|---|
| Width (desktop) | 780px |
| Background | White |
| Border | `2px solid #5EFCE8` (teal) |
| Border-radius | `radius-4xl` (24px) |
| Shadow | `drop-shadow: 0px 20px 12px rgba(133,186,255,0.08)` |

**Footer row:** `[+]` add button · `[📖 Source ▾]` pill · `[🎤]` mic (radius-full) · `[↑]` send (filled pill, `#155EEF`)

---

### 13.18 Discover Modals

| Property | Value |
|---|---|
| Border-radius | `radius-2xl` (16px) |
| Background | White |
| Shadow | `0px 10px 7.5px rgba(0,0,0,0.1), 0px 4px 3px rgba(0,0,0,0.1)` |
| Backdrop | blur `8px`, semi-transparent |
| Position | Centered on screen |

**⚠ Modal layout rule: Header and footer are ALWAYS sticky. Only the body scrolls.**

---

## 14. Key Design Rules — Discover UI

1. **Viewport + sidebar = same color** (`#F5F5F5`). This is the two-layer illusion. Never make the sidebar white or give it any border.
2. **Floating card = white**, `radius-4xl` (24px), 12px inset from all edges. Never edge-to-edge.
3. **CTA buttons are always pills** (`radius-full`) — except KB page admin buttons (`radius-md`).
4. **Active nav item = white bg pill**, `radius-4xl`. Inactive = no bg, `radius-sm`.
5. **Metric cards use `radius-4xl`** (24px) and `shadow-xs` with `border-secondary`.
6. **CTA metric card has blue border** (`#84ADFF`) and arrow-expand icon — it's clickable.
7. **Borrowed card titles are Brand/900** (`#004675`) — not Gray/900. Due dates are `#004EEB`.
8. **Overdue status uses `#DC6803`** (Warning/600) with alert icon.
9. **File type icons in tables are 40×40px** with PDF/Note/Article/Book type indicators.
10. **Batch selection header** uses `#EFF8FF` (utility-blue-50) background.
11. **Modal header and footer are always sticky.** Only the body scrolls.
12. **Quick View panel slides within the card** — not a modal, no backdrop.
13. **Primary CTA = `#155EEF`** (Discover), KB-page admin buttons = `#006FB8` (Admin).
14. **Source badges** use `radius-full` with a colored 16px dot icon + label text.
15. **The sidebar has no border, no shadow, no radius** on any side.
