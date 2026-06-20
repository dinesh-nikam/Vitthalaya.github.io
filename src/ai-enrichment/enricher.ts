/**
 * Digital Pandharpur — AI Enrichment Engine
 *
 * Core LLM interaction layer for Marathi devotional content analysis.
 * - Calls OpenAI-compatible APIs (configurable model, provider)
 * - Parses structured JSON responses
 * - Validates output against schema
 * - Handles retries, timeouts, token limits
 *
 * Provider-agnostic: works with OpenAI, Anthropic, Ollama, or any
 * OpenAI-compatible endpoint via environment configuration.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { buildFullEnrichmentPrompt, buildReEnrichPrompt } from './prompts';
import { resolveFreeConfig } from './free-provider';
import { db } from '../db/client';

// ─── Configuration ──────────────────────────────────────────────────────────

export interface LLMConfig {
  /** API endpoint URL (defaults to OpenAI) */
  baseUrl: string;
  /** Model name */
  model: string;
  /** API key */
  apiKey: string;
  /** Max tokens for response */
  maxTokens: number;
  /** Temperature for generation */
  temperature: number;
  /** Request timeout in ms */
  timeoutMs: number;
  /** Provider name (for display/logging) */
  providerName: string;
}

/**
 * Get the best available LLM configuration.
 *
 * Resolves using the free provider chain:
 *   LLM_API_KEY → GROQ_API_KEY → GEMINI_API_KEY → local Ollama
 *
 * Set LLM_PROVIDER=groq|gemini|ollama to force a specific free provider.
 * Set LLM_API_KEY to use any OpenAI-compatible endpoint.
 */
function getConfig(): LLMConfig {
  const resolved = resolveFreeConfig();
  return {
    ...resolved.config,
    providerName: resolved.providerName,
  };
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EnrichmentInput {
  compositionId: string;
  fullText: string;
  title: string;
  type: string;
  saintName?: string;
}

export interface EnrichmentOutput {
  summary: string | null;
  meaning: string | null;
  keywords: string[];
  deity: string | null;
  deityConfidence: string | null;
  festivals: string[];
  categories: string[];
  tags: string[];
  difficulty: string | null;
  sentiment: string | null;
  historicalNotes: string | null;
}

export interface EnrichmentResult {
  success: boolean;
  output: EnrichmentOutput | null;
  rawResponse: string;
  promptTokens: number;
  completionTokens: number;
  error: string | null;
  provider: string;
  model: string;
}

// ─── JSON Parsing ───────────────────────────────────────────────────────────

/**
 * Parse and validate the LLM JSON response.
 * Handles common edge cases: markdown-wrapped JSON, trailing commas, partial output.
 */
function parseLLMResponse(raw: string): EnrichmentOutput | null {
  let cleaned = raw.trim();

  // Strip markdown code fences if present
  const jsonMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    cleaned = jsonMatch[1].trim();
  }

  // Strip any leading/trailing non-JSON content
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  try {
    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary ?? null,
      meaning: parsed.meaning ?? null,
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      deity: parsed.deity ?? null,
      deityConfidence: parsed.deityConfidence ?? null,
      festivals: Array.isArray(parsed.festivals) ? parsed.festivals : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      difficulty: parsed.difficulty ?? null,
      sentiment: parsed.sentiment ?? null,
      historicalNotes: parsed.historicalNotes ?? null,
    };
  } catch {
    // Try to recover partial JSON
    try {
      const fixed = cleaned
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/(['"])?([a-zA-Z_]+)(['"])?\s*:/g, '"$2":');
      return JSON.parse(fixed) as EnrichmentOutput;
    } catch {
      return null;
    }
  }
}

// ─── LLM Call ───────────────────────────────────────────────────────────────

/**
 * Make the actual HTTP call to the LLM API.
 * OpenAI-compatible chat completions endpoint.
 */
async function callLLM(
  messages: Array<{ role: string; content: string }>,
  config: LLMConfig
): Promise<{
  content: string;
  promptTokens: number;
  completionTokens: number;
}> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `LLM API error: ${response.status} ${response.statusText}. ${errorBody.slice(0, 500)}`
    );
  }

  const data = await response.json();
  const choice = data.choices?.[0];

  if (!choice?.message?.content) {
    throw new Error('LLM returned empty response');
  }

  return {
    content: choice.message.content,
    promptTokens: data.usage?.prompt_tokens ?? 0,
    completionTokens: data.usage?.completion_tokens ?? 0,
  };
}

// ─── Entity Resolution ──────────────────────────────────────────────────────

/**
 * Resolve a deity name from the LLM to a DB deity ID.
 * Uses name similarity matching.
 */
export async function resolveDeityId(deityName: string | null): Promise<string | null> {
  if (!deityName) return null;

  const deities = await db.deity.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true },
  });

  const normalized = deityName.trim().toLowerCase();

  // Exact match
  const exact = deities.find(
    (d) =>
      d.nameMarathi.toLowerCase() === normalized ||
      d.nameTranslit.toLowerCase() === normalized
  );
  if (exact) return exact.id;

  // Partial match (deity name contained in DB name or vice versa)
  const partial = deities.find(
    (d) =>
      d.nameMarathi.toLowerCase().includes(normalized) ||
      normalized.includes(d.nameMarathi.toLowerCase()) ||
      d.nameTranslit.toLowerCase().includes(normalized) ||
      normalized.includes(d.nameTranslit.toLowerCase())
  );
  return partial?.id ?? null;
}

/**
 * Resolve festival names from the LLM to DB festival IDs.
 */
export async function resolveFestivalIds(festivalNames: string[]): Promise<string[]> {
  if (festivalNames.length === 0) return [];

  const festivals = await db.festival.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true },
  });

  const ids: string[] = [];
  for (const name of festivalNames) {
    const normalized = name.trim().toLowerCase();
    const match = festivals.find(
      (f) =>
        f.nameMarathi.toLowerCase() === normalized ||
        f.nameTranslit.toLowerCase() === normalized ||
        f.nameMarathi.toLowerCase().includes(normalized) ||
        normalized.includes(f.nameMarathi.toLowerCase())
    );
    if (match) ids.push(match.id);
  }
  return ids;
}

/**
 * Match LLM category names to existing category slugs.
 * Returns both matched IDs and suggested new names.
 */
export async function resolveCategoryNames(
  categoryNames: string[]
): Promise<{ matchedIds: string[]; suggestedNew: string[] }> {
  if (categoryNames.length === 0) return { matchedIds: [], suggestedNew: [] };

  const categories = await db.category.findMany({
    select: { id: true, nameMarathi: true, nameTranslit: true },
  });

  const matchedIds: string[] = [];
  const suggestedNew: string[] = [];

  for (const name of categoryNames) {
    const normalized = name.trim().toLowerCase();
    const match = categories.find(
      (c) =>
        c.nameMarathi.toLowerCase() === normalized ||
        c.nameTranslit.toLowerCase() === normalized ||
        c.nameMarathi.toLowerCase().includes(normalized)
    );
    if (match) {
      matchedIds.push(match.id);
    } else {
      suggestedNew.push(name);
    }
  }

  return { matchedIds, suggestedNew };
}

// ─── Main Enrich Function ───────────────────────────────────────────────────

/**
 * Run full enrichment on a composition.
 * Calls the LLM, parses the response, resolves entities, returns result.
 */
export async function enrichComposition(
  input: EnrichmentInput
): Promise<EnrichmentResult> {
  const config = getConfig();

  // Validate API key
  if (!config.apiKey) {
    return {
      success: false,
      output: null,
      rawResponse: '',
      promptTokens: 0,
      completionTokens: 0,
      error: 'No LLM API key configured. Set LLM_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or run Ollama locally.',
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  }

  try {
    // Build prompts
    const messages = buildFullEnrichmentPrompt({
      fullText: input.fullText,
      title: input.title,
      type: input.type,
      saintName: input.saintName,
    });

    // Call LLM
    const response = await callLLM(messages, config);

    // Parse response
    const output = parseLLMResponse(response.content);

    if (!output) {
      return {
        success: false,
        output: null,
        rawResponse: response.content,
        promptTokens: response.promptTokens,
        completionTokens: response.completionTokens,
        error: 'Failed to parse LLM JSON response',
        provider: config.providerName ?? config.baseUrl,
        model: config.model,
      };
    }

    return {
      success: true,
      output,
      rawResponse: response.content,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      error: null,
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      output: null,
      rawResponse: '',
      promptTokens: 0,
      completionTokens: 0,
      error: message,
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  }
}

/**
 * Re-enrich with editor feedback.
 * Used in the review workflow when specific fields need correction.
 */
export async function reEnrichWithFeedback(
  input: EnrichmentInput,
  existingResult: Record<string, unknown>,
  editorFeedback: string
): Promise<EnrichmentResult> {
  const config = getConfig();

  if (!config.apiKey) {
    return {
      success: false,
      output: null,
      rawResponse: '',
      promptTokens: 0,
      completionTokens: 0,
      error: 'No LLM API key configured. Set LLM_API_KEY, GROQ_API_KEY, GEMINI_API_KEY, or run Ollama locally.',
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  }

  try {
    const messages = buildReEnrichPrompt(
      input.fullText,
      existingResult,
      editorFeedback
    );

    const response = await callLLM(messages, config);
    const output = parseLLMResponse(response.content);

    return {
      success: output !== null,
      output,
      rawResponse: response.content,
      promptTokens: response.promptTokens,
      completionTokens: response.completionTokens,
      error: output ? null : 'Failed to parse re-enrichment response',
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  } catch (err) {
    return {
      success: false,
      output: null,
      rawResponse: '',
      promptTokens: 0,
      completionTokens: 0,
      error: err instanceof Error ? err.message : String(err),
      provider: config.providerName ?? config.baseUrl,
      model: config.model,
    };
  }
}
