// OJT Master - AI Content Generator (Hybrid: Chrome AI + WebLLM, Issue #96)
// Chrome AI 우선, WebLLM 폴백 콘텐츠 생성

import { createFallbackContent } from './fallbackContent';

/**
 * Check AI engine status (Chrome AI + WebLLM)
 * @returns {Promise<Object>} AI status object
 */
export async function checkAIStatus() {
  try {
    // Chrome AI 상태 확인
    const { checkChromeAISupport, getChromeAIStatus, CHROME_AI_STATUS } =
      await import('./chromeAI.js');
    const chromeSupported = await checkChromeAISupport();
    const chromeStatus = await getChromeAIStatus();

    // WebLLM 상태 확인
    const { getWebLLMStatus, checkWebGPUSupport } = await import('./webllm.js');
    const webllmStatusData = getWebLLMStatus();
    const webgpuSupported = await checkWebGPUSupport();

    // Chrome AI가 ready면 최우선
    const chromeReady = chromeSupported && chromeStatus === CHROME_AI_STATUS.READY;

    return {
      // 통합 상태
      online: chromeSupported || webgpuSupported,
      engineReady: chromeReady || webllmStatusData.loaded,

      // Chrome AI 상태
      chromeAI: {
        supported: chromeSupported,
        status: chromeStatus,
        ready: chromeReady,
      },

      // WebLLM 상태
      webllm: {
        model: webllmStatusData.model,
        loaded: webllmStatusData.loaded,
        loading: webllmStatusData.loading,
        progress: webllmStatusData.progress,
        webgpuSupported,
      },

      // 권장 엔진
      recommendedEngine: chromeReady ? 'chromeai' : webllmStatusData.loaded ? 'webllm' : null,
    };
  } catch (error) {
    console.error('AI status check failed:', error);
    return {
      online: false,
      engineReady: false,
      chromeAI: { supported: false, status: null, ready: false },
      webllm: { model: null, loaded: false, webgpuSupported: false },
      recommendedEngine: null,
    };
  }
}

/**
 * Generate content using Chrome AI
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Generated content
 */
async function generateWithChromeAI(contentText, title, onProgress) {
  const { generateWithChromeAI: chromeGenerate, createChromeAISession } =
    await import('./chromeAI.js');

  // 세션 확보
  await createChromeAISession();

  if (onProgress) onProgress('Chrome AI로 콘텐츠 분석 중...');

  // 프롬프트 생성
  const prompt = buildContentPrompt(contentText, title);

  if (onProgress) onProgress('Chrome AI로 섹션 구조화 중...');
  const response = await chromeGenerate(prompt);

  if (onProgress) onProgress('Chrome AI 응답 파싱 중...');
  const result = await parseAIResponse(response, title);

  result.ai_engine = 'chromeai';
  result.model = 'Gemini Nano';

  return result;
}

/**
 * Generate content using WebLLM
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} Generated content
 */
async function generateWithWebLLMEngine(contentText, title, onProgress) {
  const { generateWithWebLLM, getWebLLMStatus } = await import('./webllm.js');
  const status = getWebLLMStatus();

  if (!status.loaded) {
    throw new Error('WebLLM이 로드되지 않았습니다. 먼저 모델을 로드해주세요.');
  }

  if (onProgress) onProgress('WebLLM으로 콘텐츠 생성 중...');
  const result = await generateWithWebLLM(contentText, title, onProgress);
  result.ai_engine = 'webllm';
  return result;
}

/**
 * Generate OJT content using best available AI engine
 * Priority: Chrome AI (if ready) > WebLLM > Fallback
 *
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} _stepNumber - Current step number (unused, for compatibility)
 * @param {number} _totalSteps - Total number of steps (unused, for compatibility)
 * @param {Function} onProgress - Progress callback
 * @param {string} preferredEngine - Optional: 'chromeai' | 'webllm' | 'auto'
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  _stepNumber = 1,
  _totalSteps = 1,
  onProgress,
  preferredEngine = 'auto'
) {
  try {
    const status = await checkAIStatus();

    // 엔진 선택
    let engine = preferredEngine;
    if (engine === 'auto') {
      engine = status.recommendedEngine;
    }

    // Chrome AI 시도
    if (engine === 'chromeai' && status.chromeAI.ready) {
      try {
        console.log('[ContentGenerator] Using Chrome AI (Gemini Nano)');
        return await generateWithChromeAI(contentText, title, onProgress);
      } catch (chromeError) {
        console.warn('[ContentGenerator] Chrome AI failed, falling back to WebLLM:', chromeError);
        // WebLLM으로 폴백
        if (status.webllm.loaded) {
          return await generateWithWebLLMEngine(contentText, title, onProgress);
        }
        throw chromeError;
      }
    }

    // WebLLM 시도
    if (engine === 'webllm' && status.webllm.loaded) {
      try {
        console.log('[ContentGenerator] Using WebLLM');
        return await generateWithWebLLMEngine(contentText, title, onProgress);
      } catch (webllmError) {
        console.warn('[ContentGenerator] WebLLM failed:', webllmError);
        throw webllmError;
      }
    }

    // 엔진 없음
    throw new Error('AI 엔진이 준비되지 않았습니다. Chrome AI 또는 WebLLM을 먼저 로드해주세요.');
  } catch (error) {
    console.warn('AI 생성 실패:', error.message);

    // Graceful Degradation: 원문 그대로 반환
    if (onProgress) onProgress('AI 분석 실패 - 원문으로 등록 중...');

    return createFallbackContent(contentText, title, error.message);
  }
}

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
        const { createPlaceholderQuiz } = await import('./fallbackContent');
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
      quiz: [],
      summary: '',
      estimated_minutes: 5,
    };
  }
}
