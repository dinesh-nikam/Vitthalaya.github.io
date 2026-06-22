# Digital Pandharpur — Visual Assets Audit & Replacement Guide

This document details all **placeholder, temporary, and generic images** currently in the codebase that should be replaced with high-quality, authentic, regional, and historical images. It provides the file locations, current image details, context, and precise search queries to find the correct images online.

---

## 1. PWA & Application Icon Placeholders

These icons are registered in the Progressive Web App (PWA) configuration but are currently blank, 70-byte placeholder files.

*   **Target Files:**
    *   [`/public/icons/icon-192x192.png`](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/public/icons/icon-192x192.png)
    *   [`/public/icons/icon-384x384.png`](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/public/icons/icon-384x384.png)
    *   [`/public/icons/icon-512x512.png`](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/public/icons/icon-512x512.png)
*   **Current State:** 1x1 pixel empty/blank PNGs.
*   **What it should be:** A premium, stylized icon representation of the Warkari culture. Good options include:
    *   A vector silhouette of the **Bhagwa Flag (saffron flag)**.
    *   A clean line-art representation of the **Pandharpur Temple dome/spire**.
    *   Traditional calligraphic art of the word **"विठ्ठल"** or the sacred **"ॐ"** symbol.
*   **Online Search Queries:**
    *   `"traditional saffron flag vector icon logo"`
    *   `"devanagari calligraphy vitthal png"`
    *   `"pandharpur temple silhouette minimalist icon"`

---

## 2. Assets Registry (`src/lib/assets-registry.ts`)

The file [`src/lib/assets-registry.ts`](file:///c:/Users/Dinesh%20Nikam/Desktop/mirai/varkari/src/lib/assets-registry.ts) serves as the primary catalog for visual assets displayed on the home page, category grids, and saint collections. Many cards use generic stock photographs instead of actual regional structures and cultural artifacts.

Below is the list of specific placeholders grouped by collection:

### Category: Saints Gallery (`SAINTS_COLLECTION`)

| Asset ID | Current Title & Context | Current Unsplash ID / Placeholder | What the Actual Image Should Be | Online Search Queries |
| :--- | :--- | :--- | :--- | :--- |
| **`s11`** | **Sacred Woods of Dehu** <br>*(संत तुकाराम महाराजांच्या वास्तव्याने पुनीत झालेले शांत वन)* | `photo-1447752875215-b2761acb3c5d` <br>*(Generic European forest)* | Bhandara Dongar (the sacred hill near Dehu where Sant Tukaram wrote his abhangs) or the Indrayani River bank at Dehu. | `"Dehu Bhandara Dongar temple"`, `"Indrayani river Dehu ghats"`, `"Dehu Gatha Mandir"` |
| **`s12`** | **Silent Chandrabhaga Shore** <br>*(चंद्रभागा नदीचा संथ वाहणारा प्रवाह)* | `photo-1507525428034-b723cf961d3e` <br>*(Generic tropical beach with sunset)* | The actual sandy shores of the Chandrabhaga River in Pandharpur showing devotees or boats. | `"Chandrabhaga river Pandharpur"`, `"Chandrabhaga ghats sunset"` |
| **`s13`** | **Prayer Beads of Devotion** <br>*(हातात तुळशीची माळ धरून जप करणारे भक्त)* | `photo-1604871000636-074fa5117945` <br>*(Generic red background texture)* | A close-up of a devotee's hands holding or counting traditional wooden Tulsi beads (Tulsi Mala). | `"Tulsi Mala prayer beads close up"`, `"Warkari Tulsi mala chanting"` |
| **`s14`** | **Gateway to the Divine** <br>*(दगडी कोरीव काम असलेले प्राचीन मंदिराचे प्रवेशद्वार)* | `photo-1518005020951-eccb494ad742` <br>*(Generic Indian stone carved arch)* | The main entrance door ("Mahadwar") or portal structure of the Vitthal-Rukmini Mandir in Pandharpur. | `"Vitthal temple Pandharpur entrance Mahadwar"`, `"Pandharpur temple gate entrance"` |
| **`s16`** | **The Sacred Banyan Tree** <br>*(ज्याखाली बसून संतांनी ज्ञान प्राप्ती केली तो प्राचीन वटवृक्ष)* | `photo-1502082553048-f009c37129b9` <br>*(Generic woodland tree)* | The sacred Ajan Vriksha (ancient tree) adjacent to Sant Dnyaneshwar's samadhi temple in Alandi. | `"Alandi temple Ajan Vriksha"`, `"Alandi Dnyaneshwar samadhi temple tree"` |
| **`s17`** | **Ancient Devotional Manuscripts** <br>*(भूर्जपत्रावरील किंवा जुन्या कागदावरील हस्ताक्षरात लिहिलेले अभंग)* | `photo-1544644181-1484b3fdfc62` <br>*(Generic old western library books)* | Authentic handwritten manuscripts of the *Dnyaneshwari* or *Tukaram Gatha* written in Modi script or old Marathi script. | `"Dnyaneshwari old manuscript"`, `"Modi script paper archive Maharashtra"`, `"historical Marathi scroll manuscript"` |
| **`s18`** | **Traditional Chants (Bhajan)** <br>*(टाळ-मृदंगाच्या गजरात भजनामध्ये तल्लीन झालेले भक्त)* | `photo-1582510003544-4d00b7f74220` <br>*(Generic drum set cymbals)* | Warkari devotees playing the *Tal* (traditional brass hand cymbals) or *Chipri* during a Bhajan session. | `"Warkari bhajan tal cymbals"`, `"Warkari chipri singers"`, `"bhajan kirtan Maharashtra crowd"` |

---

### Category: Pandharpur Heritage (`PANDHARPUR_COLLECTION`)

| Asset ID | Current Title & Context | Current Unsplash ID / Placeholder | What the Actual Image Should Be | Online Search Queries |
| :--- | :--- | :--- | :--- | :--- |
| **`p1`** | **Pandharpur Temple Shikhara** <br>*(श्री विठ्ठल रुक्मिणी मंदिराचे उंच आणि सुंदर शिखर)* | `photo-1590076211831-299f24ba8382` <br>*(Generic river ghats view)* | The golden Shikhara (dome/spire) of the Vitthal Rukmini Mandir in Pandharpur. | `"Vitthal temple Pandharpur Shikhara"`, `"Pandharpur mandir golden dome"` |
| **`p3`** | **Devotees at Temple Complex** <br>*(विठू माऊलीच्या दर्शनासाठी मंदिराबाहेर लागलेल्या लांबच लांब रांगा)* | `photo-1562016600-ece13e8ba570` <br>*(Generic crowded city street)* | The long queue of Warkari pilgrims waiting patiently on the bridge or around the temple complex. | `"Pandharpur wari crowd queue"`, `"Vitthal mandir queue devotees"` |
| **`p5`** | **Lamps of the Sanctum** <br>*(मंदिराच्या आत विठ्ठल मूर्तीसमोर पेटवलेले शेकडो तेजोमय दिवे)* | `photo-1605276374104-dee2a0ed3cd6` <br>*(Generic small brass oil lamps)* | The towering stone Deepmala (lamp pillars) of the Pandharpur temple lit up at night. | `"Pandharpur temple Deepmala stone pillar"`, `"Maharashtra stone Deepmal temple"` |
| **`p12`** | **Sant Namdev Payari** <br>*(मंदिराच्या प्रवेशद्वारावरील संत नामदेव महाराजांची समाधी पायरी)* | `photo-1447752875215-b2761acb3c5d` <br>*(Generic forest pathway)* | The historical "Namdev Payari" (the first step of the temple covered in a metal mask where devotees bow before entering). | `"Namdev Payari Vitthal temple entrance"`, `"Namdev Payari Pandharpur"` |
| **`p17`** | **Mauli Divine Radiance** <br>*(कमरेवर हात ठेवून विटेवर उभा असलेल्या विठू माऊलीचे काल्पनिक चित्र)* | `photo-1604871000636-074fa5117945` <br>*(Generic red background)* | A painting, visual artwork, or clean sculpture photography of Lord Vitthal (Vithoba) standing on a brick with hands on his waist. | `"Vithoba Vitthal standing hands on hips brick painting"`, `"Pandharpur Vithoba statue idol"` |
| **`p19`** | **Gopalpur Temple Area** <br>*(श्रीकृष्ण लीलांचे गोपाळपूर मंदिर)* | `photo-1502082553048-f009c37129b9` <br>*(Generic tree)* | The historic Gopalpur Temple located just outside Pandharpur town. | `"Gopalpur temple Pandharpur"`, `"Gopalpura Krishna temple Chandrabhaga"` |

---

### Category: Wari Pilgrimage (`WARI_COLLECTION`)

| Asset ID | Current Title & Context | Current Unsplash ID / Placeholder | What the Actual Image Should Be | Online Search Queries |
| :--- | :--- | :--- | :--- | :--- |
| **`w1`** | **Wari Foot Pilgrimage** <br>*(उन्हा-पावसातही विठ्ठलाच्या नामस्मरणात मैलोन्मैल चालणारे वारकरी)* | `photo-1473163928189-364b2c4e1135` <br>*(Generic feet walking on road)* | Panoramic or wide shot of thousands of white-clad Warkaris walking along the rural highway carrying saffron flags. | `"Ashadhi Wari pilgrimage crowd highway"`, `"Warkari walking saffron flags"` |
| **`w5`** | **Palkhi Procession Start** <br>*(आळंदी किंवा देहू येथून निघणाऱ्या ज्ञानेश्वर-तुकाराम महाराजांच्या पालख्या)* | `photo-1590076211831-299f24ba8382` <br>*(Generic sunset river)* | The decorated silver or gold carriage (Palkhi) carrying the footprints (*Padukas*) of the saints at the start of the journey. | `"Sant Dnyaneshwar Palkhi chariot Alandi"`, `"Tukaram Palkhi Dehu procession"` |
| **`w6`** | **Elderly Warkari Pilgrim** <br>*(कपाळावर बुक्का आणि हाती टाळ घेऊन गाणारे वयोवृद्ध वारकरी बाबा)* | `photo-1545128485-c400e7702796` <br>*(Generic meditation portrait)* | Portrait of a senior Warkari with traditional Bukka and Chandan markings on his forehead, holding a Veena or cymbals. | `"Vaishnava warkari pilgrim face portrait"`, `"elderly warkari devotee"` |
| **`w7`** | **Ringan Ceremony** <br>*(वारीतील प्रसिद्ध रिंगण सोहळा, जेथे घोडे आणि भाविक गोल धावतात)* | `photo-1506126613408-eca07ce68773` <br>*(Generic yoga/meditation posture at dawn)* | The famous Ringan ceremony where the sacred riderless horse (Maulincha Ashwa) runs around a circle of devotees. | `"Pandharpur wari Ringan ceremony horse"`, `"Alandi Palkhi Ringan"` |
| **`w12`** | **Veena Carrying Devotee** <br>*(खांद्यावर वीणा घेऊन अखंड विठ्ठल जप करणारे वारकरी)* | `photo-1518241353330-0f7941c2d9b5` <br>*(Generic book library)* | A Warkari carrying the long wooden stringed instrument (Veena) vertically on their shoulder. | `"Warkari carrying veena instrument"`, `"veena player warkari"` |
| **`w13** | **Sandalwood Paste Markings** <br>*(कपाळावर टिळा आणि बुक्का लावलेले वारकऱ्यांचे पारंपरिक रूप)* | `photo-1604871000636-074fa5117945` <br>*(Generic red background)* | Close-up details of a pilgrim's forehead showing the vertical Chandan line with a dark Bukka circular dot. | `"warkari tilak forehead close up"`, `"gopichand chandan tilak forehead"` |
| **`w16`** | **Women Devotees with Cymbals** <br>*(डोक्यावर तुळशीचे वृंदावन घेऊन नाचणाऱ्या महिला वारकरी)* | `photo-1519817650390-64a93db51149` <br>*(Generic reader portrait)* | Traditional warkari women carrying metallic Tulsi pots (Tulsi Vrindavan) on their heads as they dance. | `"women carrying tulsi pot in wari"`, `"warkari women Tulsi head"` |

---

### Category: Festivals & Heritage (`FESTIVAL_COLLECTION` & `HERITAGE_COLLECTION`)

| Asset ID | Current Title & Context | Current Unsplash ID / Placeholder | What the Actual Image Should Be | Online Search Queries |
| :--- | :--- | :--- | :--- | :--- |
| **`f2`** | **Traditional Gudi Padwa** <br>*(नवीन वर्षाच्या स्वागतासाठी घरासमोर उभारलेली गुढी)* | `photo-1532186212198-d8f8b8cf8d2e` <br>*(Generic street lights)* | A decorated Gudi pole (saffron/green silk cloth, neem leaves, garland, and copper vessel) erected outside a Maharashtrian house. | `"Gudi Padwa flag hoisting home"`, `"Maharashtrian Gudi decoration"` |
| **`f18`** | **Khandoba Bhandara Festival** <br>*(जेजुरी गडावर उधळण्यात येणारा पिवळाधमक भंडारा)* | `photo-1544644181-1484b3fdfc62` <br>*(Generic books list)* | The Jejuri Temple steps and sky covered in golden yellow turmeric powder (Bhandara) thrown by devotees. | `"Jejuri Bhandara festival turmeric"`, `"Jejuri temple yellow powder storm"` |
| **`h1`** | **Raigad Fort - Sahyadri Glory** <br>*(छत्रपती शिवाजी महाराजांची राजधानी असलेला ऐतिहासिक रायगड)* | `photo-1589308078059-be1415eab4c3` <br>*(Generic road through green hills)* | The stone bastions, massive Maha Darwaja, or the grand throne canopy structure at Raigad Fort. | `"Raigad fort Maha Darwaja"`, `"Raigad fort Shivaji Maharaj throne"` |
| **`h13`** | **Paithani Saree Weaving** <br>*(पैठण येथील सोन्याच्या जरीचे आणि मोराच्या नक्षीचे रेशमी विणकाम)* | `photo-1604871000636-074fa5117945` <br>*(Generic red background)* | Close-up photography of a handloom weaver weaving the famous silk Paithani saree with its trademark golden peacock borders. | `"Paithani saree handloom weaving"`, `"Paithani peacock border silk weave"` |
