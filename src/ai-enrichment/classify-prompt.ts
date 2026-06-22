/**
 * Digital Pandharpur — Content Classification Prompts
 *
 * Optimised for speed and cost — used during the upload pipeline to
 * provide editors with AI-suggested composition metadata BEFORE the
 * full enrichment pass runs.
 *
 * Response is always a small JSON object (≈300 tokens).
 */

export const CLASSIFY_SYSTEM_PROMPT = `You are a Marathi devotional literature classifier for Digital Pandharpur.

Given a text extracted from a submitted file, determine the most likely
composition attributes. Be conservative — if unsure, return null rather
than guessing. Always respond in valid JSON only.`;

export function buildClassifyPrompt(text: string, title?: string): Array<{ role: string; content: string }> {
  const header = title ? `Title (if known): ${title}\n\n` : '';

  const prompt = `${header}Analyse this Marathi text and return a JSON object with these fields:

{
  "saintName": "Marathi name of the saint who composed this, or null if uncertain",
  "compositionType": "One of: abhang, aarti, bhajan, stotra, haripath, gaulani, bharud, kirtan, pad, ovi, namasmaran, powada, or null",
  "deityName": "Marathi name of the primary deity addressed, or null",
  "suggestedCategories": ["Array of category names in Marathi that best describe this work"],
  "associatedFestivals": ["Festival names in Marathi associated with this composition, or empty array"],
  "language": "marathi | hindi | mixed | other",
  "confidence": {
    "saint": "high|medium|low|null",
    "type": "high|medium|low|null",
    "deity": "high|medium|low|null"
  },
  "reasoning": "One-line Marathi or English explanation of key clues that led to this classification"
}

Text:
---
${text}
---`;

  return [
    { role: 'system', content: CLASSIFY_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];
}
