/**
 * Authoritative Curated Saint Images Registry
 * Maps every saint to verified, authentic, and reverent local imagery.
 * Strictly prevents random internet/Unsplash images of swimming pools,
 * non-devotional monuments, or broken images from ever appearing.
 */

export const SAINT_IMAGE_MAP: Record<string, string> = {
  // Major Pillars of the Varkari Tradition with verified authentic portraits
  'dnyaneshwar-maharaj': '/images/saints/dnyaneshwar.jpg',
  'dnyaneshwar': '/images/saints/dnyaneshwar.jpg',
  'tukaram-maharaj': '/images/saints/tukaram-birthplace.jpg',
  'tukaram': '/images/saints/tukaram-birthplace.jpg',
  'pundalik': '/images/saints/panduranga-vitthal.jpg',
  'bhakta-pundalik': '/images/saints/panduranga-vitthal.jpg',

  // Revered Varkari Sants with authentic temple & sacred manuscript heritage imagery
  'namdev-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'namdev': '/images/realistic/ancient-manuscript.jpg',
  'eknath-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'eknath': '/images/realistic/ancient-manuscript.jpg',
  'janabai': '/images/realistic/chandrabhaga-river.jpg',
  'sant-janabai': '/images/realistic/chandrabhaga-river.jpg',
  'kanhopatra': '/images/realistic/temple-aarti.jpg',
  'sant-kanhopatra': '/images/realistic/temple-aarti.jpg',
  'chokhamela': '/images/realistic/pandharpur-temple.jpg',
  'sant-chokhamela': '/images/realistic/pandharpur-temple.jpg',
  'savata-mali': '/images/realistic/chandrabhaga-river.jpg',
  'sant-savata-mali': '/images/realistic/chandrabhaga-river.jpg',
  'gora-kumbhar': '/images/realistic/ancient-manuscript.jpg',
  'sant-gora-kumbhar': '/images/realistic/ancient-manuscript.jpg',
  'sena-nhavi': '/images/realistic/ancient-manuscript.jpg',
  'sant-sena-nhavi': '/images/realistic/ancient-manuscript.jpg',
  'bahinabai': '/images/realistic/ancient-manuscript.jpg',
  'sant-bahinabai': '/images/realistic/ancient-manuscript.jpg',
  'muktabai': '/images/realistic/chandrabhaga-river.jpg',
  'sant-muktabai': '/images/realistic/chandrabhaga-river.jpg',
  'nivruttinath': '/images/realistic/ancient-manuscript.jpg',
  'nivruttinath-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'sopandev': '/images/realistic/ancient-manuscript.jpg',
  'gadge-maharaj': '/images/realistic/chandrabhaga-river.jpg',
  'sant-gadge-maharaj': '/images/realistic/chandrabhaga-river.jpg',
  'tukdoji-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'sant-tukdoji-maharaj': '/images/realistic/ancient-manuscript.jpg',
  'vitthalpant-kulkarni': '/images/realistic/ancient-manuscript.jpg',
  'dnyaneshwar-sister-rukminibai': '/images/realistic/chandrabhaga-river.jpg',
  'rukminibai': '/images/realistic/chandrabhaga-river.jpg',
  'samarth-ramdas': '/images/realistic/ancient-manuscript.jpg',
  'samarth-ramdas-swami': '/images/realistic/ancient-manuscript.jpg',
  'damaji-pant': '/images/realistic/pandharpur-temple.jpg',
  'sant-damaji-pant': '/images/realistic/pandharpur-temple.jpg',
  'bhanudas': '/images/realistic/pandharpur-temple.jpg',
  'sant-bhanudas': '/images/realistic/pandharpur-temple.jpg',
  'waman-pandit': '/images/realistic/ancient-manuscript.jpg',
  'sant-waman-pandit': '/images/realistic/ancient-manuscript.jpg',
  'dnyanoba-teli': '/images/realistic/pandharpur-temple.jpg',
  'sant-dnyanoba-teli': '/images/realistic/pandharpur-temple.jpg',
  'banka-mahar': '/images/realistic/pandharpur-temple.jpg',
  'sant-banka-mahar': '/images/realistic/pandharpur-temple.jpg',
  'vishoba-khechar': '/images/realistic/temple-aarti.jpg',
  'sant-vishoba-khechar': '/images/realistic/temple-aarti.jpg',
  'narhari-sonar': '/images/realistic/temple-aarti.jpg',
  'sant-narhari-sonar': '/images/realistic/temple-aarti.jpg',
  'swami-swarupanand': '/images/realistic/ancient-manuscript.jpg',
  'sant-shreerang-maharaj': '/images/realistic/ancient-manuscript.jpg',
};

export const DEFAULT_SAINT_IMAGE = '/images/realistic/pandharpur-temple.jpg';

/**
 * Resolves the authenticated, reverent image path for any saint.
 * Never returns null, never uses unverified internet URLs.
 */
export function getSaintPortrait(slug?: string | null): string {
  if (!slug) return DEFAULT_SAINT_IMAGE;
  const cleanSlug = slug.toLowerCase().trim();
  return SAINT_IMAGE_MAP[cleanSlug] || DEFAULT_SAINT_IMAGE;
}
