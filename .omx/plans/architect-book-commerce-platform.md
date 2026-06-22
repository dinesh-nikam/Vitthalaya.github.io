# DIGITAL PANDHARPUR — Book Commerce Platform Architecture

> **Status**: Architecture Phase  
> **Author**: Sisyphus  
> **Date**: 2026-06-21  
> **Version**: v1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Existing Foundations](#2-existing-foundations)
3. [Data Model Extensions](#3-data-model-extensions)
4. [AI Book Generation Engine](#4-ai-book-generation-engine)
5. [PDF/EPUB/Kindle Generation](#5-pdfepubkindle-generation)
6. [3D Preview & Visualization](#6-3d-preview--visualization)
7. [Print-on-Demand Engine](#7-print-on-demand-engine)
8. [E-Commerce System](#8-e-commerce-system)
9. [Personalization & Gifting](#9-personalization--gifting)
10. [Marketplace & Community Books](#10-marketplace--community-books)
11. [Admin Publishing Dashboard](#11-admin-publishing-dashboard)
12. [SEO & Content Strategy](#12-seo--content-strategy)
13. [Monetization Model](#13-monetization-model)
14. [Implementation Roadmap](#14-implementation-roadmap)
15. [Appendix: Schema Migrations](#15-appendix-schema-migrations)

---

## 1. Executive Summary

The Digital Pandharpur Book Commerce Platform transforms 100,000+ devotional compositions into **automatically generated, premium-quality books** that users can discover, customize, preview in 3D, and order as physical keepsakes.

### Core Capabilities

| Capability | Description |
|---|---|
| **AI Book Generation** | Compose books from saint/deity/festival/theme/user criteria |
| **Auto-Design Engine** | Typography, layout, cover art, illustrations generated per book |
| **Multi-Format Export** | Print-ready PDF, EPUB, Kindle MOBI, web preview |
| **3D Preview** | Three.js flipbook: rotate, flip, zoom before purchase |
| **Print-on-Demand** | Regional + global printers (Printful, Lulu, KDP, local) |
| **E-Commerce** | Cart, checkout, gifting, personalized dedications |
| **Marketplace** | Community curations, featured collections, revenue sharing |
| **Admin Dashboard** | Pricing, inventory, print providers, order management |

---

## 2. Existing Foundations

### What Already Exists ✅

| Component | Details |
|---|---|
| **Content Pipeline** | 9+ scrapers feeding 1000s of compositions into PostgreSQL. Canonical dedup engine. AI enrichment (summaries, meanings). |
| **Data Model** | `Composition`, `Saint`, `Deity`, `Festival`, `Category`, `User`, `Book` (basic) |
| **Auth** | NextAuth v4 with Prisma adapter. User model with accounts/sessions. |
| **3D Infrastructure** | Three.js + `@types/three` in package.json. 5 cultural 3D viewers (bell, deepak, palkhi, temple, tulsi). |
| **Design System** | Saffron/Maroon/Gold palette, Noto Sans Devanagari + Inter typography, Tailwind CSS. |
| **AI Pipeline** | `AiEnrichmentJob` + `AiEnrichmentResult` models. Existing enrichment for summaries & meanings. |
| **Search** | Meilisearch integrated for Devanagari text search. |
| **Image** | `sharp` installed for image processing. |
| **Admin Base** | `app/admin/` route exists. API routes for moderation. |

### What Must Be Built ❌

| Component | Effort |
|---|---|
| Extended Book/Edition models | Medium |
| AI Curation Engine | High |
| Book Generation Pipeline | High |
| PDF Generation (Puppeteer/Playwright print-to-PDF) | Medium |
| EPUB/Kindle Generation | Medium |
| 3D Book Preview | High |
| Cover & Illustration Generation | High |
| Print-on-Demand Integration | Medium |
| Full E-Commerce (Cart, Orders, Payments) | High |
| Gifting & Personalization | Medium |
| Admin Dashboard | High |
| Marketplace & Collections | Medium |

---

## 3. Data Model Extensions

### 3.1 New & Extended Models

```prisma
// ── Book Publication ─────────────────────────────────────────

model BookPublication {
  id            String   @id @default(uuid())
  titleMarathi  String   @map("title_marathi")
  titleEnglish  String?  @map("title_english")
  slug          String   @unique

  // Book type
  bookType      BookType @default(STANDARD)
  // STANDARD | PREMIUM_HARDCOVER | COLLECTOR | POCKET | TEMPLE

  // Status
  status        BookStatus @default(DRAFT)
  // DRAFT | GENERATING | READY | PUBLISHED | ARCHIVED

  // Generation inputs
  curationType  CurationType @map("curation_type")
  // SAINT_BASED | DEITY_BASED | FESTIVAL_BASED | THEME_BASED | USER_CURATED

  curationConfig String?  @map("curation_config") // JSON: criteria, filters, count per type
  themeId       String?   @map("theme_id")

  // Book metadata
  description   String?
  saintId       String?   @map("saint_id")
  saint         Saint?    @relation(fields: [saintId], references: [id])
  deityId       String?   @map("deity_id")
  deity         Deity?    @relation(fields: [deityId], references: [id])

  // User ownership
  creatorId     String?   @map("creator_id")
  creator       User?     @relation(fields: [creatorId], references: [id])
  isPublic      Boolean   @default(false) @map("is_public")

  // Pricing
  basePrice     Decimal?  @map("base_price") // in INR
  royaltyPercent Float?   @map("royalty_percent")

  // Generation tracking
  generationStartedAt  DateTime? @map("generation_started_at")
  generationCompletedAt DateTime? @map("generation_completed_at")
  generationError      String?   @map("generation_error")

  // Relationships
  editions      BookEdition[]
  compositions  BookComposition[]
  orders        OrderItem[]

  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([bookType])
  @@index([curationType])
  @@index([saintId])
  @@index([deityId])
  @@index([creatorId])
  @@map("book_publications")
}

enum BookType {
  POCKET           // 100-150 pages, affordable
  STANDARD         // 250-400 pages, most popular
  PREMIUM_HARDCOVER // 500-1000 pages, luxury
  COLLECTOR        // Leather-style, gold foil, special packaging
  TEMPLE           // For temples, trusts, libraries
}

enum BookStatus {
  DRAFT
  GENERATING
  READY
  PUBLISHED
  ARCHIVED
}

enum CurationType {
  SAINT_BASED
  DEITY_BASED
  FESTIVAL_BASED
  THEME_BASED
  USER_CURATED
}

// ── Book Edition (per format) ─────────────────────────────────

model BookEdition {
  id              String   @id @default(uuid())
  publicationId   String   @map("publication_id")
  publication     BookPublication @relation(fields: [publicationId], references: [id], onDelete: Cascade)

  format          BookFormat @map("format")
  // DIGITAL_PDF | DIGITAL_EPUB | DIGITAL_KINDLE | PRINT_PAPERBACK | PRINT_HARDCOVER | PRINT_COLLECTOR

  // File assets
  fileUrl         String?  @map("file_url")       // hosted file path
  fileSizeBytes   Int?     @map("file_size_bytes")
  previewUrl      String?  @map("preview_url")    // 5-page sample PDF
  coverUrl        String?  @map("cover_url")

  // Print specs
  pageCount       Int?     @map("page_count")
  trimSize        String?  @map("trim_size")     // "5.5x8.5", "6x9", "8.5x11"
  paperType       String?  @map("paper_type")    // "cream", "white", "premium"
  coverFinish     String?  @map("cover_finish")  // "matte", "glossy", "leather"
  bleedMm         Float?   @map("bleed_mm")
  dpi             Int?     @default(300) @map("dpi")
  colorMode       String?  @default("CMYK") @map("color_mode")

  // Pricing
  price           Decimal? @map("price")
  printCost       Decimal? @map("print_cost")
  shippingWeightG Int?     @map("shipping_weight_g")

  isDefault       Boolean  @default(false) @map("is_default")

  createdAt       DateTime @default(now()) @map("created_at")

  @@index([publicationId])
  @@index([format])
  @@map("book_editions")
}

enum BookFormat {
  DIGITAL_PDF
  DIGITAL_EPUB
  DIGITAL_KINDLE
  PRINT_PAPERBACK
  PRINT_HARDCOVER
  PRINT_COLLECTOR
}

// ── Book Composition (M2M with ordering) ──────────────────────

model BookComposition {
  id              String   @id @default(uuid())
  publicationId   String   @map("publication_id")
  publication     BookPublication @relation(fields: [publicationId], references: [id], onDelete: Cascade)
  compositionId   String   @map("composition_id")
  composition     Composition @relation(fields: [compositionId], references: [id])

  sortOrder       Int      @map("sort_order")
  sectionName     String?  @map("section_name") // e.g. "Abhang", "Aarti", "Stotra"
  curatedByAi     Boolean  @default(true) @map("curated_by_ai")
  includeMeaning  Boolean  @default(true) @map("include_meaning")
  userNotes       String?  @map("user_notes")  // user's personal note for this composition

  @@unique([publicationId, compositionId])
  @@index([publicationId])
  @@index([compositionId])
  @@map("book_compositions")
}

// ── Book Theme ────────────────────────────────────────────────

model BookTheme {
  id              String   @id @default(uuid())
  nameMarathi     String   @map("name_marathi")
  nameEnglish     String   @map("name_english")
  slug            String   @unique
  description     String?

  // Curation rules (JSON: saint IDs, deity IDs, type mix, keyword filters)
  curationRules   String?  @map("curation_rules")

  isOfficial      Boolean  @default(false) @map("is_official")
  isActive        Boolean  @default(true) @map("is_active")

  createdAt       DateTime @default(now()) @map("created_at")
  @@map("book_themes")
}

// ── Orders & Checkout ─────────────────────────────────────────

model Order {
  id              String        @id @default(uuid())

  userId          String?       @map("user_id")
  user            User?         @relation(fields: [userId], references: [id])

  // Guest info
  guestEmail      String?       @map("guest_email")
  guestName       String?       @map("guest_name")

  status          OrderStatus   @default(PENDING)
  // PENDING | CONFIRMED | PROCESSING | PRINTING | SHIPPED | DELIVERED | CANCELLED | REFUNDED

  // Shipping
  shippingAddressId String?     @map("shipping_address_id")
  shippingAddress  Address?     @relation(fields: [shippingAddressId], references: [id])
  shippingMethod  String?       @map("shipping_method")
  shippingCost    Decimal?      @map("shipping_cost")
  trackingNumber  String?       @map("tracking_number")

  // Payment
  paymentProvider String?       @map("payment_provider") // "razorpay", "stripe", "phonepe"
  paymentId       String?       @map("payment_id")
  paymentStatus   String?       @map("payment_status")
  currency        String        @default("INR")
  subtotal        Decimal       @map("subtotal")
  tax             Decimal       @default(0)
  total           Decimal

  // Gifting
  isGift          Boolean       @default(false) @map("is_gift")
  giftMessage     String?       @map("gift_message")
  giftRecipient   String?       @map("gift_recipient")

  // Dedication
  dedicationText  String?       @map("dedication_text")

  // Print partner
  printPartnerId  String?       @map("print_partner_id")

  items           OrderItem[]
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")

  @@index([userId])
  @@index([status])
  @@index([paymentStatus])
  @@map("orders")
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PROCESSING
  PRINTING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id              String         @id @default(uuid())
  orderId         String         @map("order_id")
  order           Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)

  publicationId   String         @map("publication_id")
  publication     BookPublication @relation(fields: [publicationId], references: [id])
  editionId       String?        @map("edition_id")
  edition         BookEdition?   @relation(fields: [editionId], references: [id])

  quantity        Int            @default(1)
  unitPrice       Decimal        @map("unit_price")
  totalPrice      Decimal        @map("total_price")

  // Personalized content (snapshot at time of order)
  dedicationText  String?        @map("dedication_text")
  personalizationJson String?    @map("personalization_json") // cover customization, title, etc.

  createdAt       DateTime       @default(now()) @map("created_at")

  @@index([orderId])
  @@index([publicationId])
  @@map("order_items")
}

model Address {
  id              String   @id @default(uuid())
  userId          String?  @map("user_id")
  user            User?    @relation(fields: [userId], references: [id])

  label           String?  // "Home", "Office", "Temple"
  fullName        String   @map("full_name")
  phone           String
  line1           String
  line2           String?
  city            String
  state           String
  postalCode      String   @map("postal_code")
  country         String   @default("IN")

  isDefault       Boolean  @default(false) @map("is_default")
  orders          Order[]

  createdAt       DateTime @default(now()) @map("created_at")
  @@index([userId])
  @@map("addresses")
}

// ── Print Partners ────────────────────────────────────────────

model PrintPartner {
  id              String   @id @default(uuid())
  name            String
  provider        String   // "printful", "lulu", "kdp", "regional_printer"
  isActive        Boolean  @default(true) @map("is_active")

  // API configuration
  apiEndpoint     String?  @map("api_endpoint")
  apiKey          String?  @map("api_key") // encrypted
  apiSecret       String?  @map("api_secret") // encrypted

  // Supported formats
  supportsHardcover  Boolean @default(false) @map("supports_hardcover")
  supportsColor      Boolean @default(true) @map("supports_color")
  maxPages           Int?    @map("max_pages")

  // Pricing
  baseCostPerPage    Decimal? @map("base_cost_per_page")
  baseCostPerBook    Decimal? @map("base_cost_per_book")
  coverCostPerBook   Decimal? @map("cover_cost_per_book")
  currency           String   @default("INR")

  // Regions
  regions             String? // JSON array of supported regions

  orders             Order[]
  createdAt          DateTime @default(now()) @map("created_at")
  @@map("print_partners")
}

// ── User Collections (Community) ──────────────────────────────

model UserCollection {
  id              String   @id @default(uuid())
  name            String
  slug            String   @unique
  description     String?
  userId          String   @map("user_id")
  user            User     @relation(fields: [userId], references: [id])

  isPublic        Boolean  @default(false) @map("is_public")
  isFeatured      Boolean  @default(false) @map("is_featured")

  compositions    CollectionComposition[]
  bookPublication BookPublication? // generated book from this collection

  likes           Int      @default(0)
  saves           Int      @default(0)

  createdAt       DateTime @default(now()) @map("created_at")
  @@index([userId])
  @@index([isPublic, isFeatured])
  @@map("user_collections")
}

model CollectionComposition {
  id              String   @id @default(uuid())
  collectionId    String   @map("collection_id")
  collection      UserCollection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  compositionId   String   @map("composition_id")
  composition     Composition @relation(fields: [compositionId], references: [id])
  sortOrder       Int      @map("sort_order")
  userNotes       String?  @map("user_notes")

  @@unique([collectionId, compositionId])
  @@map("collection_compositions")
}
```

### 3.2 Key Model Relationships

```
User
 ├── BookPublication (creator)
 ├── Order (buyer)
 ├── Address
 ├── UserCollection
 └── BookPublication (purchases via OrderItem)

BookPublication
 ├── BookEdition (1 per format — PDF, EPUB, Print)
 ├── BookComposition (ordered list of compositions)
 ├── BookTheme
 ├── Saint / Deity (curation focus)
 └── OrderItem (purchased copies)

Order
 ├── OrderItem (publication + edition)
 ├── Address (shipping)
 └── PrintPartner (assigned for production)
```

---

## 4. AI Book Generation Engine

### 4.1 Architecture

```
User Input (criteria)
       │
       ▼
┌─────────────────────────────────────┐
│         Curation Orchestrator        │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Filter   │  │ Composition       │  │
│  │ Engine   │──│ Ranking & Scoring │  │
│  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Section  │  │ Balance Check     │  │
│  │ Builder  │──│ (type/saint/deity)│  │
│  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│        Book Structure Generator      │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Preface  │  │ Saint Bio (AI)   │  │
│  │ Generator│──│ History Context  │  │
│  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Section  │  │ Meaning Writer    │  │
│  │ Headers  │──│ (AI per section)  │  │
│  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│       Design & Layout Engine         │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Cover AI │  │ Typography        │  │
│  │ Designer │──│ Engine            │  │
│  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Layout   │  │ Illustration      │  │
│  │ Renderer │──│ Placer            │  │
│  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│          Format Exporter             │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ PDF      │  │ EPUB             │  │
│  │ Generator│──│ Generator         │  │
│  └──────────┘  └──────────────────┘  │
│  ┌──────────┐  ┌──────────────────┐  │
│  │ Kindle   │  │ Preview          │  │
│  │ Exporter │──│ Generator         │  │
│  └──────────┘  └──────────────────┘  │
└─────────────────────────────────────┘
```

### 4.2 Curation Scoring

Each composition is scored on multiple axes before inclusion:

```typescript
interface CurationScore {
  composition: Composition;
  scores: {
    popularity: number;        // views, saves, bookmarks
    historicalSignificance: number; // age, saint importance
    authenticity: number;      // canonical confidence score
    literaryValue: number;     // AI-evaluated poetic merit
    spiritualRelevance: number; // how well it fits the theme
    diversityBonus: number;    // ensures variety in collection
  };
  compositeScore: number;
  included: boolean;
  reason: string;
}
```

### 4.3 Generation Pipeline (`src/book-generation/`)

| Module | Responsibility |
|---|---|
| `curator.ts` | Filters + scores compositions based on criteria |
| `structure-builder.ts` | Organizes into chapters/sections with preface |
| `ai-content-writer.ts` | Calls LLM for biographies, historical context, meanings |
| `cover-designer.ts` | Generates cover art + typography layout |
| `layout-renderer.ts` | Composes pages with proper typography |
| `illustration-placer.ts` | Places saint portraits, temple art, decorative borders |
| `format-exporter.ts` | Exports to PDF/EPUB/Kindle/Preview |
| `book-generator.ts` | Top-level orchestrator calling all modules |

### 4.4 Curation Presets

#### Saint-Based Collection
```
Filter: saintId = "tukaram-maharaj"
Config: { types: ["abhang", "bhajan"], max: 200, balanceByDeity: true }
```

#### Deity-Based Collection
```
Filter: deityId = "vitthal"
Config: { types: ["abhang", "aarti", "bhajan"], max: 150, topSaints: true }
```

#### Festival-Based Collection
```
Filter: festivalSlug = "ashadhi-ekadashi"
Config: { mode: "ceremonial", includeHistory: true, max: 100 }
```

#### Theme-Based Collection
```
Theme "Wari Journey":
  Rules: { saints: [vitthal-related], types: ["abhang", "gaulani"],
           keywords: ["वारी", "पंढरपूर", "विठ्ठल", "पांडुरंग"],
           max: 120, includeMeaning: true }
```

#### User-Curated
```
User picks individually from library
AI auto-sorts + generates missing metadata
Custom title, dedication page
```

---

## 5. PDF/EPUB/Kindle Generation

### 5.1 Stack Choice

| Format | Technology | Rationale |
|---|---|---|
| **PDF** | Puppeteer/Playwright `page.pdf()` | Headless Chrome prints HTML → PDF with full CSS support. Handles Devanagari perfectly. 300DPI CMYK via CSS print. |
| **EPUB** | Custom XHTML + OPF builder | EPUB is just zipped XHTML. We can build directly without heavy libraries. |
| **Kindle** | Convert EPUB via KindleGen or Calibre | Amazon provides free `kindlegen` CLI. Or use `calibre ebook-convert`. |
| **Preview** | HTML → Next.js route | Renders the book as a web page with page-turn UI. |

### 5.2 PDF Generation Architecture

```
HTML Template Engine (React Server Components)
       │
       ▼
React renderToStaticMarkup()
       │
       ▼
Puppeteer/Playwright headless browser
  - Loads full HTML with embedded CSS
  - Sets viewport to book dimensions (e.g. 6"x9" at 300DPI = 1800x2700)
  - Applies print-specific CSS (page-break, orphans, widows)
  - Calls page.pdf() with proper settings
       │
       ▼
PDF Post-Processing
  - Add crop marks (if print-ready)
  - Set PDF metadata (title, author, subject)
  - Generate thumbnail preview
  - Save to storage (S3/local)
```

### 5.3 File Structure per Book

```
storage/books/{bookId}/
├── preview/          # Web preview HTML + assets
│   ├── index.html
│   ├── cover.jpg
│   └── page-*.html
├── editions/
│   ├── digital.pdf
│   ├── digital.epub
│   ├── digital.mobi
│   ├── print-ready.pdf       # With bleed + crop marks
│   ├── print-cover.pdf       # Cover wrap for POD
│   └── sample.pdf            # Free 5-10 page sample
├── assets/
│   ├── cover.png
│   ├── spine.png
│   ├── back-cover.png
│   ├── illustrations/
│   └── fonts/
└── metadata.json
```

### 5.4 Print-Ready Specifications

| Trim Size | DPI | Bleed | Safe Zone | Best For |
|---|---|---|---|---|
| 5.5" × 8.5" | 300 | 0.125" | 0.375" inner | Pocket |
| 6" × 9" | 300 | 0.125" | 0.375" inner | Standard |
| 8.5" × 11" | 300 | 0.125" | 0.5" inner | Temple/Large |
| 7" × 10" | 300 | 0.125" | 0.375" inner | Collector |

### 5.5 CSS Print Framework

```css
/* Print-specific styles for book rendering */
@page {
  size: 6in 9in;
  margin: 0.75in 0.875in;
  @top-center { content: element(pageHeader); }
  @bottom-center { content: counter(page); }
}

.page-break { page-break-after: always; }
.section-start { page-break-before: right; }
.avoid-break { page-break-inside: avoid; }

/* Devanagari reading optimization */
body { line-height: 1.8; font-size: 11pt; }
.devanagari-text { font-family: 'Noto Sans Devanagari', serif; }
.verse { font-size: 11pt; line-height: 2; text-align: center; }
.meaning { font-size: 9pt; line-height: 1.6; color: #444; }
```

---

## 6. 3D Preview & Visualization

### 6.1 Three.js Book Viewer

Leverages existing Three.js infrastructure in the project. New component `BookViewer3D`:

```
components/3d/book-viewer.tsx         # Main 3D book component
components/3d/book-page.tsx           # Single page texture
components/3d/book-cover.tsx          # Cover + spine model
components/book-preview.tsx           # Higher-level: manages state, pages
```

### 6.2 Technical Approach

- **Pages as Textures**: Each page spread rendered as HTML → captured as image (puppeteer) → applied as Three.js texture
- **Page Turning**: Animated vertex shader for page curl effect. Or simpler: Flat page rotation with opacity transition.
- **Cover Rendering**: Canvas-based cover with Devanagari text over template → used as texture
- **Lighting**: Warm ambient + directional to emulate temple lighting
- **Controls**: OrbitControls for rotation, pinch-to-zoom, tap-to-flip

### 6.3 Performance Strategy

```
Pages < 50  → Full 3D (all pages rendered as textures)
Pages < 200 → 3D cover + sample pages, 2D preview for full
Pages > 200 → Cover 3D only, preview as scrollable 2D
```

### 6.4 Progressive Enhancement

```
├── Fast device + ≤100 pages → Full 3D flipbook
├── Slow device + ≤100 pages → Simplified 3D (lower resolution textures)
├── Fast device + >100 pages → 3D cover + 2D page scroll
└── Slow device + >100 pages → 2D carousel only
```

---

## 7. Print-on-Demand Engine

### 7.1 Partner Integration Matrix

| Partner | Format Support | Regions | Integration |
|---|---|---|---|
| **Printful** | PB, HC, Premium | Global/US/EU | REST API, webhooks |
| **Lulu** | PB, HC, HC Dust Jacket | Global | REST API, print API |
| **Amazon KDP** | PB, HC | Global | KDP API, Cover Creator |
| **Regional (India)** | PB, HC, Saddle-Stitch | India Only | Manual/Email order |
| **Local (Maharashtra)** | Any | Local pickup | Dashboard notification |

### 7.2 Order Flow

```
User places order
       │
       ▼
Order → PENDING
       │
       ▼
Select best print partner (cost + region)
       │
       ▼
Send print-ready PDF to partner API
       │
       ▼
Partner acknowledges → Order → PROCESSING
       │
       ▼
Partner ships → tracking number → SHIPPED
       │
       ▼
Delivery confirmed → DELIVERED
```

### 7.3 Cost Calculation

```
Book Cost = BaseCost + (PageCount × CostPerPage)
Shipping  = Based on weight + destination
Total     = BookCost + Shipping + Tax

COLLECTOR Edition adds: Special packaging + ₹X
```

### 7.4 Regional Printer Fallback

For faster delivery in Maharashtra, maintain a list of local print shops. The admin dashboard receives a notification when a new order is placed for a regional printer. Dashboard shows print-ready PDF for download.

---

## 8. E-Commerce System

### 8.1 Pages

| Route | Component | Description |
|---|---|---|
| `/books` | BookMarketplace | Browse/search all published books |
| `/books/[slug]` | BookDetailPage | Cover, preview, editions, pricing |
| `/books/[slug]/preview` | BookPreviewPage | 3D flipbook + scrollable preview |
| `/books/[slug]/customize` | BookCustomizer | Title, dedication, edition selection |
| `/books/generate` | BookGeneratorWizard | Step-by-step book creation |
| `/cart` | CartPage | Cart management |
| `/checkout` | CheckoutPage | Address, payment, confirmation |
| `/orders` | OrderHistory | User's order history |
| `/orders/[id]` | OrderDetail | Order status, tracking |
| `/account/books` | MyBooks | User's generated books |
| `/account/collections` | MyCollections | User's curated collections |
| `/account/addresses` | AddressBook | Saved addresses |
| `/gift/[orderId]` | GiftPage | Gift delivery status |

### 8.2 Payment Integration

First phase: **Razorpay** (best for India/INR).

```typescript
// Payment flow
interface PaymentFlow {
  1. User fills address + selects shipping
  2. Frontend calls /api/orders/create
  3. Backend creates Order + OrderItems (PENDING)
  4. Backend creates Razorpay order → returns order_id
  5. Frontend opens Razorpay checkout modal
  6. On success: webhook → POST /api/orders/webhook
  7. Webhook updates Order status, triggers print workflow
}
```

Fallback: **PhonePe** for UPI-only users.
International: **Stripe** (Phase 2).

### 8.3 Cart Architecture

```typescript
// Cart state (localStorage + server sync for logged-in users)
interface CartItem {
  publicationId: string;
  editionId: string;
  quantity: number;
  personalization?: {
    dedicationText?: string;
    customTitle?: string;
    coverOption?: string;
  };
  unitPrice: number;
}

// Cart API
POST /api/cart/add
POST /api/cart/remove
POST /api/cart/update
GET  /api/cart
```

---

## 9. Personalization & Gifting

### 9.1 Personalization Options

| Option | Description | Implementation |
|---|---|---|
| Custom Title | User names their book | Stored in BookPublication. Replaces auto-title on cover. |
| Dedication Page | "To my family..." | Extra page after title page. Custom text. |
| Cover Color | Choose from 5 heritage palettes | CSS variable swap, regenerated cover image. |
| Include Meaning | Toggle meaning sections per composition | Flag in BookComposition. |
| Select Compositions | Individual pick mode | User curation flow. |
| Cover Photo | Upload personal photo (optional) | Overlay with traditional border. |

### 9.2 Gifting System

```
Gift Flow:
1. User selects book + edition
2. Clicks "Gift this Book"
3. Enters recipient name, email/address
4. Writes gift message
5. Chooses: Digital (email delivery) or Print (ship to recipient)
6. Pays
7. Recipient gets: (a) Email notification with gift message, (b) Book delivered or digital download link
8. Optional: Scheduled delivery for birthdays/festivals
```

### 9.3 Dedication Page Template

```
┌─────────────────────────────┐
│                             │
│     ✦ समर्पण ✦            │
│     (Dedication)            │
│                             │
│  हे पुस्तक समर्पित          │
│                             │
│  [Recipient Name]            │
│                             │
│  [Gift Message]              │
│                             │
│  — [Giver Name]             │
│  [Date]                     │
│                             │
│  ✦ सप्रेम भेट ✦            │
│     (With Love)              │
│                             │
└─────────────────────────────┘
```

---

## 10. Marketplace & Community Books

### 10.1 Marketplace Pages

| Page | Description |
|---|---|
| `/books` | Grid of all published books with filters (saint, deity, festival, type, price) |
| `/books?featured=1` | Editor's picks |
| `/books?collection=top` | Community top collections |
| `/books/new` | Recently published |

### 10.2 Community Collections

```typescript
// User creates a curated collection
interface UserCollectionFlow {
  1. User browses compositions (with search/filter)
  2. User adds compositions to a named collection
  3. User sets collection as public/private
  4. If public: others can view, save, and optionally purchase
  5. Admin can feature collections on marketplace
  6. Revenue sharing: creator gets X% of each sale
}
```

### 10.3 Revenue Sharing

| Role | Share |
|---|---|
| Community Curator | 5-10% of net |
| Platform | 60-70% |
| Print Partner | 20-30% |
| Saint Family Trust (if any) | 5% |

---

## 11. Admin Publishing Dashboard

### 11.1 Routes

| Route | Function |
|---|---|
| `/admin` | Dashboard overview |
| `/admin/books` | All books, filtering, search |
| `/admin/books/[id]` | Book detail, editions, orders |
| `/admin/books/generate` | Trigger AI generation |
| `/admin/orders` | Order management |
| `/admin/orders/[id]` | Single order processing |
| `/admin/print-partners` | Print partner management |
| `/admin/pricing` | Pricing rules, discounts |
| `/admin/collections` | Feature/demote collections |
| `/admin/themes` | Manage official themes |
| `/admin/analytics` | Sales, traffic, popular books |

### 11.2 Key Admin Workflows

```
1. Approve AI-generated book → PUBLISHED
2. Set pricing per book/edition
3. Review community collections → feature
4. Route orders to print partners
5. Handle cancellations/refunds
6. Manage print partner API keys
7. View sales reports
```

---

## 12. SEO & Content Strategy

### 12.1 URL Structure

```
/books/tukaram-gatha-premium            # Saint collection
/books/ashadhi-ekadashi-collection      # Festival collection
/books/vitthal-bhakti-classics          # Deity collection
/books/wari-journey                     # Theme collection
/books/tukaram-maharaj-abhang-108       # User curated
/books/श्री-तुकाराम-गाथा                # Devanagari slug
```

### 12.2 SEO Per Book

```typescript
interface BookSEO {
  title: string;          // "तुकाराम गाथा - Premium Hardcover | Digital Pandharpur"
  description: string;    // "तुकाराम महाराजांच्या २०० अभंगांचा संग्रह. सुंदर हार्डकव्हर आवृत्ती."
  keywords: string[];     // ["तुकाराम", "अभंग", "गाथा", "वारकरी", "विठ्ठल"]
  ogImage: string;        // Cover image URL
  schema: CreativeWork;   // JSON-LD schema.org/Book
  canonical: string;      // Canonical URL
}
```

### 12.3 Blog Posts (for SEO)

Automated blog posts per book:
- `/blog/tukaram-gatha-premium-book` — details, sample pages, significance
- `/blog/how-to-choose-bhakti-book` — buying guide
- `/blog/top-10-tukaram-abhangs` — listicle with purchase CTA

---

## 13. Monetization Model

### 13.1 Pricing Tiers

| Edition | Digital | Print |
|---|---|---|
| Pocket | ₹99 | ₹299 |
| Standard | ₹199 | ₹599 |
| Premium Hardcover | ₹399 | ₹1,299 |
| Collector | ₹999 | ₹2,999 |
| Temple Edition | Free PDF | ₹4,999 (bulk) |

### 13.2 Revenue Streams

| Stream | Description | Margin |
|---|---|---|
| Digital PDFs | Instant download, no shipping | ~90% |
| Printed Books | POD, margin after print cost | ~40-50% |
| Collector Editions | Premium pricing, special packaging | ~55% |
| Personalized Books | Customization fee on top | ~60% |
| Temple Editions | Bulk pricing for institutions | ~35% |
| Community Revenue Share | Cut from curator-linked sales | ~10% |
| Subscription | Monthly "Book of the Month" club | Recurring |

### 13.3 Suggested Subscription

```
"Bhakta Club" — ₹99/month
- 1 free digital book per month
- 15% off all print books
- Early access to new collections
- Exclusive cover designs
- Free dedication page
```

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)

| Step | Deliverable | Files |
|---|---|---|
| 1.1 | Schema migrations | `prisma/schema.prisma` — new models |
| 1.2 | Book generation API | `src/book-generation/curator.ts`, `generator.ts` |
| 1.3 | Basic PDF export | `src/book-generation/format-exporter.ts` → PDF via Puppeteer |
| 1.4 | Book preview page | `app/books/[slug]/page.tsx` |
| 1.5 | Book generation wizard | `app/books/generate/page.tsx` |
| **Milestone** | First AI-generated book in PDF format | |

### Phase 2: Commerce (Weeks 5-8)

| Step | Deliverable | Files |
|---|---|---|
| 2.1 | Cart + Checkout | `app/cart/`, `app/checkout/`, `src/lib/orders.ts` |
| 2.2 | Razorpay integration | `app/api/orders/create/`, `webhook/` |
| 2.3 | User address management | `app/account/addresses/` |
| 2.4 | Order management | `app/orders/`, `app/api/orders/` |
| 2.5 | Print-ready PDF generation | Enhanced `format-exporter.ts` with CMYK + bleed |
| **Milestone** | User can order a printed book | |

### Phase 3: Experience (Weeks 9-12)

| Step | Deliverable | Files |
|---|---|---|
| 3.1 | 3D book preview | `components/3d/book-viewer.tsx` |
| 3.2 | Cover + illustration generation | `src/book-generation/cover-designer.ts` |
| 3.3 | EPUB/Kindle export | Enhanced `format-exporter.ts` |
| 3.4 | Gifting system | `app/gift/`, dedication page generation |
| **Milestone** | Full 3D preview + multi-format export | |

### Phase 4: Scale (Weeks 13-16)

| Step | Deliverable | Files |
|---|---|---|
| 4.1 | Print partner integration | `src/lib/print-partners/` (Printful, Lulu, KDP) |
| 4.2 | Marketplace launch | `app/books` with full filtering, featured |
| 4.3 | Community collections | `app/collections/`, revenue sharing |
| 4.4 | Admin dashboard | `app/admin/` full CMS |
| 4.5 | Book of the Month subscription | Recurring payment flow |
| **Milestone** | Full platform launch | |

### Phase 5: Polish (Weeks 17-20)

| Step | Deliverable |
|---|---|
| 5.1 | AI illustration engine (saint portraits, temple art) |
| 5.2 | Regional printer integration (Maharashtra) |
| 5.3 | Performance optimization for large books |
| 5.4 | SEO for all book pages |
| 5.5 | Analytics, A/B testing, conversion optimization |

---

## 15. Appendix: Schema Migrations

### 15.1 Migration Order

```
1. create_publication.sql        — BookPublication + BookType enum
2. create_edition.sql            — BookEdition + BookFormat enum
3. create_book_composition.sql   — BookComposition M2M
4. create_theme.sql              — BookTheme
5. create_address.sql            — Address
6. create_order.sql              — Order + OrderItem + OrderStatus
7. create_print_partner.sql      — PrintPartner
8. create_collection.sql         — UserCollection + CollectionComposition
```

### 15.2 Key Index Strategy

```sql
-- Books
CREATE INDEX idx_publication_status ON book_publications(status);
CREATE INDEX idx_publication_type ON book_publications(book_type);
CREATE INDEX idx_publication_saint ON book_publications(saint_id);
CREATE INDEX idx_publication_deity ON book_publications(deity_id);
CREATE INDEX idx_publication_creator ON book_publications(creator_id);

-- Orders
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_order_items_publication ON order_items(publication_id);

-- Collections
CREATE INDEX idx_collections_user ON user_collections(user_id);
CREATE INDEX idx_collections_featured ON user_collections(is_public, is_featured);
```

---

## Directory Structure (New Modules)

```
src/book-generation/
├── index.ts              # Public API
├── types.ts              # Shared types
├── curator.ts            # Composition selection + scoring
├── structure-builder.ts  # Chapter/section organization
├── ai-content-writer.ts  # LLM calls for bios, contexts
├── cover-designer.ts     # Cover art generation
├── layout-renderer.ts    # Typography + page layout
├── illustration-placer.ts # Image placement
├── format-exporter.ts    # PDF/EPUB/Kindle export
└── book-generator.ts     # Top-level orchestrator

src/lib/orders/
├── cart.ts               # Cart service
├── checkout.ts           # Checkout + payment flow
├── pricing.ts            # Cost calculation
└── print-partners/
    ├── index.ts          # Partner resolution
    ├── printful.ts       # Printful integration
    ├── lulu.ts           # Lulu integration
    └── kdp.ts            # Amazon KDP integration

src/lib/payments/
├── razorpay.ts           # Razorpay integration
├── stripe.ts             # Stripe integration (Phase 2)
└── webhooks.ts           # Payment webhook handler

components/3d/book-viewer.tsx    # Three.js book viewer
components/3d/book-page.tsx      # Page texture
components/book-preview.tsx      # High-level preview component
components/book-customizer.tsx   # Personalization UI
components/book-generator-wizard.tsx # Multi-step generation form

app/books/                       # Marketplace
app/books/[slug]/                # Book detail
app/books/[slug]/preview/        # 3D preview
app/books/[slug]/customize/      # Personalization
app/books/generate/              # Generation wizard
app/cart/                        # Cart
app/checkout/                    # Checkout
app/orders/                      # Order history
app/gift/                        # Gifting
app/account/books/               # My books
app/account/collections/         # My collections
app/account/addresses/           # Address book
app/admin/books/                 # Admin: book management
app/admin/orders/                # Admin: order management
app/admin/pricing/               # Admin: pricing
app/admin/print-partners/        # Admin: print partners
app/admin/collections/           # Admin: community collections
app/admin/analytics/             # Admin: analytics
```

---

## Key Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| **PDF Generation** | Puppeteer page.pdf() | Already in project. Handles Devanagari via CSS. Full HTML/CSS support. |
| **3D Preview** | Three.js | Already in project. Active community. WebGL standard. |
| **Payment** | Razorpay first | Best India support. Simple API. Works with INR. |
| **POD Partners** | Printful + Lulu + regional | Coverage: global + local. Printful has India printing. |
| **EPUB** | Custom builder (no library) | EPUB is simple zipped XHTML. Avoids heavy deps. |
| **AI Engine** | Uses existing AiEnrichment pipeline | Don't build new LLM infrastructure. Extend existing jobs. |
| **Images** | sharp for processing | Already installed. Best Node.js image lib. |
| **File Storage** | Local FS → S3/CDN | Phase 1: local. Phase 2: cloud. Easy migration (file URL abstraction). |
| **Book Generation** | Async job queue | Large books take time. Use QueuedJob pattern (as AiEnrichmentJob). |
