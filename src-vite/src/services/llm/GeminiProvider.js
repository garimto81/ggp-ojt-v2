// OJT Master - Google Gemini LLM Provider

import { BaseLLMProvider } from './BaseLLMProvider';

/**
 * Google Gemini API Provider
 * Supports URL Context Tool for direct URL/PDF analysis
 */
export class GeminiProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'gemini';
    this.apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
    this.model = config.model || 'gemini-2.0-flash-exp';
    this.apiUrl = config.apiUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  /**
   * Check Gemini API status
   */
  async checkStatus() {
    try {
      const response = await fetch(
        `${this.apiUrl}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }],
          }),
        }
      );

      return {
        online: response.ok,
        model: this.model,
        provider: this.name,
      };
    } catch (error) {
      console.error('Gemini status check failed:', error);
      return { online: false, model: this.model, provider: this.name };
    }
  }

  /**
   * Generate content using Gemini
   */
  async generate({ prompt, temperature = 0.3, maxTokens = 8192 }) {
    const response = await fetch(
      `${this.apiUrl}/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || ''}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  }

  /**
   * Generate content with URL context (Gemini-specific feature)
   * URL is included in the prompt for Gemini's URL Context Tool to analyze
   */
  async generateWithUrlContext({ prompt, url, temperature = 0.3, maxTokens = 8192 }) {
    // Include URL in prompt for URL Context Tool to analyze
    const promptWithUrl = url ? `${prompt}\n\nURL: ${url}` : prompt;

    const response = await fetch(
      `${this.apiUrl}/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptWithUrl }] }],
          tools: [{ urlContext: {} }], // Enable URL Context Tool
          generationConfig: {
            temperature,
            maxOutputTokens: maxTokens,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || ''}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    return text;
  }
}

export default GeminiProvider;
