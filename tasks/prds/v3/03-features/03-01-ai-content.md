# 03-01. AI Content Generation

> **Parent**: [Master PRD](../00-master-prd.md) | **Version**: 3.0.0

## 3.1.1 Overview

AI 콘텐츠 생성 엔진은 비정형 입력(텍스트, PDF, URL)을 구조화된 교육 자료와 퀴즈로 변환합니다.

### Engine Priority

```
┌─────────────────────────────────────────────────┐
│  1. Gemini API (Primary)                        │
│     - gemini-2.0-flash-exp                      │
│     - Server-side API call                      │
│     - 빠른 응답, 높은 품질                        │
└────────────────────┬────────────────────────────┘
                     │ (API 실패/할당량 초과)
                     ▼
┌─────────────────────────────────────────────────┐
│  2. WebLLM (Fallback)                           │
│     - Qwen 2.5 3B (기본, 한국어 우수)            │
│     - Gemma 2 2B (저사양용)                      │
│     - Browser-side, WebGPU 필요                 │
└─────────────────────────────────────────────────┘
```

---

## 3.1.2 Input Types

### Text Input (직접 작성)

| 필드 | 설명 |
|------|------|
| `title` | 문서 제목 |
| `team` | 팀/부서 |
| `rawContent` | 비정형 텍스트 (메모, 설명 등) |

**처리 흐름**:
```
rawContent → AI Prompt → Structured Sections + Quiz
```

### URL Input

| 필드 | 설명 |
|------|------|
| `sourceUrl` | 웹페이지 URL |

**처리 흐름**:
```
URL → CORS Proxy → HTML → Text Extract (max 15,000 chars)
    → AI Prompt → Structured Sections + Quiz
```

**CORS Proxy 우선순위**:
1. R2 Worker Proxy (`/proxy` endpoint)
2. `allorigins.win` (fallback)
3. `corsproxy.io` (fallback)

### PDF Input

| 필드 | 설명 |
|------|------|
| `sourceFile` | PDF 파일명 (R2 저장) |
| `pdfText` | 추출된 텍스트 |

**처리 흐름**:
```
PDF File → pdfjs-dist → Text Extract → AI Prompt
         → Structured Sections + Quiz
```

---

## 3.1.3 Output Structure

### Sections (교육 콘텐츠)

```typescript
interface Section {
  title: string;        // 섹션 제목
  content: string;      // 본문 (HTML 허용)
  keyPoints: string[];  // 핵심 포인트 (3-5개)
  order: number;        // 순서
}
```

**AI 생성 규칙**:
- 3-7개 섹션으로 구성
- 각 섹션 500-1500자
- 핵심 포인트 bullet point 형식

### Quiz (퀴즈 문항)

```typescript
interface QuizQuestion {
  id: string;
  question: string;     // 질문
  options: string[];    // 4지선다 보기
  correctIndex: number; // 정답 인덱스 (0-3)
  explanation: string;  // 해설
  difficulty: 'easy' | 'medium' | 'hard';
  category: 'recall' | 'comprehension' | 'application';
}
```

**AI 생성 규칙**:
- 최소 10문항, 최대 20문항
- 난이도 분포: Easy 30% / Medium 50% / Hard 20%
- 유형 분포: Recall 40% / Comprehension 35% / Application 25%

---

## 3.1.4 AI Prompts

### Content Generation Prompt

```
당신은 OJT 교육 자료 전문가입니다.
다음 텍스트를 신입사원을 위한 체계적인 교육 자료로 변환해주세요.

## 입력 텍스트
{rawContent}

## 출력 형식 (JSON)
{
  "sections": [
    {
      "title": "섹션 제목",
      "content": "본문 내용",
      "keyPoints": ["핵심1", "핵심2", "핵심3"]
    }
  ]
}

## 규칙
- 3-7개 섹션으로 구성
- 서론-본론-결론 구조
- 비속어/은어를 표준 용어로 변환
- 실무 예시 포함
```

### Quiz Generation Prompt

```
다음 교육 자료를 바탕으로 4지선다 퀴즈를 생성해주세요.

## 교육 자료
{sections}

## 출력 형식 (JSON)
{
  "quiz": [
    {
      "question": "질문",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctIndex": 0,
      "explanation": "해설",
      "difficulty": "medium",
      "category": "comprehension"
    }
  ]
}

## 규칙
- 10-20문항 생성
- 난이도 분포 준수
- 오답도 그럴듯하게 작성
- 해설은 왜 정답인지 명확히
```

---

## 3.1.5 Error Handling

| 에러 | 대응 |
|------|------|
| Gemini API 실패 | WebLLM fallback |
| WebLLM 미지원 | 에러 메시지 표시 |
| JSON 파싱 실패 | Regex fallback으로 필드 추출 |
| 퀴즈 부족 (< 4문항) | `createPlaceholderQuiz()` 호출 |
| CORS 차단 | 다음 프록시로 순차 시도 |
| 토큰 한도 초과 | 입력 텍스트 truncate (15,000자) |

---

## 3.1.6 Configuration

```javascript
// constants.js
export const CONFIG = {
  AI_TEMPERATURE: 0.3,
  AI_MAX_TOKENS: 8192,
  AI_RETRY_TIMEOUT: 30000,
  MAX_URL_EXTRACT_CHARS: 15000,
};

export const GEMINI_CONFIG = {
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  MODEL: 'gemini-2.0-flash-exp',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};

export const WEBLLM_CONFIG = {
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  FALLBACK_MODEL: 'gemma-2-2b-it-q4f16_1-MLC',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
};
```

---

## Related Documents

- [Quiz System](./03-02-quiz-system.md)
- [Tech Stack](../05-tech-stack.md)
- [API Specification](../06-api-spec.md)
