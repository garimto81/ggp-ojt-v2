/**
 * Gemini Agent - Module Entry Point
 * @agent gemini-agent
 * @blocks ai.gemini.generate, ai.gemini.quiz, ai.gemini.status
 * @description Gemini AI API 전담 에이전트
 */

// Client (Core API)
export {
  generateOJTContent,
  regenerateQuiz,
  checkStatus,
  getConfig,
  delay,
  calculateBackoff,
} from './client';

// Prompts
export {
  createOJTContentPrompt,
  createQuizRegeneratePrompt,
  createHealthCheckPrompt,
} from './prompts';

// Parser
export {
  parseJSONResponse,
  parseJSONArrayResponse,
  normalizeQuizQuestion,
  createPlaceholderQuiz,
  validateAndFillResult,
} from './parser';

// Validator
export { validateQuizQuality, validateSections, validateOJTContent } from './validator';
