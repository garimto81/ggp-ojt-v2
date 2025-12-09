# AI Domain Agent Rules

**Version**: 1.0.0 | **Domain**: AI | **Level**: 1

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | AI 엔진 관리 전문가 |
| **Scope** | Gemini API, WebLLM, Chrome AI 관리 |
| **Managed Blocks** | `ai.engine`, `ai.gemini`, `ai.webllm` |

---

## Block Responsibilities

### ai.engine

| 항목 | 내용 |
|------|------|
| **책임** | 엔진 선택, 상태 관리, Fallback |
| **입력** | `{ preferredEngine?: 'chromeai' \| 'webllm' }` |
| **출력** | `{ currentEngine: string, status: string }` |
| **파일** | `AIContext.jsx`, `AIEngineSelector.jsx` |

### ai.gemini (현재 비활성)

| 항목 | 내용 |
|------|------|
| **책임** | Gemini API 호출 |
| **입력** | `{ prompt: string, config?: {} }` |
| **출력** | `{ text: string, usage: {} }` |
| **상태** | v2.8.0 롤백으로 비활성 |

### ai.webllm

| 항목 | 내용 |
|------|------|
| **책임** | 브라우저 내 LLM 실행 |
| **입력** | `{ prompt: string, model?: string }` |
| **출력** | `{ text: string, modelId: string }` |
| **파일** | `webllm.js`, `AIContext.jsx` |

---

## Engine Priority (v2.12+)

```
1. Chrome AI (Gemini Nano) - Chrome 138+ 내장
   ↓ 미지원 시
2. WebLLM - 브라우저 내 LLM (WebGPU 필요)
   ↓ 실패 시
3. 에러 표시 - AI 기능 비활성화
```

---

## Dependencies

### Internal

```javascript
import { useToast } from '@/contexts/ToastContext';
```

### External

- `@anthropic/webllm`: WebLLM 라이브러리 (또는 직접 import)

### Cross-Domain

- `content-domain`: 콘텐츠 생성 요청 수신
- AI 응답을 content-domain으로 반환

---

## Constraints

### DO

- ✅ 엔진 상태는 `AIContext`에서만 관리
- ✅ WebLLM 모델 다운로드 진행률 표시
- ✅ 타임아웃 설정 (기본 60초)
- ✅ 메모리 부족 시 작은 모델로 전환
- ✅ 모델 캐시 활용 (IndexedDB)

### DON'T

- ❌ API 키 클라이언트 노출 (환경 변수 사용)
- ❌ 무한 재시도 (최대 2회)
- ❌ 대용량 프롬프트 전송 (토큰 제한 확인)
- ❌ 여러 모델 동시 로드 (메모리 문제)

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AI ENGINE FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  content-domain (콘텐츠 생성 요청)                            │
│       │                                                      │
│       ▼                                                      │
│  ai.engine → 현재 엔진 확인                                   │
│       │                                                      │
│       ├─── Chrome AI 사용 가능? ───▶ ai.chromeai              │
│       │           │                      │                   │
│       │           No                     ▼                   │
│       │           │               Gemini Nano 호출            │
│       │           ▼                      │                   │
│       │     WebGPU 지원? ───▶ ai.webllm  │                   │
│       │           │              │       │                   │
│       │           No             ▼       │                   │
│       │           │         WebLLM 호출  │                   │
│       │           ▼              │       │                   │
│       │     에러 반환 ◀──────────┴───────┘                   │
│       │                                                      │
│       ▼                                                      │
│  AI 응답 → content-domain 반환                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## WebLLM Configuration

### 기본 모델

```javascript
export const WEBLLM_CONFIG = {
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',  // 한국어 우수
  FALLBACK_MODEL: 'gemma-2-2b-it-q4f16_1-MLC',      // 저사양용
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
};
```

### 모델 선택 기준

| 조건 | 선택 모델 |
|------|----------|
| VRAM 4GB+ | Qwen 2.5 3B (2.4GB) |
| VRAM 2-4GB | Gemma 2 2B (1.8GB) |
| VRAM < 2GB | 에러 (WebLLM 불가) |

### 상태 흐름

```
CHECKING → NOT_SUPPORTED (WebGPU 미지원)
    ↓
DOWNLOADING → 모델 다운로드 중 (진행률 표시)
    ↓
READY → 사용 가능
    ↓
GENERATING → 텍스트 생성 중
    ↓
READY (완료) / ERROR (실패)
```

---

## Chrome AI Configuration

### 상태 흐름

```
NOT_SUPPORTED → Chrome 138 미만 또는 미지원 플랫폼
    ↓
NOT_DOWNLOADED → 모델 미다운로드 (window.ai.languageModel.create() 필요)
    ↓
DOWNLOADING → 모델 다운로드 중
    ↓
READY → 사용 가능
```

### 사용 코드

```javascript
const session = await window.ai.languageModel.create({
  temperature: 0.3,
  topK: 40,
});
const response = await session.prompt(userPrompt);
```

---

## Error Codes

| Code | 의미 | 처리 |
|------|------|------|
| `AI_ENGINE_NOT_AVAILABLE` | 사용 가능한 엔진 없음 | 수동 입력 유도 |
| `AI_WEBGPU_NOT_SUPPORTED` | WebGPU 미지원 | Chrome AI 시도 또는 안내 |
| `AI_MODEL_DOWNLOAD_FAILED` | 모델 다운로드 실패 | 재시도 버튼 표시 |
| `AI_TIMEOUT` | 생성 시간 초과 | 작은 모델로 재시도 |
| `AI_OUT_OF_MEMORY` | 메모리 부족 | 브라우저 재시작 안내 |
| `AI_PARSE_FAILED` | JSON 파싱 실패 | Regex fallback |

---

## Testing Guidelines

### Unit Tests

```javascript
describe('ai.engine', () => {
  it('should detect WebGPU support', () => {});
  it('should fallback from Chrome AI to WebLLM', async () => {});
});

describe('ai.webllm', () => {
  it('should load model successfully', async () => {});
  it('should generate text with correct format', async () => {});
});
```

### Mocking Rules

- ✅ `navigator.gpu` Mock (WebGPU 지원 여부)
- ✅ `window.ai` Mock (Chrome AI 지원 여부)
- ✅ WebLLM engine Mock
- ❌ 실제 모델 로드 테스트는 E2E에서만

---

## Performance Considerations

1. **모델 캐싱**: IndexedDB에 모델 저장 (재다운로드 방지)
2. **지연 로딩**: AI 기능 사용 시점에 모델 로드
3. **진행률 표시**: 다운로드/생성 중 UX 제공
4. **메모리 관리**: 미사용 시 모델 언로드

---

## Related Files

### Current Structure

- `src-vite/src/contexts/AIContext.jsx`
- `src-vite/src/components/AIEngineSelector.jsx`
- `src-vite/src/utils/webllm.js`

### Future Structure (Vertical Slicing)

```
features/ai/
├── components/
│   └── AIEngineSelector.jsx
├── contexts/
│   └── AIContext.jsx
├── services/
│   ├── chromeAIService.js
│   └── webllmService.js
├── hooks/
│   └── useAIGeneration.js
├── index.js
└── AGENT_RULES.md
```
