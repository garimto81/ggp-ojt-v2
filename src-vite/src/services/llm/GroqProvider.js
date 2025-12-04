// OJT Master - Groq Cloud LLM Provider

import { BaseLLMProvider } from './BaseLLMProvider';

/**
 * Groq Cloud API Provider
 * Ultra-fast inference with free tier available
 * Supports Llama 3.3 70B for excellent Korean language support
 */
export class GroqProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'groq';
    this.apiKey = config.apiKey || import.meta.env.VITE_GROQ_API_KEY || '';
    this.model = config.model || 'llama-3.3-70b-versatile';
    this.apiUrl = config.apiUrl || 'https://api.groq.com/openai/v1';
  }

  /**
   * Check Groq API status
   */
  async checkStatus() {
    if (!this.apiKey) {
      return {
        online: false,
        model: this.model,
        provider: this.name,
        error: 'API key not configured',
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/models`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      return {
        online: response.ok,
        model: this.model,
        provider: this.name,
      };
    } catch (error) {
      console.error('Groq status check failed:', error);
      return { online: false, model: this.model, provider: this.name };
    }
  }

  /**
   * Generate content using Groq (OpenAI-compatible API)
   */
  async generate({ prompt, temperature = 0.3, maxTokens = 8192 }) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }, // Force JSON output
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${error.error?.message || ''}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!text) {
      throw new Error('Groq returned empty response');
    }

    return text;
  }

  /**
   * Generate without JSON format (for status checks or simple queries)
   */
  async generateText({ prompt, temperature = 0.3, maxTokens = 1024 }) {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const response = await fetch(`${this.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Groq API error: ${response.status} - ${error.error?.message || ''}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }
}

export default GroqProvider;
