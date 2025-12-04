// OJT Master - Base LLM Provider Interface
// Abstract class defining the interface for all LLM providers

/**
 * Base class for LLM providers
 * All provider implementations must extend this class
 */
export class BaseLLMProvider {
  constructor(config = {}) {
    this.config = config;
    this.name = 'base';
  }

  /**
   * Check if the provider is available and ready
   * @returns {Promise<{online: boolean, model: string, provider: string}>}
   */
  async checkStatus() {
    throw new Error('checkStatus() must be implemented by provider');
  }

  /**
   * Generate OJT content from raw text
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt to send
   * @param {number} params.temperature - Temperature setting (0-1)
   * @param {number} params.maxTokens - Maximum tokens to generate
   * @returns {Promise<string>} - Generated text response
   */
  // eslint-disable-next-line no-unused-vars
  async generate({ prompt, temperature = 0.3, maxTokens = 8192 }) {
    throw new Error('generate() must be implemented by provider');
  }

  /**
   * Generate content with URL context (if supported)
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt to send
   * @param {string} params.url - URL to analyze
   * @returns {Promise<string>} - Generated text response
   */
  // eslint-disable-next-line no-unused-vars
  async generateWithUrlContext({ prompt, url }) {
    // Default: fallback to regular generation
    console.warn(`${this.name} does not support URL context, using regular generation`);
    return this.generate({ prompt });
  }

  /**
   * Get provider name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Get provider model name
   * @returns {string}
   */
  getModel() {
    return this.config.model || 'unknown';
  }
}

export default BaseLLMProvider;
