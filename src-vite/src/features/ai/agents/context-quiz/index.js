/**
 * Context Quiz Agent - 진입점
 * @agent context-quiz-agent
 * @blocks ai.quiz.entry
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * URL/PDF 원본 기반 퀴즈 전용 생성 에이전트
 * - URL: Gemini URL Context Tool 사용 (CORS 프록시 불필요)
 * - PDF: Gemini Files API 사용 (48시간 유효)
 *
 * 콘텐츠 정제 없이 퀴즈만 생성 (sections = null)
 */

// URL Context Tool
export { generateQuizFromUrl, extractTitleFromUrl, checkUrlAccessible } from './url-context';

// Files API 업로드
export {
  uploadToGeminiFiles,
  getFileInfo,
  deleteFile,
  isPdf,
  isPdfUrl,
  SUPPORTED_MIME_TYPES,
} from './file-upload';

// 퀴즈 생성
export { generateQuizFromFile, generateQuizFromLocalFile, generateQuiz } from './quiz-generator';

// 프롬프트
export {
  QUIZ_ONLY_PROMPT,
  createUrlQuizPrompt,
  createFileQuizPrompt,
  DEFAULT_QUIZ_COUNT,
} from './prompts';

// 파서
export { parseQuizResponse, validateQuiz } from './parser';
