// OJT Master - Ollama Local LLM Provider

import { BaseLLMProvider } from './BaseLLMProvider';

/**
 * Ollama Self-Hosted Provider
 * Zero API cost, complete data privacy
 * Recommended models: Qwen3 8B/14B, Motif 102B (Korean)
 */
export class OllamaProvider extends BaseLLMProvider {
  constructor(config = {}) {
    super(config);
    this.name = 'ollama';
    this.baseUrl = config.baseUrl || import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434';
    this.model = config.model || import.meta.env.VITE_OLLAMA_MODEL || 'qwen3:8b';
  }

  /**
   * Check Ollama server status
   */
  async checkStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);

      if (!response.ok) {
        return { online: false, model: this.model, provider: this.name };
      }

      const data = await response.json();
      const models = data.models || [];
      const hasModel = models.some((m) => m.name === this.model || m.name.startsWith(this.model));

      return {
        online: true,
        model: this.model,
        provider: this.name,
        modelAvailable: hasModel,
        availableModels: models.map((m) => m.name),
      };
    } catch (error) {
      console.error('Ollama status check failed:', error);
      return {
        online: false,
        model: this.model,
        provider: this.name,
        error: 'Ollama server not reachable',
      };
    }
  }

  /**
   * Generate content using Ollama
   */
  async generate({ prompt, temperature = 0.3, maxTokens = 8192 }) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        format: 'json', // Request JSON output
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.response;

    if (!text) {
      throw new Error('Ollama returned empty response');
    }

    return text;
  }

  /**
   * Generate with chat format (better for instruction following)
   */
  async generateChat({ prompt, temperature = 0.3, maxTokens = 8192 }) {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        stream: false,
        options: {
          temperature,
          num_predict: maxTokens,
        },
        format: 'json',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const text = data.message?.content;

    if (!text) {
      throw new Error('Ollama returned empty response');
    }

    return text;
  }

  /**
   * Pull a model if not available
   */
  async pullModel(modelName) {
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName || this.model }),
    });

    if (!response.ok) {
      throw new Error(`Failed to pull model: ${response.status}`);
    }

    return true;
  }
}

export default OllamaProvider;
