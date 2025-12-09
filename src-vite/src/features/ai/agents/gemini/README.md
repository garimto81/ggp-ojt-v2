# Gemini Agent v1.0.0

**Issue**: #179
**Date**: 2025-12-10
**Status**: Active

---

## 개요

Gemini AI API 전담 에이전트입니다. OJT 콘텐츠 생성, 퀴즈 생성, AI 응답 파싱을 담당합니다.

## 역할

| 책임 | 설명 |
|------|------|
| **API 통신** | Gemini API 요청/응답 처리 |
| **프롬프트 관리** | OJT 생성용 프롬프트 템플릿 |
| **응답 파싱** | JSON 추출 및 정규화 |
| **에러 핸들링** | API 오류 복구, fallback 지원 |
| **퀴즈 검증** | 퀴즈 품질 검증 및 보완 |

---

## 디렉토리 구조

```
src/features/ai/agents/gemini/
├── README.md           # 에이전트 가이드 (본 파일)
├── index.js            # 모듈 진입점 (barrel export)
├── client.js           # Gemini API 클라이언트
├── prompts.js          # 프롬프트 템플릿
├── parser.js           # 응답 파싱 유틸리티
├── validator.js        # 퀴즈/콘텐츠 검증
└── client.test.js      # 단위 테스트
```

---

## API 설계

### 1. generateOJTContent

OJT 교육 콘텐츠 생성

```javascript
import { generateOJTContent } from '@features/ai/agents/gemini';

const result = await generateOJTContent({
  contentText: '원본 텍스트...',
  title: '문서 제목',
  onProgress: (msg) => console.log(msg),
  options: {
    temperature: 0.3,
    maxTokens: 8192,
    quizCount: 20
  }
});

// 반환값
{
  title: string,
  team: string,
  sections: Array<{title: string, content: string}>,
  quiz: Array<{question: string, options: string[], correct: number}>,
  ai_engine: 'gemini'
}
```

### 2. regenerateQuiz

특정 퀴즈 문제 재생성

```javascript
import { regenerateQuiz } from '@features/ai/agents/gemini';

const updatedQuiz = await regenerateQuiz({
  contentText: '원본 텍스트...',
  existingQuiz: [...],
  indices: [0, 3, 7],  // 재생성할 인덱스
  onProgress: (msg) => console.log(msg)
});
```

### 3. checkStatus

API 상태 확인

```javascript
import { checkStatus } from '@features/ai/agents/gemini';

const status = await checkStatus();
// { online: boolean, model: string, latency?: number }
```

---

## 환경 변수

```bash
# .env
VITE_GEMINI_API_KEY=AIza...      # Gemini API 키
VITE_GEMINI_MODEL=gemini-2.0-flash-exp  # 사용 모델
```

---

## 프롬프트 템플릿

### OJT 콘텐츠 생성

```javascript
// prompts.js
export const OJT_CONTENT_PROMPT = (title, contentText) => `
당신은 10년 경력의 기업 교육 설계 전문가입니다.

다음 텍스트를 분석하여 신입사원 OJT 교육 자료를 생성하세요.
문서 제목: "${title}"

## 출력 형식 (반드시 JSON)
{
  "title": "문서 제목",
  "team": "팀 또는 분야명",
  "sections": [...],
  "quiz": [...]
}

## 입력 텍스트
${contentText}
`;
```

---

## 에러 처리

| 에러 코드 | 원인 | 처리 |
|-----------|------|------|
| 400 | 잘못된 요청 | 프롬프트 검증 |
| 401 | API 키 오류 | 환경 변수 확인 |
| 429 | Rate Limit | 재시도 (exponential backoff) |
| 500 | 서버 오류 | WebLLM fallback |

### Fallback 체인

```
Gemini API 실패
  ↓
WebLLM 시도 (fallbackEnabled: true)
  ↓
원문 모드 (Graceful Degradation)
```

---

## 테스트

```bash
# 단위 테스트
cd src-vite
npx vitest run src/features/ai/agents/gemini/

# 통합 테스트 (API 키 필요)
VITE_GEMINI_API_KEY=xxx npm run test:run
```

---

## 마이그레이션 가이드

### 기존 코드에서 전환

```javascript
// Before: api.js에서 직접 호출
import { generateOJTContent } from '@/utils/api';

// After: gemini-agent 사용
import { generateOJTContent } from '@features/ai/agents/gemini';
```

### 호환성

- `api.js`의 기존 함수는 내부적으로 gemini-agent를 호출하도록 리팩토링
- 기존 코드 변경 없이 동작 보장

---

## 관련 문서

- `src/features/ai/README.md` - AI 기능 전체 가이드
- `docs/BLOCK_AGENT_SYSTEM.md` - 에이전트 시스템 개요
- `src/utils/webllm.js` - WebLLM fallback 구현
