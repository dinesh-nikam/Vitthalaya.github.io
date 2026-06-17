# Design System: Digital Pandharpur - Marathi Bhakti Sahitya Platform

## Overview
A sacred, cultural, spiritual digital space for Marathi devotional literature that feels like Pandharpur and Wari. Not a lyrics aggregator. Focus on emotional and cultural authenticity.

---

## Pattern Analysis

### Primary Pattern: Cultural Heritage Platform
- **Focus:** Content-first, reading-optimized, spiritual experience
- **Interaction:** Search-first discovery, reverent reading experience, subtle animations
- **Conversion:** User engagement through cultural connection, not traditional CTAs

### Secondary Pattern: Editorial/Content Reading
- **Focus:** Large readable Marathi text (Devanagari)
- **Sections:** Hero + Search + Featured Content + Browse Categories + Saint Profiles

---

## Color Palette: Temple Heritage

### Primary Colors (Sacred Marathi)
| Role | Hex | Usage |
|------|-----|-------|
| Saffron (Bhagwa) | `#FF7A1A` | Primary actions, cultural identity, traditional flags |
| Deep Maroon | `#6B1E1E` | Headers, spiritual depth, traditional textiles |
| Temple Gold | `#C9A227` | Accents, diya glow, premium highlights, festival banners |

### Secondary Colors (Peaceful Foundation)
| Role | Hex | Usage |
|------|-----|-------|
| Cream | `#FFF8EC` | Background, paper-like reading surface |
| Light Sand | `#F2E8D8` | Secondary backgrounds, card surfaces |
| White | `#FFFFFF` | Pure spaces, contrast, cleanliness |

### Accent Colors (Nature & Devotion)
| Role | Hex | Usage |
|------|-----|-------|
| Peacock Blue | `#1B6E8C` | Links, secondary actions, Chandrabhaga river |
| Tulsi Green | `#3E6B3E` | Success states, nature elements, spiritual growth |

### Semantic Tokens
| Token | Light Mode | Dark Mode |
|-------|------------|-----------|
| `--color-primary` | `#FF7A1A` | `#FF9E4D` |
| `--color-primary-hover` | `#E66A0E` | `#FFA75A` |
| `--color-background` | `#FFF8EC` | `#1C1C1C` |
| `--color-foreground` | `#2D1810` | `#E8DCC9` |
| `--color-card` | `#FFFFFF` | `#2A2A2A` |
| `--color-card-foreground` | `#4C1D95` | `#E8DCC9` |
| `--color-muted` | `#F2E8D8` | `#3A3A3A` |
| `--color-accent` | `#C9A227` | `#D9B44A` |
| `--color-destructive` | `#DC2626` | `#EF4444` |

---

## Typography: Devanagari Reading Optimized

### Font Selection
| Purpose | Font | Rationale |
|---------|------|-----------|
| Devanagari (Marathi) Body | `Noto Sans Devanagari` | Google's optimized Devanagari font, excellent readability |
| Devanagari Headings | `Tiro Devanagari Marathi` | Traditional feel, scholarly appearance |
| Latin UI/Transliteration | `Inter` | Clean, accessible, pairs well with Noto |

### Font Scale
| Element | Size | Line Height | Weight |
|---------|------|-------------|--------|
| Hero Headline | clamp(2.5rem, 8vw, 4rem) | 1.2 | 700 |
| Hero Subheadline | clamp(1.25rem, 3vw, 1.5rem) | 1.5 | 400 |
| Page Title (H1) | 2.5rem | 1.3 | 700 |
| Section Title (H2) | 1.75rem | 1.4 | 600 |
| Card Title (H3) | 1.25rem | 1.4 | 600 |
| Body Text | 1.125rem (18px) | 1.7 | 400 |
| Reading Text | 1.25rem | 1.8 | 400 |
| Caption | 0.875rem | 1.5 | 500 |
| UI Labels | 0.875rem | 1.4 | 500 |

### CSS Import
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Devanagari:wght@300;400;500;600;700&family=Tiro+Devanagari+Marathi:ital,wght@0,400;1,400&display=swap');
```

---

## Motion & Animation: Subtle Spiritual

### Principles
- Gentle, respectful animations only
- All animations respect `prefers-reduced-motion`
- No gamification or flashy transitions
- Motion conveys meaning, not decoration

### Key Animations
| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Hero particles | Slow drift (30s cycle) | Infinite | Linear |
| Diya glow | Soft pulse | 3s | ease-in-out |
| Bell swing (hover) | Gentle rotation | 600ms | Spring curve |
| Flag wave | Subtle flutter | 8s | ease-in-out |
| Page transition | Smooth fade | 200ms | ease-out |

---

## Layout & Spacing

### Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| Mobile | 375px | Primary target |
| Tablet | 768px | Portrait tablets |
| Desktop | 1024px | Laptops, small screens |
| Wide | 1440px | Large desktop displays |

### Spacing Scale (8pt grid)
- xs: 4px, sm: 8px, md: 16px, lg: 24px, xl: 32px, 2xl: 48px, 3xl: 64px

---

## Components

### Hero Section
- Full-screen height on mobile, min 80vh on desktop
- Animated background (temple silhouette, river, flags, diya particles)
- Centered Marathi headline and search bar
- "Growing digital collection" honest corpus size messaging

### Search Bar
- Rounded, prominent on hero
- Rotating placeholder: तुकाराम महाराज, विठ्ठल, हरिपाठ
- Instant results with Devanagari + Latin matching
- Typo-tolerant search

### Composition Card
- Clean white surface for reading
- Devanagari title prominent
- Transliteration secondary
- Saint name, deity icon, type badge
- Audio indicator if available

### Reading Mode
- Full-screen, distraction-free
- Large Marathi text optimized
- Toggle meaning/context panel
- Bookmark/share controls

---

## Anti-Patterns (Avoid)
- ❌ No emojis as icons (use SVG temple symbols, diya icons, musical notes)
- ❌ No gamification or game-like UI
- ❌ No corporate SaaS aesthetics
- ❌ No copying other devotional sites' content
- ❌ No automated scraping of third-party sites
- ❌ No intrusive advertisements
- ❌ No flashy animations that distract from reading

---

## Accessibility Requirements
- ✅ Devanagari text >= 4.5:1 contrast against backgrounds
- ✅ Focus states visible for keyboard navigation
- ✅ `prefers-reduced-motion` honored
- ✅ Semantic HTML (article, nav, main)
- ✅ Screen reader friendly Marathi reading
- ✅ Touch targets >= 44×44px

---

## Dark Mode
- Background: `#1C1C1C` (deep temple stone)
- Text: `#E8DCC9` (warm sand)
- Cards: `#2A2A2A` with subtle elevation
- Accent colors remain warm (saffron/gold) for cultural continuity