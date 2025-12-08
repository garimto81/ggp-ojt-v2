// OJT Master - AI Content Generator (Local AI + WebLLM, Issue #101)
// 우선순위: Local AI (vLLM) → WebLLM → Fallback

import { createFallbackContent, createPlaceholderQuiz } from './fallbackContent';
import { generateWithLocalAI, checkLocalAIAvailable, getLocalAIStatus } from './localAI';

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
    const webllmReady = await isWebLLMReady();
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
 *
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} _stepNumber - Unused, for compatibility
 * @param {number} _totalSteps - Unused, for compatibility
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  _stepNumber = 1,
  _totalSteps = 1,
  onProgress
) {
  // 1순위: Local AI 서버 시도
  try {
    const localAvailable = await checkLocalAIAvailable();
    if (localAvailable) {
      if (onProgress) onProgress('Local AI 서버로 콘텐츠 생성 중...');
      const result = await generateWithLocalAIEngine(contentText, title, onProgress);
      if (result) return result;
    }
  } catch (localError) {
    console.warn('[ContentGenerator] Local AI 생성 실패:', localError.message);
  }

  // 2순위: WebLLM 시도
  try {
    if (onProgress) onProgress('WebLLM (브라우저)으로 콘텐츠 생성 중...');
    const result = await generateWithWebLLMEngine(contentText, title, onProgress);
    if (result) return result;
  } catch (webllmError) {
    console.warn('[ContentGenerator] WebLLM 생성 실패:', webllmError.message);
  }

  // 3순위: Fallback Content
  if (onProgress) onProgress('AI 분석 실패 - 원문으로 등록 중...');
  return createFallbackContent(contentText, title, 'AI 엔진을 사용할 수 없습니다.');
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

/**
 * Generate content using WebLLM (browser)
 */
async function generateWithWebLLMEngine(contentText, title, onProgress) {
  const { generateWithWebLLM, isWebLLMReady, initWebLLM } = await import('./webllm.js');

  // WebLLM 준비 확인
  const ready = await isWebLLMReady();
  if (!ready) {
    if (onProgress) onProgress('WebLLM 모델 로딩 중...');
    await initWebLLM((progress) => {
      if (onProgress) onProgress(`모델 다운로드: ${Math.round(progress)}%`);
    });
  }

  const prompt = buildContentPrompt(contentText, title);

  if (onProgress) onProgress('WebLLM으로 섹션 및 퀴즈 생성 중...');
  const response = await generateWithWebLLM(prompt);

  if (onProgress) onProgress('응답 파싱 중...');
  const result = await parseAIResponse(response, title);

  result.ai_engine = 'webllm';
  result.model = 'Qwen2.5-3B-Instruct';

  if (onProgress) onProgress('콘텐츠 생성 완료!');
  return result;
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
