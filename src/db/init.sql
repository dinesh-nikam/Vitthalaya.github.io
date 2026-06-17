-- Digital Pandharpur - SQLite Schema
-- Mirrors postgres_schema.sql with SQLite-compatible syntax

-- Saints (Venerable poets)
CREATE TABLE IF NOT EXISTS saints (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name_marathi TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    period TEXT,
    biography TEXT,
    region TEXT,
    image_url TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Deities (Vitthal, Shiva, Devi, etc.)
CREATE TABLE IF NOT EXISTS deities (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name_marathi TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    icon_name TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Festivals (Ashadhi Ekadashi, etc.)
CREATE TABLE IF NOT EXISTS festivals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name_marathi TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    date_rule TEXT,
    month_day_rule TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Categories (Nested classification)
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name_marathi TEXT NOT NULL,
    name_transliteration TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    parent_category_id TEXT REFERENCES categories(id),
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Compositions (Core content)
CREATE TABLE IF NOT EXISTS compositions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title_marathi TEXT NOT NULL,
    title_transliteration TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN (
        'abhang', 'aarti', 'bhajan', 'stotra', 'haripath',
        'gaulani', 'deviche_gane', 'bharud', 'kirtan',
        'namasmaran', 'powada'
    )),
    full_text TEXT NOT NULL,
    meaning TEXT,
    saint_id TEXT REFERENCES saints(id),
    deity_id TEXT REFERENCES deities(id),
    region TEXT,
    source_attribution TEXT,
    source_url TEXT,
    audio_links TEXT, -- JSON stored as TEXT (replaces JSONB)
    is_verified INTEGER DEFAULT 0, -- 0=false, 1=true (SQLite has no BOOLEAN)
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Junction tables for many-to-many relationships
CREATE TABLE IF NOT EXISTS composition_festivals (
    composition_id TEXT REFERENCES compositions(id) ON DELETE CASCADE,
    festival_id TEXT REFERENCES festivals(id) ON DELETE CASCADE,
    PRIMARY KEY (composition_id, festival_id)
);

CREATE TABLE IF NOT EXISTS composition_categories (
    composition_id TEXT REFERENCES compositions(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (composition_id, category_id)
);

-- Saint relationships (related saints)
CREATE TABLE IF NOT EXISTS saint_relationships (
    saint_id TEXT REFERENCES saints(id) ON DELETE CASCADE,
    related_saint_id TEXT REFERENCES saints(id) ON DELETE CASCADE,
    relationship_type TEXT,
    PRIMARY KEY (saint_id, related_saint_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compositions_type ON compositions(type);
CREATE INDEX IF NOT EXISTS idx_compositions_saint ON compositions(saint_id);
CREATE INDEX IF NOT EXISTS idx_compositions_search ON compositions(title_marathi, title_transliteration);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_category_id);

-- ============================================================
-- Seed Data
-- ============================================================

-- Deities
INSERT INTO deities (name_marathi, name_transliteration, icon_name) VALUES
('विठ्ठल', 'Vitthal', '🚩'),
('राम', 'Ram', '🌙'),
('कृष्ण', 'Krishna', '🐚'),
('शिव', 'Shiva', 'ॐ'),
('देवी', 'Devi', '🙏'),
('गणपती', 'Ganpati', '🌸'),
('अन्य', 'Other', '🕉️');

-- Festivals
INSERT INTO festivals (name_marathi, name_transliteration, date_rule, month_day_rule) VALUES
('आषाढी एकादशी', 'Ashadhi Ekadashi', 'आशाढी कृष्ण पक्षाची एकादशी', 'अशा एकादशी'),
('कार्तिकी एकादशी', 'Kartiki Ekadashi', 'कार्तिक कृष्ण पक्षाची एकादशी', 'कार्तिक एकादशी'),
('गणेश चतुर्थी', 'Ganesh Chaturthi', 'भाद्रपद शुक्ल चतुर्थी', 'गणेश चतुर्थी'),
('नवरात्री', 'Navratri', 'अश्विन शुक्ल पक्षाची पहिली दिवशी पाडवा', 'नवरात्री'),
('दत्त जयंती', 'Datta Jayanti', 'अश्विन कृष्ण पक्षाच्या पंचमी', 'दत्त जयंती'),
('राम नवमी', 'Ram Navami', 'चैत्र कृष्ण पक्षाची नवमी', 'राम नवमी'),
('हनुमान जयंती', 'Hanuman Jayanti', 'चैत्र शुक्ल पक्षाची पंचमी', 'हनुमान जयंती');

-- Categories
INSERT INTO categories (name_marathi, name_transliteration, slug, description) VALUES
('विठ्ठल', 'Vitthal', 'vitthal', 'विठ्ठल वर्षा आणि वारकरी सम्बन्धी साहित्य'),
('अभंग', 'Abhang', 'abhang', 'तुकाराम, द्न्यादेश्वर यांचे अभंग'),
('हरिपाठ', 'Haripath', 'haripath', 'नामदेव महाराजांचे हरिपाठ'),
('आरती', 'Aarti', 'aarti', 'देवी, देवतांच्या आरती'),
('स्तोत्र', 'Stotra', 'stotra', 'प्रार्थना आणि स्तोत्रगाथा'),
('भजन', 'Bhajan', 'bhajan', 'भक्ती भजने'),
('गौळणी', 'Gaulani', 'gaulani', 'गौळणी काव्ये'),
('देवीचे गाणे', 'Deviche Gane', 'deviche-gane', 'देवीची गाणी आणि स्तोत्रे'),
('कीर्तन', 'Kirtan', 'kirtan', 'कीर्तन साहित्य');

-- Saints (from seed.ts)
INSERT INTO saints (name_marathi, name_transliteration, period, region, biography) VALUES
('तुकाराम महाराज', 'Tukaram Maharaj', '१७थे शतक', 'देहू',
 'तुकाराम महाराज हे वारकरी संत या संघाटीचे मुख्य संत होंडले. तुकाराम महाराज यांचे अभंग विठ्ठल वर्षा आणि भक्ती भावनेत रचलेले आहेत. त्यांच्या अभंगात प्रेम आणि भक्ती यांचे सुकून प्रतिबिंबित होते.'),
('द्न्यादेश्वर महाराज', 'Dnyaneshwar Maharaj', '१३थे शतक', 'अलंदी',
 'द्न्यादेश्वर महाराज हे वारकरी संत या संघाटीचे संत होंडले. त्यांनी हरिपाठ लिहिले आहे, जे मराठी भक्ती साहित्यातील अविभाज्य अंश आहे.'),
('नामदेव महाराज', 'Namdev Maharaj', '१३थे शतक', 'अहमदनगर',
 'नामदेव महाराज हे वारकरी संत या संघाटीचे संत आणि त्यांचे हरिपाठ हे भक्ती काव्याचा उत्कृष्ट स्तराचे उदाहरण आहे.'),
('एकनाथ महाराज', 'Eknath Maharaj', '१६थे शतक', 'पुणे',
 'एकनाथ महाराज हे वारकरी संत या संघाटीचे संत आणि त्यांचे स्तोत्र आणि अभंग विशेष महत्वाचे आहेत.');
