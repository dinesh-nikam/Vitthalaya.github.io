# Phase 0 Implementation Plan - Digital Pandharpur

## What's Been Built (Design Structure)

### 🎨 Design System
- **Location:** `design-system/digital-pandharpur/MASTER.md`
- Color palette: Saffron (#FF7A1A), Deep Maroon (#6B1E1E), Temple Gold (#C9A227)
- Typography: Noto Sans Devanagari + Tiro Devanagari Marathi for headings
- Animation principles: Subtle, spiritual, respects `prefers-reduced-motion`

### 🏗️ Project Structure
```
varkari/
├── app/
│   ├── layout.tsx          # Root layout with header/footer
│   ├── page.tsx            # Home page with hero + featured content
│   ├── search/             # Search results page
│   ├── abhang/[slug]/      # Composition detail pages
│   ├── sant/[slug]/        # Saint hub pages
│   ├── category/[slug]/    # Category browsing
│   └── festival/[slug]/    # Festival pages
├── components/
│   ├── hero-section.tsx    # Animated hero with cultural background
│   ├── search-results.tsx  # Search UI components
│   └── reading-mode-provider.tsx
├── src/
│   ├── db/
│   │   └── seed.ts         # Initial data seeding
│   └── lib/
│       └── search.ts       # Typesense integration
└── postgres_schema.sql     # Database schema
```

### 📚 Database Schema (PostgreSQL)
- `saints` - Venerable poets (Tukaram, Dnyaneshwar, etc.)
- `compositions` - Core content (Abhang, Aarti, Bhajan, etc.)
- `deities` - Vitthal, Shiva, Devi, Ganpati
- `festivals` - Ashadhi Ekadashi, Kartiki, etc.
- `categories` - Nested classification (Vitthal > Abhang > Haripath)

### 🚀 Phase 0 Completion Checklist

| Requirement | Status | Notes |
|-------------|--------|-------|
| Design system created | ✅ | Cultural palette + typography |
| 500-2K compositions | 🔄 | Schema ready, mock data only |
| Devanagari search | 🔄 | Typesense client stub created |
| SEO-optimized pages | ✅ | JSON-LD metadata in place |
| Mobile-first design | ✅ | Tailwind responsive utilities |
| Reading experience | ✅ | Large Devanagari text, meaning panel |
| Saint/category pages | ✅ | Nested browsing structure |
| No scraping | ✅ | Editorial ingestion documented |

## Next Steps Before Launch

1. **Install & Run**
   ```bash
   cd varkari
   bun install
   bun dev
   ```

2. **Set up PostgreSQL**
   ```bash
   # Create database
   createdb digital_pandharpur
   
   # Run schema
   psql -d digital_pandharpur -f postgres_schema.sql
   
   # Seed data (500-2000 curated entries)
   # TODO: Add actual seed data
   ```

3. **Configure Search**
   - Install Typesense server
   - Create search collection with Devanagari fields
   - Index initial compositions

4. **Content Curation**
   - Source from public domain texts
   - Write original meanings/context
   - Verify 500-2000 core compositions

5. **Testing**
   - Test Devanagari rendering
   - Test transliteration search ("vitthal" → "विठ्ठल")
   - Test mobile responsiveness
   - Verify accessibility (contrast, navigation)

## Cultural Design Guidelines Followed

- ✅ No emoji as icons (using SVG/temple symbols)
- ✅ Saffron + Maroon + Gold palette
- ✅ Devanagari-optimized typography
- ✅ Subtle animations (bell swing, diya pulse)
- ✅ Respects `prefers-reduced-motion`
- ✅ WCAG AA contrast ratios
- ✅ Mobile-first responsive