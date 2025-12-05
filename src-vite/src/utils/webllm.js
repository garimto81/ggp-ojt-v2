// OJT Master - WebLLM Wrapper (PRD-0007)
// Browser-based LLM for offline content generation

import * as webllm from '@mlc-ai/web-llm';
import { WEBLLM_CONFIG, CONFIG } from '../constants';

// Singleton engine instance
let engine = null;
let currentModelId = null;

/**
 * Check if WebGPU is supported in the current browser
 * @returns {Promise<{supported: boolean, error?: string}>}
 */
export async function checkWebGPUSupport() {
  if (!navigator.gpu) {
    return {
      supported: false,
      error: '이 브라우저는 WebGPU를 지원하지 않습니다. Chrome 113+ 또는 Edge 113+를 사용해주세요.',
    };
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return {
        supported: false,
        error: 'WebGPU 어댑터를 찾을 수 없습니다. GPU 드라이버를 업데이트해주세요.',
      };
    }
    return { supported: true };
  } catch (error) {
    return {
      supported: false,
      error: `WebGPU 초기화 실패: ${error.message}`,
    };
  }
}

/**
 * Initialize WebLLM engine with specified model
 * @param {string} modelKey - Model key from WEBLLM_CONFIG.MODELS
 * @param {Function} onProgress - Progress callback (progress: {text, progress})
 * @returns {Promise<void>}
 */
export async function initWebLLM(modelKey = WEBLLM_CONFIG.DEFAULT_MODEL, onProgress) {
  const modelConfig = WEBLLM_CONFIG.MODELS[modelKey];
  if (!modelConfig) {
    throw new Error(`Unknown model: ${modelKey}`);
  }

  // Check WebGPU support first
  const gpuCheck = await checkWebGPUSupport();
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.error);
  }

  // Skip if same model already loaded
  if (engine && currentModelId === modelConfig.id) {
    return;
  }

  // Unload previous model if different
  if (engine && currentModelId !== modelConfig.id) {
    await unloadWebLLM();
  }

  try {
    engine = await webllm.CreateMLCEngine(modelConfig.id, {
      initProgressCallback: (report) => {
        if (onProgress) {
          onProgress({
            text: report.text,
            progress: report.progress,
          });
        }
      },
    });
    currentModelId = modelConfig.id;

    // Mark as cached in localStorage
    localStorage.setItem(WEBLLM_CONFIG.STORAGE_KEYS.MODEL_CACHED, modelKey);
    localStorage.setItem(WEBLLM_CONFIG.STORAGE_KEYS.SELECTED_MODEL, modelKey);
  } catch (error) {
    engine = null;
    currentModelId = null;
    throw new Error(`모델 로드 실패: ${error.message}`);
  }
}

/**
 * Unload current WebLLM engine to free memory
 */
export async function unloadWebLLM() {
  if (engine) {
    try {
      await engine.unload();
    } catch (error) {
      console.warn('WebLLM unload warning:', error);
    }
    engine = null;
    currentModelId = null;
  }
}

/**
 * Check if WebLLM engine is ready
 * @returns {boolean}
 */
export function isWebLLMReady() {
  return engine !== null;
}

/**
 * Get current loaded model info
 * @returns {{key: string, config: object} | null}
 */
export function getCurrentModel() {
  if (!currentModelId) return null;

  for (const [key, config] of Object.entries(WEBLLM_CONFIG.MODELS)) {
    if (config.id === currentModelId) {
      return { key, config };
    }
  }
  return null;
}

/**
 * Build OJT content generation prompt
 * @param {string} contentText - Source content
 * @param {string} title - Document title
 * @returns {string}
 */
function buildOJTPrompt(contentText, title) {
  return `당신은 10년 경력의 기업 교육 설계 전문가입니다.

다음 텍스트를 분석하여 신입사원 OJT(On-the-Job Training) 교육 자료를 생성하세요.
문서 제목: "${title}"

## 출력 형식 (반드시 JSON만 출력)
{
  "title": "문서 제목",
  "team": "팀 또는 분야명",
  "sections": [
    {
      "title": "섹션 제목",
      "content": "HTML 형식의 상세 내용 (p, ul, li, strong 태그 사용)"
    }
  ],
  "quiz": [
    {
      "question": "문제",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "correct": 0
    }
  ]
}

## 섹션 구성 (4-6개)
1. 학습 목표
2. 핵심 내용 (가장 중요)
3. 실무 예시
4. 주의사항
5. 요약 정리

## 퀴즈 구성 (20개)
- 기억형 40%: 핵심 용어, 정의
- 이해형 35%: 개념 관계, 비교
- 적용형 25%: 실무 상황 판단

## 입력 텍스트
${contentText.substring(0, 10000)}`;
}

/**
 * Generate OJT content using WebLLM
 * @param {string} contentText - Source content text
 * @param {string} title - Document title
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<object>} Generated OJT content
 */
export async function generateWithWebLLM(contentText, title, onProgress) {
  if (!engine) {
    throw new Error('WebLLM이 초기화되지 않았습니다. 먼저 initWebLLM()을 호출하세요.');
  }

  if (onProgress) onProgress('AI 분석 중...');

  const messages = [
    {
      role: 'system',
      content:
        '당신은 10년 경력의 기업 교육 설계 전문가입니다. 반드시 유효한 JSON 형식으로만 응답하세요. 다른 텍스트는 포함하지 마세요.',
    },
    {
      role: 'user',
      content: buildOJTPrompt(contentText, title),
    },
  ];

  try {
    const response = await engine.chat.completions.create({
      messages,
      temperature: WEBLLM_CONFIG.GENERATION.temperature,
      max_tokens: WEBLLM_CONFIG.GENERATION.maxTokens,
      response_format: { type: 'json_object' },
    });

    const responseText = response.choices[0]?.message?.content;

    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Parse JSON response
    const result = parseAIResponse(responseText);

    // Validate and fill quiz if needed
    return validateAndFillResult(result, title);
  } catch (error) {
    console.error('WebLLM generation error:', error);
    throw new Error(`콘텐츠 생성 실패: ${error.message}`);
  }
}

/**
 * Parse AI response to JSON
 * @param {string} responseText - Raw AI response
 * @returns {object}
 */
function parseAIResponse(responseText) {
  // Try direct JSON parse first
  try {
    return JSON.parse(responseText);
  } catch {
    // Try to extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON 형식을 찾을 수 없습니다.');
    }

    // Clean JSON string (remove control characters)
    const jsonStr = jsonMatch[0]
      .replace(/[\x00-\x1F\x7F]/g, ' ')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']');

    return JSON.parse(jsonStr);
  }
}

/**
 * Validate and fill OJT result with placeholder quizzes if needed
 * @param {object} result - Parsed result
 * @param {string} title - Document title
 * @returns {object}
 */
function validateAndFillResult(result, title) {
  // Ensure sections exist
  if (!Array.isArray(result.sections) || result.sections.length === 0) {
    result.sections = [{ title: '학습 목표', content: '<p>내용을 확인해주세요.</p>' }];
  }

  // Ensure quiz exists
  if (!Array.isArray(result.quiz)) {
    result.quiz = [];
  }

  // Normalize each quiz question
  result.quiz = result.quiz.map((q, idx) => normalizeQuizQuestion(q, idx, title));

  // Fill quiz if less than required
  while (result.quiz.length < CONFIG.QUIZ_TOTAL_POOL) {
    result.quiz.push(createPlaceholderQuiz(title, result.quiz.length + 1));
  }

  return result;
}

/**
 * Normalize a quiz question
 */
function normalizeQuizQuestion(question, index, title) {
  const normalized = { ...question };

  if (!Array.isArray(normalized.options) || normalized.options.length < 2) {
    normalized.options = ['정답', '오답 1', '오답 2', '오답 3'];
    normalized.correct = 0;
  }

  if (
    typeof normalized.correct !== 'number' ||
    normalized.correct < 0 ||
    normalized.correct >= normalized.options.length
  ) {
    normalized.correct = 0;
  }

  normalized.answer = normalized.options[normalized.correct];

  if (!normalized.question || normalized.question.trim() === '') {
    normalized.question = `${title} 관련 문제 ${index + 1}`;
  }

  return normalized;
}

/**
 * Create a placeholder quiz question
 */
function createPlaceholderQuiz(title, number) {
  return {
    question: `[자동 생성] ${title} 관련 문제 ${number}`,
    options: ['정답', '오답 1', '오답 2', '오답 3'],
    correct: 0,
    answer: '정답',
    isPlaceholder: true,
  };
}

/**
 * Get preferred AI engine from localStorage
 * @returns {'gemini' | 'webllm'}
 */
export function getPreferredEngine() {
  return localStorage.getItem(WEBLLM_CONFIG.STORAGE_KEYS.PREFERRED_ENGINE) || 'gemini';
}

/**
 * Set preferred AI engine
 * @param {'gemini' | 'webllm'} engine
 */
export function setPreferredEngine(engine) {
  localStorage.setItem(WEBLLM_CONFIG.STORAGE_KEYS.PREFERRED_ENGINE, engine);
}

/**
 * Check if a model is cached (previously downloaded)
 * @param {string} modelKey
 * @returns {boolean}
 */
export function isModelCached(modelKey) {
  return localStorage.getItem(WEBLLM_CONFIG.STORAGE_KEYS.MODEL_CACHED) === modelKey;
}
