/**
 * Typesense Search Client for Digital Pandharpur
 * Provides instant, typo-tolerant, transliteration-aware search
 */

interface CompositionDocument {
  id: string;
  title_marathi: string;
  title_transliteration: string;
  slug: string;
  type: string;
  full_text: string;
  meaning: string;
  saint_id: string;
  saint_name: string;
  saint_transliteration: string;
  deity_name: string;
  festival_names: string[];
  has_audio: boolean;
  popularity_score: number;
}

class SearchClient {
  private client: unknown; // Typesense.Client

  constructor() {
    // Initialize Typesense client
    // In production: use env vars for configuration
    // this.client = new Typesense.Client({...})
  }

  async search(query: string): Promise<CompositionDocument[]> {
    // Multi-field search supporting Devanagari + Latin transliteration
    const searchParams = {
      q: query,
      queryBy: 'title_marathi,title_transliteration,full_text,saint_name,saint_transliteration',
      sortBy: '_text_match:desc,popularity_score:desc',
      numTypos: 2,
      prefix: true,
      // Enable transliteration matching
      // "vitthal" -> "विठ्ठल", "tukaram" -> "तुकाराम"
    };

    // Mock results for now
    return this.mockResults(query);
  }

  async searchWithFilters(
    query: string,
    filters: {
      type?: string;
      saint?: string;
      deity?: string;
      festival?: string;
      has_audio?: boolean;
    }
  ): Promise<CompositionDocument[]> {
    // Apply filters in addition to search
    // Implementation with Typesense filter_by
    return this.search(query);
  }

  async getSuggestions(partial: string): Promise<string[]> {
    // Get search suggestions for autocomplete
    // Could use Typesense's typo-tolerant prefix search
    if (!partial) return [];

    const commonSuggestions = [
      'तुकाराम महाराज',
      'विठ्ठल',
      'हरिपाठ',
      'आरती',
      'देवी',
      'शिव',
      'गणपती',
    ];

    return commonSuggestions.filter((s) =>
      s.toLowerCase().includes(partial.toLowerCase())
    );
  }

  private mockResults(query: string): CompositionDocument[] {
    // Mock data - replace with actual Typesense query
    if (!query) return [];

    return [
      {
        id: '1',
        title_marathi: 'तुज रूप चिती राहो',
        title_transliteration: 'Tuze Rup Chitti Rahō',
        slug: 'tuze-rup-chitti-raho',
        type: 'अभंग',
        full_text: 'तुज रूप चिती राहो...',
        meaning: 'विठ्ठलाच्या रूपाच्या विचारात राहणे...',
        saint_id: '1',
        saint_name: 'तुकाराम महाराज',
        saint_transliteration: 'Tukaram Maharaj',
        deity_name: 'विठ्ठल',
        festival_names: ['आषाढी एकादशी'],
        has_audio: true,
        popularity_score: 95,
      },
    ];
  }
}

export const searchClient = new SearchClient();

// Server-side search function for SSR
export async function searchServer(query: string) {
  return searchClient.search(query);
}

// Client-side search for instant results
export function searchClientSide(query: string, callback: (results: CompositionDocument[]) => void) {
  searchClient.search(query).then(callback);
}