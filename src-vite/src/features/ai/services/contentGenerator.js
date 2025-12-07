// OJT Master - AI Content Generator (Chrome Gemini Nano 전용, Issue #96)
// Chrome 138+ 내장 Gemini Nano 모델만 사용

import { createFallbackContent, createPlaceholderQuiz } from './fallbackContent';

/**
 * Check Chrome AI status
 * @returns {Promise<Object>} AI status object
 */
export async function checkAIStatus() {
  try {
    const { checkChromeAISupport, getChromeAIStatus, isChromeAIReady, CHROME_AI_STATUS } =
      await import('./chromeAI.js');

    const supported = await checkChromeAISupport();
    const status = await getChromeAIStatus();
    const ready = await isChromeAIReady();

    return {
      supported,
      status,
      ready,
      engine: 'chromeai',
      model: 'Gemini Nano',
    };
  } catch (error) {
    console.error('[ContentGenerator] AI status check failed:', error);
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
 * Generate OJT content using Chrome AI (Gemini Nano)
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
  try {
    const { generateWithChromeAI, createChromeAISession, isChromeAIReady } =
      await import('./chromeAI.js');

    // Chrome AI 준비 확인
    const ready = await isChromeAIReady();
    if (!ready) {
      // 세션 생성 시도
      if (onProgress) onProgress('Chrome AI 세션 생성 중...');
      await createChromeAISession();
    }

    if (onProgress) onProgress('Chrome AI로 콘텐츠 분석 중...');

    // 프롬프트 생성
    const prompt = buildContentPrompt(contentText, title);

    if (onProgress) onProgress('Chrome AI로 섹션 및 퀴즈 생성 중...');
    const response = await generateWithChromeAI(prompt);

    if (onProgress) onProgress('응답 파싱 중...');
    const result = await parseAIResponse(response, title);

    result.ai_engine = 'chromeai';
    result.model = 'Gemini Nano';

    if (onProgress) onProgress('콘텐츠 생성 완료!');
    return result;
  } catch (error) {
    console.warn('[ContentGenerator] Chrome AI 생성 실패:', error.message);

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
