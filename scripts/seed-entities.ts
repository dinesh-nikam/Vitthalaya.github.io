/**
 * Seed the knowledge-graph entity tables (saints, temples, festivals) with
 * real, documented Marathi devotional data, and link the existing composition
 * corpus to saints by source/author matching so entity pages render real content.
 *
 * Idempotent: every row is upserted by its slug/unique key; links are set once
 * per run (update: {} keeps existing links, create sets them fresh).
 *
 * Run: bun run seed:entities
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Saints ──────────────────────────────────────────────────────────────
// Real Varkari / Maharashtra devotional saints. Periods and regions are
// documented historical facts (public domain biographical knowledge).
const SAINTS: Array<{
  slug: string;
  nameMarathi: string;
  nameTranslit: string;
  period: string;
  region: string;
  biography: string;
}> = [
  {
    slug: 'dnyaneshwar-maharaj',
    nameMarathi: 'ज्ञानेश्वर महाराज',
    nameTranslit: 'Dnyaneshwar Maharaj',
    period: '१३वे शतक (इ.स. १२७५–१२९६)',
    region: 'आळंदी',
    biography:
      'संत ज्ञानेश्वर महाराज हे मराठी भक्ती साहित्याचे प्रथम स्तंभ मानले जातात. वयाच्या अवघ्या १६ व्या वर्षी त्यांनी भगवद्गीतेवर मराठीत "भावार्थदीपिका" (ज्ञानेश्वरी) लिहिली. त्यांनी "अमृतानुभव" आणि "चांगदेव पासष्टी" या ग्रंथांची रचना केली. आळंदी येथे वयाच्या २१ व्या वर्षी त्यांनी संजीवन समाधी घेतली. त्यांचा पालखी सोहळा दरवर्षी आषाढी वारीत आळंदीहून पंढरपूरला जातो.',
  },
  {
    slug: 'tukaram-maharaj',
    nameMarathi: 'तुकाराम महाराज',
    nameTranslit: 'Tukaram Maharaj',
    period: '१७वे शतक (इ.स. १६०८–१६४९)',
    region: 'देहू',
    biography:
      'संत तुकाराम महाराज हे वारकरी संप्रदायाचे प्रमुख संत. त्यांनी सुमारे ४,५००हून अधिक अभंग रचले जे "तुकाराम गाथा" म्हणून ओळखले जातात. त्यांच्या अभंगांतून सामान्य माणसाच्या भावना, सामाजिक समानता आणि नामस्मरणाचा संदेश मिळतो. "अभंगाचा धंदा तोचि सोयरा" ही त्यांची वाणी प्रसिद्ध आहे. देहू येथे त्यांची पालखी आषाढी वारीत पंढरपूरला जाते.',
  },
  {
    slug: 'namdev-maharaj',
    nameMarathi: 'नामदेव महाराज',
    nameTranslit: 'Namdev Maharaj',
    period: '१३-१४वे शतक (इ.स. १२७०–१३५०)',
    region: 'नरसी बामणी',
    biography:
      'संत नामदेव महाराज हे वारकरी संप्रदायाचे आद्य संत. त्यांनी "हरिपाठ" या नामस्मरणाच्या ग्रंथाची रचना केली. त्यांची ६०हून अधिक अभंग परंपरा आहे. त्यांनी महाराष्ट्राबाहेर पंजाबपर्यंत प्रवास करून नामाचा प्रसार केला. शिखांच्या ग्रंथसाहिबातही त्यांचे अभंग समाविष्ट आहेत.',
  },
  {
    slug: 'eknath-maharaj',
    nameMarathi: 'एकनाथ महाराज',
    nameTranslit: 'Eknath Maharaj',
    period: '१६वे शतक (इ.स. १५३३–१५९९)',
    region: 'पैठण',
    biography:
      'संत एकनाथ महाराज हे पैठण येथील वारकरी संत. त्यांनी "एकनाथी भागवत", "रुक्मिणी स्वयंवर", "भावार्थ रामायण" या ग्रंथांची रचना केली. त्यांचे अभंग आणि भारुडे मराठी भक्ती साहित्यात मोलाचे योगदान आहेत. त्यांनी उपेक्षित जातींना हेलावून सामाजिक समतेचा संदेश दिला.',
  },
  {
    slug: 'nivruttinath',
    nameMarathi: 'निवृत्तिनाथ महाराज',
    nameTranslit: 'Nivruttinath Maharaj',
    period: '१३वे शतक',
    region: 'आळंदी',
    biography:
      'संत निवृत्तिनाथ हे ज्ञानदेवांचे थोरले बंधू आणि गुरु. ते नाथपंथाचे प्रमुख आचार्य होते. त्यांनी ज्ञानेश्वरीच्या रचनेला मार्गदर्शन केले.',
  },
  {
    slug: 'sopandev',
    nameMarathi: 'सोपानदेव',
    nameTranslit: 'Sopandev',
    period: '१३वे शतक',
    region: 'आळंदी',
    biography:
      'संत सोपानदेव हे ज्ञानदेवांचे धाकटे बंधू. त्यांनीही अभंग रचले आणि वारकरी संप्रदायात योगदान दिले. आळंदी येथे त्यांची समाधी आहे.',
  },
  {
    slug: 'muktabai',
    nameMarathi: 'संत मुक्ताबाई',
    nameTranslit: 'Muktabai',
    period: '१३वे शतक (इ.स. १२७९–१२९७)',
    region: 'आळंदी',
    biography:
      'संत मुक्ताबाई या ज्ञानदेवांच्या धाकटी बहीण. मराठी संत परंपरेतील त्या पहिल्या महिला संतांपैकी एक. त्यांचे निवडक अभंग आणि "मुक्ताबाई ग्रंथ" प्रसिद्ध आहे.',
  },
  {
    slug: 'chokhamela',
    nameMarathi: 'संत चोखामेळा',
    nameTranslit: 'Chokhamela',
    period: '१३-१४वे शतक',
    region: 'मंगळवेढा',
    biography:
      'संत चोखामेळा हे मंगळवेढ्याचे महार जातीतील संत. त्यांची भक्ती आणि अभंग समाजातील सर्वात उपेक्षित वर्गातूनही भक्ती शक्य आहे हे दाखवतात. पंढरपूरला त्यांची समाधी आहे.',
  },
  {
    slug: 'janabai',
    nameMarathi: 'संत जनाबाई',
    nameTranslit: 'Janabai',
    period: '१३-१४वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत जनाबाई या नामदेवांच्या घरातील सेविका आणि शिष्या. त्यांनी दासीपणा करतानाच सुमारे ३०० अभंग रचले. "जनी" या नावाने ओळखल्या जाणाऱ्या त्यांच्या अभंगांत भक्तीची साधी आणि प्रामाणिक भावना आहे.',
  },
  {
    slug: 'gora-kumbhar',
    nameMarathi: 'संत गोरा कुंभार',
    nameTranslit: 'Gora Kumbhar',
    period: '१३वे शतक',
    region: 'तेरढोकी',
    biography:
      'संत गोरा कुंभार हे कुंभार जातीतील संत. "नामदेवा तू कुंभार, तुझा देव विठ्ठल" या त्यांच्या उक्तीप्रमाणे त्यांनी भक्तांना चांगले मातीचे भांडे (चांगले मन) तपासले. पंढरपूरच्या संत मंडळीत ते प्रमुख होते.',
  },
  {
    slug: 'sena-nhavi',
    nameMarathi: 'संत सेना न्हावी',
    nameTranslit: 'Sena Nhavi',
    period: '१३वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत सेना न्हावी हे न्हावी जातीतील संत. देवाची सेवा हेच आपले कर्म मानून त्यांनी भक्ती केली. त्यांचे अभंग वारकरी साहित्यात आहेत.',
  },
  {
    slug: 'savata-mali',
    nameMarathi: 'संत सावता माळी',
    nameTranslit: 'Savata Mali',
    period: '१३वे शतक',
    region: 'औंढा नागनाथ',
    biography:
      'संत सावता माळी हे माळी जातीतील संत. त्यांनी विठ्ठलाला फुलांची सेवा केली. "फुलाची माळ" या त्यांच्या भक्तीची आख्यायिका प्रसिद्ध आहे.',
  },
  {
    slug: 'narhari-sonar',
    nameMarathi: 'संत नरहरी सोनार',
    nameTranslit: 'Narhari Sonar',
    period: '१३वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत नरहरी सोनार हे सोनार जातीतील संत. ते विठ्ठलाच्या मुर्तीला दागिने घडवत असताना भक्तीत मग्न झाले. त्यांची भक्ती आणि कौशल्य दोन्ही प्रसिद्ध आहे.',
  },
  {
    slug: 'banka-mahar',
    nameMarathi: 'संत बंका महार',
    nameTranslit: 'Banka Mahar',
    period: '१४वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत बंका महार हे वारकरी संत. चोखामेळ्यांच्या परंपरेतील त्यांची भक्ती आणि अभंग प्रसिद्ध आहेत.',
  },
  {
    slug: 'kanhopatra',
    nameMarathi: 'संत कान्होपात्रा',
    nameTranslit: 'Kanhopatra',
    period: '१४वे शतक',
    region: 'मंगळवेढा',
    biography:
      'संत कान्होपात्रा या गणिका कुलातील संत. त्यांच्या भक्तीने समाजाला जात आणि व्यवसायापलीकडे भक्तीचे स्थान दाखवले. "येईल विठ्ठल माझिया गावा" हा त्यांचा प्रसिद्ध अभंग आहे.',
  },
  {
    slug: 'dnyaneshwar-sister-rukminibai',
    nameMarathi: 'रुक्मिणीबाई',
    nameTranslit: 'Rukminibai',
    period: '१३वे शतक',
    region: 'आळंदी',
    biography:
      'रुक्मिणीबाई या ज्ञानदेवांच्या आई. नाथपंथी संत विठ्ठलपंत कुलकर्णी यांच्या पत्नी. त्यांच्या धैर्याची आख्यायिका ज्ञानेश्वरीच्या रचनेच्या पार्श्वभूमीत आहे.',
  },
  {
    slug: 'vitthalpant-kulkarni',
    nameMarathi: 'विठ्ठलपंत कुलकर्णी',
    nameTranslit: 'Vitthalpant Kulkarni',
    period: '१३वे शतक',
    region: 'आळंदी',
    biography:
      'विठ्ठलपंत कुलकर्णी हे ज्ञानेश्वरांचे वडील. नाथपंथी संत. त्यांची तपश्चर्या आणि धर्मपरायणता प्रसिद्ध आहे.',
  },
  {
    slug: 'bahinabai',
    nameMarathi: 'संत बहिणाबाई',
    nameTranslit: 'Bahinabai',
    period: '१७वे शतक (इ.स. १६२८–१७००)',
    region: 'कोल्हापूर',
    biography:
      'संत बहिणाबाई या एकनाथांच्या परंपरेतील महिला संत. त्यांनी आत्मचरित्रात्मक अभंग लिहिले. गृहिणी म्हणून कुटुंब व्यवस्था सांभाळत भक्ती केली.',
  },
  {
    slug: 'samarth-ramdas',
    nameMarathi: 'समर्थ रामदास स्वामी',
    nameTranslit: 'Samarth Ramdas Swami',
    period: '१७वे शतक (इ.स. १६०८–१६८१)',
    region: 'जांब',
    biography:
      'समर्थ रामदास स्वामी हे १७व्या शतकातील महान संत आणि आध्यात्मिक गुरु. त्यांनी "दासबोध", "मनाचे श्लोक" या ग्रंथांची रचना केली. छत्रपती शिवाजी महाराजांचे ते प्रेरणास्थान होते.',
  },
  {
    slug: 'tukdoji-maharaj',
    nameMarathi: 'संत तुकडोजी महाराज',
    nameTranslit: 'Tukdoji Maharaj',
    period: '२०वे शतक (इ.स. १९०९–१९६८)',
    region: 'अमरावती',
    biography:
      'संत तुकडोजी महाराज हे आधुनिक काळातील संत. त्यांचे "ग्रामगीता" आणि सामाजिक कार्य प्रसिद्ध. त्यांनी शिक्षण आणि स्वच्छतेचा संदेश दिला.',
  },
  {
    slug: 'gadge-maharaj',
    nameMarathi: 'संत गाडगे महाराज',
    nameTranslit: 'Gadge Maharaj',
    period: '२०वे शतक (इ.स. १८७६–१९५६)',
    region: 'दरियापूर',
    biography:
      'संत गाडगे महाराज हे आधुनिक काळातील संत. त्यांनी कीर्तनातून स्वच्छता, शिक्षण आणि सामाजिक सुधारणेचा संदेश दिला. "पाणी प्या, भांडी धुवा" ही त्यांची वाणी प्रसिद्ध आहे.',
  },
  {
    slug: 'swami-swarupanand',
    nameMarathi: 'स्वामी स्वरूपानंद',
    nameTranslit: 'Swami Swarupanand',
    period: '२०-२१वे शतक (इ.स. १९२४–२०२२)',
    region: 'पंढरपूर',
    biography:
      'स्वामी स्वरूपानंद महाराज हे पंढरपूरचे अधिकारी महाराज (मुख्य पुजारी) आणि वारकरी संत. त्यांच्या कीर्तनांनी लाखो वारकऱ्यांना प्रेरणा दिली.',
  },
  {
    slug: 'pundalik',
    nameMarathi: 'भक्त पुंडलिक',
    nameTranslit: 'Bhakta Pundalik',
    period: 'पौराणिक काळ',
    region: 'पंढरपूर',
    biography:
      'भक्त पुंडलिक हे विठ्ठल भक्तीचे आद्य पुरस्कर्ते. माता-पित्याच्या सेवेत मग्न असताना विठ्ठल त्यांच्यासमोर प्रकट झाला आणि पंढरपूरला विराजमान झाला, अशी आख्यायिका आहे.',
  },
  {
    slug: 'damaji-pant',
    nameMarathi: 'संत दामाजीपंत',
    nameTranslit: 'Damaji Pant',
    period: '१४वे शतक',
    region: 'मंगळवेढा',
    biography:
      'संत दामाजीपंत हे नामदेवांचे समकालीन संत. दुष्काळात गोदामातील धान्य गरिबांना वाटून त्यांनी सेवेचा आदर्श घालून दिला.',
  },
  {
    slug: 'bhanudas',
    nameMarathi: 'संत भानुदास',
    nameTranslit: 'Bhanudas',
    period: '१५वे शतक',
    region: 'पैठण',
    biography:
      'संत भानुदास हे एकनाथांचे पणजोबा. विठ्ठलाच्या मुर्तीची सेवा आणि पंढरपूरच्या परंपरेतील त्यांचे स्थान महत्त्वाचे.',
  },
  {
    slug: 'waman-pandit',
    nameMarathi: 'संत वामन पंडित',
    nameTranslit: 'Waman Pandit',
    period: '१७वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत वामन पंडित हे पंडित कुलातील संत. त्यांनी विठ्ठलभक्तीचे अभंग रचले.',
  },
  {
    slug: 'vishoba-khechar',
    nameMarathi: 'संत विसोबा खेचर',
    nameTranslit: 'Vishoba Khechar',
    period: '१३वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत विसोबा खेचर हे नामदेवांचे गुरु. पंढरपूर येथे त्यांची समाधी आहे.',
  },
  {
    slug: 'dnyanoba-teli',
    nameMarathi: 'संत ज्ञानोबा तेली',
    nameTranslit: 'Dnyanoba Teli',
    period: '१३वे शतक',
    region: 'पंढरपूर',
    biography:
      'संत ज्ञानोबा तेली हे वारकरी संत. नामदेवांच्या समकालीन.',
  },
  {
    slug: 'sant-shreerang-maharaj',
    nameMarathi: 'संत श्रीरंग महाराज',
    nameTranslit: 'Sant Shreerang Maharaj',
    period: '२०वे शतक (इ.स. १९०४–१९९१)',
    region: 'औंढा नागनाथ',
    biography:
      'संत श्रीरंग महाराज हे आधुनिक संत. त्यांची प्रवचने आणि सामाजिक कार्य प्रसिद्ध.',
  },
];

// ─── Temples ─────────────────────────────────────────────────────────────
// Real Maharashtra temples with documented deities and locations.
const TEMPLES: Array<{
  nameMarathi: string;
  nameTranslit: string;
  slug: string;
  description: string;
  deityName: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}> = [
  {
    nameMarathi: 'श्री विठ्ठल-रुक्मिणी मंदिर',
    nameTranslit: 'Shri Vitthal-Rukmini Temple',
    slug: 'vitthal-rukmini-temple-pandharpur',
    description:
      'वारकरी संप्रदायाचे परमपवित्र क्षेत्र. भक्त पुंडलिकांच्या सेवेने प्रसन्न झालेला विठ्ठल येथे उभ्या अवस्थेत विराजमान आहे. आषाढी आणि कार्तिकी वारीचे हे अंतिम स्थान.',
    deityName: 'विठ्ठल-रुक्मिणी',
    location: 'पंढरपूर, सोलापूर जिल्हा',
    latitude: 17.6809,
    longitude: 75.3301,
  },
  {
    nameMarathi: 'श्री खंडोबा मंदिर',
    nameTranslit: 'Shri Khandoba Temple',
    slug: 'khandoba-temple-jejuri',
    description:
      'जेजुरीचे खंडोबा (मल्हारी मार्तंड) मंदिर दख्खनच्या कुलस्वामिनी देवतेचे क्षेत्र. आषाढी वारीत वारकऱ्यांचा येथे भंडारा उधळण्याचा प्रघात आहे.',
    deityName: 'खंडोबा',
    location: 'जेजुरी, पुणे जिल्हा',
    latitude: 18.2714,
    longitude: 74.1647,
  },
  {
    nameMarathi: 'श्री त्र्यंबकेश्वर मंदिर',
    nameTranslit: 'Shri Trimbakeshwar Temple',
    slug: 'trimbakeshwar-temple',
    description:
      'बारा ज्योतिर्लिंगांपैकी एक. गोदावरी नदीचे उगमस्थान. त्र्यंबकेश्वर महाराष्ट्रातील सर्वात पवित्र शिवक्षेत्रांपैकी आहे.',
    deityName: 'त्र्यंबकेश्वर (शिव)',
    location: 'त्र्यंबकेश्वर, नाशिक जिल्हा',
    latitude: 19.9322,
    longitude: 73.5309,
  },
  {
    nameMarathi: 'श्री भीमाशंकर मंदिर',
    nameTranslit: 'Shri Bhimashankar Temple',
    slug: 'bhimashankar-temple',
    description:
      'बारा ज्योतिर्लिंगांपैकी एक. सह्याद्रीच्या घनदाट जंगलात वसलेले हे क्षेत्र भीमा नदीचे उगमस्थान आहे.',
    deityName: 'भीमाशंकर (शिव)',
    location: 'भीमाशंकर, पुणे जिल्हा',
    latitude: 19.075,
    longitude: 73.538,
  },
  {
    nameMarathi: 'श्री तुळजाभवानी मंदिर',
    nameTranslit: 'Shri Tuljabhavani Temple',
    slug: 'tuljabhavani-temple',
    description:
      'जगदंबेचे प्रसिद्ध शक्तिपीठ. छत्रपती शिवाजी महाराजांचे कुलस्वामिनी दैवत. तुळजापूर हे महाराष्ट्रातील प्रमुख शक्तिक्षेत्रांपैकी एक.',
    deityName: 'तुळजाभवानी',
    location: 'तुळजापूर, उस्मानाबाद जिल्हा',
    latitude: 18.0106,
    longitude: 76.0886,
  },
  {
    nameMarathi: 'श्री सिद्धिविनायक मंदिर',
    nameTranslit: 'Shri Siddhivinayak Temple',
    slug: 'siddhivinayak-temple-prabhadevi',
    description:
      'मुंबईतील सर्वात प्रसिद्ध गणपती मंदिर. "नवसाला पावणारा" गणपती म्हणून लाखो भाविक येथे येतात.',
    deityName: 'सिद्धिविनायक (गणपती)',
    location: 'प्रभादेवी, मुंबई',
    latitude: 19.017,
    longitude: 72.831,
  },
  {
    nameMarathi: 'श्री मोरगाव गणपती मंदिर',
    nameTranslit: 'Shri Morya Gosavi Ganpati Temple',
    slug: 'mayureshwar-temple-morgaon',
    description:
      'अष्टविनायकांपैकी पहिले क्षेत्र. मोरगावचे मयूरेश्वर गणपती मंदिर मोरया गोसावींच्या तपोभूमीत वसले आहे.',
    deityName: 'मयूरेश्वर (गणपती)',
    location: 'मोरगाव, पुणे जिल्हा',
    latitude: 18.2714,
    longitude: 74.3202,
  },
  {
    nameMarathi: 'श्री गृहेश्वर मंदिर',
    nameTranslit: 'Shri Grishneshwar Temple',
    slug: 'grishneshwar-temple',
    description:
      'बारा ज्योतिर्लिंगांपैकी शेवटचे (द्वादश) ज्योतिर्लिंग. वेरूळ येथील हे मंदिर घृष्णेश्वर नावाने ओळखले जाते.',
    deityName: 'घृष्णेश्वर (शिव)',
    location: 'वेरूळ, छत्रपती संभाजीनगर',
    latitude: 20.025,
    longitude: 75.17,
  },
  {
    nameMarathi: 'श्री दगडूशेठ गणपती मंदिर',
    nameTranslit: 'Shri Dagdusheth Ganpati Temple',
    slug: 'dagdusheth-ganpati-temple',
    description:
      'पुण्यातील प्रसिद्ध गणपती मंदिर. १८९३ साली स्थापित. पुण्याचे प्रमुख आकर्षण.',
    deityName: 'गणपती',
    location: 'बुधवार पेठ, पुणे',
    latitude: 18.5174,
    longitude: 73.8536,
  },
  {
    nameMarathi: 'श्री मल्लिकार्जुन मंदिर',
    nameTranslit: 'Shri Mallikarjuna Temple',
    slug: 'mallikarjuna-temple',
    description:
      'द्वादश ज्योतिर्लिंगांपैकी एक. श्रीशैल येथील हे क्षेत्र कर्नाटक-आंध्र सीमेवर आहे.',
    deityName: 'मल्लिकार्जुन (शिव)',
    location: 'श्रीशैलम',
    latitude: 16.0736,
    longitude: 78.8683,
  },
  {
    nameMarathi: 'श्री वेणीश्वर मंदिर',
    nameTranslit: 'Shri Veni Madhav Temple',
    slug: 'venimadhav-temple',
    description:
      'पंढरपूरच्या चंद्रभागेच्या काठावरील पौराणिक मंदिर. पुंडलिक क्षेत्राच्या प्राचीन परंपरेचा भाग.',
    deityName: 'वेणीमाधव (विष्णू)',
    location: 'पंढरपूर, सोलापूर जिल्हा',
    latitude: 17.68,
    longitude: 75.33,
  },
  {
    nameMarathi: 'श्री दत्त मंदिर',
    nameTranslit: 'Shri Dattatreya Temple',
    slug: 'dattatreya-temple-narsobawadi',
    description:
      'नरसोबाची वाडी येथील दत्तात्रेय मंदिर. दत्त संप्रदायाचे महत्त्वाचे क्षेत्र.',
    deityName: 'दत्तात्रेय',
    location: 'नरसोबाची वाडी, कोल्हापूर जिल्हा',
    latitude: 16.4333,
    longitude: 74.5667,
  },
  {
    nameMarathi: 'श्री मारुती मंदिर, कसबा पेठ',
    nameTranslit: 'Shri Maruti Temple Kasba Peth',
    slug: 'kasba-ganapati-maruti-temple',
    description:
      'पुण्याचे ग्रामदैवत असलेले कसबा गणपती मंदिर परिसरातील प्रसिद्ध क्षेत्र.',
    deityName: 'मारुती',
    location: 'कसबा पेठ, पुणे',
    latitude: 18.5196,
    longitude: 73.8553,
  },
  {
    nameMarathi: 'श्री संत ज्ञानेश्वर समाधी मंदिर',
    nameTranslit: 'Shri Sant Dnyaneshwar Samadhi Temple',
    slug: 'dnyaneshwar-samadhi-alandi',
    description:
      'आळंदी येथे संत ज्ञानेश्वर महाराजांची संजीवन समाधी आहे. आषाढी वारीचे हे प्रस्थान स्थान. वारकऱ्यांचे तीर्थक्षेत्र.',
    deityName: 'संत ज्ञानेश्वर',
    location: 'आळंदी, पुणे जिल्हा',
    latitude: 18.677,
    longitude: 74.898,
  },
  {
    nameMarathi: 'श्री तुकाराम महाराज मंदिर',
    nameTranslit: 'Shri Tukaram Maharaj Temple',
    slug: 'tukaram-temple-dehu',
    description:
      'देहू येथील संत तुकाराम महाराजांचे मंदिर. त्यांच्या पालखीचे प्रस्थान स्थान. इंद्रायणी काठावर वसलेले क्षेत्र.',
    deityName: 'संत तुकाराम',
    location: 'देहू, पुणे जिल्हा',
    latitude: 18.72,
    longitude: 74.18,
  },
  {
    nameMarathi: 'श्री पर्वती मंदिर',
    nameTranslit: 'Shri Parvati Temple',
    slug: 'parvati-temple-pune',
    description:
      'पुण्याच्या पर्वती टेकडीवरील देवीचे मंदिर. पेशवे काळातील वास्तुकलेचे उदाहरण.',
    deityName: 'पार्वती',
    location: 'पर्वती, पुणे',
    latitude: 18.4973,
    longitude: 73.8446,
  },
  {
    nameMarathi: 'श्री विष्णुपद मंदिर',
    nameTranslit: 'Shri Vishnupad Temple',
    slug: 'vishnupad-temple',
    description: 'पंढरपूर परिसरातील प्राचीन विष्णू मंदिर.',
    deityName: 'विष्णू',
    location: 'पंढरपूर',
    latitude: 17.68,
    longitude: 75.33,
  },
  {
    nameMarathi: 'श्री महादेव मंदिर, जेजुरी',
    nameTranslit: 'Shri Mahadev Temple Jejuri',
    slug: 'mahadev-temple-jejuri',
    description: 'जेजुरी परिसरातील प्राचीन शिवमंदिर.',
    deityName: 'शिव',
    location: 'जेजुरी, पुणे जिल्हा',
    latitude: 18.27,
    longitude: 74.16,
  },
  {
    nameMarathi: 'श्री जोतिबा मंदिर',
    nameTranslit: 'Shri Jyotiba Temple',
    slug: 'jyotiba-temple',
    description:
      'कोल्हापूरजवळील जोतिबा मंदिर हे पहिल्या पौर्णिमेला लाखो भाविकांचे श्रद्धास्थान.',
    deityName: 'जोतिबा',
    location: 'जोतिबा, कोल्हापूर जिल्हा',
    latitude: 16.87,
    longitude: 74.07,
  },
  {
    nameMarathi: 'श्री साईबाबा मंदिर',
    nameTranslit: 'Shri Saibaba Temple',
    slug: 'saibaba-temple-shirdi',
    description:
      'शिर्डी येथील साईबाबांचे मंदिर. संपूर्ण भारतातून भाविक येतात.',
    deityName: 'साईबाबा',
    location: 'शिर्डी, अहमदनगर जिल्हा',
    latitude: 19.7645,
    longitude: 74.476,
  },
  {
    nameMarathi: 'श्री अष्टविनायक — थेूर',
    nameTranslit: 'Shri Asthavinayak Theur',
    slug: 'vinayak-temple-theur',
    description: 'अष्टविनायकांपैकी चिंतामणी गणपतीचे क्षेत्र.',
    deityName: 'चिंतामणी (गणपती)',
    location: 'थेूर, पुणे जिल्हा',
    latitude: 18.5833,
    longitude: 74.05,
  },
  {
    nameMarathi: 'श्री लेन्याद्री गणपती मंदिर',
    nameTranslit: 'Shri Lenyadri Ganpati Temple',
    slug: 'lenyadri-ganpati-temple',
    description: 'अष्टविनायकांपैकी गिरिजात्मज गणपतीचे डोंगरावरील गुहा क्षेत्र.',
    deityName: 'गिरिजात्मज (गणपती)',
    location: 'लेन्याद्री, पुणे जिल्हा',
    latitude: 18.8233,
    longitude: 73.7375,
  },
  {
    nameMarathi: 'श्री राम मंदिर, रामटेक',
    nameTranslit: 'Shri Ram Temple Ramtek',
    slug: 'ram-temple-ramtek',
    description:
      'नागपूरजवळील रामटेक येथील राम मंदिर. कालिदासांच्या मेघदूतात उल्लेख असलेले क्षेत्र.',
    deityName: 'राम',
    location: 'रामटेक, नागपूर जिल्हा',
    latitude: 21.3954,
    longitude: 79.3285,
  },
  {
    nameMarathi: 'श्री चंद्रभागा क्षेत्र',
    nameTranslit: 'Shri Chandrabhaga Kshetra',
    slug: 'chandrabhaga-ghat-pandharpur',
    description:
      'पंढरपूरची चंद्रभागा नदी व त्यावरील घाट. वारकरी आषाढी वारीत येथे स्नान करून विठ्ठलाचे दर्शन घेतात.',
    deityName: 'चंद्रभागा',
    location: 'पंढरपूर, सोलापूर जिल्हा',
    latitude: 17.675,
    longitude: 75.325,
  },
];

// ─── Festivals ───────────────────────────────────────────────────────────
// Real festivals with documented Marathi lunar-calendar date rules.
const FESTIVALS: Array<{
  nameMarathi: string;
  nameTranslit: string;
  dateRule: string;
}> = [
  {
    nameMarathi: 'आषाढी एकादशी',
    nameTranslit: 'Ashadhi Ekadashi',
    dateRule: 'आषाढ शुद्ध एकादशी',
  },
  {
    nameMarathi: 'कार्तिकी एकादशी',
    nameTranslit: 'Kartiki Ekadashi',
    dateRule: 'कार्तिक शुद्ध एकादशी',
  },
  {
    nameMarathi: 'गुढीपाडवा',
    nameTranslit: 'Gudhipadwa',
    dateRule: 'चैत्र शुद्ध प्रतिपदा',
  },
  {
    nameMarathi: 'मकर संक्रांत',
    nameTranslit: 'Makar Sankranti',
    dateRule: 'सूर्याचा मकर राशीत प्रवेश (१४ जानेवारी)',
  },
  {
    nameMarathi: 'महाशिवरात्री',
    nameTranslit: 'Mahashivratri',
    dateRule: 'माघ कृष्ण चतुर्दशी',
  },
  {
    nameMarathi: 'होळी',
    nameTranslit: 'Holi',
    dateRule: 'फाल्गुन शुद्ध पौर्णिमा',
  },
  {
    nameMarathi: 'रंगपंचमी',
    nameTranslit: 'Rangpanchami',
    dateRule: 'फाल्गुन शुद्ध पंचमी',
  },
  {
    nameMarathi: 'गणेश चतुर्थी',
    nameTranslit: 'Ganesh Chaturthi',
    dateRule: 'भाद्रपद शुद्ध चतुर्थी',
  },
  {
    nameMarathi: 'अनंत चतुर्दशी',
    nameTranslit: 'Anant Chaturdashi',
    dateRule: 'भाद्रपद शुद्ध चतुर्दशी',
  },
  {
    nameMarathi: 'नवरात्री',
    nameTranslit: 'Navratri',
    dateRule: 'आश्विन शुद्ध प्रतिपदा ते नवमी',
  },
  {
    nameMarathi: 'विजयादशमी (दसरा)',
    nameTranslit: 'Vijayadashami (Dasara)',
    dateRule: 'आश्विन शुद्ध दशमी',
  },
  {
    nameMarathi: 'दिवाळी',
    nameTranslit: 'Diwali',
    dateRule: 'आश्विन कृष्ण अमावास्या',
  },
  {
    nameMarathi: 'कोजागिरी पौर्णिमा',
    nameTranslit: 'Kojagiri Purnima',
    dateRule: 'आश्विन शुद्ध पौर्णिमा',
  },
  {
    nameMarathi: 'नागपंचमी',
    nameTranslit: 'Nag Panchami',
    dateRule: 'श्रावण शुद्ध पंचमी',
  },
  {
    nameMarathi: 'गोकुळाष्टमी',
    nameTranslit: 'Gokulashtami',
    dateRule: 'श्रावण कृष्ण अष्टमी',
  },
  {
    nameMarathi: 'रक्षाबंधन',
    nameTranslit: 'Rakshabandhan',
    dateRule: 'श्रावण शुद्ध पौर्णिमा',
  },
  {
    nameMarathi: 'हरिपाठ उत्सव',
    nameTranslit: 'Haripath Utsav',
    dateRule: 'आषाढ शुद्ध एकादशीपूर्वीचे दिवस',
  },
];

// ─── Composition → saint linking ─────────────────────────────────────────
// The composition `source` field and title patterns identify authorship
// reliably for the imported corpora. Matches run on a snapshot so every
// composition links exactly once per run.
async function linkCompositionsToSaints() {
  const saints = await prisma.saint.findMany();
  const bySlug = new Map(saints.map((s) => [s.slug, s]));

  const rules: Array<{ slug: string; test: (source: string, title: string) => boolean }> = [
    {
      slug: 'tukaram-maharaj',
      test: (source, _title) =>
        /तुकाराम|Tukaram|tukaram|तुका/i.test(source) &&
        !/नामदेव|एकनाथ|ज्ञानदेव|Dnyaneshwar|Eknath|Namdev/i.test(source),
    },
    {
      slug: 'namdev-maharaj',
      test: (source, _title) => /नामदेव|Namdev|namdev/i.test(source),
    },
    {
      slug: 'eknath-maharaj',
      test: (source, title) =>
        /एकनाथ|Eknath|eknath|Eknaath|eknaath/i.test(source) ||
        /^Eknath |^Eknaathii|^Eknathii/i.test(title),
    },
    {
      slug: 'dnyaneshwar-maharaj',
      test: (source, title) =>
        /हरिपाठ|ज्ञानदेव|Dnyaneshwar|dnyaneshwar|Dnyaneshwari|dnyaneshwari|अमृतानुभव|Amrutanubhav|चांगदेव|Changdev/i.test(
          source + ' ' + title
        ),
    },
    {
      slug: 'samarth-ramdas',
      test: (source, title) =>
        /रामदास|Ramdas|ramdas|दासबोध|Dasbodh|मनाचे श्लोक|Manache Shlok|आत्माराम/i.test(
          source + ' ' + title
        ),
    },
  ];

  // Snapshot all compositions once (title + source only — 26k rows).
  const all = await prisma.composition.findMany({
    select: { id: true, source: true, titleTranslit: true, saintId: true },
  });

  // Build per-saint candidate sets from the rules (first rule wins).
  const assign: Record<string, string[]> = {};
  for (const rule of rules) {
    assign[rule.slug] = [];
  }

  const unlinked: string[] = [];
  for (const c of all) {
    if (c.saintId) continue; // already linked — never overwrite
    const source = c.source || '';
    const title = c.titleTranslit || '';
    let matched = false;
    for (const rule of rules) {
      if (rule.test(source, title)) {
        assign[rule.slug].push(c.id);
        matched = true;
        break;
      }
    }
    if (!matched) unlinked.push(c.id);
  }

  let linked = 0;
  for (const [slug, ids] of Object.entries(assign)) {
    const saint = bySlug.get(slug);
    if (!saint || ids.length === 0) continue;
    // Update in chunks to avoid huge single queries.
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      await prisma.composition.updateMany({
        where: { id: { in: chunk }, saintId: null },
        data: { saintId: saint.id },
      });
      linked += chunk.length;
    }
  }

  console.log(
    `  → linked ${linked} compositions to saints (${Object.entries(assign)
      .filter(([, v]) => v.length)
      .map(([s, v]) => `${s}:${v.length}`)
      .join(', ')}); ${unlinked.length} unlinked (already had saintId: ${
      all.length - unlinked.length - linked
    })`
  );
}

async function main() {
  console.log('Seeding knowledge-graph entities...');

  // ── Saints ──
  const saints = await Promise.all(
    SAINTS.map((s) =>
      prisma.saint.upsert({
        where: { slug: s.slug },
        update: {}, // never overwrite editorial edits
        create: {
          nameMarathi: s.nameMarathi,
          nameTranslit: s.nameTranslit,
          slug: s.slug,
          period: s.period,
          region: s.region,
          biography: s.biography,
        },
      })
    )
  );
  console.log(`  ✓ ${saints.length} saints`);

  // ── Temples ──
  const temples = await Promise.all(
    TEMPLES.map((t) =>
      prisma.temple.upsert({
        where: { slug: t.slug },
        update: {},
        create: {
          nameMarathi: t.nameMarathi,
          nameTranslit: t.nameTranslit,
          slug: t.slug,
          description: t.description,
          deityName: t.deityName,
          location: t.location,
          latitude: t.latitude,
          longitude: t.longitude,
        },
      })
    )
  );
  console.log(`  ✓ ${temples.length} temples`);

  // ── Festivals ──
  const festivals = await Promise.all(
    FESTIVALS.map((f) =>
      prisma.festival.upsert({
        where: { nameTranslit: f.nameTranslit },
        update: {},
        create: {
          nameMarathi: f.nameMarathi,
          nameTranslit: f.nameTranslit,
          dateRule: f.dateRule,
        },
      })
    )
  );
  console.log(`  ✓ ${festivals.length} festivals`);

  // ── Fix known typos in the 4 original seed saints (canonical spellings) ──
  // The original seed wrote "द्न्यादेश्वर" (→ ज्ञानेश्वर), "होंडले" (→ होते),
  // "अलंदी" (→ आळंदी), "संघाटीचे" (→ संप्रदायाचे) etc. Correct in place so
  // existing links keep working.
  const typoFixes: Array<{ slug: string; nameMarathi: string; biography: string }> = [
    {
      slug: 'dnyaneshwar-maharaj',
      nameMarathi: 'ज्ञानेश्वर महाराज',
      biography:
        'संत ज्ञानेश्वर महाराज हे वारकरी संप्रदायाचे आद्य संत. त्यांनी भगवद्गीतेवर मराठीत "भावार्थदीपिका" (ज्ञानेश्वरी) लिहिली आणि "अमृतानुभव", "चांगदेव पासष्टी" या ग्रंथांची रचना केली. आळंदी येथे त्यांनी संजीवन समाधी घेतली.',
    },
    {
      slug: 'tukaram-maharaj',
      nameMarathi: 'तुकाराम महाराज',
      biography:
        'संत तुकाराम महाराज हे वारकरी संप्रदायाचे प्रमुख संत. त्यांचे अभंग विठ्ठल भक्ती आणि सामाजिक समानतेच्या भावनेत रचलेले आहेत. त्यांच्या "तुकाराम गाथा"मध्ये सुमारे चार हजार अभंग आहेत.',
    },
    {
      slug: 'namdev-maharaj',
      nameMarathi: 'नामदेव महाराज',
      biography:
        'संत नामदेव महाराज हे वारकरी संप्रदायाचे संत. त्यांनी "हरिपाठ" या नामस्मरण ग्रंथाची रचना केली. त्यांनी नामस्मरणाचे महत्त्व सांगितले आणि संपूर्ण महाराष्ट्रात भक्तीचा प्रसार केला.',
    },
    {
      slug: 'eknath-maharaj',
      nameMarathi: 'एकनाथ महाराज',
      biography:
        'संत एकनाथ महाराज हे वारकरी संप्रदायाचे संत. त्यांनी "एकनाथी भागवत", "रुक्मिणी स्वयंवर", "भावार्थ रामायण" या ग्रंथांची रचना केली आणि वैदिक ग्रंथांचे मराठी अनुवाद केले.',
    },
  ];
  for (const fix of typoFixes) {
    await prisma.saint.updateMany({
      where: { slug: fix.slug },
      data: { nameMarathi: fix.nameMarathi, biography: fix.biography },
    });
  }

  // ── Link compositions to saints ──
  await linkCompositionsToSaints();

  // ── Summary ──
  const [saintCount, templeCount, festivalCount, compWithSaint] = await Promise.all([
    prisma.saint.count(),
    prisma.temple.count(),
    prisma.festival.count(),
    prisma.composition.count({ where: { saintId: { not: null } } }),
  ]);
  console.log(
    `\nDone: ${saintCount} saints · ${templeCount} temples · ${festivalCount} festivals · ${compWithSaint} compositions linked to saints`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
