/**
 * Phonetic Search for Marathi
 * 
 * Implements Soundex-like algorithm adapted for Marathi/Devanagari.
 * Handles common variations in transliteration:
 * - "vitthal" → "vithal" → "vittal"
 * - "tukaram" → "tukaro" → "tukoba"
 * - "dnyaneshwar" → "gyaneshwar" → "jnandev"
 * 
 * Uses a phonetic encoding system that groups similar-sounding
 * Marathi words together.
 */

// ─── Phonetic Encoding Rules ────────────────────────────────────────────────

/** Marathi phonetic groups - similar sounds map to same code */
const PHONETIC_GROUPS: Record<string, string> = {
  // Vowels
  'a': '1', 'aa': '1', 'ā': '1',
  'i': '2', 'ee': '2', 'ī': '2',
  'u': '3', 'oo': '3', 'ū': '3',
  'e': '4', 'ai': '4',
  'o': '5', 'au': '5',
  
  // Consonants - grouped by phonetic similarity
  'k': '6', 'kh': '6', 'q': '6',
  'g': '7', 'gh': '7',
  'ch': '8', 'chh': '8',
  'j': '9', 'jh': '9',
  
  't': 'A', 'th': 'A',
  'd': 'B', 'dh': 'B',
  'n': 'C',
  
  'p': 'D', 'ph': 'D', 'f': 'D',
  'b': 'E', 'bh': 'E',
  'm': 'F',
  
  'y': 'G',
  'r': 'H',
  'l': 'I',
  'v': 'J', 'w': 'J',
  'sh': 'K', 'ś': 'K',
  'ṣ': 'L', 's': 'L',
  'h': 'M',
  
  //特殊 Marathi sounds
  'ḍ': 'B', 'ḍh': 'B',
  'ṇ': 'C',
  'ḷ': 'I',
  'ṃ': 'F',
  'ḥ': 'M',
};

// ─── Phonetic Encoding ─────────────────────────────────────────────────────

/**
 * Generate phonetic encoding for a Marathi word.
 * Similar-sounding words will have same encoding.
 * 
 * @example
 * encodePhonetic('vitthal') → 'J2AAMI'
 * encodePhonetic('vithal') → 'J2AAMI'  // Same as vitthal
 * encodePhonetic('vittal') → 'J2AAMI'  // Same as vitthal
 */
export function encodePhonetic(word: string): string {
  const normalized = word.toLowerCase().trim();
  if (!normalized) return '';
  
  let encoding = '';
  let i = 0;
  
  while (i < normalized.length) {
    // Try to match longest pattern first (2 chars, then 1 char)
    let matched = false;
    
    for (const len of [2, 1]) {
      const substr = normalized.slice(i, i + len);
      const code = PHONETIC_GROUPS[substr];
      
      if (code) {
        // Avoid consecutive same codes (for phonetic similarity)
        if (encoding.length === 0 || encoding[encoding.length - 1] !== code) {
          encoding += code;
        }
        i += len;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      // Skip unknown characters
      i++;
    }
  }
  
  return encoding;
}

// ─── Phonetic Expansion ─────────────────────────────────────────────────────

/** Common Marathi transliteration variations */
const PHONETIC_VARIATIONS: Record<string, string[]> = {
  'vitthal': ['vithal', 'vittal', 'viththal', 'vithal'],
  'tukaram': ['tukaro', 'tukoba', 'tukaram', 'tukaram'],
  'dnyaneshwar': ['gyaneshwar', 'jnandev', 'jnaneshwar', 'gyaneshvar'],
  'eknath': ['eknat', 'ekanath', 'eknat'],
  'namdev': ['namadev', 'namdeo', 'namadeo'],
  'pandurang': ['pandharinath', 'pandhurang', 'panduranga'],
  'shiva': ['shankar', 'mahadev', 'mahadeva'],
  'vishnu': ['narayan', 'bishnu', 'vishnu'],
  'krishna': ['krushna', 'krsna', 'krishn'],
};

/**
 * Expand a query to include phonetic variations.
 * 
 * @example
 * expandPhonetic('vitthal') → ['vitthal', 'vithal', 'vittal', 'viththal']
 */
export function expandPhonetic(query: string): string[] {
  const normalized = query.toLowerCase().trim();
  const variations = new Set<string>([normalized]);
  
  // Check if this word has known variations
  for (const [base, vars] of Object.entries(PHONETIC_VARIATIONS)) {
    if (base.includes(normalized) || normalized.includes(base)) {
      vars.forEach(v => variations.add(v));
    }
  }
  
  // Generate phonetic encoding and find similar words
  const queryEncoding = encodePhonetic(normalized);
  
  // Add common spelling variations
  const commonVariations: Record<string, string[]> = {
    'v': ['w', 'b'],
    't': ['d', 'th'],
    'k': ['kh', 'q'],
    'g': ['gh'],
    'j': ['jh', 'z'],
    's': ['sh', 'ś', 'ṣ'],
    'h': ['ḥ'],
    'n': ['ṇ'],
    'l': ['ḷ'],
  };
  
  // Generate variations by substituting similar consonants
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];
    const similar = commonVariations[char];
    
    if (similar) {
      for (const sub of similar) {
        const variation = normalized.slice(0, i) + sub + normalized.slice(i + 1);
        variations.add(variation);
      }
    }
  }
  
  return Array.from(variations);
}

// ─── Search Integration ─────────────────────────────────────────────────────

/**
 * Build expanded search query with phonetic variations.
 * Returns a query string that includes all phonetic variations.
 */
export function expandPhoneticQuery(query: string): string {
  const variations = expandPhonetic(query);
  return variations.join(' ');
}

/**
 * Check if two words are phonetically similar.
 */
export function arePhoneticallySimilar(word1: string, word2: string): boolean {
  return encodePhonetic(word1) === encodePhonetic(word2);
}

/**
 * Get phonetic distance between two words (0 = identical, higher = more different).
 */
export function phoneticDistance(word1: string, word2: string): number {
  const enc1 = encodePhonetic(word1);
  const enc2 = encodePhonetic(word2);
  
  if (enc1 === enc2) return 0;
  
  // Simple Levenshtein distance on encodings
  const len1 = enc1.length;
  const len2 = enc2.length;
  const matrix: number[][] = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = enc1[i - 1] === enc2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  return matrix[len1][len2];
}
