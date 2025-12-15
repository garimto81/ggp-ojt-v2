/**
 * Context Quiz Agent - 파일 기반 퀴즈 생성
 * @agent context-quiz-agent
 * @blocks ai.quiz.generate
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * Gemini Files API에 업로드된 파일을 기반으로 퀴즈를 생성합니다.
 * PDF, 이미지 등 멀티모달 콘텐츠에서 퀴즈를 추출합니다.
 *
 * @see https://ai.google.dev/gemini-api/docs/document-processing
 */

import { GEMINI_CONFIG, CONFIG } from '@/constants';

import { uploadToGeminiFiles, SUPPORTED_MIME_TYPES } from './file-upload';
import { parseQuizResponse, validateQuiz } from './parser';
import { createFileQuizPrompt, DEFAULT_QUIZ_COUNT } from './prompts';

/**
 * 파일 기반 퀴즈 생성 (Files API 사용)
 *
 * @param {string} fileUri - Gemini Files API에 업로드된 파일 URI
 * @param {Object} options - 옵션
 * @param {string} options.mimeType - 파일 MIME 타입 (기본: application/pdf)
 * @param {number} options.quizCount - 생성할 퀴즈 개수
 * @param {Function} options.onProgress - 진행률 콜백
 * @returns {Promise<Array>} 생성된 퀴즈 배열
 *
 * @example
 * const fileUri = await uploadToGeminiFiles(pdfFile);
 * const quiz = await generateQuizFromFile(fileUri.uri, {
 *   mimeType: 'application/pdf',
 *   quizCount: 10
 * });
 */
export async function generateQuizFromFile(fileUri, options = {}) {
  const {
    mimeType = SUPPORTED_MIME_TYPES.PDF,
    quizCount = DEFAULT_QUIZ_COUNT,
    onProgress,
  } = options;

  if (!GEMINI_CONFIG.API_KEY) {
    throw new Error('Gemini API 키가 설정되지 않았습니다');
  }

  if (!fileUri) {
    throw new Error('파일 URI가 필요합니다');
  }

  onProgress?.('파일 콘텐츠 분석 중...');

  try {
    const apiUrl = `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`;

    const requestBody = {
      contents: [
        {
          parts: [
            // 파일 데이터
            {
              file_data: {
                file_uri: fileUri,
                mime_type: mimeType,
              },
            },
            // 퀴즈 생성 프롬프트
            {
              text: createFileQuizPrompt(quizCount),
            },
          ],
        },
      ],
      generationConfig: {
        temperature: CONFIG.AI_TEMPERATURE || 0.3,
        maxOutputTokens: CONFIG.AI_MAX_TOKENS || 8192,
        responseMimeType: 'application/json',
      },
    };

    onProgress?.('Gemini API로 퀴즈 생성 중...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      const errorMsg = error.error?.message || `API 오류: ${response.status}`;

      if (response.status === 429) {
        throw new Error('API 할당량 초과. 잠시 후 다시 시도해주세요.');
      }
      if (response.status === 400 && errorMsg.includes('file')) {
        throw new Error('파일이 만료되었거나 접근할 수 없습니다. 다시 업로드해주세요.');
      }

      throw new Error(errorMsg);
    }

    const data = await response.json();
    onProgress?.('퀴즈 파싱 중...');

    const quiz = parseQuizResponse(data);

    const validation = validateQuiz(quiz);
    if (!validation.valid) {
      console.warn('[context-quiz] 퀴즈 품질 이슈:', validation.issues);
    }

    onProgress?.(`퀴즈 ${quiz.length}개 생성 완료`);

    return quiz;
  } catch (error) {
    console.error('[context-quiz] 파일 퀴즈 생성 실패:', error);
    throw error;
  }
}

/**
 * 로컬 파일에서 퀴즈 생성 (업로드 + 생성 통합)
 *
 * @param {File} file - 로컬 파일
 * @param {Object} options - 옵션
 * @param {number} options.quizCount - 생성할 퀴즈 개수
 * @param {Function} options.onProgress - 진행률 콜백
 * @returns {Promise<Object>} { quiz: Array, fileInfo: Object }
 *
 * @example
 * const result = await generateQuizFromLocalFile(pdfFile, {
 *   onProgress: (msg) => setStatus(msg)
 * });
 * console.log(result.quiz);      // 퀴즈 배열
 * console.log(result.fileInfo);  // 업로드된 파일 정보
 */
export async function generateQuizFromLocalFile(file, options = {}) {
  const { quizCount = DEFAULT_QUIZ_COUNT, onProgress } = options;

  // 1. 파일 업로드
  onProgress?.('파일 업로드 중...');
  const fileInfo = await uploadToGeminiFiles(file, { onProgress });

  // 2. 퀴즈 생성
  const quiz = await generateQuizFromFile(fileInfo.uri, {
    mimeType: fileInfo.mimeType,
    quizCount,
    onProgress,
  });

  return {
    quiz,
    fileInfo,
  };
}

/**
 * 퀴즈 생성 결과 타입
 * @typedef {Object} QuizGenerationResult
 * @property {Array} quiz - 생성된 퀴즈 배열
 * @property {string} source - 생성 소스 ('url_context' | 'files_api')
 * @property {number} generatedAt - 생성 시간 (timestamp)
 */

/**
 * 통합 퀴즈 생성 함수 (URL 또는 File 자동 감지)
 *
 * @param {string|File} input - URL 문자열 또는 File 객체
 * @param {Object} options - 옵션
 * @returns {Promise<QuizGenerationResult>}
 */
export async function generateQuiz(input, options = {}) {
  const isUrl = typeof input === 'string';
  const isFile = input instanceof File;

  if (!isUrl && !isFile) {
    throw new Error('URL 또는 File 객체가 필요합니다');
  }

  let quiz;
  let source;

  if (isUrl) {
    // URL Context Tool 사용
    const { generateQuizFromUrl } = await import('./url-context');
    quiz = await generateQuizFromUrl(input, options);
    source = 'url_context';
  } else {
    // Files API 사용
    const result = await generateQuizFromLocalFile(input, options);
    quiz = result.quiz;
    source = 'files_api';
  }

  return {
    quiz,
    source,
    generatedAt: Date.now(),
  };
}
