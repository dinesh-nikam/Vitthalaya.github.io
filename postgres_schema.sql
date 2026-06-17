-- Digital Pandharpur - PostgreSQL Schema
-- Phase 0 MVP: Core entities for Marathi Bhakti Sahitya

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Saints (Venerable poets)
CREATE TABLE saints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_marathi VARCHAR(100) NOT NULL,
    name_transliteration VARCHAR(100) NOT NULL,
    period VARCHAR(50), -- e.g., '१३थ्या शतक'
    biography TEXT, -- Marathi biography (editor-written)
    region VARCHAR(50), -- Pandharpur, Varanasi, etc.
    image_url VARCHAR(500), -- Optional saint image
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Deities (Vitthal, Shiva, Devi, etc.)
CREATE TABLE deities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_marathi VARCHAR(50) NOT NULL,
    name_transliteration VARCHAR(50) NOT NULL,
    icon_name VARCHAR(50), -- For emoji/icon reference
    created_at TIMESTAMP DEFAULT NOW()
);

-- Festivals (Ashadhi Ekadashi, etc.)
CREATE TABLE festivals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_marathi VARCHAR(100) NOT NULL,
    name_transliteration VARCHAR(100) NOT NULL,
    date_rule TEXT, -- Lunar calendar logic (e.g., "आशाढी कृष्ण पक्षाची एकादशी")
    month_day_rule VARCHAR(50), -- For calculation
    created_at TIMESTAMP DEFAULT NOW()
);

-- Categories (Nested classification)
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_marathi VARCHAR(100) NOT NULL,
    name_transliteration VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    parent_category_id UUID REFERENCES categories(id), -- For nesting (Vitthal > Abhang > Haripath)
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Composition Types
CREATE TYPE composition_type AS ENUM (
    'abhang',
    'aarti',
    'bhajan',
    'stotra',
    'haripath',
    'gaulani',
    'deviche_gane',
    'bharud',
    'kirtan',
    'namasmaran',
    'powada'
);

-- Compositions (Core content)
CREATE TABLE compositions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_marathi VARCHAR(200) NOT NULL,
    title_transliteration VARCHAR(200) NOT NULL,
    slug VARCHAR(200) UNIQUE NOT NULL,
    type composition_type NOT NULL,
    full_text TEXT NOT NULL, -- Marathi Devanagari text
    meaning TEXT, -- Editor-written meaning/explanation
    saint_id UUID REFERENCES saints(id),
    deity_id UUID REFERENCES deities(id),
    region VARCHAR(50), -- Where composed/published
    source_attribution TEXT, -- Book/Archive source
    audio_links JSONB, -- YouTube/Spotify embed URLs array
    is_verified BOOLEAN DEFAULT FALSE, -- Editorial review flag
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Junction tables for many-to-many relationships
CREATE TABLE composition_festivals (
    composition_id UUID REFERENCES compositions(id) ON DELETE CASCADE,
    festival_id UUID REFERENCES festivals(id) ON DELETE CASCADE,
    PRIMARY KEY (composition_id, festival_id)
);

CREATE TABLE composition_categories (
    composition_id UUID REFERENCES compositions(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (composition_id, category_id)
);

-- Saint relationships (related saints)
CREATE TABLE saint_relationships (
    saint_id UUID REFERENCES saints(id) ON DELETE CASCADE,
    related_saint_id UUID REFERENCES saints(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50), -- 'guru', 'contemporary', etc.
    PRIMARY KEY (saint_id, related_saint_id)
);

-- Search index sync fields (for Typesense/Meilisearch)
CREATE INDEX idx_compositions_search ON compositions
    USING gin(to_tsvector('simple', title_marathi || ' ' || title_transliteration || ' ' || full_text));

CREATE INDEX idx_compositions_slug ON compositions(slug);
CREATE INDEX idx_compositions_type ON compositions(type);
CREATE INDEX idx_compositions_saint ON compositions(saint_id);
CREATE INDEX idx_categories_parent ON categories(parent_category_id);

-- Views for easy querying
CREATE VIEW composition_with_details AS
    SELECT
        c.*,
        s.name_marathi as saint_name,
        s.name_transliteration as saint_transliteration,
        d.name_marathi as deity_name,
        array_agg(f.name_marathi) as festival_names,
        array_agg(cat.name_marathi) as category_names
    FROM compositions c
    LEFT JOIN saints s ON c.saint_id = s.id
    LEFT JOIN deities d ON c.deity_id = d.id
    LEFT JOIN composition_festivals cf ON c.id = cf.composition_id
    LEFT JOIN festivals f ON cf.festival_id = f.id
    LEFT JOIN composition_categories cc ON c.id = cc.composition_id
    LEFT JOIN categories cat ON cc.category_id = cat.id
    GROUP BY c.id, s.name_marathi, s.name_transliteration, d.name_marathi;

-- Seed data for initial MVP
-- Insert core deities
INSERT INTO deities (name_marathi, name_transliteration, icon_name) VALUES
('विठ्ठल', 'Vitthal', '🚩'),
('राम', 'Ram', '🌙'),
('कृष्ण', 'Krishna', '🐚'),
('शिव', 'Shiva', 'ॐ'),
('देवी', 'Devi', '🙏'),
('गणपती', 'Ganpati', '🌸'),
('अन्य', 'Other', '🕉️');

-- Insert core festivals
INSERT INTO festivals (name_marathi, name_transliteration, date_rule, month_day_rule) VALUES
('आषाढी एकादशी', 'Ashadhi Ekadashi', 'आशाढी कृष्ण पक्षाची एकादशी', 'अशा एकादशी'),
('कार्तिकी एकादशी', 'Kartiki Ekadashi', 'कार्तिक कृष्ण पक्षाची एकादशी', 'कार्तिक एकादशी'),
('गणेश चतुर्थी', 'Ganesh Chaturthi', 'भाद्रपद शुक्ल चतुर्थी', 'गणेश चतुर्थी'),
('नवरात्री', 'Navratri', 'अश्विन शुक्ल पक्षाची पहिली दिवशी पाडवा', 'नवरात्री'),
('दत्त जयंती', 'Datta Jayanti', 'अश्विन कृष्ण पक्षाच्या पंचमी', 'दत्त जयंती'),
('राम नवमी', 'Ram Navami', 'चैत्र कृष्ण पक्षाची नवमी', 'राम नवमी'),
('हनुमान जयंती', 'Hanuman Jayanti', 'चैत्र शुक्ल पक्षाची पंचमी', 'हनुमान जयंती');

-- Insert core categories
INSERT INTO categories (name_marathi, name_transliteration, slug, description) VALUES
('विठ्ठल', 'Vitthal', 'vitthal', 'विठ्ठल वर्षा आणि वारकरी सम्बन्धी साहित्य'),
('अभंग', 'Abhang', 'abhang', 'तुकाराम, द्न्यादेश्वर यांचे अभंग'),
('हरिपाठ', 'Haripath', 'haripath', 'नामदेव महाराजांचे हरिपाठ'),
('आरती', 'Aarti', 'aarti', 'देवी, देवतांच्या आरती'),
('स्तोत्र', 'Stotra', 'stotra', 'प्रार्थना आणि स्तोत्रगाथा'),
('भजन', 'Bhajan', 'bhajan', 'भक्ती भजने'),
('गौळणी', 'Gaulani', 'gaulani', 'गौळणी काव्ये'),
('कीर्तन', 'Kirtan', 'kirtan', 'कीर्तन साहित्य');