/**
 * Embeddings helper for Digital Pandharpur
 * Generates 768-dimensional dense vectors for semantic search.
 * Connects to Google Gemini text-embedding-004 API when GEMINI_API_KEY is present,
 * and falls back to a deterministic, normalized hash-based embedding in local environments.
 */

const DIMENSIONS = 768;

/**
 * Generate a 768-dimensional vector embedding for the input text
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.LLM_API_KEY;

  if (!apiKey) {
    return generateFallbackEmbedding(text);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }],
        },
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.warn(`Gemini Embeddings API returned status ${response.status}. Falling back.`);
      return generateFallbackEmbedding(text);
    }

    const data = (await response.json()) as any;
    const values = data.embedding?.values;

    if (Array.isArray(values) && values.length === DIMENSIONS) {
      return values;
    }

    console.warn(`Gemini Embeddings dimensions mismatch or missing values. Expected ${DIMENSIONS}, got ${values?.length}. Falling back.`);
    return generateFallbackEmbedding(text);
  } catch (err) {
    console.warn('Error fetching embedding from Gemini API. Falling back:', err);
    return generateFallbackEmbedding(text);
  }
}

/**
 * Generates a deterministic unit-vector embedding based on the string hash.
 * This guarantees consistent cosine similarity for local testing and offline execution.
 */
export function generateFallbackEmbedding(text: string): number[] {
  const embedding = new Array(DIMENSIONS).fill(0);
  
  if (!text) {
    embedding[0] = 1.0;
    return embedding;
  }

  // Seed values based on text content
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    // Distribute weights deterministically across dimensions
    const idx1 = (i * 7 + charCode) % DIMENSIONS;
    const idx2 = (i * 13 + charCode * 3) % DIMENSIONS;
    const idx3 = (i * 31 + charCode * 7) % DIMENSIONS;

    embedding[idx1] = (embedding[idx1] + Math.sin(charCode + i)) / 2;
    embedding[idx2] = (embedding[idx2] + Math.cos(charCode * 2 + i)) / 2;
    embedding[idx3] = (embedding[idx3] + Math.sin(charCode * 3 + i * 2)) / 2;
  }

  // Normalize the vector for cosine similarity (magnitude = 1.0)
  let sumSq = 0;
  for (let i = 0; i < DIMENSIONS; i++) {
    sumSq += embedding[i] * embedding[i];
  }
  
  const magnitude = Math.sqrt(sumSq);
  if (magnitude > 0) {
    for (let i = 0; i < DIMENSIONS; i++) {
      embedding[i] = embedding[i] / magnitude;
    }
  } else {
    embedding[0] = 1.0;
  }

  return embedding;
}
