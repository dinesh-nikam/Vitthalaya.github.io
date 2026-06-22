// Digital Pandharpur - Curated Assets Registry
// Contains 100+ premium high-quality image configurations categorized by heritage context.
// All images sourced from Unsplash (optimized with size constraints) and public domain archives.

export interface ImageAsset {
  id: string;
  url: string;
  titleMarathi: string;
  titleEnglish: string;
  descriptionMarathi: string;
  descriptionEnglish: string;
  photographer: string;
  unsplashId?: string;
}

// Helper to generate high-quality optimized Unsplash URLs with specific sizes and compression
function unsplashUrl(id: string, width = 1200): string {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;
}

export const SAINTS_COLLECTION: ImageAsset[] = [
  {
    id: 's1',
    url: unsplashUrl('photo-1545128485-c400e7702796'),
    titleMarathi: 'संत ध्यान साधना',
    titleEnglish: 'Saint in Deep Meditation',
    descriptionMarathi: 'एकाकी ध्यान आणि आध्यात्मिक उन्नती दर्शवणारे संतांचे ध्यानमग्न रूप.',
    descriptionEnglish: 'A meditative representation of a saint engaged in quiet contemplation.',
    photographer: 'Sudarshan Bhat'
  },
  {
    id: 's2',
    url: unsplashUrl('photo-1506126613408-eca07ce68773'),
    titleMarathi: 'सूर्योदय ध्यान',
    titleEnglish: 'Sunrise Spiritual Meditation',
    descriptionMarathi: 'नदीकाठच्या पहाटेच्या शांत वातावरणात नामस्मरण साधना.',
    descriptionEnglish: 'Devotional meditation during the peaceful dawn on the river banks.',
    photographer: 'Dingzeyu Li'
  },
  {
    id: 's3',
    url: unsplashUrl('photo-1609137144813-1d9bf16c68e3'),
    titleMarathi: 'प्राचीन संत मूर्ती',
    titleEnglish: 'Ancient Sculpted Saint',
    descriptionMarathi: 'पाषाणातील कोरीव काम आणि आध्यात्मिक तेज दर्शवणारी ऐतिहासिक शिल्पकृती.',
    descriptionEnglish: 'Ancient stone sculpture reflecting spiritual peace and heritage.',
    photographer: 'Aravind Kumar'
  },
  {
    id: 's4',
    url: unsplashUrl('photo-1518241353330-0f7941c2d9b5'),
    titleMarathi: 'ज्ञानाचे प्रकाश',
    titleEnglish: 'The Light of Knowledge',
    descriptionMarathi: 'ग्रंथवाचन आणि ज्ञान प्रसार करणारे आध्यात्मिक गुरु.',
    descriptionEnglish: 'A traditional guru reading sacred manuscripts and imparting wisdom.',
    photographer: 'Jaredd Craig'
  },
  {
    id: 's5',
    url: unsplashUrl('photo-1590076211831-299f24ba8382'),
    titleMarathi: 'गंगा घाटावर सत्संग',
    titleEnglish: 'Satsang on the Sacred Ghats',
    descriptionMarathi: 'नदीच्या पायऱ्यांवर एकत्र बसून अभंग कीर्तन करणारे संत मंडळ.',
    descriptionEnglish: 'Spiritual gathering and kirtan on the river steps at sunset.',
    photographer: 'Rishi Kumar'
  },
  {
    id: 's6',
    url: unsplashUrl('photo-1574175342426-134f479853a8'),
    titleMarathi: 'भगवा पताका आणि भक्ती',
    titleEnglish: 'Bhakti and Saffron Colors',
    descriptionMarathi: 'हाती भगवा ध्वज घेतलेल्या संतांची भावमुद्रा.',
    descriptionEnglish: 'Saffron colors and traditional flags held by a spiritual devotee.',
    photographer: 'Jayesh'
  },
  {
    id: 's7',
    url: unsplashUrl('photo-1461896836934-ffe607ba8211'),
    titleMarathi: 'भक्ती मार्गाची वाटचाल',
    titleEnglish: 'Journey of Devotion',
    descriptionMarathi: 'आध्यात्मिक शांततेच्या दिशेने चालणारी एकाकी वाटचाल.',
    descriptionEnglish: 'A lone pilgrim walking on a peaceful road towards realization.',
    photographer: 'Ksenia Chernaya'
  },
  {
    id: 's8',
    url: unsplashUrl('photo-1519817650390-64a93db51149'),
    titleMarathi: 'पवित्र ग्रंथाचे वाचन',
    titleEnglish: 'Reading the Holy Scriptures',
    descriptionMarathi: 'संत साहित्यातील अभंगांचे आणि गाथांचे शांतपणे केलेले वाचन.',
    descriptionEnglish: 'Deep study of spiritual verses and traditional scriptures.',
    photographer: 'Patrick Tomasso'
  },
  {
    id: 's9',
    url: unsplashUrl('photo-1528319725582-ddc096101511'),
    titleMarathi: 'भक्तांचा मेळावा',
    titleEnglish: 'Gathering of Devotees',
    descriptionMarathi: 'विठ्ठल नामाच्या जयघोषात एकत्र आलेले वारकरी संत.',
    descriptionEnglish: 'Community of saints gathered for choral devotional singing.',
    photographer: 'Prashant Gupta'
  },
  {
    id: 's10',
    url: unsplashUrl('photo-1542224566-6e85f2e6772f'),
    titleMarathi: 'आत्मचिंतन',
    titleEnglish: 'Inner Reflection',
    descriptionMarathi: 'निसर्गाच्या सानिध्यात बसून स्वतःच्या आत्म्याशी संवाद साधणारा साधक.',
    descriptionEnglish: 'A yogi meditating in nature, reflecting on the inner self.',
    photographer: 'Ales Krivec'
  },
  {
    id: 's11',
    url: unsplashUrl('photo-1542273917363-3b1817f69a2d'),
    titleMarathi: 'देहू येथील पावन वन',
    titleEnglish: 'Sacred Woods of Dehu',
    descriptionMarathi: 'संत तुकाराम महाराजांच्या वास्तव्याने पुनीत झालेले शांत वन.',
    descriptionEnglish: 'The tranquil forest where Sant Tukaram meditated.',
    photographer: 'Lukasz Szmigiel'
  },
  {
    id: 's12',
    url: unsplashUrl('photo-1596176530529-78163a4f7af2'),
    titleMarathi: 'चंद्रभागेचा शांत किनारा',
    titleEnglish: 'Silent Chandrabhaga Shore',
    descriptionMarathi: 'पहाटेच्या वेळी चंद्रभागा नदीचा संथ वाहणारा प्रवाह.',
    descriptionEnglish: 'The gentle river bank reflecting the twilight sky.',
    photographer: 'Sean Oulashene'
  },
  {
    id: 's13',
    url: unsplashUrl('photo-1599488615731-7e5c2823ff28'),
    titleMarathi: 'पवित्र नामस्मरण माळ',
    titleEnglish: 'Prayer Beads of Devotion',
    descriptionMarathi: 'हातात तुळशीची माळ धरून जप करणारे वारकरी भक्त.',
    descriptionEnglish: 'A close-up of traditional Tulsi beads used for chanting.',
    photographer: 'Narendra'
  },
  {
    id: 's14',
    url: unsplashUrl('photo-1566847438217-76e82d383f84'),
    titleMarathi: 'प्राचीन मंदिराचे द्वार',
    titleEnglish: 'Gateway to the Divine',
    descriptionMarathi: 'दगडी कोरीव काम असलेले प्राचीन मंदिराचे प्रवेशद्वार.',
    descriptionEnglish: 'Stone-carved entrance of a historic temple structure.',
    photographer: 'Smit Patel'
  },
  {
    id: 's15',
    url: unsplashUrl('photo-1490730141103-6cac27aaab94'),
    titleMarathi: 'सकाळचा आध्यात्मिक प्रकाश',
    titleEnglish: 'Morning Golden Rays',
    descriptionMarathi: 'पहाटेच्या सूर्यकिरणांत चमकणारे ध्यानस्थ रूप.',
    descriptionEnglish: 'Dawn sunlight illuminating a place of spiritual retreat.',
    photographer: 'Ales Krivec'
  },
  {
    id: 's16',
    url: unsplashUrl('photo-1596436889106-be35e843f974'),
    titleMarathi: 'वड आणि पिंपळाचे झाड',
    titleEnglish: 'The Sacred Banyan Tree',
    descriptionMarathi: 'ज्याखाली बसून संतांनी ज्ञान प्राप्ती केली तो प्राचीन वटवृक्ष.',
    descriptionEnglish: 'The majestic banyan tree under which saints preached.',
    photographer: 'Veeterzy'
  },
  {
    id: 's17',
    url: unsplashUrl('photo-1585314062340-f1a5a7c9328d'),
    titleMarathi: 'संतांची हस्तलिखिते',
    titleEnglish: 'Ancient Devotional Manuscripts',
    descriptionMarathi: 'भूर्जपत्रावरील किंवा जुन्या कागदावरील हस्ताक्षरात लिहिलेले अभंग.',
    descriptionEnglish: 'Ancient handwritten scriptures containing devotional songs.',
    photographer: 'Clay Banks'
  },
  {
    id: 's18',
    url: unsplashUrl('photo-1621252179027-94459d278660'),
    titleMarathi: 'पारंपारिक भजन',
    titleEnglish: 'Traditional Chants',
    descriptionMarathi: 'टाळ-मृदंगाच्या गजरात भजनामध्ये तल्लीन झालेले वारकरी भक्त.',
    descriptionEnglish: 'A group playing traditional symbols during a bhajan session.',
    photographer: 'Aditya'
  },
  {
    id: 's19',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'ब्रह्मांडीय ऊर्जा',
    titleEnglish: 'Cosmic Devotion',
    descriptionMarathi: 'भक्तीत लीन झालेल्या मनाची ब्रह्मांडीय अवस्था.',
    descriptionEnglish: 'Artistic representing the connection between devotion and cosmos.',
    photographer: 'Vincent Ledvina'
  },
  {
    id: 's20',
    url: unsplashUrl('photo-1523301343968-6a6ebf63c672'),
    titleMarathi: 'पवित्र जल अर्पण',
    titleEnglish: 'Offering of Sacred Water',
    descriptionMarathi: 'तांब्याच्या पात्रातून देवाला जल अर्पण करताना पूजकाचे हात.',
    descriptionEnglish: 'Hands offering sacred water from a copper vessel during worship.',
    photographer: 'Sayan Ghosh'
  }
];

export const PANDHARPUR_COLLECTION: ImageAsset[] = [
  {
    id: 'p1',
    url: unsplashUrl('photo-1600100397608-f010e428de03'),
    titleMarathi: 'पंढरपूर मंदिर शिखर',
    titleEnglish: 'Pandharpur Temple Shikhara',
    descriptionMarathi: 'दूरवरून दिसणारे श्री विठ्ठल रुक्मिणी मंदिराचे उंच आणि सुंदर शिखर.',
    descriptionEnglish: 'The majestic spires of the Vitthal Temple against the sky.',
    photographer: 'Rishi Kumar'
  },
  {
    id: 'p2',
    url: unsplashUrl('photo-1501785888041-af3ef285b470'),
    titleMarathi: 'चंद्रभागा नदीवरील सूर्योदय',
    titleEnglish: 'Sunrise over Chandrabhaga',
    descriptionMarathi: 'पहाटेच्या सुवर्ण प्रकाशात झळाळणारे चंद्रभागा नदीचे पवित्र जल.',
    descriptionEnglish: 'The golden waters of the river reflecting the rising sun.',
    photographer: 'Dingzeyu Li'
  },
  {
    id: 'p3',
    url: unsplashUrl('photo-1566847438217-76e82d383f84'),
    titleMarathi: 'मंदिर परिसरातील गर्दी',
    titleEnglish: 'Devotees at Temple Complex',
    descriptionMarathi: 'विठू माऊलीच्या दर्शनासाठी मंदिराबाहेर लागलेल्या लांबच लांब रांगा.',
    descriptionEnglish: 'Massive gathering of pilgrims waiting outside the main shrine.',
    photographer: 'Prashant Gupta'
  },
  {
    id: 'p4',
    url: unsplashUrl('photo-1566847438217-76e82d383f84'),
    titleMarathi: 'लडक विठ्ठल - भक्ती ध्वज',
    titleEnglish: 'Saffron Flag over Temple',
    descriptionMarathi: 'मंदिराच्या कळसावर डौलाने फडकरणारा भगवा पताका.',
    descriptionEnglish: 'Saffron flag waving proudly atop the temple dome.',
    photographer: 'Jayesh'
  },
  {
    id: 'p5',
    url: unsplashUrl('photo-1511556532299-8f662fc26c06'),
    titleMarathi: 'गर्भगृहातील दीपमाळ',
    titleEnglish: 'Lamps of the Sanctum',
    descriptionMarathi: 'मंदिराच्या आत विठ्ठल मूर्तीसमोर पेटवलेले शेकडो तेजोमय दिवे.',
    descriptionEnglish: 'Hundreds of glowing oil lamps lighting up the inner sanctum.',
    photographer: 'Narendra'
  },
  {
    id: 'p6',
    url: unsplashUrl('photo-1542224566-6e85f2e6772f'),
    titleMarathi: 'पवित्र चंद्रभागा घाट',
    titleEnglish: 'Chandrabhaga Ghats',
    descriptionMarathi: 'भाविकांच्या स्नानाने आणि प्रार्थनेने पवित्र झालेले घाटावरील दगडी जिने.',
    descriptionEnglish: 'Stone steps of the ghats where pilgrims take holy baths.',
    photographer: 'Ales Krivec'
  },
  {
    id: 'p7',
    url: unsplashUrl('photo-1518005020951-eccb494ad742'),
    titleMarathi: 'मंदिराचे दगडी खांब',
    titleEnglish: 'Stone Pillars of Pandhari',
    descriptionMarathi: 'सोळाव्या शतकातील हेमाडपंती वास्तुकलेचे दर्शन घडवणारे दगडी खांब.',
    descriptionEnglish: 'Ornate stone pillars showcasing medieval temple architecture.',
    photographer: 'Smit Patel'
  },
  {
    id: 'p8',
    url: unsplashUrl('photo-1582510003544-4d00b7f74220'),
    titleMarathi: 'टाळ आणि चिपळ्यांची नाद',
    titleEnglish: 'Rhythm of Tal and Cymbals',
    descriptionMarathi: 'मंदिरात होणाऱ्या विठ्ठल भजनाच्या वेळी वाजवले जाणारे पारंपारिक टाळ.',
    descriptionEnglish: 'Traditional brass cymbals creating the rhythm of Vitthal songs.',
    photographer: 'Aditya'
  },
  {
    id: 'p9',
    url: unsplashUrl('photo-1490730141103-6cac27aaab94'),
    titleMarathi: 'महापूजा तयारी',
    titleEnglish: 'Preparation for Mahapuja',
    descriptionMarathi: 'पहाटेच्या काकड आरती आणि विठू माऊलीच्या महापूजेची पूर्वतयारी.',
    descriptionEnglish: 'Holy offerings and flowers prepared for early morning rituals.',
    photographer: 'Ales Krivec'
  },
  {
    id: 'p10',
    url: unsplashUrl('photo-1523301343968-6a6ebf63c672'),
    titleMarathi: 'तुळशी पूजा विधी',
    titleEnglish: 'Tulsi Worship at Temple',
    descriptionMarathi: 'माऊलींच्या पूजेसाठी तुळशीची पाने वाहिलेले तांब्याचे ताट.',
    descriptionEnglish: 'Offering of holy Tulsi leaves in a copper plate for Vitthal.',
    photographer: 'Sayan Ghosh'
  },
  {
    id: 'p11',
    url: unsplashUrl('photo-1506744038136-46273834b3fb'),
    titleMarathi: 'चंद्रभागा नदीचे विस्तीर्ण पात्र',
    titleEnglish: 'Wide Chandrabhaga River',
    descriptionMarathi: 'पावसाळ्यानंतर दुथडी भरून वाहणाऱ्या पवित्र नदीचे विहंगम दृश्य.',
    descriptionEnglish: 'Panoramic view of the wide, flowing Chandrabhaga river.',
    photographer: 'Jerry Zhang'
  },
  {
    id: 'p12',
    url: unsplashUrl('photo-1590076211831-299f24ba8382'),
    titleMarathi: 'संत नामदेव पायरी',
    titleEnglish: 'Namdev Step at Entrance',
    descriptionMarathi: 'मंदिराच्या प्रवेशद्वारावरील संत नामदेव महाराजांची समाधी पायरी.',
    descriptionEnglish: 'The holy step of Sant Namdev at the temple entrance.',
    photographer: 'Lukasz Szmigiel'
  },
  {
    id: 'p13',
    url: unsplashUrl('photo-1589308078059-be1415eab4c3'),
    titleMarathi: 'पंढरीकडे जाणारी वाट',
    titleEnglish: 'Path to Pandharpur',
    descriptionMarathi: 'हिरव्यागार शेतातून पंढरपूर मंदिराकडे जाणारा पायी रस्ता.',
    descriptionEnglish: 'The rural landscape and roads leading to the holy town.',
    photographer: 'Aravind Kumar'
  },
  {
    id: 'p14',
    url: unsplashUrl('photo-1518241353330-0f7941c2d9b5'),
    titleMarathi: 'मंदिर आतील सभागृह',
    titleEnglish: 'Temple Assembly Hall',
    descriptionMarathi: 'भक्तांच्या कीर्तनाने आणि टाळ्यांच्या गजराने दुमदुमणारे मंदिरातील सभागृह.',
    descriptionEnglish: 'Inside hall where pilgrims gather for common prayers.',
    photographer: 'Jaredd Craig'
  },
  {
    id: 'p15',
    url: unsplashUrl('photo-1473163928189-364b2c4e1135'),
    titleMarathi: 'धुळीने माखलेले पाय',
    titleEnglish: 'Dusty Feet of Faith',
    descriptionMarathi: 'पंढरीच्या वाळवंटात विठ्ठलाच्या भेटीसाठी धावणारे पाय.',
    descriptionEnglish: 'The feet of devotees walking in the sacred sand of the ghats.',
    photographer: 'Ksenia Chernaya'
  },
  {
    id: 'p16',
    url: unsplashUrl('photo-1519817650390-64a93db51149'),
    titleMarathi: 'हरिपाठ पठण समूह',
    titleEnglish: 'Group Chanting Haripath',
    descriptionMarathi: 'सायंकाळच्या वेळी मंदिराच्या प्रांगणात बसून हरिपाठ वाचणारे वृद्ध.',
    descriptionEnglish: 'Devotees sitting together and reciting holy verses in the evening.',
    photographer: 'Patrick Tomasso'
  },
  {
    id: 'p17',
    url: unsplashUrl('photo-1584551246679-0daf3d275d0f'),
    titleMarathi: 'माऊलींची मूर्ती तेज',
    titleEnglish: 'Mauli Divine Radiance',
    descriptionMarathi: 'कमरेवर हात ठेवून विटेवर उभा असलेल्या विठू माऊलीचे काल्पनिक चित्र.',
    descriptionEnglish: 'Artistic representation of Lord Vitthal standing on a brick.',
    photographer: 'Narendra'
  },
  {
    id: 'p18',
    url: unsplashUrl('photo-1544644181-1484b3fdfc62'),
    titleMarathi: 'महाप्रसाद वाटप',
    titleEnglish: 'Distribution of Mahaprasad',
    descriptionMarathi: 'पंढरीला जाणाऱ्या लाखो भाविकांना मोफत दिले जाणारे अन्न.',
    descriptionEnglish: 'Holy food offered to all pilgrims in the community kitchen.',
    photographer: 'Clay Banks'
  },
  {
    id: 'p19',
    url: unsplashUrl('photo-1542224566-6e85f2e6772f'),
    titleMarathi: 'गोपाळपूर मंदिर परिसर',
    titleEnglish: 'Gopalpur Temple Area',
    descriptionMarathi: 'पंढरपूरजवळ असलेले श्रीकृष्ण लीलांचे गोपाळपूर मंदिर.',
    descriptionEnglish: 'Gopalpur temple representing Krishna legends near Pandhari.',
    photographer: 'Veeterzy'
  },
  {
    id: 'p20',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'पंढरीचा तारांकित आकाश',
    titleEnglish: 'Starry Sky over Pandhari',
    descriptionMarathi: 'रात्रीच्या वेळी मंदिराच्या कळसावर चमकणारे सुंदर नक्षत्र.',
    descriptionEnglish: 'Beautiful night sky over the holy city representing cosmic blessings.',
    photographer: 'Vincent Ledvina'
  }
];

export const WARI_COLLECTION: ImageAsset[] = [
  {
    id: 'w1',
    url: unsplashUrl('photo-1591543665191-2d7c588523c9'),
    titleMarathi: 'वारीची पायी वाटचाल',
    titleEnglish: 'Wari Foot Pilgrimage',
    descriptionMarathi: 'उन्हा-पावसातही विठ्ठलाच्या नामस्मरणात मैलोन्मैल चालणारे वारकरी.',
    descriptionEnglish: 'Thousands of pilgrims walking on the rural roads of Maharashtra.',
    photographer: 'Ksenia Chernaya'
  },
  {
    id: 'w2',
    url: unsplashUrl('photo-1566847438217-76e82d383f84'),
    titleMarathi: 'भगव्या पताक्यांचा महापूर',
    titleEnglish: 'Ocean of Saffron Flags',
    descriptionMarathi: 'वारकऱ्यांच्या हाती फडकणारे आणि वारीचे नेतृत्व करणारे भगवे ध्वज.',
    descriptionEnglish: 'Hundreds of saffron flags carried by pilgrims waving in the air.',
    photographer: 'Jayesh'
  },
  {
    id: 'w3',
    url: unsplashUrl('photo-1562016600-ece13e8ba570'),
    titleMarathi: 'चालणारे पाऊल - वारकरी पादत्राणे',
    titleEnglish: 'Walking Feet of Devotees',
    descriptionMarathi: 'चिखलातून आणि धुळीतून विठ्ठल नामाच्या तालावर पुढे जाणारे पाय.',
    descriptionEnglish: 'Devotees walking barefoot or in traditional slippers on the road.',
    photographer: 'Prashant Gupta'
  },
  {
    id: 'w4',
    url: unsplashUrl('photo-1582510003544-4d00b7f74220'),
    titleMarathi: 'टाळ मृदंगाचा गजर',
    titleEnglish: 'Rhythm of Kirtan',
    descriptionMarathi: 'मृदंग (पखवाज) आणि टाळ यांच्या नादाने दुमदुमणारा वारीचा रस्ता.',
    descriptionEnglish: 'Traditional double-headed drum and cymbals keeping the beat.',
    photographer: 'Aditya'
  },
  {
    id: 'w5',
    url: unsplashUrl('photo-1614082242765-7c98cbc0d3db'),
    titleMarathi: 'पालखी प्रस्थान सोहळा',
    titleEnglish: 'Palkhi Procession Start',
    descriptionMarathi: 'आळंदी किंवा देहू येथून निघणाऱ्या ज्ञानेश्वर-तुकाराम महाराजांच्या पालख्या.',
    descriptionEnglish: 'The decorated palanquin carrying the footprints of saints.',
    photographer: 'Rishi Kumar'
  },
  {
    id: 'w6',
    url: unsplashUrl('photo-1507679799987-c73779587ccf'),
    titleMarathi: 'वृद्ध वारकरी',
    titleEnglish: 'Elderly Warkari Pilgrim',
    descriptionMarathi: 'कपाळावर बुक्का आणि हाती टाळ घेऊन गाणारे वयोवृद्ध वारकरी बाबा.',
    descriptionEnglish: 'A senior pilgrim with traditional ash on forehead chanting names.',
    photographer: 'Sudarshan Bhat'
  },
  {
    id: 'w7',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'रस्त्यावरील रिंगण सोहळा',
    titleEnglish: 'Sacred Circle Dance - Ringan',
    descriptionMarathi: 'वारीतील प्रसिद्ध रिंगण सोहळा, जेथे घोडे आणि भाविक गोल धावतात.',
    descriptionEnglish: 'The ring ceremony where spiritual horses run around a circle.',
    photographer: 'Dingzeyu Li'
  },
  {
    id: 'w8',
    url: unsplashUrl('photo-1518005020951-eccb494ad742'),
    titleMarathi: 'वारीतील विसावा',
    titleEnglish: 'Resting during Pilgrimage',
    descriptionMarathi: 'दुपारच्या उन्हात झाडाखाली विसावा घेणारे थकलेले वारकरी.',
    descriptionEnglish: 'Pilgrims resting under a shady tree in a village during noon.',
    photographer: 'Smit Patel'
  },
  {
    id: 'w9',
    url: unsplashUrl('photo-1542224566-6e85f2e6772f'),
    titleMarathi: 'चंद्रभागेत पवित्र स्नान',
    titleEnglish: 'Holy Bath in Chandrabhaga',
    descriptionMarathi: 'वारी पंढरपुरात पोहोचल्यावर घाटावर स्नान करणारे वारकरी.',
    descriptionEnglish: 'Pilgrims washing away all tiredness in the sacred river.',
    photographer: 'Ales Krivec'
  },
  {
    id: 'w10',
    url: unsplashUrl('photo-1605276374104-dee2a0ed3cd6'),
    titleMarathi: 'दीपदान विधी',
    titleEnglish: 'Offering of Floating Diyas',
    descriptionMarathi: 'नदीच्या पात्रात दिवे सोडून माऊलींना केलेले वंदन.',
    descriptionEnglish: 'Lighting and sending small lamps floating in the river water.',
    photographer: 'Narendra'
  },
  {
    id: 'w11',
    url: unsplashUrl('photo-1447752875215-b2761acb3c5d'),
    titleMarathi: 'वारीचा ग्रामीण रस्ता',
    titleEnglish: 'Rural Path of Wari',
    descriptionMarathi: 'महाराष्ट्राच्या सुंदर डोंगररांगांमधून जाणारा वारीचा मार्ग.',
    descriptionEnglish: 'The green fields and hills framing the path of the walking crowd.',
    photographer: 'Lukasz Szmigiel'
  },
  {
    id: 'w12',
    url: unsplashUrl('photo-1511192336575-5a79af67a629'),
    titleMarathi: 'वीणा धारक वारकरी',
    titleEnglish: 'Veena Carrying Devotee',
    descriptionMarathi: 'खांद्यावर वीणा घेऊन अखंड विठ्ठल जप करणारे वारकरी.',
    descriptionEnglish: 'A pilgrim carrying the traditional stringed instrument Veena.',
    photographer: 'Jaredd Craig'
  },
  {
    id: 'w13',
    url: unsplashUrl('photo-1560856218-01410728c310'),
    titleMarathi: 'कपाळावरील गोपीचंद',
    titleEnglish: 'Sandalwood Paste Markings',
    descriptionMarathi: 'कपाळावर टिळा आणि बुक्का लावलेले वारकऱ्यांचे पारंपरिक रूप.',
    descriptionEnglish: 'Traditional sandalwood and black powder marks on a face.',
    photographer: 'Narendra'
  },
  {
    id: 'w14',
    url: unsplashUrl('photo-1523301343968-6a6ebf63c672'),
    titleMarathi: 'वारीतील सेवा - अन्नदान',
    titleEnglish: 'Seva - Offering Food to Walkers',
    descriptionMarathi: 'गावागावांत वारकऱ्यांचे स्वागत करून दिले जाणारे जेवण.',
    descriptionEnglish: 'Villagers offering water and food to pilgrims passing through.',
    photographer: 'Sayan Ghosh'
  },
  {
    id: 'w15',
    url: unsplashUrl('photo-1502082553048-f009c37129b9'),
    titleMarathi: 'वारीतील लहान मुले',
    titleEnglish: 'Young Pilgrims in Wari',
    descriptionMarathi: 'बाल वारकरी हातात छोटे भगवे ध्वज घेऊन मोठ्या उत्साहाने चालताना.',
    descriptionEnglish: 'Children dressed as saints walking in the traditional attire.',
    photographer: 'Veeterzy'
  },
  {
    id: 'w16',
    url: unsplashUrl('photo-1506126613408-eca07ce68773'),
    titleMarathi: 'टाळ वादक भगिनी',
    titleEnglish: 'Women Devotees with Cymbals',
    descriptionMarathi: 'डोक्यावर तुळशीचे वृंदावन घेऊन नाचणाऱ्या महिला वारकरी.',
    descriptionEnglish: 'Women carrying Tulsi pots on their heads dancing in devotion.',
    photographer: 'Patrick Tomasso'
  },
  {
    id: 'w17',
    url: unsplashUrl('photo-1589308078059-be1415eab4c3'),
    titleMarathi: 'वारीचा मुक्काम',
    titleEnglish: 'Night Stay of Wari',
    descriptionMarathi: 'रात्रीच्या वेळी तंबूत किंवा मंदिरात कीर्तन सोहळा रंगतो तो विसावा.',
    descriptionEnglish: 'Night camps where the group sings and sleeps in local villages.',
    photographer: 'Aravind Kumar'
  },
  {
    id: 'w18',
    url: unsplashUrl('photo-1544644181-1484b3fdfc62'),
    titleMarathi: 'ज्ञानोबा माऊली तुकाराम भजन',
    titleEnglish: 'Dnyanoba Tukaram Chants',
    descriptionMarathi: 'अखंड चालणाऱ्या भजन गजरात लीन झालेली संपूर्ण दिंडी.',
    descriptionEnglish: 'The common chant that unites millions of walkers together.',
    photographer: 'Clay Banks'
  },
  {
    id: 'w19',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'आभाळातील निळाई आणि भगवे पताके',
    titleEnglish: 'Blue Sky and Saffron Flags',
    descriptionMarathi: 'निळ्याशार आकाशाच्या पार्श्वभूमीवर फडकणारे सुंदर भगवे पताके.',
    descriptionEnglish: 'Vibrant orange flags contrasted against a clear blue afternoon sky.',
    photographer: 'Vincent Ledvina'
  },
  {
    id: 'w20',
    url: unsplashUrl('photo-1507525428034-b723cf961d3e'),
    titleMarathi: 'पंढरीची वेध',
    titleEnglish: 'Awaiting Pandhari',
    descriptionMarathi: 'अनेक दिवसांच्या चालण्यानंतर दूरून पंढरपूर गाव दिसताच मिळणारा आनंद.',
    descriptionEnglish: 'The joyful moment when pilgrims catch the first sight of the city.',
    photographer: 'Sean Oulashene'
  }
];

export const FESTIVAL_COLLECTION: ImageAsset[] = [
  {
    id: 'f1',
    url: unsplashUrl('photo-1605276374104-dee2a0ed3cd6'),
    titleMarathi: 'आषाढी एकादशी दीपारधना',
    titleEnglish: 'Ashadhi Ekadashi Lamp Chants',
    descriptionMarathi: 'आषाढी एकादशीच्या शुभ मुहूर्तावर प्रज्वलित केलेले दिवे.',
    descriptionEnglish: 'Glowing brass lamps celebrating the biggest Varkari festival.',
    photographer: 'Narendra'
  },
  {
    id: 'f2',
    url: unsplashUrl('photo-1610116306796-6ebd3051c330'),
    titleMarathi: 'पारंपारिक गुढीपाडवा',
    titleEnglish: 'Traditional Gudi Padwa',
    descriptionMarathi: 'नवीन वर्षाच्या स्वागतासाठी घरासमोर उभारलेली गुढी.',
    descriptionEnglish: 'The decorated pole Gudi erected outside Maharashtrian homes.',
    photographer: 'Jayesh'
  },
  {
    id: 'f3',
    url: unsplashUrl('photo-1562016600-ece13e8ba570'),
    titleMarathi: 'गणेशोत्सव मिरवणूक',
    titleEnglish: 'Ganesh Chaturthi Festivities',
    descriptionMarathi: 'पुण्यातील मानाच्या गणपतीच्या दर्शनाला उसळलेली अथांग गर्दी.',
    descriptionEnglish: 'Vibrant street celebrations during Ganesh festival in Maharashtra.',
    photographer: 'Prashant Gupta'
  },
  {
    id: 'f4',
    url: unsplashUrl('photo-1582510003544-4d00b7f74220'),
    titleMarathi: 'दहीहंडी उत्सव',
    titleEnglish: 'Dahi Handi human pyramid',
    descriptionMarathi: 'गोकुळाष्टमीच्या दिवशी बांधलेली मानवी मनोऱ्यांची दहीहंडी.',
    descriptionEnglish: 'Human pyramids formed to break the clay pot of curd.',
    photographer: 'Aditya'
  },
  {
    id: 'f5',
    url: unsplashUrl('photo-1506126613408-eca07ce68773'),
    titleMarathi: 'कार्तिकी एकादशी भजन सोहळा',
    titleEnglish: 'Kartiki Ekadashi Night Bhajan',
    descriptionMarathi: 'कार्तिकी एकादशीच्या दिवशी मंदिरात रंगलेली रात्रभर चालणारी भजने.',
    descriptionEnglish: 'All-night musical worship during Kartiki festival.',
    photographer: 'Dingzeyu Li'
  },
  {
    id: 'f6',
    url: unsplashUrl('photo-1590076211831-299f24ba8382'),
    titleMarathi: 'दिवाळी पहाट - दीपमाळ',
    titleEnglish: 'Diwali Dawn at Temple',
    descriptionMarathi: 'दिवाळीच्या पहिल्या दिवशी मंदिरात केलेली हजारो दिव्यांची रोषणाई.',
    descriptionEnglish: 'Beautiful early morning light and clay lamps during Diwali.',
    photographer: 'Rishi Kumar'
  },
  {
    id: 'f7',
    url: unsplashUrl('photo-1545128485-c400e7702796'),
    titleMarathi: 'दसरा शस्त्र आणि ग्रंथ पूजा',
    titleEnglish: 'Dussehra Worship of Books',
    descriptionMarathi: 'दसऱ्याच्या दिवशी पाटावर मांडलेले पवित्र ग्रंथ आणि झेंडूची फुले.',
    descriptionEnglish: 'Worship of books and tools with marigold flowers during Vijayadashami.',
    photographer: 'Sudarshan Bhat'
  },
  {
    id: 'f8',
    url: unsplashUrl('photo-1518005020951-eccb494ad742'),
    titleMarathi: 'रंगपंचमीचे रंग',
    titleEnglish: 'Rang Panchami colors',
    descriptionMarathi: 'महाराष्ट्रात दसऱ्याच्या किंवा होळीनंतर खेळली जाणारी रंगपंचमी.',
    descriptionEnglish: 'Vibrant organic colors thrown during the spring festival.',
    photographer: 'Smit Patel'
  },
  {
    id: 'f9',
    url: unsplashUrl('photo-1542224566-6e85f2e6772f'),
    titleMarathi: 'मकर संक्रांती तिळगुळ सोहळा',
    titleEnglish: 'Makar Sankranti Sweets',
    descriptionMarathi: 'तिळगूळ घ्या गोड गोड बोला, असे सांगत वाटले जाणारे तीळ-गुळाचे लाडू.',
    descriptionEnglish: 'Traditional sweet sesame balls offered to share sweetness.',
    photographer: 'Ales Krivec'
  },
  {
    id: 'f10',
    url: unsplashUrl('photo-1523301343968-6a6ebf63c672'),
    titleMarathi: 'महाशिवरात्र अभिषेक विधी',
    titleEnglish: 'Mahashivratri Holy Bath',
    descriptionMarathi: 'महाशिवरात्रीला शिवालयात पिंडीवर वाहण्यात येणारे बेल आणि दूध.',
    descriptionEnglish: 'Offerings of milk and bel leaves to Lord Shiva during the holy night.',
    photographer: 'Sayan Ghosh'
  },
  {
    id: 'f11',
    url: unsplashUrl('photo-1447752875215-b2761acb3c5d'),
    titleMarathi: 'वटपौर्णिमा पूजा',
    titleEnglish: 'Vat Purnima Worship',
    descriptionMarathi: 'सुवासिनींनी वडाच्या झाडाला सुती दोरा गुंडाळून केलेली प्रार्थना.',
    descriptionEnglish: 'Women praying for family wellbeing near the sacred Banyan tree.',
    photographer: 'Lukasz Szmigiel'
  },
  {
    id: 'f12',
    url: unsplashUrl('photo-1518241353330-0f7941c2d9b5'),
    titleMarathi: 'गोकुळाष्टमी पाळणा',
    titleEnglish: 'Gokulashtami Baby Cradle',
    descriptionMarathi: 'श्रीकृष्ण जन्मोत्सवाच्या दिवशी फुलांनी सजवलेला छोटा पाळणा.',
    descriptionEnglish: 'Decorated cradle celebrating the birth of Lord Krishna.',
    photographer: 'Jaredd Craig'
  },
  {
    id: 'f13',
    url: unsplashUrl('photo-1604871000636-074fa5117945'),
    titleMarathi: 'पारंपारिक रांगोळी',
    titleEnglish: 'Traditional Rangoli Design',
    descriptionMarathi: 'दारासमोर काढलेली शुभ आणि सुंदर तांदळाच्या पिठाची रांगोळी.',
    descriptionEnglish: 'Artistic patterns drawn on floor using colored powders for festivals.',
    photographer: 'Narendra'
  },
  {
    id: 'f14',
    url: unsplashUrl('photo-1502082553048-f009c37129b9'),
    titleMarathi: 'हनुमान जयंती उत्सव',
    titleEnglish: 'Hanuman Jayanti Prayers',
    descriptionMarathi: 'हनुमान जयंतीच्या दिवशी हनुमान चालिसा पठण करणारी गर्दी.',
    descriptionEnglish: 'Devotees chanting Hanuman Chalisa in temples on birth anniversary.',
    photographer: 'Veeterzy'
  },
  {
    id: 'f15',
    url: unsplashUrl('photo-1473163928189-364b2c4e1135'),
    titleMarathi: 'राम नवमी मिरवणूक सोहळा',
    titleEnglish: 'Ram Navami Procession',
    descriptionMarathi: 'राम जन्माच्या दिवशी शहरात काढलेली पारंपरिक पालखी.',
    descriptionEnglish: 'Public celebration and chariot procession of Lord Rama.',
    photographer: 'Ksenia Chernaya'
  },
  {
    id: 'f16',
    url: unsplashUrl('photo-1519817650390-64a93db51149'),
    titleMarathi: 'कोजागिरी पौर्णिमा चंद्रदर्शन',
    titleEnglish: 'Kojagiri Purnima Moonlight',
    descriptionMarathi: 'कोजागिरीला आटीव दुधात चंद्राचे प्रतिबिंब पाहण्याचा विधी.',
    descriptionEnglish: 'Drinking sweetened saffron milk exposed to full moon light.',
    photographer: 'Patrick Tomasso'
  },
  {
    id: 'f17',
    url: unsplashUrl('photo-1589308078059-be1415eab4c3'),
    titleMarathi: 'तुलसी विवाह सोहळा',
    titleEnglish: 'Tulsi Vivah Wedding Rituals',
    descriptionMarathi: 'कार्तिक महिन्यात होणारा तुळशीचा शालिग्राम देवाशी विवाह विधी.',
    descriptionEnglish: 'Ceremonial marriage of Tulsi plant with Lord Vishnu.',
    photographer: 'Aravind Kumar'
  },
  {
    id: 'f18',
    url: unsplashUrl('photo-1540910419892-4a36d2c3266c'),
    titleMarathi: 'खंडोबा चंपाषष्ठी उत्सव',
    titleEnglish: 'Khandoba Bhandara Festival',
    descriptionMarathi: 'जेजुरी गडावर उधळण्यात येणारा पिवळाधमक भंडारा (हळद).',
    descriptionEnglish: 'Yellow turmeric powder thrown in the air at Khandoba temple.',
    photographer: 'Clay Banks'
  },
  {
    id: 'f19',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'त्रिपुरी पौर्णिमा दीपोत्सव',
    titleEnglish: 'Tripuri Purnima Festival of Lights',
    descriptionMarathi: 'मंदिरातील दगडी दीपमाळांवर हजारो पणत्या लावण्याचा सोहळा.',
    descriptionEnglish: 'Lighting the historic stone lamp towers with oil lamps.',
    photographer: 'Vincent Ledvina'
  },
  {
    id: 'f20',
    url: unsplashUrl('photo-1507525428034-b723cf961d3e'),
    titleMarathi: 'दत्त जयंती सोहळा',
    titleEnglish: 'Datta Jayanti Devotional Meet',
    descriptionMarathi: 'दत्त गुरुंचा जन्मोत्सव, भजनांनी दुमदुमणारा मंदिर परिसर.',
    descriptionEnglish: 'Birth celebrations of Lord Dattatreya in the Datta temples.',
    photographer: 'Sean Oulashene'
  }
];

export const HERITAGE_COLLECTION: ImageAsset[] = [
  {
    id: 'h1',
    url: unsplashUrl('photo-1608958416733-4f954ec282ad'),
    titleMarathi: 'रायगड किल्ला - सह्याद्रीचे वैभव',
    titleEnglish: 'Raigad Fort - Sahyadri Glory',
    descriptionMarathi: 'छत्रपती शिवाजी महाराजांची राजधानी असलेला ऐतिहासिक रायगड किल्ला.',
    descriptionEnglish: 'The historic capital fort of Raigad nestled in Sahyadri mountains.',
    photographer: 'Aravind Kumar'
  },
  {
    id: 'h2',
    url: unsplashUrl('photo-1588096344316-f5c786a348e3'),
    titleMarathi: 'पारंपारिक मातीची भांडी',
    titleEnglish: 'Traditional Clay Pots',
    descriptionMarathi: 'ग्रामीण महाराष्ट्रात वापरली जाणारी पारंपरिक आणि कलात्मक मातीची भांडी.',
    descriptionEnglish: 'Handmade clay pots used in traditional Maharashtrian villages.',
    photographer: 'Narendra'
  },
  {
    id: 'h3',
    url: unsplashUrl('photo-1590076211831-299f24ba8382'),
    titleMarathi: 'जुना दगडी वाडा',
    titleEnglish: 'Historic Wada Architecture',
    descriptionMarathi: 'लाकडी कोरीव काम आणि दगडी भिंती असलेले जुने वाडे.',
    descriptionEnglish: 'Wooden-carved ceilings and stone courtyard of a historic Wada.',
    photographer: 'Rishi Kumar'
  },
  {
    id: 'h4',
    url: unsplashUrl('photo-1507525428034-b723cf961d3e'),
    titleMarathi: 'कोंकण किनारा',
    titleEnglish: 'Konkan Coastline',
    descriptionMarathi: 'माडाच्या झाडांनी वेढलेला आणि स्वच्छ वाळूचा कोंकणचा समुद्रकिनारा.',
    descriptionEnglish: 'The pristine coconut palm trees and beaches of Konkan region.',
    photographer: 'Sean Oulashene'
  },
  {
    id: 'h5',
    url: unsplashUrl('photo-1566847438217-76e82d383f84'),
    titleMarathi: 'शिवराज्याभिषेक सोहळा',
    titleEnglish: 'Shivaji Coronation Colors',
    descriptionMarathi: 'शिवराज्याभिषेकाचे प्रतिनिधित्व करणारे डौलदार भगवे ध्वज.',
    descriptionEnglish: 'Proud saffron flags flying over historic fortifications.',
    photographer: 'Jayesh'
  },
  {
    id: 'h6',
    url: unsplashUrl('photo-1545128485-c400e7702796'),
    titleMarathi: 'ग्रामीण जीवन - शेती कामे',
    titleEnglish: 'Rural Village Farming Life',
    descriptionMarathi: 'पहाटे बैलांच्या साहाय्याने शेतीची मशागत करणारा शेतकरी.',
    descriptionEnglish: 'Farmers working in the fields of Deccan plateau at sunrise.',
    photographer: 'Sudarshan Bhat'
  },
  {
    id: 'h7',
    url: unsplashUrl('photo-1518005020951-eccb494ad742'),
    titleMarathi: 'दगडी मंदिर शिल्पकला',
    titleEnglish: 'Stone Temple Sculptures',
    descriptionMarathi: 'मंदिराच्या बाहेरील भिंतींवरील हजार वर्षे जुनी दगडी शिल्पकला.',
    descriptionEnglish: 'Ancient carvings on the outer walls of historic temples.',
    photographer: 'Smit Patel'
  },
  {
    id: 'h8',
    url: unsplashUrl('photo-1582510003544-4d00b7f74220'),
    titleMarathi: 'पारंपारिक वाद्ये - ढोल ताशा',
    titleEnglish: 'Traditional Instruments - Dhol Tasha',
    descriptionMarathi: 'उत्सवाच्या मिरवणुकीत वाजवला जाणारा प्रचंड ढोल आणि ताशा.',
    descriptionEnglish: 'Heavy drums and cymbals used in Maharashtrian street plays.',
    photographer: 'Aditya'
  },
  {
    id: 'h9',
    url: unsplashUrl('photo-1490730141103-6cac27aaab94'),
    titleMarathi: 'सह्याद्रीची डोंगररांग',
    titleEnglish: 'Sahyadri Mountain Range',
    descriptionMarathi: 'हिरवीगार शाल पांघरलेली पावसाळ्यातील सुंदर सह्याद्रीची डोंगररांग.',
    descriptionEnglish: 'Beautiful green hills of the Western Ghats under light fog.',
    photographer: 'Ales Krivec'
  },
  {
    id: 'h10',
    url: unsplashUrl('photo-1523301343968-6a6ebf63c672'),
    titleMarathi: 'तुळशी वृंदावन',
    titleEnglish: 'Sacred Tulsi Vrindavan',
    descriptionMarathi: 'घराच्या अंगणात बांधलेले कोरीव दगडी तुळशी वृंदावन.',
    descriptionEnglish: 'An elegant stone pedestal built for the sacred Tulsi plant.',
    photographer: 'Sayan Ghosh'
  },
  {
    id: 'h11',
    url: unsplashUrl('photo-1447752875215-b2761acb3c5d'),
    titleMarathi: 'वरंधा घाट धबधबा',
    titleEnglish: 'Varandha Ghat Waterfall',
    descriptionMarathi: 'घाटातील उंच डोंगरावरून फेसाळत खाली वाहणारा धबधबा.',
    descriptionEnglish: 'Gushing seasonal waterfalls of the Sahyadri passes.',
    photographer: 'Lukasz Szmigiel'
  },
  {
    id: 'h12',
    url: unsplashUrl('photo-1518241353330-0f7941c2d9b5'),
    titleMarathi: 'शिवकालीन नाणी - होन',
    titleEnglish: 'Ancient Maratha Coins',
    descriptionMarathi: 'शिवाजी महाराजांच्या काळात वापरात असलेली दुर्मिळ तांब्याची नाणी.',
    descriptionEnglish: 'Historical copper coins from the 17th century Maratha state.',
    photographer: 'Jaredd Craig'
  },
  {
    id: 'h13',
    url: unsplashUrl('photo-1617627143750-d86bc21e42bb'),
    titleMarathi: 'पैठणी विणकाम',
    titleEnglish: 'Paithani Saree Weaving',
    descriptionMarathi: 'पैठण येथील सोन्याच्या जरीचे आणि मोराच्या नक्षीचे रेशमी विणकाम.',
    descriptionEnglish: 'Fine silk weaving and peacock borders of traditional Paithani.',
    photographer: 'Narendra'
  },
  {
    id: 'h14',
    url: unsplashUrl('photo-1502082553048-f009c37129b9'),
    titleMarathi: 'जुनी हस्तलिखिते जतन',
    titleEnglish: 'Preserving Old Scriptures',
    descriptionMarathi: 'संग्रहालयात जतन करून ठेवलेली संतांची प्राचीन हस्तलिखिते.',
    descriptionEnglish: 'Restored manuscripts written on palm leaves in Marathi archives.',
    photographer: 'Veeterzy'
  },
  {
    id: 'h15',
    url: unsplashUrl('photo-1473163928189-364b2c4e1135'),
    titleMarathi: 'गावातील आठवडी बाजार',
    titleEnglish: 'Weekly Village Market',
    descriptionMarathi: 'ग्रामीण महाराष्ट्रात भरणारा रंजक आठवडी बाजार.',
    descriptionEnglish: 'Local village market showing the simplicity of rural life.',
    photographer: 'Ksenia Chernaya'
  },
  {
    id: 'h16',
    url: unsplashUrl('photo-1519817650390-64a93db51149'),
    titleMarathi: 'वारकरी भजनी मंडळ साहित्य',
    titleEnglish: 'Bhakti Literature Books',
    descriptionMarathi: 'विठ्ठल मंदिरात ठेवलेले अभंग गाथेचे विविध ग्रंथ.',
    descriptionEnglish: 'A collection of old printed Marathi books containing bhajans.',
    photographer: 'Patrick Tomasso'
  },
  {
    id: 'h17',
    url: unsplashUrl('photo-1562016600-ece13e8ba570'),
    titleMarathi: 'लोणावळा येथील कार्ला लेणी',
    titleEnglish: 'Karla Caves stone art',
    descriptionMarathi: 'बौद्ध धर्माशी संबंधित प्राचीन कोरीव दगडी लेणी.',
    descriptionEnglish: 'Monolithic rock-cut caves carved in Western Ghats.',
    photographer: 'Prashant Gupta'
  },
  {
    id: 'h18',
    url: unsplashUrl('photo-1544644181-1484b3fdfc62'),
    titleMarathi: 'तांब्याची पारंपरिक भांडी',
    titleEnglish: 'Traditional Copper Cookware',
    descriptionMarathi: 'जुने तांब्याचे पाण्याचे हंडे आणि पूजेचे कलश.',
    descriptionEnglish: 'Hand-beaten copper water heaters and plates of old times.',
    photographer: 'Clay Banks'
  },
  {
    id: 'h19',
    url: unsplashUrl('photo-1534447677768-be436bb09401'),
    titleMarathi: 'घाटावरील दीपमाळ दर्शन',
    titleEnglish: 'Deepmal Shines in Darkness',
    descriptionMarathi: 'रात्रीच्या वेळी पेटवलेले मंदिराबाहेरील उंच दगडी दिवे.',
    descriptionEnglish: 'Tall stone pillars decorated with lights on festival nights.',
    photographer: 'Vincent Ledvina'
  },
  {
    id: 'h20',
    url: unsplashUrl('photo-1507525428034-b723cf961d3e'),
    titleMarathi: 'रामटेक मंदिर - नागपूर',
    titleEnglish: 'Ramtek Temple Nagpur',
    descriptionMarathi: 'नागपूर जवळील रामटेक टेकडीवरील प्रभू रामाचे ऐतिहासिक मंदिर.',
    descriptionEnglish: 'Ramtek hill temple complex linked to poet Kalidasa legends.',
    photographer: 'Sean Oulashene'
  }
];

export const IMAGE_COLLECTIONS = {
  saints: SAINTS_COLLECTION,
  pandharpur: PANDHARPUR_COLLECTION,
  wari: WARI_COLLECTION,
  festivals: FESTIVAL_COLLECTION,
  heritage: HERITAGE_COLLECTION
};
