# AI 엔진 가이드

> OJT Master의 AI 콘텐츠 생성 시스템 아키텍처 및 사용법

## 개요

OJT Master는 **하이브리드 AI 엔진** 시스템을 사용합니다:

1. **Chrome AI (Gemini Nano)** - 1순위, Chrome 138+ 내장
2. **WebLLM** - 2순위, WebGPU 기반 fallback

모든 AI 처리는 **브라우저 내에서 로컬로** 실행되어 프라이버시가 보장됩니다.

## 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    AIProvider (Context)                  │
│                 상태 관리 및 엔진 선택                   │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
┌───────────────┐           ┌───────────────┐
│   Chrome AI   │           │    WebLLM     │
│ (Gemini Nano) │           │ (Qwen/Gemma)  │
│  Chrome 138+  │           │  WebGPU 필요  │
└───────┬───────┘           └───────┬───────┘
        │                           │
        └─────────────┬─────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│               contentGenerator.js                        │
│           섹션 구조화 + 퀴즈 생성 로직                   │
└─────────────────────────────────────────────────────────┘
```

## 파일 구조

```
src-vite/src/features/ai/
├── hooks/
│   └── AIContext.jsx       # AI 상태 관리 Context
├── services/
│   ├── chromeAI.js         # Chrome Prompt API 래퍼
│   ├── webllm.js           # WebLLM 래퍼
│   ├── contentGenerator.js # 콘텐츠 생성 로직
│   ├── quizValidator.js    # 퀴즈 검증/보완
│   └── fallbackContent.js  # 실패 시 기본 콘텐츠
└── components/
    └── AIEngineSelector.jsx # 엔진 선택 UI (선택적)
```

## Chrome AI (Gemini Nano)

### 요구사항
- Chrome 138 이상
- `window.ai.languageModel` API 지원

### 상태 흐름

```
NOT_SUPPORTED → NOT_DOWNLOADED → DOWNLOADING → READY
      │               │              │           │
   미지원        다운로드 필요    진행 중      사용 가능
```

### 사용 예시

```javascript
import {
  checkChromeAISupport,
  createChromeAISession,
  generateWithChromeAI,
  CHROME_AI_STATUS,
} from '@features/ai/services/chromeAI';

// 1. 지원 여부 확인
const isSupported = await checkChromeAISupport();

// 2. 세션 생성
const session = await createChromeAISession({
  temperature: 0.3,
  topK: 40,
  onProgress: (progress) => console.log(`다운로드: ${progress}%`),
});

// 3. 텍스트 생성
const response = await generateWithChromeAI('한국의 수도는?');
console.log(response); // "서울입니다."
```

### 설정값 (constants.js)

```javascript
export const CHROME_AI_CONFIG = {
  TEMPERATURE: 0.3,
  TOP_K: 40,
  MIN_CHROME_VERSION: 138,
  MODEL_NAME: 'Gemini Nano',
};
```

## WebLLM (Fallback)

### 요구사항
- WebGPU 지원 브라우저 (Chrome 113+, Edge 113+)
- 충분한 GPU 메모리 (최소 4GB 권장)

### 사용 가능한 모델

| 모델 ID | 이름 | 크기 | 권장 |
|---------|------|------|------|
| `Qwen2.5-3B-Instruct-q4f16_1-MLC` | Qwen 2.5 3B | 2.4GB | ✅ 기본 |
| `gemma-2-2b-it-q4f16_1-MLC` | Gemma 2 2B | 1.8GB | 저사양용 |
| `Llama-3.2-3B-Instruct-q4f16_1-MLC` | Llama 3.2 3B | 2.1GB | 영어 중심 |
| `Qwen2.5-0.5B-Instruct-q4f16_1-MLC` | Qwen 2.5 0.5B | 0.5GB | 테스트용 |

### 사용 예시

```javascript
import {
  initWebLLM,
  generateWithWebLLM,
  checkWebGPUSupport,
  getWebLLMStatus,
} from '@features/ai/services/webllm';

// 1. WebGPU 지원 확인
const hasWebGPU = await checkWebGPUSupport();

// 2. 엔진 초기화
await initWebLLM('Qwen2.5-3B-Instruct-q4f16_1-MLC', (progress) => {
  console.log(progress); // "모델 로딩 중... 45%"
});

// 3. 상태 확인
const status = getWebLLMStatus();
console.log(status); // { loaded: true, model: 'Qwen2.5-3B...', progress: 100 }

// 4. 콘텐츠 생성
const result = await generateWithWebLLM(
  contentText,
  '문서 제목',
  (progress) => console.log(progress),     // 진행률
  (chunk) => console.log('스트리밍:', chunk), // 스트리밍
);
```

### 설정값 (constants.js)

```javascript
export const WEBLLM_CONFIG = {
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  FALLBACK_MODEL: 'gemma-2-2b-it-q4f16_1-MLC',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
};
```

## AIContext 사용법

### Provider 설정 (main.jsx)

```jsx
import { AIProvider } from '@features/ai/hooks/AIContext';

<AIProvider>
  <App />
</AIProvider>
```

### Hook 사용

```jsx
import { useAI } from '@features/ai/hooks/AIContext';

function MyComponent() {
  const {
    // 상태
    aiStatus,      // 전체 상태 객체
    isSupported,   // Chrome AI 지원 여부
    isReady,       // 사용 준비 완료
    isLoading,     // 로딩 중
    error,         // 에러 메시지

    // 액션
    loadAI,        // AI 엔진 로드
    unloadAI,      // AI 엔진 해제
    refreshStatus, // 상태 새로고침

    // 상수
    CHROME_AI_STATUS,
    CHROME_AI_CONFIG,
  } = useAI();

  const handleLoad = async () => {
    try {
      await loadAI();
      console.log('AI 준비 완료!');
    } catch (err) {
      console.error('AI 로드 실패:', err.message);
    }
  };

  return (
    <div>
      <p>상태: {isReady ? '준비됨' : isLoading ? '로딩 중...' : '미준비'}</p>
      <button onClick={handleLoad} disabled={isLoading || isReady}>
        AI 로드
      </button>
    </div>
  );
}
```

## 콘텐츠 생성 (contentGenerator)

### 생성 흐름

```
입력 텍스트 → AI 프롬프트 → JSON 응답 → 파싱 → 검증/보완 → 결과
```

### 출력 형식

```javascript
{
  title: "문서 제목",
  team: "팀명",
  sections: [
    { title: "학습 목표", content: "<p>HTML 내용...</p>" },
    { title: "핵심 내용", content: "<ul><li>항목 1</li></ul>" },
    // 4-6개 섹션
  ],
  quiz: [
    {
      question: "문제 내용",
      options: ["선택지 A", "선택지 B", "선택지 C", "선택지 D"],
      correct: 0,  // 정답 인덱스
      answer: "선택지 A"  // 정답 텍스트
    },
    // 10개 퀴즈
  ],
  ai_engine: "chromeai" // 또는 "webllm"
}
```

### 퀴즈 구성 비율

- **기억형 (40%)**: 핵심 용어, 정의
- **이해형 (35%)**: 개념 관계, 비교
- **적용형 (25%)**: 실무 상황 판단

## 에러 처리

### Chrome AI 에러 타입

```javascript
import { CHROME_AI_ERROR_TYPES } from '@features/ai/services/chromeAI';

// NOT_SUPPORTED - 브라우저 미지원
// DOWNLOAD_FAILED - 모델 다운로드 실패
// SESSION_FAILED - 세션 생성 실패
// GENERATION_FAILED - 생성 실패
```

### WebLLM 에러 타입

```javascript
import { WEBLLM_ERROR_TYPES, classifyWebLLMError } from '@features/ai/services/webllm';

// WEBGPU_NOT_SUPPORTED - WebGPU 미지원
// NETWORK_ERROR - 네트워크 오류
// OUT_OF_MEMORY - 메모리 부족
// MODEL_LOAD_FAILED - 모델 로드 실패
// GENERATION_FAILED - 생성 실패
```

### 에러 분류 및 사용자 안내

```javascript
try {
  await initWebLLM(modelId);
} catch (error) {
  const classified = classifyWebLLMError(error);
  console.log(classified.type);     // 'OUT_OF_MEMORY'
  console.log(classified.message);  // '메모리가 부족합니다.'
  console.log(classified.fallback); // 'Gemma 2B 모델로 전환해보세요.'
}
```

## 테스트

### 독립 테스트 파일

`test-webllm.html` - WebLLM 전용 테스트 페이지

```bash
npx serve . -p 8080
# http://localhost:8080/test-webllm.html
```

### 브라우저 콘솔 테스트

```javascript
// Chrome AI 테스트
const caps = await window.ai?.languageModel?.capabilities();
console.log(caps?.available); // 'readily', 'after-download', 'no'

// WebGPU 테스트
const adapter = await navigator.gpu?.requestAdapter();
console.log(!!adapter); // true/false
```

## 트러블슈팅

자세한 트러블슈팅은 [DEBUG_GUIDE.md](../DEBUG_GUIDE.md#ai-엔진-트러블슈팅-issue-96) 참조

### 빠른 체크리스트

- [ ] Chrome 버전 138 이상인가?
- [ ] WebGPU가 지원되는 브라우저인가?
- [ ] GPU 드라이버가 최신인가?
- [ ] 인터넷 연결이 안정적인가?
- [ ] GPU 메모리가 충분한가? (4GB+ 권장)

## 관련 이슈

- [#96](https://github.com/garimto81/ggp-ojt-v2/issues/96) - Chrome Prompt API 통합
- [#62](https://github.com/garimto81/ggp-ojt-v2/issues/62) - WebLLM Service Worker
- [#45](https://github.com/garimto81/ggp-ojt-v2/issues/45) - WebLLM 초기 통합
