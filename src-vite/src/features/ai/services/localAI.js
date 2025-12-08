// OJT Master - Local AI Server Integration
// 사내 MLC LLM REST 서버 연동 (OpenAI 호환 API)

/**
 * Local AI 서버 설정
 */
const LOCAL_AI_CONFIG = {
  // 환경변수에서 URL 가져오기, 없으면 기본값
  getBaseUrl: () => import.meta.env.VITE_LOCAL_AI_URL || null,
  timeout: 60000, // 60초 타임아웃
  model: 'Qwen2.5-3B-Instruct', // 기본 모델
};

/**
 * Local AI 서버 사용 가능 여부 확인
 * @returns {Promise<boolean>}
 */
export async function checkLocalAIAvailable() {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    console.log('[LocalAI] VITE_LOCAL_AI_URL not configured');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃

    const response = await fetch(`${baseUrl}/v1/models`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      console.log('[LocalAI] Server available, models:', data);
      return true;
    }

    console.warn('[LocalAI] Server responded with:', response.status);
    return false;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn('[LocalAI] Server timeout');
    } else {
      console.warn('[LocalAI] Server not reachable:', error.message);
    }
    return false;
  }
}

/**
 * Local AI 상태 조회
 * @returns {Promise<Object>}
 */
export async function getLocalAIStatus() {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  const available = await checkLocalAIAvailable();

  return {
    configured: !!baseUrl,
    available,
    url: baseUrl,
    model: LOCAL_AI_CONFIG.model,
  };
}

/**
 * Local AI 서버로 텍스트 생성
 * @param {string} prompt - 프롬프트
 * @param {Object} options - 옵션
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function generateWithLocalAI(prompt, options = {}) {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    throw new Error('Local AI server URL not configured');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), LOCAL_AI_CONFIG.timeout);

  try {
    console.log('[LocalAI] Generating response...');

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || LOCAL_AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content:
              '당신은 OJT 교육 콘텐츠 전문가입니다. 한국어로 응답하고, 요청된 JSON 형식을 정확히 따라주세요.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Local AI server error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Empty response from Local AI server');
    }

    console.log('[LocalAI] Response generated, length:', content.length);
    return content;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Local AI server timeout (60s)');
    }

    console.error('[LocalAI] Generation failed:', error);
    throw error;
  }
}

/**
 * Local AI 서버로 OJT 콘텐츠 생성
 * @param {string} contentText - 원문 텍스트
 * @param {string} title - 문서 제목
 * @param {Function} onProgress - 진행 콜백
 * @returns {Promise<Object>} 생성된 OJT 콘텐츠
 */
export async function generateOJTWithLocalAI(contentText, title, onProgress) {
  if (onProgress) onProgress('로컬 AI 서버로 콘텐츠 분석 중...');

  const prompt = buildOJTPrompt(contentText, title);

  if (onProgress) onProgress('로컬 AI 서버로 섹션 및 퀴즈 생성 중...');
  const response = await generateWithLocalAI(prompt);

  if (onProgress) onProgress('응답 파싱 중...');
  const result = parseAIResponse(response, title);

  result.ai_engine = 'local';
  result.model = LOCAL_AI_CONFIG.model;

  if (onProgress) onProgress('콘텐츠 생성 완료! (로컬 AI 서버)');
  return result;
}

/**
 * OJT 콘텐츠 생성용 프롬프트 빌드
 * @private
 */
function buildOJTPrompt(contentText, title) {
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
 * AI 응답 파싱
 * @private
 */
function parseAIResponse(response, title) {
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

      return {
        title,
        sections: parsed.sections,
        quiz: parsed.quiz.slice(0, 10),
        summary: parsed.summary || '',
        estimated_minutes: Math.max(5, Math.ceil(response.length / 500)),
        ai_processed: true,
      };
    }

    throw new Error('JSON 파싱 실패');
  } catch (error) {
    console.warn('[LocalAI] Parse failed:', error);

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
      ai_processed: true,
    };
  }
}
