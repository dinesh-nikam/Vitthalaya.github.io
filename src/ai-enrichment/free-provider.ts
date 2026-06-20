/**
 * Digital Pandharpur — Free LLM Provider Integration
 *
 * Provider-agnostic free tier configurations for AI enrichment.
 * Supports Groq (primary, OpenAI-compatible), Google Gemini (backup),
 * and Ollama (local, zero config).
 *
 * Usage:
 *   # Groq (recommended — fast, free, OpenAI-compatible)
 *   LLM_PROVIDER=groq
 *   GROQ_API_KEY=gsk_...
 *
 *   # Google Gemini (free tier, 60 req/min)
 *   LLM_PROVIDER=gemini
 *   GEMINI_API_KEY=AIza...
 *
 *   # Ollama (local, completely free, no API key)
 *   LLM_PROVIDER=ollama
 *
 *   # Auto-detect (default): tries LLM_API_KEY → GROQ_API_KEY → GEMINI_API_KEY → ollama
 *   LLM_PROVIDER=auto
 */

// ─── Provider Types ──────────────────────────────────────────────────────────

export type FreeProvider = 'groq' | 'gemini' | 'ollama' | 'auto';

interface ProviderConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}

interface ProviderInfo {
  name: string;
  description: string;
  setup: string;
  models: string[];
}

// ─── Provider Definitions ────────────────────────────────────────────────────

export const PROVIDER_REGISTRY: Record<FreeProvider, ProviderInfo> = {
  groq: {
    name: 'Groq',
    description: 'Fast LPU-powered inference. Free tier: 6000 req/min for Llama models, 30 req/min for Mixtral. No credit card needed.',
    setup: 'Get a free API key at https://console.groq.com/keys',
    models: ['mixtral-8x7b-32768', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Google AI Studio free tier: 60 requests/minute, 1500 requests/day. Requires a Google account.',
    setup: 'Get a free API key at https://aistudio.google.com/apikey',
    models: ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'],
  },
  ollama: {
    name: 'Ollama (Local)',
    description: 'Run LLMs locally. Completely free, no API key needed. Must have Ollama installed and running.',
    setup: 'Install from https://ollama.ai, then: ollama pull gemma2:9b && ollama serve',
    models: ['gemma2:9b', 'llama3.1:8b', 'mistral:7b', 'qwen2.5:7b'],
  },
  auto: {
    name: 'Auto-detect',
    description: 'Tries providers in order: LLM_API_KEY → GROQ_API_KEY → GEMINI_API_KEY → local Ollama',
    setup: 'Set any of the above API keys or run Ollama locally',
    models: [],
  },
};

// ─── Provider Configuration Builders ─────────────────────────────────────────

/**
 * Build config for Groq (OpenAI-compatible, free tier).
 * Models: mixtral-8x7b-32768 (best quality), llama-3.3-70b-versatile (fastest)
 */
function groqConfig(apiKey?: string): ProviderConfig | null {
  const key = apiKey || process.env.GROQ_API_KEY || '';
  if (!key) return null;

  return {
    baseUrl: 'https://api.groq.com/openai/v1',
    model: process.env.GROQ_MODEL ?? 'mixtral-8x7b-32768',
    apiKey: key,
    maxTokens: parseInt(process.env.GROQ_MAX_TOKENS ?? '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.1'),
    timeoutMs: parseInt(process.env.GROQ_TIMEOUT_MS ?? '120000', 10),
  };
}

/**
 * Build config for Google Gemini (free tier via Google AI Studio).
 * Uses the Google Generative AI SDK for OpenAI-compatible endpoint.
 */
function geminiConfig(apiKey?: string): ProviderConfig | null {
  const key = apiKey || process.env.GEMINI_API_KEY || '';
  if (!key) return null;

  return {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    model: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    apiKey: key,
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS ?? '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.1'),
    timeoutMs: parseInt(process.env.GEMINI_TIMEOUT_MS ?? '120000', 10),
  };
}

/**
 * Build config for local Ollama instance.
 * No API key needed. Uses Ollama's OpenAI-compatible endpoint.
 */
function ollamaConfig(): ProviderConfig | null {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434/v1',
    model: process.env.OLLAMA_MODEL ?? 'gemma2:9b',
    apiKey: 'ollama', // Ollama ignores the key but some clients require a value
    maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS ?? '4096', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.1'),
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS ?? '300000', 10),
  };
}

/**
 * Build config for the configured OpenAI-compatible endpoint (existing behavior).
 * This is the default/fallback for traditional API keys.
 */
function openaiConfig(): ProviderConfig {
  return {
    baseUrl: process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1',
    model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
    apiKey: process.env.LLM_API_KEY ?? '',
    maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? '2048', 10),
    temperature: parseFloat(process.env.LLM_TEMPERATURE ?? '0.1'),
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '60000', 10),
  };
}

// ─── Main Config Resolver ────────────────────────────────────────────────────

export interface ResolvedConfig {
  config: ProviderConfig;
  provider: FreeProvider;
  providerName: string;
}

/**
 * Get the best available LLM configuration based on environment variables.
 *
 * Priority:
 *   LLM_PROVIDER=groq   → Groq (needs GROQ_API_KEY)
 *   LLM_PROVIDER=gemini  → Gemini (needs GEMINI_API_KEY)
 *   LLM_PROVIDER=ollama  → Ollama (local)
 *   LLM_PROVIDER=auto    → Try each in order until one has a key
 *   (none set)           → Try OpenAI key first, then auto-detect free providers
 */
export function resolveFreeConfig(): ResolvedConfig {
  const provider = (process.env.LLM_PROVIDER ?? 'auto') as FreeProvider;

  // Explicit provider selection
  if (provider === 'groq') {
    const cfg = groqConfig();
    if (cfg) return { config: cfg, provider: 'groq', providerName: 'Groq' };
    console.warn('⚠  LLM_PROVIDER=groq but GROQ_API_KEY not set. Falling back.');
  }

  if (provider === 'gemini') {
    const cfg = geminiConfig();
    if (cfg) return { config: cfg, provider: 'gemini', providerName: 'Google Gemini' };
    console.warn('⚠  LLM_PROVIDER=gemini but GEMINI_API_KEY not set. Falling back.');
  }

  if (provider === 'ollama') {
    const cfg = ollamaConfig();
    if (cfg) return { config: cfg, provider: 'ollama', providerName: `Ollama (${cfg.model})` };
  }

  // Auto-detect or fallback: try providers in order
  // 1. Traditional LLM_API_KEY (OpenAI-compatible)
  if (process.env.LLM_API_KEY) {
    const cfg = openaiConfig();
    return { config: cfg, provider: 'auto', providerName: `OpenAI-compatible (${cfg.model})` };
  }

  // 2. Groq free tier
  const grokCfg = groqConfig();
  if (grokCfg) {
    return { config: grokCfg, provider: 'groq', providerName: `Groq (${grokCfg.model})` };
  }

  // 3. Google Gemini free tier
  const gemCfg = geminiConfig();
  if (gemCfg) {
    return { config: gemCfg, provider: 'gemini', providerName: `Gemini (${gemCfg.model})` };
  }

  // 4. Local Ollama (no key needed)
  const ollCfg = ollamaConfig();
  if (ollCfg) {
    return { config: ollCfg, provider: 'ollama', providerName: `Ollama (${ollCfg.model})` };
  }

  // 5. Last resort: try Ollama default (stub for demo - would need proper ollama config)
  const ollamaDefault = ollamaConfig();
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  return {
    config: ollamaDefault!,
    provider: 'ollama',
    providerName: 'Ollama (gemma2:9b)',
  };
}

// ─── Health Check ────────────────────────────────────────────────────────────

/**
 * Check if any free provider is available (has API key or local server).
 * Returns a list of available providers with their status.
 */
export function checkFreeProviders(): Array<{ name: string; available: boolean; config: ProviderConfig | null }> {
  return [
    {
      name: 'Groq',
      available: !!(process.env.GROQ_API_KEY || process.env.LLM_API_KEY),
      config: groqConfig(),
    },
    {
      name: 'Google Gemini',
      available: !!(process.env.GEMINI_API_KEY),
      config: geminiConfig(),
    },
    {
      name: 'Ollama (Local)',
      available: true, // Always available — fails gracefully if server not running
      config: ollamaConfig(),
    },
    {
      name: 'OpenAI-compatible',
      available: !!process.env.LLM_API_KEY,
      config: openaiConfig(),
    },
  ];
}

/**
 * Print provider status to console (used by CLI).
 */
export function printProviderStatus(): void {
  const resolved = resolveFreeConfig();
  const providers = checkFreeProviders();
  const hasKey = providers.some((p) => p.available);

  console.log('\n🔌 Free LLM Provider Status');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  Active:    ${resolved.providerName}`);
  console.log(`  Endpoint:  ${resolved.config.baseUrl}`);
  console.log(`  Model:     ${resolved.config.model}`);
  console.log(`  Max Tokens: ${resolved.config.maxTokens}`);
  console.log('');

  if (!hasKey && resolved.provider !== 'ollama') {
    console.log('  ⚠  No API keys found! Enrichment will fail without a key or Ollama.');
    console.log('');
    console.log('  Quick setup (pick one):');
    console.log('  1. Groq (fastest): Get free key at https://console.groq.com/keys');
    console.log('     → export GROQ_API_KEY=gsk_your_key_here');
    console.log('');
    console.log('  2. Google Gemini: Get free key at https://aistudio.google.com/apikey');
    console.log('     → export GEMINI_API_KEY=AIza_your_key_here');
    console.log('');
    console.log('  3. Ollama (local, no key):');
    console.log('     → ollama pull gemma2:9b && ollama serve');
    console.log('');
  }

  console.log('  Available:');
  for (const p of providers) {
    const icon = p.available ? '✅' : '  ';
    console.log(`  ${icon} ${p.name}: ${p.available ? p.config?.model ?? 'ready' : 'not configured'}`);
  }
  console.log('');
}
