/**
 * Authoritative Varkari Saint Lineage & Sacred Seals Metadata
 * Pure cultural scholarship — maps every saint to their authentic abhang mudra,
 * calligraphic monogram glyph, spiritual tradition, and verified portrait (if authentic).
 */

export interface SaintSealData {
  glyph: string;
  mudra: string;
  tradition: string;
  authenticPortrait?: string;
  accentBg: string; // Tailored sacred color palette
}

export const SAINT_SEALS: Record<string, SaintSealData> = {
  'dnyaneshwar-maharaj': {
    glyph: 'ज्ञा',
    mudra: 'ज्ञानोबा माउली',
    tradition: 'नाथ व वारकरी परंपरा',
    authenticPortrait: '/images/saints/dnyaneshwar.jpg',
    accentBg: 'from-[#5C240E] to-[#2D1206]',
  },
  'dnyaneshwar': {
    glyph: 'ज्ञा',
    mudra: 'ज्ञानोबा माउली',
    tradition: 'नाथ व वारकरी परंपरा',
    authenticPortrait: '/images/saints/dnyaneshwar.jpg',
    accentBg: 'from-[#5C240E] to-[#2D1206]',
  },
  'tukaram-maharaj': {
    glyph: 'तु',
    mudra: 'तुका म्हणे',
    tradition: 'वारकरी संप्रदाय',
    authenticPortrait: '/images/saints/tukaram-birthplace.jpg',
    accentBg: 'from-[#6B3208] to-[#361703]',
  },
  'tukaram': {
    glyph: 'तु',
    mudra: 'तुका म्हणे',
    tradition: 'वारकरी संप्रदाय',
    authenticPortrait: '/images/saints/tukaram-birthplace.jpg',
    accentBg: 'from-[#6B3208] to-[#361703]',
  },
  'pundalik': {
    glyph: 'पु',
    mudra: 'पुंडलीक वरदा हरी विठ्ठल',
    tradition: 'आद्य वारकरी भक्त',
    authenticPortrait: '/images/saints/panduranga-vitthal.jpg',
    accentBg: 'from-[#4A2411] to-[#1E0D06]',
  },
  'bhakta-pundalik': {
    glyph: 'पु',
    mudra: 'पुंडलीक वरदा हरी विठ्ठल',
    tradition: 'आद्य वारकरी भक्त',
    authenticPortrait: '/images/saints/panduranga-vitthal.jpg',
    accentBg: 'from-[#4A2411] to-[#1E0D06]',
  },
  'namdev-maharaj': {
    glyph: 'ना',
    mudra: 'नामा म्हणे',
    tradition: 'भागवत धर्म प्रचारक',
    accentBg: 'from-[#5A2914] to-[#281107]',
  },
  'namdev': {
    glyph: 'ना',
    mudra: 'नामा म्हणे',
    tradition: 'भागवत धर्म प्रचारक',
    accentBg: 'from-[#5A2914] to-[#281107]',
  },
  'eknath-maharaj': {
    glyph: 'ए',
    mudra: 'एका जनार्दनी',
    tradition: 'दत्त व वारकरी परंपरा',
    accentBg: 'from-[#5E2B0C] to-[#2E1404]',
  },
  'eknath': {
    glyph: 'ए',
    mudra: 'एका जनार्दनी',
    tradition: 'दत्त व वारकरी परंपरा',
    accentBg: 'from-[#5E2B0C] to-[#2E1404]',
  },
  'chokhamela': {
    glyph: 'चो',
    mudra: 'चोखा म्हणे',
    tradition: 'वारकरी संत',
    accentBg: 'from-[#542512] to-[#260F06]',
  },
  'sant-chokhamela': {
    glyph: 'चो',
    mudra: 'चोखा म्हणे',
    tradition: 'वारकरी संत',
    accentBg: 'from-[#542512] to-[#260F06]',
  },
  'janabai': {
    glyph: 'ज',
    mudra: 'दासी जनी म्हणे',
    tradition: 'वारकरी कवयित्री',
    accentBg: 'from-[#59261B] to-[#2B110B]',
  },
  'sant-janabai': {
    glyph: 'ज',
    mudra: 'दासी जनी म्हणे',
    tradition: 'वारकरी कवयित्री',
    accentBg: 'from-[#59261B] to-[#2B110B]',
  },
  'kanhopatra': {
    glyph: 'कां',
    mudra: 'कान्हो म्हणे',
    tradition: 'विठ्ठल अनन्य भक्ती',
    accentBg: 'from-[#4F1E1E] to-[#230C0C]',
  },
  'sant-kanhopatra': {
    glyph: 'कां',
    mudra: 'कान्हो म्हणे',
    tradition: 'विठ्ठल अनन्य भक्ती',
    accentBg: 'from-[#4F1E1E] to-[#230C0C]',
  },
  'gora-kumbhar': {
    glyph: 'गो',
    mudra: 'गोरा म्हणे',
    tradition: 'कुंभार संत',
    accentBg: 'from-[#613310] to-[#2F1806]',
  },
  'sant-gora-kumbhar': {
    glyph: 'गो',
    mudra: 'गोरा म्हणे',
    tradition: 'कुंभार संत',
    accentBg: 'from-[#613310] to-[#2F1806]',
  },
  'savata-mali': {
    glyph: 'सा',
    mudra: 'सावता म्हणे',
    tradition: 'कर्मयोगी वारकरी संत',
    accentBg: 'from-[#3D3A16] to-[#1C1B08]',
  },
  'sant-savata-mali': {
    glyph: 'सा',
    mudra: 'सावता म्हणे',
    tradition: 'कर्मयोगी वारकरी संत',
    accentBg: 'from-[#3D3A16] to-[#1C1B08]',
  },
  'sena-nhavi': {
    glyph: 'से',
    mudra: 'सेना म्हणे',
    tradition: 'वारकरी संत',
    accentBg: 'from-[#5C2915] to-[#2C1308]',
  },
  'sant-sena-nhavi': {
    glyph: 'से',
    mudra: 'सेना म्हणे',
    tradition: 'वारकरी संत',
    accentBg: 'from-[#5C2915] to-[#2C1308]',
  },
  'bahinabai': {
    glyph: 'ब',
    mudra: 'बहिणी म्हणे',
    tradition: 'तुकाराम शिष्य परंपरा',
    accentBg: 'from-[#58251B] to-[#290F0B]',
  },
  'sant-bahinabai': {
    glyph: 'ब',
    mudra: 'बहिणी म्हणे',
    tradition: 'तुकाराम शिष्य परंपरा',
    accentBg: 'from-[#58251B] to-[#290F0B]',
  },
  'muktabai': {
    glyph: 'मु',
    mudra: 'मुक्ता म्हणे ताटी उघडा',
    tradition: 'आदिमाता मुक्ताई',
    accentBg: 'from-[#5A271C] to-[#28100A]',
  },
  'sant-muktabai': {
    glyph: 'मु',
    mudra: 'मुक्ता म्हणे ताटी उघडा',
    tradition: 'आदिमाता मुक्ताई',
    accentBg: 'from-[#5A271C] to-[#28100A]',
  },
  'nivruttinath': {
    glyph: 'नि',
    mudra: 'निवृत्ती म्हणे',
    tradition: 'गहिनीनाथ शिष्य',
    accentBg: 'from-[#4D2812] to-[#241206]',
  },
  'nivruttinath-maharaj': {
    glyph: 'नि',
    mudra: 'निवृत्ती म्हणे',
    tradition: 'गहिनीनाथ शिष्य',
    accentBg: 'from-[#4D2812] to-[#241206]',
  },
  'sopandev': {
    glyph: 'सो',
    mudra: 'सोपान म्हणे',
    tradition: 'सोपानकाका',
    accentBg: 'from-[#4F2B14] to-[#251307]',
  },
  'gadge-maharaj': {
    glyph: 'गा',
    mudra: 'गोपाला गोपाला देवकीनंदन गोपाला',
    tradition: 'स्वच्छता व समाजप्रबोधन',
    accentBg: 'from-[#47301B] to-[#21160B]',
  },
  'sant-gadge-maharaj': {
    glyph: 'गा',
    mudra: 'गोपाला गोपाला देवकीनंदन गोपाला',
    tradition: 'स्वच्छता व समाजप्रबोधन',
    accentBg: 'from-[#47301B] to-[#21160B]',
  },
  'tukdoji-maharaj': {
    glyph: 'तु',
    mudra: 'तुकड्या म्हणे',
    tradition: 'राष्ट्रसंत ग्रामगीताकार',
    accentBg: 'from-[#542B10] to-[#271305]',
  },
  'sant-tukdoji-maharaj': {
    glyph: 'तु',
    mudra: 'तुकड्या म्हणे',
    tradition: 'राष्ट्रसंत ग्रामगीताकार',
    accentBg: 'from-[#542B10] to-[#271305]',
  },
  'vitthalpant-kulkarni': {
    glyph: 'वि',
    mudra: 'आदिसंत परंपरा',
    tradition: 'ज्ञानेश्वरांचे पिता',
    accentBg: 'from-[#4C2815] to-[#241208]',
  },
  'dnyaneshwar-sister-rukminibai': {
    glyph: 'रु',
    mudra: 'मातृवंदना',
    tradition: 'ज्ञानेश्वरांची माता',
    accentBg: 'from-[#57271D] to-[#27100B]',
  },
  'rukminibai': {
    glyph: 'रु',
    mudra: 'मातृवंदना',
    tradition: 'ज्ञानेश्वरांची माता',
    accentBg: 'from-[#57271D] to-[#27100B]',
  },
  'samarth-ramdas': {
    glyph: 'रा',
    mudra: 'दासबोधकार',
    tradition: 'रामदासी परंपरा',
    accentBg: 'from-[#632D10] to-[#301506]',
  },
  'damaji-pant': {
    glyph: 'दा',
    mudra: 'दामाजी म्हणे',
    tradition: 'धान्याचे कोठार खुले करणारे भक्त',
    accentBg: 'from-[#4F2E14] to-[#241407]',
  },
  'bhanudas': {
    glyph: 'भा',
    mudra: 'भानुदास म्हणे',
    tradition: 'विठ्ठल मूर्ती आणणारे संत',
    accentBg: 'from-[#552A15] to-[#261208]',
  },
  'waman-pandit': {
    glyph: 'वा',
    mudra: 'यथार्थदीपिकाकार',
    tradition: 'पंडित कवी',
    accentBg: 'from-[#4E2B16] to-[#241309]',
  },
  'banka-mahar': {
    glyph: 'बं',
    mudra: 'बंका म्हणे',
    tradition: 'चोखामेळा मेहुणे',
    accentBg: 'from-[#4D2713] to-[#221006]',
  },
  'dnyanoba-teli': {
    glyph: 'ज्ञा',
    mudra: 'विठ्ठल भक्ती',
    tradition: 'वारकरी संत',
    accentBg: 'from-[#502914] to-[#241107]',
  },
  'vishoba-khechar': {
    glyph: 'वि',
    mudra: 'खेचर म्हणे',
    tradition: 'नामदेवांचे गुरु',
    accentBg: 'from-[#4E2C17] to-[#231309]',
  },
  'narhari-sonar': {
    glyph: 'नर',
    mudra: 'नरहरी म्हणे',
    tradition: 'सोनार संत',
    accentBg: 'from-[#5A3511] to-[#2A1806]',
  },
  'swami-swarupanand': {
    glyph: 'स्व',
    mudra: 'अमृतानुभव साधक',
    tradition: 'पावस ज्ञानसाधना',
    accentBg: 'from-[#4F2D17] to-[#241409]',
  },
  'sant-shreerang-maharaj': {
    glyph: 'श्री',
    mudra: 'नामस्मरण',
    tradition: 'वारकरी परंपरा',
    accentBg: 'from-[#4D2914] to-[#231207]',
  },
};

/**
 * Returns authentic sacred seal metadata for any saint slug.
 */
export function getSaintSeal(slug?: string | null, nameMarathi?: string): SaintSealData {
  if (slug) {
    const clean = slug.toLowerCase().trim();
    if (SAINT_SEALS[clean]) {
      return SAINT_SEALS[clean];
    }
  }

  // Derive respectful glyph from first letter of Marathi name if unlisted
  const defaultGlyph = nameMarathi ? nameMarathi.replace(/^संत\s*/, '').slice(0, 2) : 'सं';

  return {
    glyph: defaultGlyph,
    mudra: 'विठ्ठल नामस्मरण',
    tradition: 'वारकरी परंपरा',
    accentBg: 'from-[#522814] to-[#261107]',
  };
}
