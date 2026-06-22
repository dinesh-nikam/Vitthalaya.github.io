/**
 * Comprehensive transliteration map for Marathi search
 * Maps common Roman/Latin spellings to Devanagari
 * Covers saints, deities, festivals, places, terms
 */

export const TRANSLITERATION_MAP: Record<string, string> = {
  // === Saints (Sant Parampara) ===
  tukaram: 'तुकाराम',
  tuka: 'तुका',
  dnyaneshwar: 'ज्ञानेश्वर',
  dnyandev: 'ज्ञानदेव',
  dnyaneshvar: 'ज्ञानेश्वर',
  eknath: 'एकनाथ',
  namdev: 'नामदेव',
  namadev: 'नामदेव',
  janabai: 'जनाबाई',
  janani: 'जनाबाई',
  chokhamela: 'चोखामेळा',
  chokha: 'चोखा',
  soyanarayan: 'सोयानारायण',
  soyanand: 'सोयानंद',
  gora: 'गोरा',
  goraKumbhar: 'गोरा कुंभार',
  narahari: 'नरहरी',
  sonar: 'सोनार',
  bhagubai: 'भागुबाई',
  bhagu: 'भागू',
  bhakta: 'भक्त',
  bhanudas: 'भानुदास',
  damaji: 'दामाजी',
  kanhopatra: 'कान्होपात्रा',
  karmamel: 'कर्ममेळ',
  keertan: 'किर्तन',
  madhava: 'माधव',
  madhav: 'माधव',
  mahabat: 'महाबत',
  muktabai: 'मुक्ताबाई',
  mukta: 'मुक्ता',
  nivrutti: 'निवृत्ती',
  nivruttinath: 'निवृत्तीनाथ',
  sadhana: 'साधना',
  sena: 'सेना',
  senanhavi: 'सेना न्हावी',
  sevalal: 'सेवालाल',
  trembl: 'त्रेंबक',
  trembak: 'त्रेंबक',
  vasudeo: 'वासुदेव',
  vasudev: 'वासुदेव',
  visoba: 'विसोबा',
  khecara: 'खेचर',
  bhagwat: 'भागवत',
  gnyaneshwar: 'ज्ञानेश्वर',
  gyaneshwar: 'ज्ञानेश्वर',
  sants: 'संत',

  // === Deities ===
  vitthal: 'विठ्ठल',
  vithoba: 'विठोबा',
  vithu: 'विठू',
  pandurang: 'पांडुरंग',
  pandharinath: 'पंढरिनाथ',
  bishnu: 'विष्णु',
  vishnu: 'विष्णु',
  narayan: 'नारायण',
  krishna: 'कृष्ण',
  krushna: 'कृष्ण',
  shiva: 'शिव',
  shankar: 'शंकर',
  mahadev: 'महादेव',
  mahadeva: 'महादेव',
  brahma: 'ब्रह्मा',
  ram: 'राम',
  rama: 'राम',
  ramachandra: 'रामचंद्र',
  laxmi: 'लक्ष्मी',
  lakshmi: 'लक्ष्मी',
  parvati: 'पार्वती',
  durga: 'दुर्गा',
  devi: 'देवी',
  ganpati: 'गणपती',
  ganesh: 'गणेश',
  dattatreya: 'दत्तात्रेय',
  datta: 'दत्त',
  hanuman: 'हनुमान',
  maruti: 'मारुती',
  annapurna: 'अन्नपूर्णा',
  saraswati: 'सरस्वती',
  radha: 'राधा',
  radhe: 'राधे',

  // === Festivals ===
  ekadashi: 'एकादशी',
  ashadhi: 'आषाढी',
  ashadhiEkadashi: 'आषाढी एकादशी',
  kartiki: 'कार्तिकी',
  kartik: 'कार्तिक',
  maghi: 'माघी',
  pausha: 'पौष',
  poush: 'पौष',
  holi: 'होळी',
  dusshera: 'दसरा',
  dussehra: 'दसरा',
  diwali: 'दिवाळी',
  deepavali: 'दीपावली',
  gudipadwa: 'गुढीपाडवा',
  ganeshChaturthi: 'गणेश चतुर्थी',
  navaratri: 'नवरात्री',
  navratri: 'नवरात्री',
  shivaratri: 'शिवरात्री',
  mahashivaratri: 'महाशिवरात्री',
  rathasaptami: 'रथसप्तमी',
  rathsaptami: 'रथसप्तमी',
  hanumanJayanti: 'हनुमान जयंती',
  vatPurnima: 'वटपौर्णिमा',
  guruPurnima: 'गुरुपौर्णिमा',
  kumbh: 'कुंभ',
  sinhastha: 'सिंहस्थ',
  wari: 'वारी',
  palakhi: 'पालखी',
  palkhi: 'पालखी',
  dindi: 'दिंडी',

  // === Places ===
  pandharpur: 'पंढरपूर',
  pandarpur: 'पंढरपूर',
  alandi: 'आळंदी',
  dehu: 'देहू',
  dehuRoad: 'देहूरोड',
  dehuroad: 'देहूरोड',
  paithan: 'पैठण',
  maha: 'महा',
  maharashtra: 'महाराष्ट्र',
  maharastra: 'महाराष्ट्र',
  chandrabhaga: 'चंद्रभागा',
  bhima: 'भीमा',
  ghodnadi: 'घोडनदी',
  indrayani: 'इंद्रायणी',
  tuplam: 'तुळजापूर',
  tuljapur: 'तुळजापूर',
  shirdi: 'शिर्डी',
  nashik: 'नाशिक',
  nasik: 'नाशिक',
  tryambakeshwar: 'त्र्यंबकेश्वर',
  trimbakeshwar: 'त्र्यंबकेश्वर',
  bhimashankar: 'भीमाशंकर',
  shaniShinganapur: 'शनी शिंगणापूर',
  shegaon: 'शेगाव',
  ganpatipule: 'गणपतीपुळे',
  bhor: 'भोर',
  sagar: 'सागर',
  sangam: 'संगम',

  // === Devotional Terms ===
  abhang: 'अभंग',
  abhanga: 'अभंग',
  aarti: 'आरती',
  arati: 'आरती',
  bhajan: 'भजन',
  stotra: 'स्तोत्र',
  stotram: 'स्तोत्र',
  haripath: 'हरिपाठ',
  pad: 'पद',
  padda: 'पद',
  gatha: 'गाथा',
  kirtan: 'कीर्तन',
  parayan: 'पारायण',
  pothi: 'पोथी',
  granth: 'ग्रंथ',
  bhagvat: 'भागवत',
  bhagwata: 'भागवत',
  geeta: 'गीता',
  gita: 'गीता',
  puran: 'पुराण',
  upanishad: 'उपनिषद',
  ved: 'वेद',
  stuti: 'स्तुती',
  stut: 'स्तुती',
  namasmarana: 'नामस्मरण',
  namasmaran: 'नामस्मरण',
  namdevachi: 'नामदेवाची',
  tukaChe: 'तुक्याचे',
  gaulani: 'गौळणी',
  ovi: 'ओवी',
  pawa: 'पावा',
  bhupali: 'भूपाळी',
  mangalacharan: 'मंगलाचरण',
  prarthana: 'प्रार्थना',
  prarthna: 'प्रार्थना',
  naman: 'नमन',
  namaskar: 'नमस्कार',
  mangal: 'मंगल',

  // === Common Warkari Terms ===
  warkari: 'वारकरी',
  varakari: 'वारकरी',
  viththal: 'विठ्ठल',
  pandhari: 'पंढरी',
  pandhara: 'पांढरा',
  pundalik: 'पुंडलिक',
  pundalika: 'पुंडलिक',
  namadeva: 'नामदेव',
  jnandev: 'ज्ञानदेव',
  tukoba: 'तुकोबा',
  sakharam: 'सखाराम',
  dew: 'देव',
  bhagwant: 'भगवंत',
  parmatma: 'परमात्मा',
  ishwar: 'ईश्वर',
  isvar: 'ईश्वर',
  guru: 'गुरू',
  sadguru: 'सद्गुरू',
  bhakti: 'भक्ती',
  mukti: 'मुक्ती',
  dhyan: 'ध्यान',
  yoga: 'योग',
  yog: 'योग',
  puja: 'पूजा',
  archa: 'अर्चा',
  tulsi: 'तुळसी',
  tulasi: 'तुळसी',
  prasad: 'प्रसाद',
  bhoga: 'भोग',
  nivedan: 'निवेदन',
  sankalpa: 'संकल्प',
  sewa: 'सेवा',
  seva: 'सेवा',
  darshan: 'दर्शन',
  darasan: 'दर्शन',
};

/**
 * Build expanded search query from a transliterated input
 * If the input matches a known Latin → Devanagari mapping,
 * returns both forms concatenated for Meilisearch
 */
export function expandTransliteration(query: string): string {
  const cleaned = query.toLowerCase().trim();
  if (!cleaned) return query;

  const devanagariForm = TRANSLITERATION_MAP[cleaned];
  if (devanagariForm) {
    return `${query} ${devanagariForm}`;
  }

  // Check partial matches — prefix-based
  const matches = Object.entries(TRANSLITERATION_MAP)
    .filter(([latin]) => latin.startsWith(cleaned) || cleaned.startsWith(latin))
    .slice(0, 5)
    .map(([, deva]) => deva);

  if (matches.length > 0) {
    return `${query} ${matches.join(' ')}`;
  }

  return query;
}

/**
 * Get autocomplete suggestions from the transliteration map
 */
export function getTransliterationSuggestions(prefix: string): { latin: string; devanagari: string }[] {
  const cleaned = prefix.toLowerCase().trim();
  if (!cleaned || cleaned.length < 1) return [];

  const results = Object.entries(TRANSLITERATION_MAP)
    .filter(([latin]) => latin.startsWith(cleaned))
    .slice(0, 8)
    .map(([latin, devanagari]) => ({ latin, devanagari }));

  return results;
}
