# Mộc Vị Restaurant · Design foundation

Design direction: Vietnamese contemporary fine-casual. The interface is warm, calm and editorial; hierarchy comes from typography, light spacing and quiet dividers, not glossy effects or dense card grids.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--background` | `#f7f4eb` | warm cream page canvas |
| `--foreground` | `#243126` | primary text |
| `--surface` | `#fffdf8` | content surface |
| `--muted` | `#ede9dc` | quiet section background |
| `--muted-foreground` | `#59645b` | secondary text |
| `--primary` | `#35563d` | muted olive action / focus |
| `--secondary` | `#d8c8ab` | warm supporting material |
| `--accent` | `#8d6844` | natural wood accent |
| `--border` | `#d7d2c3` | stone divider |
| `--success` | `#2d6a4f` | positive status |
| `--warning` | `#8a601d` | caution status |
| `--destructive` | `#a33c32` | destructive status |

## Type and layout

- Display/headings: Georgia system serif, 500 weight, tight editorial tracking.
- Body/meta: Arial system sans, 16px minimum body size; meta is 12px uppercase with measured tracking.
- Container: maximum 1200px. Gutters: 20px mobile, 32px tablet/desktop.
- Space rhythm: 8, 12, 16, 24, 32, 48, 72, 96, 128px.
- Responsive checkpoints: 320px minimum, 704px mobile/tablet reflow, 1024px desktop grid.

## Component principles

- Buttons are rectangular, quiet and at least 48px high. One primary action per view.
- Cards use a fine border and no heavy shadow. Use a card only when it groups an independently scannable item.
- Tabs are semantic buttons with an underline selected state, not pill badges.
- Status always has text plus visual treatment; color alone is not meaningful.
- Media stays inside a fixed aspect ratio. Before Phase 3B, use `MediaPlaceholder`, never a broken image URL.
- FloorPlan is an HTML/CSS plan with keyboard-operable TableNode buttons; current public state is neutral.

## Motion and accessibility

- Use only short color/opacity transitions (about 180ms); no scroll reveal or decorative animation.
- Disable transitions under `prefers-reduced-motion`.
- Every interactive element has a visible olive focus ring. Main content has a skip link.
- Long text wraps, and the floor plan may scroll horizontally on narrow screens by intent.

Public-specific rules are documented in `pages/public.md`.
