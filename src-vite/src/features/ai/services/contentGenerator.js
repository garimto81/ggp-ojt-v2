// OJT Master - AI Content Generator (Local AI + WebLLM, Issue #101, #104)
// 우선순위: Local AI (vLLM) → WebLLM → Fallback
// 타임아웃 및 사용자 취소 지원

import { createPlaceholderQuiz, createEnhancedFallbackContent } from './fallbackContent';
import { generateWithLocalAI, checkLocalAIAvailable, getLocalAIStatus } from './localAI';

// 타임아웃 설정 (ms)
const TIMEOUTS = {
  LOCAL_AI_CHECK: 5000, // Local AI 연결 확인: 5초
  LOCAL_AI_GENERATE: 60000, // Local AI 생성: 60초
  WEBLLM_LOAD: 30000, // WebLLM 모델 로딩: 30초
  WEBLLM_GENERATE: 60000, // WebLLM 콘텐츠 생성: 60초
};

/**
 * Promise with timeout wrapper
 * @param {Promise} promise - 원본 Promise
 * @param {number} ms - 타임아웃 (ms)
 * @param {string} errorMessage - 타임아웃 에러 메시지
 * @param {AbortController} abortController - 취소 컨트롤러 (optional)
 * @returns {Promise}
 */
function withTimeout(promise, ms, errorMessage, abortController = null) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      if (abortController) abortController.abort();
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Check AI status (Local AI → WebLLM)
 * @returns {Promise<Object>} AI status object
 */
export async function checkAIStatus() {
  // 1. Local AI 상태 확인
  const localStatus = await getLocalAIStatus();
  if (localStatus.available) {
    return {
      supported: true,
      status: 'available',
      ready: true,
      engine: 'localai',
      model: localStatus.model,
      url: localStatus.url,
    };
  }

  // 2. WebLLM 상태 확인
  try {
    const { isWebLLMReady } = await import('./webllm.js');
    const webllmReady = isWebLLMReady(); // sync 함수
    return {
      supported: true,
      status: webllmReady ? 'ready' : 'not_loaded',
      ready: webllmReady,
      engine: 'webllm',
      model: 'Qwen2.5-3B-Instruct',
    };
  } catch {
    return {
      supported: false,
      status: null,
      ready: false,
      engine: null,
      model: null,
    };
  }
}

/**
 * Generate OJT content using AI engines
 * Priority: Local AI → WebLLM → Fallback
 * 타임아웃 및 사용자 취소 지원
 *
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} _stepNumber - Unused, for compatibility
 * @param {number} _totalSteps - Unused, for compatibility
 * @param {Function} onProgress - Progress callback
 * @param {Object} options - 추가 옵션
 * @param {AbortSignal} options.signal - 사용자 취소 시그널
 * @param {Function} options.onCancel - 취소 콜백
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  _stepNumber = 1,
  _totalSteps = 1,
  onProgress,
  options = {}
) {
  const { signal } = options;
  const errors = [];
  const startTime = Date.now();

  // 사용자 취소 확인 헬퍼
  const checkAborted = () => {
    if (signal?.aborted) {
      throw new Error('USER_CANCELLED');
    }
  };

  // 1순위: Local AI 서버 시도
  try {
    checkAborted();
    if (onProgress) onProgress('Local AI 서버 연결 확인 중...');

    const localAvailable = await withTimeout(
      checkLocalAIAvailable(),
      TIMEOUTS.LOCAL_AI_CHECK,
      'Local AI 연결 타임아웃 (5초)'
    );

    if (localAvailable) {
      checkAborted();
      if (onProgress) onProgress('✅ Local AI 서버 연결됨 - 콘텐츠 생성 시작...');

      const result = await withTimeout(
        generateWithLocalAIEngine(contentText, title, onProgress),
        TIMEOUTS.LOCAL_AI_GENERATE,
        'Local AI 생성 타임아웃 (60초)'
      );

      if (result) {
        result.generation_time = Date.now() - startTime;
        return result;
      }
    } else {
      errors.push({ engine: 'localai', error: '서버 미연결' });
      if (onProgress) onProgress('Local AI 서버 미연결 - WebLLM으로 전환...');
    }
  } catch (localError) {
    if (localError.message === 'USER_CANCELLED') throw localError;
    errors.push({ engine: 'localai', error: localError.message });
    console.warn('[ContentGenerator] Local AI 실패:', localError.message);
    if (onProgress) onProgress(`Local AI 실패: ${localError.message}`);
  }

  // 2순위: WebLLM 시도
  try {
    checkAborted();
    if (onProgress) onProgress('WebLLM 엔진 준비 중...');

    const result = await generateWithWebLLMEngineWithTimeout(
      contentText,
      title,
      onProgress,
      signal
    );

    if (result) {
      result.generation_time = Date.now() - startTime;
      return result;
    }
  } catch (webllmError) {
    // 사용자가 "Fallback으로 건너뛰기" 선택 시 → Fallback 콘텐츠 생성
    if (webllmError.message === 'USER_CANCELLED') {
      errors.push({ engine: 'webllm', error: '사용자가 Fallback으로 전환' });
      if (onProgress) onProgress('⏭️ Fallback 모드로 전환 중...');
      // 아래 Fallback 로직으로 진행
    } else {
      errors.push({ engine: 'webllm', error: webllmError.message });
      console.warn('[ContentGenerator] WebLLM 실패:', webllmError.message);
      if (onProgress) onProgress(`WebLLM 실패: ${webllmError.message}`);
    }
  }

  // 3순위: Fallback Content (AI 실패 또는 사용자 취소 시)
  if (onProgress) onProgress('📝 Fallback 콘텐츠 생성 중... (키워드 기반 퀴즈 자동 생성)');

  const fallbackResult = createEnhancedFallbackContent(contentText, title, errors);
  fallbackResult.generation_time = Date.now() - startTime;

  // 사용자 취소로 인한 Fallback인 경우 플래그 추가
  if (signal?.aborted) {
    fallbackResult._fallback.reason = '사용자가 Fallback으로 전환';
    fallbackResult._fallback.userInitiated = true;
  }

  return fallbackResult;
}

/**
 * WebLLM 엔진으로 생성 (타임아웃 적용)
 */
async function generateWithWebLLMEngineWithTimeout(contentText, title, onProgress, signal) {
  const { generateWithWebLLM, isWebLLMReady, initWebLLM } = await import('./webllm.js');

  // WebLLM 준비 확인
  const ready = isWebLLMReady();
  if (!ready) {
    if (onProgress) onProgress('WebLLM 모델 로딩 중... (최대 30초)');

    // 로딩에 타임아웃 적용
    await withTimeout(
      initWebLLM(undefined, (progressText) => {
        if (signal?.aborted) return;
        if (onProgress) onProgress(progressText);
      }),
      TIMEOUTS.WEBLLM_LOAD,
      'WebLLM 모델 로딩 타임아웃 (30초)'
    );
  }

  // 사용자 취소 확인
  if (signal?.aborted) {
    throw new Error('USER_CANCELLED');
  }

  if (onProgress) onProgress('WebLLM으로 콘텐츠 생성 중... (최대 60초)');

  // 생성에 타임아웃 적용
  const result = await withTimeout(
    generateWithWebLLM(contentText, title, onProgress, null, signal),
    TIMEOUTS.WEBLLM_GENERATE,
    'WebLLM 콘텐츠 생성 타임아웃 (60초)'
  );

  result.ai_engine = 'webllm';
  result.model = 'Qwen2.5-3B-Instruct';

  if (onProgress) onProgress('✅ 콘텐츠 생성 완료!');
  return result;
}

/**
 * Generate content using Local AI server
 */
async function generateWithLocalAIEngine(contentText, title, onProgress) {
  const prompt = buildContentPrompt(contentText, title);

  if (onProgress) onProgress('Local AI로 섹션 및 퀴즈 생성 중...');
  const response = await generateWithLocalAI(prompt);

  if (onProgress) onProgress('응답 파싱 중...');
  const result = await parseAIResponse(response, title);

  result.ai_engine = 'localai';
  result.model = 'Qwen/Qwen3-4B';

  if (onProgress) onProgress('콘텐츠 생성 완료!');
  return result;
}

// generateWithWebLLMEngine 함수는 generateWithWebLLMEngineWithTimeout으로 대체됨

/**
 * Build content generation prompt
 * @param {string} contentText - Raw content
 * @param {string} title - Document title
 * @returns {string} Formatted prompt
 */
function buildContentPrompt(contentText, title) {
  return `당신은 OJT 교육 콘텐츠 전문가입니다. 아래 텍스트를 분석하여 구조화된 학습 자료와 퀴즈를 생성해주세요.

제목: ${title}

원본 텍스트:
${contentText.substring(0, 8000)}

다음 JSON 형식으로 응답해주세요:
{
  "sections": [
    {
      "title": "섹션 제목",
      "content": "섹션 내용 (HTML 형식)"
    }
  ],
  "quiz": [
    {
      "question": "질문",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": 0,
      "explanation": "정답 설명"
    }
  ],
  "summary": "전체 요약 (2-3문장)"
}

요구사항:
1. 섹션은 3-5개로 구성
2. 퀴즈는 10개 생성 (기억형 4개, 이해형 4개, 적용형 2개)
3. 각 퀴즈의 answer는 0-3 사이의 인덱스
4. 한국어로 작성`;
}

/**
 * Parse AI response to structured content
 * @param {string} response - Raw AI response
 * @param {string} title - Document title
 * @returns {Promise<Object>} Parsed content
 */
async function parseAIResponse(response, title) {
  try {
    // JSON 블록 추출 시도
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);

      // 필수 필드 검증
      if (!parsed.sections || !Array.isArray(parsed.sections)) {
        parsed.sections = [{ title: '내용', content: response }];
      }
      if (!parsed.quiz || !Array.isArray(parsed.quiz)) {
        parsed.quiz = [];
      }

      // 퀴즈 10개 미만이면 더미로 채움
      if (parsed.quiz.length < 10) {
        const dummyQuizzes = createPlaceholderQuiz(10 - parsed.quiz.length, title);
        parsed.quiz = [...parsed.quiz, ...dummyQuizzes];
      }

      return {
        title,
        sections: parsed.sections,
        quiz: parsed.quiz.slice(0, 10),
        summary: parsed.summary || '',
        estimated_minutes: Math.max(5, Math.ceil(response.length / 500)),
      };
    }

    // JSON 파싱 실패 시 원문 그대로 반환
    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.warn('[ContentGenerator] Parse failed:', error);

    // 원문 기반 기본 구조 생성
    return {
      title,
      sections: [
        {
          title: '학습 내용',
          content: `<p>${response.replace(/\n/g, '</p><p>')}</p>`,
        },
      ],
      quiz: createPlaceholderQuiz(10, title),
      summary: '',
      estimated_minutes: 5,
    };
  }
}
