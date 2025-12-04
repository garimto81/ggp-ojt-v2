// OJT Master - LLM Service (Provider Manager with Fallback Chain)

import { GeminiProvider } from './GeminiProvider';
import { GroqProvider } from './GroqProvider';
import { OllamaProvider } from './OllamaProvider';

/**
 * LLM Provider Types
 */
export const LLM_PROVIDERS = {
  GEMINI: 'gemini',
  GROQ: 'groq',
  OLLAMA: 'ollama',
};

/**
 * LLM Service - Manages providers and fallback chain
 */
class LLMService {
  constructor() {
    this.providers = new Map();
    this.activeProvider = null;
    this.fallbackChain = [];

    // Initialize available providers
    this._initProviders();
  }

  /**
   * Initialize all available providers
   */
  _initProviders() {
    // Gemini Provider
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (geminiKey) {
      this.providers.set(LLM_PROVIDERS.GEMINI, new GeminiProvider({ apiKey: geminiKey }));
    }

    // Groq Provider
    const groqKey = import.meta.env.VITE_GROQ_API_KEY;
    if (groqKey) {
      this.providers.set(LLM_PROVIDERS.GROQ, new GroqProvider({ apiKey: groqKey }));
    }

    // Ollama Provider (always available, but may not be running)
    const ollamaUrl = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    this.providers.set(LLM_PROVIDERS.OLLAMA, new OllamaProvider({ baseUrl: ollamaUrl }));

    // Set default active provider based on configuration
    const configuredProvider = import.meta.env.VITE_LLM_PROVIDER || LLM_PROVIDERS.GEMINI;
    this.activeProvider =
      this.providers.get(configuredProvider) || this.providers.get(LLM_PROVIDERS.GEMINI);

    // Set fallback chain: Groq -> Gemini -> Ollama
    this.fallbackChain = [
      this.providers.get(LLM_PROVIDERS.GROQ),
      this.providers.get(LLM_PROVIDERS.GEMINI),
      this.providers.get(LLM_PROVIDERS.OLLAMA),
    ].filter(Boolean);
  }

  /**
   * Get the active provider
   */
  getActiveProvider() {
    return this.activeProvider;
  }

  /**
   * Set active provider by name
   */
  setActiveProvider(providerName) {
    const provider = this.providers.get(providerName);
    if (provider) {
      this.activeProvider = provider;
      return true;
    }
    return false;
  }

  /**
   * Get all available provider names
   */
  getAvailableProviders() {
    return Array.from(this.providers.keys());
  }

  /**
   * Check status of all providers
   */
  async checkAllStatus() {
    const results = {};
    for (const [name, provider] of this.providers) {
      try {
        results[name] = await provider.checkStatus();
      } catch (error) {
        results[name] = { online: false, error: error.message };
      }
    }
    return results;
  }

  /**
   * Check active provider status
   */
  async checkStatus() {
    if (!this.activeProvider) {
      return { online: false, error: 'No active provider' };
    }
    return this.activeProvider.checkStatus();
  }

  /**
   * Generate content with automatic fallback
   */
  async generate(params) {
    const { useFallback = true, ...generateParams } = params;

    // Try active provider first
    if (this.activeProvider) {
      try {
        return {
          text: await this.activeProvider.generate(generateParams),
          provider: this.activeProvider.getName(),
          fallbackUsed: false,
        };
      } catch (error) {
        console.warn(`${this.activeProvider.getName()} failed:`, error.message);
        if (!useFallback) throw error;
      }
    }

    // Try fallback chain
    for (const provider of this.fallbackChain) {
      if (provider === this.activeProvider) continue; // Skip already tried

      try {
        const status = await provider.checkStatus();
        if (!status.online) continue;

        return {
          text: await provider.generate(generateParams),
          provider: provider.getName(),
          fallbackUsed: true,
        };
      } catch (error) {
        console.warn(`Fallback ${provider.getName()} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All LLM providers failed');
  }

  /**
   * Generate with URL context (Gemini-specific, falls back to regular generation)
   */
  async generateWithUrlContext(params) {
    const { useFallback = true, ...generateParams } = params;

    // Try active provider first (if it supports URL context)
    if (this.activeProvider) {
      try {
        return {
          text: await this.activeProvider.generateWithUrlContext(generateParams),
          provider: this.activeProvider.getName(),
          fallbackUsed: false,
        };
      } catch (error) {
        console.warn(`${this.activeProvider.getName()} URL context failed:`, error.message);
        if (!useFallback) throw error;
      }
    }

    // Fallback: Only Gemini supports URL context natively
    const gemini = this.providers.get(LLM_PROVIDERS.GEMINI);
    if (gemini && gemini !== this.activeProvider) {
      try {
        const status = await gemini.checkStatus();
        if (status.online) {
          return {
            text: await gemini.generateWithUrlContext(generateParams),
            provider: gemini.getName(),
            fallbackUsed: true,
          };
        }
      } catch (error) {
        console.warn('Gemini URL context fallback failed:', error.message);
      }
    }

    // Final fallback: Regular generation without URL context
    return this.generate({ ...generateParams, useFallback });
  }
}

// Singleton instance
export const llmService = new LLMService();

export default llmService;
