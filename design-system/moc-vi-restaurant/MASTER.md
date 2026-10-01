# Mộc Vị Restaurant · Design foundation

Design direction: Vietnamese contemporary fine-casual. The interface is warm, calm and editorial; hierarchy comes from typography, light spacing and quiet dividers, not glossy effects or dense card grids.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f7f4eb` | warm cream page canvas |
| `--foreground` | `#243126` | primary text |
| `--surface` | `#fffcf6` | content surface |
| `--muted` | `#eee8da` | quiet section background |
| `--muted-foreground` | `#566153` | secondary text |
| `--primary` | `#35563d` | muted olive action / focus |
| `--secondary` | `#d8c8ab` | warm supporting material |
| `--accent` | `#8d6844` | natural wood accent |
| `--border` | `#d9d1c2` | stone divider |
| `--success` | `#2d6a4f` | positive status |
| `--warning` | `#8a601d` | caution status |
| `--destructive` | `#a33c32` | destructive status |

## Type and layout

- Display/headings: Times New Roman system serif (Liberation Serif/generic serif fallback), regular 400, -0.018em tracking and 1.14 line-height; smaller headings use 1.2–1.25. Chrome on Windows verified one font for all 39 glyphs of the Vietnamese Home heading, versus mixed Georgia/Times previously.
- Body/meta: Arial system sans, 16px body; meta is 12px uppercase with 1.65 line-height. Prices use bold sans and tabular numerals.
- Fonts are system fonts: no font downloads, dependencies or build-time network requirement. Other platforms use their installed serif/sans fallback; cross-platform visual identity is not guaranteed.
- Container: maximum 1280px. Gutters: 20px mobile, 32px tablet and 48px desktop.
- Space rhythm: 8, 12, 16, 24, 32, 48, 72, 96, 128px.
- Responsive checkpoints: 320px minimum, 704px mobile/tablet reflow, 1024px desktop grid.

## Component principles

- Buttons are rectangular, quiet and at least 48px high. One primary action per view.
- Approved public design adopted on 01/10/2026: large photographic hero, serif headline, alternating space stories and compact menu listings. Square corners, quiet dividers and no decorative shadow; four combos retain their existing data and placeholders.
- Tabs are semantic buttons with an underline selected state, not pill badges.
- Status always has text plus visual treatment; color alone is not meaningful.
- Media stays inside a fixed aspect ratio. Before Phase 3B, use `MediaPlaceholder`, never a broken image URL.
- FloorPlan is an HTML/CSS plan with keyboard-operable TableNode buttons; current public state is neutral.
- Reservation stays browser-only mock on Pages. The server version has Phase 5 availability states and local-only booking, disabled by default; errors/status are focusable, unavailable tables have text labels. No cloud booking activation. Contact has no invented address or map; Phase 3 remains pending missing images.

## Motion and accessibility

- Use only short color/opacity transitions (about 180ms); no scroll reveal or decorative animation.
- Disable transitions under `prefers-reduced-motion`.
- Every interactive element has a visible olive focus ring; the olive CTA uses a light focus ring. Main content has a skip link.
- Long text wraps, and the floor plan may scroll horizontally on narrow screens by intent.

Public-specific rules are documented in `pages/public.md`.
