/**
 * Digital Pandharpur — Content Classifier
 *
 * Fast, lightweight AI classification of raw extracted text from the upload
 * pipeline. Runs BEFORE moderation, giving editors AI-suggested metadata:
 * saint name, composition type, deity, categories, festivals.
 *
 * This is DIFFERENT from full enrichment (enricher.ts):
 *   - Cheaper: smaller prompt, smaller response (~300 tokens)
 *   - Faster: shorter timeout, no entity resolution
 *   - Pre-composition: runs before a Composition record exists
 *   - Stores in UploadedFile.detectedMetadata
 *
 * Results are later fed into the full enrichment pipeline for refinement.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { resolveFreeConfig } from './free-provider';
import { buildClassifyPrompt } from './classify-prompt';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ClassificationResult {
  saintName: string | null;
  compositionType: string | null;
  deityName: string | null;
  suggestedCategories: string[];
  associatedFestivals: string[];
  language: 'marathi' | 'hindi' | 'mixed' | 'other';

  confidence: {
    saint: 'high' | 'medium' | 'low' | null;
    type: 'high' | 'medium' | 'low' | null;
    deity: 'high' | 'medium' | 'low' | null;
  };

  reasoning: string | null;
}

export interface ClassifierResponse {
  success: boolean;
  result: ClassificationResult | null;
  rawResponse: string;
  error: string | null;
  provider: string;
  model: string;
}

// ─── Default (empty) result ─────────────────────────────────────────────────

const EMPTY_RESULT: ClassificationResult = {
  saintName: null,
  compositionType: null,
  deityName: null,
  suggestedCategories: [],
  associatedFestivals: [],
  language: 'other',
  confidence: { saint: null, type: null, deity: null },
  reasoning: null,
};

// ─── JSON Parser ────────────────────────────────────────────────────────────

function parseClassificationResponse(raw: string): ClassificationResult | null {
  let cleaned = raw.trim();

  // Strip markdown fences
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) cleaned = jsonMatch[1].trim();

  // Isolate JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  cleaned = cleaned.slice(firstBrace, lastBrace + 1);

  try {
    const parsed = JSON.parse(cleaned);

    const conf = parsed.confidence ?? {};
    return {
      saintName: parsed.saintName ?? null,
      compositionType: parsed.compositionType ?? null,
      deityName: parsed.deityName ?? null,
      suggestedCategories: Array.isArray(parsed.suggestedCategories) ? parsed.suggestedCategories : [],
      associatedFestivals: Array.isArray(parsed.associatedFestivals) ? parsed.associatedFestivals : [],
      language: ['marathi', 'hindi', 'mixed', 'other'].includes(parsed.language)
        ? parsed.language
        : 'other',
      confidence: {
        saint: ['high', 'medium', 'low', null].includes(conf.saint) ? conf.saint : null,
        type: ['high', 'medium', 'low', null].includes(conf.type) ? conf.type : null,
        deity: ['high', 'medium', 'low', null].includes(conf.deity) ? conf.deity : null,
      },
      reasoning: parsed.reasoning ?? null,
    };
  } catch {
    // Attempt recovery for malformed JSON
    try {
      const fixed = cleaned.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
      const parsed = JSON.parse(fixed);
      const conf = parsed.confidence ?? {};
      return {
        saintName: parsed.saintName ?? null,
        compositionType: parsed.compositionType ?? null,
        deityName: parsed.deityName ?? null,
        suggestedCategories: Array.isArray(parsed.suggestedCategories) ? parsed.suggestedCategories : [],
        associatedFestivals: Array.isArray(parsed.associatedFestivals) ? parsed.associatedFestivals : [],
        language: ['marathi', 'hindi', 'mixed', 'other'].includes(parsed.language)
          ? parsed.language : 'other',
        confidence: {
          saint: ['high', 'medium', 'low', null].includes(conf.saint) ? conf.saint : null,
          type: ['high', 'medium', 'low', null].includes(conf.type) ? conf.type : null,
          deity: ['high', 'medium', 'low', null].includes(conf.deity) ? conf.deity : null,
        },
        reasoning: parsed.reasoning ?? null,
      };
    } catch {
      return null;
    }
  }
}

// ─── LLM Call (lightweight) ─────────────────────────────────────────────────

async function callClassifierLLM(
  messages: Array<{ role: string; content: string }>,
  config: { baseUrl: string; model: string; apiKey: string; maxTokens: number; temperature: number; timeoutMs: number }
): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: Math.min(config.maxTokens, 512), // Classifier needs fewer tokens
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Classifier API error: ${response.status}. ${errorBody.slice(0, 300)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Classifier returned empty response');
  return content;
}

// ─── Main Classify Function ─────────────────────────────────────────────────

/**
 * Classify a raw text string from the upload pipeline.
 *
 * Returns structured metadata suggestions plus confidence scores.
 * This is a fast, cheap pass — the full enrichment pipeline refines later.
 */
export async function classifyContent(
  text: string,
  title?: string
): Promise<ClassifierResponse> {
  const resolved = resolveFreeConfig();
  const config = resolved.config;

  if (!config.apiKey) {
    return {
      success: false,
      result: null,
      rawResponse: '',
      error: 'No LLM API key configured. Set GROQ_API_KEY, GEMINI_API_KEY, LLM_API_KEY, or run Ollama.',
      provider: resolved.providerName,
      model: config.model,
    };
  }

  try {
    const messages = buildClassifyPrompt(text, title);
    const raw = await callClassifierLLM(messages, config);
    const parsed = parseClassificationResponse(raw);

    if (!parsed) {
      return {
        success: false,
        result: null,
        rawResponse: raw,
        error: 'Failed to parse classifier JSON response',
        provider: resolved.providerName,
        model: config.model,
      };
    }

    return {
      success: true,
      result: parsed,
      rawResponse: raw,
      error: null,
      provider: resolved.providerName,
      model: config.model,
    };
  } catch (err) {
    return {
      success: false,
      result: null,
      rawResponse: '',
      error: err instanceof Error ? err.message : String(err),
      provider: resolved.providerName,
      model: config.model,
    };
  }
}

/**
 * Synchronous fallback that returns an empty (null) result.
 * Use when the LLM is unavailable and you need a non-null ClassificationResult.
 */
export function emptyClassification(): ClassificationResult {
  return { ...EMPTY_RESULT };
}
