/**
 * Digital Pandharpur — AI Enrichment LLM Prompts
 *
 * Marathi-optimized prompts for analyzing devotional compositions.
 * Designed to produce structured JSON output for downstream DB storage.
 *
 * Prompt design principles:
 *  - Always instruct in Marathi + English (bilingual for LLM stability)
 *  - Request JSON output with explicit field schemas
 *  - Provide few-shot examples for difficult fields (sentiment, difficulty)
 *  - Chain complex analyses: first pass = basic, second pass = deep
 */

// ─── System Prompts ─────────────────────────────────────────────────────────

export const SYSTEM_PROMPT_MARATHI = `तुम्ही डिजिटल पंढरपूर या मराठी भक्ति साहित्य मंचासाठी एक AI सहाय्यक आहात.
तुमचे कार्य: मराठी भक्ति रचनांचे विश्लेषण करून त्यांची मेटाडेटा माहिती काढणे.

आउटपुट नेहमी JSON स्वरूपात द्या. कोणतेही अतिरिक्त स्पष्टीकरण देऊ नका.
मैदाने English मध्ये भरा. मराठी मजकूर मराठीतच ठेवा.`;

export const SYSTEM_PROMPT_ENGLISH = `You are an AI assistant for Digital Pandharpur, a Marathi devotional literature platform.
Your task: analyze Marathi devotional compositions and extract structured metadata.

Always respond with JSON only. No additional explanation.
Field names in English. Marathi text preserved as-is.`;

// ─── Full Enrichment Prompt ─────────────────────────────────────────────────

/**
 * Primary prompt: extract all enrichment fields from a Marathi composition.
 * This is the "deep analysis" that covers all 10 requested fields.
 *
 * The prompt is bilingual (Marathi + English) because:
 *  - The content IS Marathi, so the LLM needs Marathi context
 *  - The structured output schema is in English for DB compatibility
 */
export function buildFullEnrichmentPrompt(params: {
  fullText: string;
  title: string;
  type: string;
  saintName?: string;
}): Array<{ role: 'system' | 'user'; content: string }> {
  const { fullText, title, type, saintName } = params;

  const userMessage = `मराठी भक्ति रचनेचे विश्लेषण करा.

Title: ${title}
Type: ${type}
Saint: ${saintName ?? 'Unknown/not attributed'}

Full text:
---
${fullText}
---
---

Analyze this composition and provide the following fields in JSON:

{
  "summary": "2-4 sentence Marathi summary of what this composition is about. Explain its context and main message.",

  "meaning": "Deeper spiritual/philosophical meaning in Marathi (2-3 sentences). What lesson or devotional concept does it convey?",

  "keywords": ["keyword1", "keyword2", ...],
  // 5-10 keywords in Marathi and English covering main themes, names, places.

  "deity": "Primary deity referenced (or null if none). Use the Marathi name (e.g. विठ्ठल, रुक्मिणी, शिव, दत्तात्रेय).",
  "deityConfidence": "high|medium|low",

  "festivals": ["Festival 1", "Festival 2", ...],
  // Festivals associated with this composition (e.g. आषाढी एकादशी, कार्तिकी एकादशी). Empty array if none.

  "categories": ["Category 1", "Category 2", ...],
  // Genre/type markers from: abhang, aarti, bhajan, stotra, haripath, gaulani, bharud, kirtan, namasmaran, powada, pad, ovi

  "tags": ["tag1", "tag2", ...],
  // Free-form descriptive tags in Marathi covering: mood, theme, occasion, imagery (e.g. विठ्ठलभक्ती, गुरुभक्ती, पंढरपूर, वारी, नामस्मरण, प्रार्थना)

  "difficulty": "beginner|intermediate|advanced|scholarly",
  // Reading difficulty based on language complexity and vocabulary:
  // - beginner: simple, repetitive, common words
  // - intermediate: some complex sentences, moderate vocabulary
  // - advanced: rich vocabulary, complex metaphors, regional dialect
  // - scholarly: archaic Marathi, dense philosophical concepts

  "sentiment": "devotional|philosophical|narrative|praisal|supplication|didactic|ecstatic",
  // Primary emotional/spiritual register:
  // - devotional: भक्तिभाव, प्रेम, श्रद्धा
  // - philosophical: तत्त्वज्ञान, आध्यात्मिक विचार
  // - narrative: कथा, वर्णन
  // - praisal: स्तुती, गुणगान
  // - supplication: प्रार्थना, विनंती
  // - didactic: उपदेश, शिकवण
  // - ecstatic: आनंद, उत्साह, भावविभोर

  "historicalNotes": "Historical context in Marathi (1-3 sentences about the period, saint, or circumstances if known. Leave empty if uncertain)."
}

Respond ONLY with the JSON. No other text.`;

  return [
    { role: 'system', content: SYSTEM_PROMPT_MARATHI + '\n' + SYSTEM_PROMPT_ENGLISH },
    { role: 'user', content: userMessage },
  ];
}

// ─── Lightweight Prompts (for re-enrichment of single fields) ───────────────

/**
 * Minimal prompt for re-enriching just the summary and meaning.
 * Use when only those fields need updating.
 */
export function buildSummaryPrompt(
  fullText: string,
  title: string
): Array<{ role: 'system'; content: string }> {
  return [
    {
      role: 'system',
      content: `You are a Marathi devotional literature expert.
Given a composition's full text, provide:
1. A 2-3 sentence Marathi summary
2. A 2-3 sentence deeper meaning

Respond ONLY with JSON:
{"summary": "...", "meaning": "..."}

Composition: ${title}
---
${fullText}
---`,
    },
  ];
}

/**
 * Minimal prompt for extracting just keywords and tags.
 */
export function buildKeywordsPrompt(
  fullText: string,
  title: string
): Array<{ role: 'system'; content: string }> {
  return [
    {
      role: 'system',
      content: `Extract keywords and tags from this Marathi devotional composition.

Keywords: 5-10 important thematic words (Marathi + English mix)
Tags: Free-form descriptive tags in Marathi

Respond ONLY with JSON:
{"keywords": ["keyword1", ...], "tags": ["tag1", ...]}

Title: ${title}
---
${fullText}
---`,
    },
  ];
}

// ─── Validation Prompt ──────────────────────────────────────────────────────

/**
 * Prompt for validating/augmenting already-generated enrichment data.
 * Used in the review workflow when an editor rejects fields.
 */
export function buildReEnrichPrompt(
  fullText: string,
  existingResult: Record<string, unknown>,
  editorFeedback: string
): Array<{ role: 'system'; content: string }> {
  return [
    {
      role: 'system',
      content: `You are improving existing enrichment data for a Marathi devotional composition.
Below is the current enrichment and editor feedback. Fix the issues.

Current data:
${JSON.stringify(existingResult, null, 2)}

Editor feedback:
${editorFeedback}

Full text:
---
${fullText}
---

Provide corrected enrichment in the same JSON schema. Maintain fields that were correct.`,
    },
  ];
}

// ─── Batch Context Builder ──────────────────────────────────────────────────

/**
 * Build a condensed context for batch processing.
 * Includes saint and deity hints from the database to improve accuracy.
 */
export function buildBatchContext(hints?: {
  knownSaints?: string[];
  knownDeities?: string[];
  knownFestivals?: string[];
  knownCategories?: string[];
}): string {
  if (!hints) return '';
  const parts: string[] = [];
  if (hints.knownSaints?.length) {
    parts.push(`Known saints: ${hints.knownSaints.join(', ')}`);
  }
  if (hints.knownDeities?.length) {
    parts.push(`Known deities: ${hints.knownDeities.join(', ')}`);
  }
  if (hints.knownFestivals?.length) {
    parts.push(`Known festivals: ${hints.knownFestivals.join(', ')}`);
  }
  if (hints.knownCategories?.length) {
    parts.push(`Known categories: ${hints.knownCategories.join(', ')}`);
  }
  return parts.join('\n');
}
