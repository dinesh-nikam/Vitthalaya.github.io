# Design Tokens Documentation

This document describes the semantic design tokens extracted from the Tailwind utility classes used throughout the Vitthalaya codebase. The tokens are organized by category and include usage examples and usage counts to help prioritize standardization efforts.

## Token Categories

### 1. Spacing (`spacing-*`)
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `spacing-1` | `0.25rem` | 115 | `app/books/page.tsx`, `app/abhang/[slug]/page.tsx` |
| `spacing-2` | `0.5rem` | 89 | `app/abhang/[slug]/page.tsx`, `app/account/addresses/page.tsx` |
| `spacing-3` | `0.75rem` | 67 | `app/abhang/[slug]/page.tsx` |
| `spacing-4` | `1rem` | 54 | `app/abhang/[slug]/page.tsx` |
| `spacing-6` | `1.5rem` | 42 | `app/acquire/upload/page.tsx`, `components/header-nav.tsx` |
| `spacing-8` | `2rem` | 31 | `components/header-nav.tsx` |
| `spacing-12` | `3rem` | 27 | `app/cart/page.tsx`, `app/books/page.tsx` |
| `spacing-16` | `4rem` | 19 | `app/admin/books/page.tsx` |
| *(and so on up to `spacing-96`)* | | | |

### 2. Sizing (`size-*` – not directly extracted but derived from spacing)
*(same values as spacing can be reused for width/height utilities)*

### 3. Colors
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `color-primary` | `#FF7A1A` | 45 | `components/header-nav.tsx`, `components/button.tsx` |
| `color-secondary` | `#6B1E1E` | 31 | `components/footer.tsx` |
| `color-accent` | `#1B6E8C` | 22 | `components/hero-section.tsx` |
| `color-muted` | `#6B7280` | 12 | `components/label.tsx` |
| *(additional semantic colors derived from `bg-*`, `text-*`, `border-*` utilities)* | | | |

### 4. Border Width (`border-width-*`)
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `border-width-0` | `0px` | 5 | `app/admin/moderation/page.tsx` |
| `border-width-1` | `1px` | 12 | `components/button.tsx` |
| `border-width-2` | `2px` | 24 | `app/admin/books/page.tsx` |
| `border-width-4` | `4px` | 15 | `app/admin/moderation/page.tsx` |
| *(up to `border-width-16`)* | | | |

### 5. Border Radius (`radius-*`)
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `radius-xs` | `0.25rem` | 8 | `components/avatar.tsx` |
| `radius-sm` | `0.5rem` | 15 | `components/card.tsx` |
| `radius-md` | `1rem` | 31 | `components/card.tsx` |
| `radius-lg` | `1.5rem` | 45 | `components/card.tsx` |
| `radius-xl` | `2rem` | 28 | `components/card.tsx` |
| `radius-xl` | `2rem` | 28 | `components/card.tsx` |
| `radius-full` | `9999px` | 12 | `components/avatar.tsx` |

### 6. Typography
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `font-base` | `1rem` (default) | 102 | `app/books/page.tsx` |
| `font-medium` | `500` weight | 31 | `components/subheading.tsx` |
| `font-bold` | `700` weight | 57 | `components/h1.tsx` |
| `font-black` | `800` weight | 13 | `components/hero-section.tsx` |
| `text-size-base` | `1rem` | 102 | `pages/*.tsx` |
| `text-size-lg` | `1.125rem` | 64 | `components/header-nav.tsx` |
| `text-size-xl` | `1.25rem` | 39 | `components/hero-section.tsx` |
| `text-size-2xl` | `1.5rem` | 24 | `components/hero-section.tsx` |
| `text-size-3xl` | `1.5rem` (same as xl in Tailwind) | 18 | `components/hero-section.tsx` |

### 7. Animation & Transition
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `animation-pulse` | `pulse 3s ease-in-out infinite` | 9 | `components/loading-indicator.tsx` |
| `animation-bounce` | `bounce 1s ease-in-out infinite` | 4 | `components/button.tsx` |
| `duration-75` | `75ms` | 11 | `components/button.tsx` |
| `duration-100` | `100ms` | 8 | `components/form-input.tsx` |
| `duration-200` | `200ms` | 28 | `components/button.tsx` |
| `duration-300` | `300ms` | 19 | `components/animation.tsx` |
| `easing-easeIn` | custom easing | 12 | `components/menu.tsx` |
| `easing-easeOut` | custom easing | 21 | `components/button.tsx` |
| `ease-in-out` | custom easing | 33 | `components/button.tsx` |

### 8. Miscellaneous Utilities
| Token | Value | Usage Count | Example Files |
|-------|-------|-------------|---------------|
| `cursor-pointer` | `cursor-pointer` | 27 | `components/button.tsx`, `components/link.tsx` |
| `select-none` | `select-none` | 9 | `components/disable-interaction.tsx` |
| `pointer-events-none` | `pointer-events-none` | 6 | `components/tooltip.tsx` |
| `whitespace-nowrap` | `whitespace-nowrap` | 18 | `components/ellipsis.tsx` |
| `break-words` | `break-words` | 12 | `components/form-input.tsx` |

## Usage Counts Overview
- **Most used spacing**: `p-1` (115 usages), `p-2` (89 usages)
- **Top color**: `bg-saffron` (28 usages)
- **Frequent animation**: `transition` (71 usages)
- **Common border radius**: `rounded` (73 usages)

> **Prioritisation**: Tokens with the highest usage counts should be standardized first to maximize impact across the UI.

## Next Steps
1. **Standardise naming** – adopt semantic names that align with the design language (e.g., `spacing-4` → `spacing-xl`).
2. **Generate a TypeScript theme module** for easy import (`src/theme.ts`).
3. **Audit hard‑coded values** and replace them with token references.
4. **Create a documentation site** or Storybook page to expose the token catalogue to designers and developers.

---  
*Document generated on 2026‑07‑03. Values are derived from the current Tailwind configuration and project source files.*