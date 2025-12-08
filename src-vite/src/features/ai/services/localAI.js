// OJT Master - Local AI Server Integration (Issue #101)
// vLLM 기반 사내 AI 서버 연동 (OpenAI-compatible API)

/**
 * Local AI 설정
 */
export const LOCAL_AI_CONFIG = {
  getBaseUrl: () => import.meta.env.VITE_LOCAL_AI_URL || null,
  timeout: 60000, // 60초
  model: 'Qwen/Qwen3-4B',
};

/**
 * Local AI 상태 상수
 */
export const LOCAL_AI_STATUS = {
  NOT_CONFIGURED: 'not_configured', // URL 미설정
  CHECKING: 'checking', // 연결 확인 중
  AVAILABLE: 'available', // 사용 가능
  UNAVAILABLE: 'unavailable', // 연결 불가
  ERROR: 'error', // 오류
};

/**
 * Local AI 서버 연결 가능 여부 확인
 * @returns {Promise<boolean>}
 */
export async function checkLocalAIAvailable() {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    console.log('[LocalAI] URL 미설정');
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      console.log('[LocalAI] 서버 연결 성공:', baseUrl);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('[LocalAI] 서버 연결 실패:', error.message);
    return false;
  }
}

/**
 * Local AI 서버 상태 조회
 * @returns {Promise<Object>}
 */
export async function getLocalAIStatus() {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    return {
      status: LOCAL_AI_STATUS.NOT_CONFIGURED,
      available: false,
      url: null,
      model: null,
    };
  }

  try {
    const available = await checkLocalAIAvailable();
    if (!available) {
      return {
        status: LOCAL_AI_STATUS.UNAVAILABLE,
        available: false,
        url: baseUrl,
        model: null,
      };
    }

    // 모델 정보 조회
    const modelsResponse = await fetch(`${baseUrl}/v1/models`);
    const modelsData = await modelsResponse.json();
    const model = modelsData.data?.[0]?.id || LOCAL_AI_CONFIG.model;

    return {
      status: LOCAL_AI_STATUS.AVAILABLE,
      available: true,
      url: baseUrl,
      model,
    };
  } catch (error) {
    return {
      status: LOCAL_AI_STATUS.ERROR,
      available: false,
      url: baseUrl,
      model: null,
      error: error.message,
    };
  }
}

/**
 * Local AI로 텍스트 생성
 * @param {string} prompt - 프롬프트
 * @param {Object} options - 생성 옵션
 * @returns {Promise<string>} 생성된 텍스트
 */
export async function generateWithLocalAI(prompt, options = {}) {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    throw new Error('Local AI URL이 설정되지 않았습니다.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || LOCAL_AI_CONFIG.timeout
  );

  try {
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
              '당신은 OJT 교육 콘텐츠 전문가입니다. 구조화된 학습 자료와 퀴즈를 생성합니다. 반드시 요청된 JSON 형식으로 응답해주세요.',
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('응답에 콘텐츠가 없습니다.');
    }

    return content;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Local AI 요청 시간 초과');
    }
    throw error;
  }
}

/**
 * Local AI 연결 테스트
 * @returns {Promise<Object>} 테스트 결과
 */
export async function testLocalAIConnection() {
  const baseUrl = LOCAL_AI_CONFIG.getBaseUrl();
  if (!baseUrl) {
    return {
      success: false,
      error: 'VITE_LOCAL_AI_URL이 설정되지 않았습니다.',
    };
  }

  try {
    // 1. Health check
    const healthResponse = await fetch(`${baseUrl}/health`, { method: 'GET' });
    if (!healthResponse.ok) {
      return { success: false, error: 'Health check 실패' };
    }

    // 2. Models list
    const modelsResponse = await fetch(`${baseUrl}/v1/models`);
    const modelsData = await modelsResponse.json();

    // 3. Simple generation test
    const testResponse = await generateWithLocalAI('Hello', {
      maxTokens: 10,
      timeout: 10000,
    });

    return {
      success: true,
      url: baseUrl,
      model: modelsData.data?.[0]?.id,
      testResponse: testResponse.substring(0, 50),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}
