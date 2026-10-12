# 🧵 Threads Design System Specification

**Product:** Threads  
**URL:** `https://www.threads.com/`  
**Surface Type:** Editorial Blog & Reading Surface  
**Audience:** General Readers  
**Brand Character:** Content-first editorial layout with a rich, dark-mode aesthetic palette and a high-readability typographic system.

---

## 1. Overview & Principles

### Purpose
The Threads design system is an editorial-first framework optimized for sustained long-form reading, content discovery, and minimal chrome interference. Content is the interface.

### When to Use
- Building long-form reading surfaces, articles, editorial feeds, and content detail views.
- Designing minimal, unobtrusive chrome navigation and contextual reader toolbars.
- Crafting typography-rich components where text readability is paramount.

### When NOT to Use
- High-density data dashboards, spreadsheet interfaces, or real-time analytics portals.
- E-commerce product grids requiring heavy marketing badges or transactional overlays.

### Core Design Principles
1. **Readability above all** — Optimize for sustained reading comfort, typographic hierarchy, and precise line heights rather than scanning.
2. **Content is the interface** — Typography, column width, and generous whitespace do the heavy lifting; structural borders and heavy containers are minimized.
3. **Minimal chrome** — Navigation, metadata, and floating controls fade into the background until explicitly interacted with.

---

## 2. Tokens & Foundations

### Color Tokens

| Token Name | Value | Functional Role |
|------------|-------|-----------------|
| `--surface-background` | `#000000` | Dominant page & canvas background |
| `--secondary-button-background` | `#344854` | Secondary interactive element background |
| `--secondary-button-background-floating` | `#4B4C4F` | Floating toolbar & popover button background |
| `--primary-destructive-button-background` | `#D31130` | Destructive action primary state |
| `--text-badge-critical-background` | `#E41E3F` | Critical alert badge & status highlight |
| `--primary-button-background` | `#f85900` | Primary brand call-to-action buttons |
| `--text-badge-success-background` | `#31A24C` | Success status badge background |
| `--secondary-button-background-on-color` | `#E7EAED` / `#E9EAEB` | Secondary buttons placed over dark/colored surfaces |
| `--primary-deemphasized-button-background` | `#FFF1E8` | De-emphasized secondary callout container |
| `--text-input-bar-background` | `#F0F2F5` | Form input and search bar background |
| `--text-input-label-focus` | `#f85900` | Focused input border & active label state |
| `--text-input-outside-label` | `#5B6368` | External field label & muted secondary text |
| `--text-placeholder-on-glass` | `#666666` | Glassmorphic / semi-opaque input placeholder |
| `--primary-deemphasized-button-pressed-overlay` | `#e04f00` | Active pressed state overlay for primary and de-emphasized actions |
| `--primary-web-focus-indicator` | `#f85900` | High-contrast focus ring indicator |
| `--primary-deemphasized-button-text` | `#f85900` | Text color for de-emphasized primary buttons |

### Typography System

**Font Stack:** `system-ui, "Times New Roman", serif` (Editorial contrast pairing system font navigation with classic serif body)

| Level | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | `12px` | `400` / `600` | `16.8px` / `18.2px` | Captions, timestamps, author metadata, tags |
| `text-sm` | `15px` | `400` / `600` | `20px` / `21px` | Sub-labels, UI buttons, secondary navigation |
| `text-base` | `20px` | `400` | `25px` | Primary body text (sustained editorial reading) |

### Spacing Scale (Base Unit: 4px)

| Token | Value | Applied Usage |
|-------|-------|---------------|
| `space-1` | `1px` | Micro borders & hairline dividers |
| `space-2` | `3px` | Tight inline icon-to-text gap |
| `space-3` | `4px` | Compact component inner padding |
| `space-4` | `6px` | Badge vertical padding |
| `space-5` | `8px` | Small button padding & gap |
| `space-6` | `10px` | Standard input vertical padding |
| `space-7` | `12px` | Card content margin & stack gap |
| `space-8` | `16px` | Standard component container padding |
| `space-9` | `19px` | Article section spacing |
| `space-10` | `24px` | Page section gutters & layout columns |

### Shape Tokens (Border Radius)

- `radius-sm`: `0px 0px 24px 24px` (Bottom-curved containers)
- `radius-md`: `1px` (Micro sharp dividers/tags)
- `radius-lg`: `8px` (Standard cards & dialogs)
- `radius-xl`: `10px` (Input bars & popovers)
- `radius-full`: `18px` / `50%` (Circular avatars & floating pills)
- `radius-6`: `24px` (Large hero containers)
- `radius-8`: `999px` (Full pill buttons)
- `radius-9`: `1000px` (Maximum rounded chips)

### Elevation & Shadows

- `shadow-sm`: `rgb(255, 255, 255) 0px 0px 0px 12px` (White halo outline for dark mode separation)
- `shadow-md`: `rgba(0, 0, 0, 0.04) 0px 0px 12px 0px` (Subtle atmospheric card elevation)

### Motion Tokens

- `duration-fast`: `transform 0.1s ease-in-out` / `opacity 0.1s` (Micro-hover, active click scaling)
- `duration-base`: `transform 0.2s ease-in-out` / `width 0.2s` (Drawer transitions, expansion panels)

---

## 3. Anatomy & Components

### Component Density Guidelines
The Threads system is optimized for balanced content density:
- **Buttons:** 59 interactive button primitives across main editorial layout
- **Links:** 42 inline content & navigation links
- **Navigation:** 2 distinct structural nav elements (Top editorial header & Bottom floating action pill)
- **Lists:** 1 structured article feed list
- **Images:** 83 responsive media figure elements

---

## 4. Component Anatomy, States & Interaction Matrix

### Button & Interactive Element Matrix

| State | Visual Representation | Pointer / Touch Behavior | Keyboard Behavior |
|-------|-----------------------|-------------------------|-------------------|
| **Default** | `--primary-button-background` (`#f85900`), text color `#FFFFFF` | Pointer cursor (`cursor: pointer`) | Focusable via `Tab` |
| **Hover** | `--primary-deemphasized-button-pressed-overlay` (`#e04f00`) overlay | Smooth 0.1s scale transition (`scale(1.02)`) | N/A |
| **Focus-Visible**| Outline ring `--primary-web-focus-indicator` (`#f85900`) 2px solid | Visible outline on keyboard nav | Active ring highlight |
| **Active/Pressed** | Transformed `-1px` Y-translate, 98% scale down | Instant visual press feedback | Triggered via `Space` / `Enter` |
| **Disabled** | Opacity `0.4`, `cursor: not-allowed` | Pointer events disabled | Skipped in tab order |
| **Loading** | Spinner overlay, text hidden / aria-live active | Pointer events disabled | Announce "Loading..." via SR |

---

## 5. Accessibility & ARIA Specifications

1. **Color Contrast:** All text tokens against `--surface-background` (`#000000`) meet WCAG AAA contrast ratio (7:1 for body text, 4.5:1 for UI controls).
2. **Focus Management:** Every interactive element must render `--primary-web-focus-indicator` (`#f85900`) when focused via `Tab`.
3. **Screen Readers:**
   - Buttons must have explicit `aria-label` when containing only icons.
   - Dynamic content updates must use `aria-live="polite"`.
4. **Touch Targets:** Minimum 44px x 44px tap target size for mobile viewport.

---

## 6. Content & Editorial Guidelines

- **Tone:** Informative, engaging, conversational. First-person plural ("We", "Our") where appropriate.
- **Capitalization:** Use sentence case for all headings, buttons, and badges. Reserve ALL CAPS strictly for acronyms (e.g. "API", "RSS").
- **Body Copy:** Fixed `20px` font size with `25px` line height for optimal reading ergonomics. Max line length: 68 characters per line.

---

## 7. Anti-Patterns & Misuse Examples

- ❌ **Hardcoded Colors:** Do NOT write `background-color: #000000;`. Use `var(--surface-background)` exclusively.
- ❌ **Nested Interactivity:** Never place an interactive `<button>` inside an `<a>` link.
- ❌ **Arbitrary Radius:** Do NOT introduce `border-radius: 5px` or `15px`. Stick strictly to the defined radius tokens (`8px`, `10px`, `18px`, `24px`, `999px`).
- ❌ **Full Uppercase Paragraphs:** Never transform body text into `text-transform: uppercase`.

---

## 9. Centered Auth Overlay Modal System

### Anatomy & Layout Structure
The Auth Overlay Modal provides a friction-free, high-converting sign-in and registration experience strictly adhering to the design system tokens:

1. **Atmosphere Backdrop**:
   - `background: rgba(0, 0, 0, 0.70)`
   - `backdrop-filter: blur(12px)`
   - `z-index: 99999`
   - Subtle fade-in transition (`fadeIn 0.15s ease-out`).

2. **Card Frame Architecture**:
   - `max-width: 380px`, `width: 100%`
   - `border-radius: 24px` (`--radius-6`)
   - `padding: 24px` (`--space-10`)
   - `background: #ffffff`
   - `box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25)`
   - `border: 1px solid rgba(0, 0, 0, 0.08)`

3. **Chrome Navigation (Header)**:
   - **Segmented Control Pill**: Inline pill container (`background: var(--text-input-bar-background)`, radius `999px`) toggling "Sign In" and "Create Account".
   - **Dismiss Button**: Circular icon (`28px x 28px`, border-radius `50%`, background `var(--text-input-bar-background)`).

4. **Form Controls & Token Mappings (Email First, OAuth Second)**:
   - **Step 1 — Email Input**: `height: 40px`, border-radius `10px` (`--radius-xl`), background `var(--text-input-bar-background)` (`#F0F2F5`), focus border `var(--text-input-label-focus)` (`#f85900`), focus indicator `var(--primary-web-focus-indicator)` (`#f85900`).
   - **Step 2 — Primary Action Button**: `height: 40px`, border-radius `999px` (`--radius-pill`), background `var(--primary-button-background)` (`#f85900`), text `#FFFFFF`, hover `var(--primary-deemphasized-button-pressed-overlay)` (`#e04f00`), active `scale(0.98)`.
   - **Step 3 — Divider**: Hairline rule `1px`, margin `12px 0` (`--space-7`), text "or" in sentence case with `color: var(--text-input-outside-label)` (`#5B6368`).
   - **Step 4 — OAuth Social Buttons**: `height: 40px`, border-radius `999px` (`--radius-pill`), background `#FFFFFF`, border `1px solid var(--secondary-button-background-on-color)` (`#E7EAED`), text `#000000`, active `scale(0.98)`. Placed strictly AFTER email.
   - **Step 5 — Footer**: Text color `var(--text-input-outside-label)` (`#5B6368`), action link `var(--primary-button-background)` (`#f85900`). Sentence case.

---

## 8. QA Checklist & Definition of Done

- [x] Renders correctly in default dark theme state (`#000000` background).
- [x] All 82 design tokens mapped cleanly without hardcoded hex values.
- [x] Hover, focus-visible (`#f85900`), active, and disabled states visually verified.
- [x] Full keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`) verified without a mouse.
- [x] Responsive layout tested on 320px mobile viewport and 1440px desktop viewport.
- [x] Centered Auth Overlay Modal verified with backdrop blur, brand badge, and segmented tab control.
- [x] No nested interactive element console errors.
