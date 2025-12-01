// OJT Master v2.3.0 - API Utilities (Supabase, Gemini)

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, GEMINI_CONFIG, CONFIG, CORS_PROXIES } from '../constants';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}

/**
 * Check Gemini AI status
 * @returns {Promise<{online: boolean, model: string}>}
 */
export async function checkAIStatus() {
  try {
    const response = await fetch(
      `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hello' }] }],
        }),
      }
    );

    return {
      online: response.ok,
      model: GEMINI_CONFIG.MODEL,
    };
  } catch (error) {
    console.error('AI status check failed:', error);
    return { online: false, model: GEMINI_CONFIG.MODEL };
  }
}

/**
 * Generate OJT content using Gemini AI
 * @param {string} contentText - Raw content text
 * @param {string} title - Document title
 * @param {number} stepNumber - Current step number
 * @param {number} totalSteps - Total number of steps
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<Object>} - Generated OJT content
 */
export async function generateOJTContent(
  contentText,
  title,
  stepNumber = 1,
  totalSteps = 1,
  onProgress
) {
  const stepLabel = totalSteps > 1 ? ` (${stepNumber}/${totalSteps}단계)` : '';

  const prompt = `당신은 10년 경력의 기업 교육 설계 전문가입니다.

다음 텍스트를 분석하여 신입사원 OJT(On-the-Job Training) 교육 자료를 생성하세요.
문서 제목: "${title}${stepLabel}"

## 출력 형식 (반드시 JSON)
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
${contentText.substring(0, 12000)}`;

  try {
    if (onProgress) onProgress('AI 분석 중...');

    const response = await fetch(
      `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: CONFIG.AI_TEMPERATURE,
            maxOutputTokens: CONFIG.AI_MAX_TOKENS,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`AI 응답 오류: ${response.status}`);
    }

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      throw new Error('AI 응답이 비어있습니다.');
    }

    // Parse AI response
    const result = parseAIResponse(responseText);

    // Validate and fill quiz if needed
    return validateAndFillResult(result, title);
  } catch (error) {
    console.error('OJT content generation failed:', error);
    throw error;
  }
}

/**
 * Parse AI response to JSON
 */
function parseAIResponse(responseText) {
  // Try to extract JSON from response
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON 형식을 찾을 수 없습니다.');
  }

  // Clean JSON string (remove control characters)
  // eslint-disable-next-line no-control-regex
  const jsonStr = jsonMatch[0]
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/"\s*\n\s*"/g, '" "');

  return JSON.parse(jsonStr);
}

/**
 * Validate and fill OJT result
 */
function validateAndFillResult(result, title) {
  // Ensure sections exist
  if (!Array.isArray(result.sections) || result.sections.length === 0) {
    result.sections = [{ title: '학습 목표', content: '<p>내용을 확인해주세요.</p>' }];
  }

  // Ensure quiz exists and has enough questions
  if (!Array.isArray(result.quiz)) {
    result.quiz = [];
  }

  // Fill quiz if less than required
  while (result.quiz.length < CONFIG.QUIZ_TOTAL_POOL) {
    result.quiz.push({
      question: `[자동 생성] ${title} 관련 문제 ${result.quiz.length + 1}`,
      options: ['정답', '오답 1', '오답 2', '오답 3'],
      correct: 0,
    });
  }

  return result;
}

/**
 * Extract text from URL using CORS proxy
 * @param {string} url - URL to extract text from
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<{text: string, wasTruncated: boolean, originalLength: number, extractedLength: number}>}
 */
export async function extractUrlText(url, onProgress) {
  // SSRF validation
  if (!validateUrlForSSRF(url)) {
    throw new Error('허용되지 않는 URL입니다.');
  }

  if (onProgress) onProgress('URL에서 텍스트 추출 중...');

  let lastError = null;

  for (const proxy of CORS_PROXIES) {
    try {
      const response = await fetch(proxy + encodeURIComponent(url));
      if (!response.ok) continue;

      const html = await response.text();

      // Extract text from HTML
      const doc = new DOMParser().parseFromString(html, 'text/html');

      // Remove scripts, styles, etc.
      doc
        .querySelectorAll('script, style, nav, footer, header, aside')
        .forEach((el) => el.remove());

      const text = doc.body?.textContent?.trim() || '';
      const originalLength = text.length;

      // Truncate if too long
      const truncatedText = text.substring(0, CONFIG.MAX_URL_EXTRACT_CHARS);

      return {
        text: truncatedText,
        wasTruncated: originalLength > CONFIG.MAX_URL_EXTRACT_CHARS,
        originalLength,
        extractedLength: truncatedText.length,
      };
    } catch (error) {
      lastError = error;
      continue;
    }
  }

  throw lastError || new Error('URL 텍스트 추출 실패');
}

/**
 * Validate URL for SSRF attacks
 */
function validateUrlForSSRF(url) {
  try {
    const parsed = new URL(url);

    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block localhost and internal IPs
    const blockedPatterns = [
      'localhost',
      '127.',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      '169.254.',
      '0.0.0.0',
      'metadata.google',
      '169.254.169.254',
    ];

    return !blockedPatterns.some((pattern) => hostname === pattern || hostname.startsWith(pattern));
  } catch {
    return false;
  }
}

/**
 * Upload image to R2
 * @param {File} file - Image file
 * @returns {Promise<string>} - Public URL of uploaded image
 */
export async function uploadImageToR2(file) {
  const { R2_CONFIG } = await import('../constants');

  // Validate file type
  if (!R2_CONFIG.ALLOWED_TYPES.includes(file.type)) {
    throw new Error('허용되지 않는 파일 형식입니다.');
  }

  // Validate file size
  if (file.size > R2_CONFIG.MAX_SIZE) {
    throw new Error('파일 크기가 10MB를 초과합니다.');
  }

  // Step 1: Get upload key
  const prepareResponse = await fetch(R2_CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type,
      fileSize: file.size,
    }),
  });

  if (!prepareResponse.ok) {
    const error = await prepareResponse.json();
    throw new Error(error.error || '업로드 준비 실패');
  }

  const { key, publicUrl } = await prepareResponse.json();

  // Step 2: Upload file
  const uploadResponse = await fetch(`${R2_CONFIG.WORKER_URL}/upload`, {
    method: 'PUT',
    headers: {
      'Content-Type': file.type,
      'X-Upload-Key': key,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || '업로드 실패');
  }

  return publicUrl;
}
