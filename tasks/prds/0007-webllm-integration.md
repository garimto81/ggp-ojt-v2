# PRD-0007: 오픈소스 LLM (WebLLM) 통합

**Version**: 1.0.0
**Date**: 2025-12-05
**Author**: Claude (AI Assistant)
**Status**: Draft
**Priority**: P1 (병행 개발)
**Parallel With**: PRD-0008 (URL/PDF 최적화)

---

## 0. 병행 개발 충돌 방지 설계

### 파일 영역 분리

| 영역 | PRD-0007 (LLM) | PRD-0008 (URL/PDF) | 충돌 위험 |
|------|---------------|-------------------|----------|
| `utils/` | `webllm.js` (신규) | `cors-proxy.js` (신규) | ❌ 없음 |
| `constants.js` | `WEBLLM_CONFIG` 블록 추가 | `CORS_CONFIG` 블록 추가 | ⚠️ 순차 병합 |
| `components/` | `AIEngineSelector.jsx` (신규) | `PdfPreview.jsx` 등 | ❌ 없음 |
| `MentorDashboard.jsx` | Phase 2에서 수정 | Phase 1에서 수정 | ⚠️ 순서 준수 |

### 작업 순서

```
Week 1-2: PRD-0008 (URL/PDF)          Week 2-3: PRD-0007 (LLM)
├── PdfPreview.jsx                    ├── utils/webllm.js
├── SplitViewLayout 개선              ├── AIEngineSelector.jsx
├── MentorDashboard UI 수정 ─────────► └── MentorDashboard 통합
└── constants.js 업데이트 ─────────────► constants.js 병합
```

### 통합 지점

MentorDashboard.jsx에서 최종 통합:
```jsx
// Phase 2 완료 후 통합
<AIEngineSelector
  engine={engine}  // 'gemini' | 'webllm'
  onSwitch={handleEngineSwitch}
/>
```

---

## 1. 개요

### 1.1 목적

Google Gemini API 의존성을 줄이고, 브라우저 내 오픈소스 LLM(WebLLM)을 통해:
1. **비용 절감**: API 호출 비용 제거
2. **오프라인 지원**: 네트워크 없이도 콘텐츠 생성
3. **데이터 프라이버시**: 민감 데이터가 외부로 전송되지 않음

### 1.2 선택 솔루션: WebLLM + Qwen-2.5-3B

| 항목 | 선택 | 이유 |
|------|------|------|
| **프레임워크** | WebLLM (mlc-ai) | 31k+ stars, OpenAI API 호환, JSON Mode 지원 |
| **모델** | Qwen-2.5-3B-Instruct | 한국어 우수, 2.4GB, instruction-following 강점 |
| **대안 모델** | Gemma-3-2B-Instruct | 1.8GB, 저사양 기기용 |

### 1.3 목표

1. **하이브리드 모드**: Gemini (기본) ↔ WebLLM (선택) 전환
2. **점진적 마이그레이션**: A/B 테스트 후 기본값 변경 검토
3. **품질 유지**: 한국어 퀴즈/섹션 생성 품질 Gemini 대비 90% 이상

---

## 2. 기능 요구사항

### FR-701: WebLLM 초기화

**트리거**: 앱 로드 시 백그라운드 초기화 (사용자 선택 시)

**처리 흐름**:
```
[앱 로드]
    │
    ▼
┌────────────────────┐
│ LocalStorage 확인   │
│ prefer_local_llm   │
└────────────────────┘
    │ true
    ▼
┌────────────────────┐     ┌────────────────────┐
│ WebLLM 엔진 생성    │────▶│ 모델 다운로드      │
│ (백그라운드)        │     │ 진행률 표시        │
└────────────────────┘     └────────────────────┘
    │ 완료
    ▼
┌────────────────────┐
│ 상태: ready         │
│ AI 엔진: WebLLM     │
└────────────────────┘
```

**상태 관리**:
```javascript
// contexts/AIContext.jsx (신규)
const AIContext = {
  engine: 'gemini' | 'webllm',
  status: 'idle' | 'loading' | 'ready' | 'error',
  progress: { loaded: 0, total: 0 },
  error: null,

  switchEngine: async (engine) => {},
  generateContent: async (prompt) => {},  // 엔진별 분기
};
```

### FR-702: AI 엔진 선택 UI

**위치**: Header 또는 MentorDashboard 설정 영역

**UI**:
```
┌────────────────────────────────────────────┐
│ AI 엔진 설정                               │
├────────────────────────────────────────────┤
│ ○ Gemini API (기본, 빠름)                  │
│ ● 로컬 LLM (오프라인, 프라이버시)          │
│   └── 모델: Qwen-2.5-3B ▼                  │
│       ████████████████░░░░ 80% (1.9GB)     │
│   └── [다운로드 취소] [모델 삭제]          │
├────────────────────────────────────────────┤
│ ⚠️ 로컬 LLM은 첫 사용 시 모델 다운로드      │
│   (약 2.4GB)가 필요합니다.                 │
└────────────────────────────────────────────┘
```

### FR-703: 콘텐츠 생성 (WebLLM)

**기존 함수 수정**: `generateOJTContent()` 엔진 분기

```javascript
// utils/api.js 수정
export async function generateOJTContent(contentText, title, options = {}) {
  const engine = options.engine || getDefaultEngine();

  if (engine === 'webllm') {
    return generateWithWebLLM(contentText, title, options);
  }

  // 기존 Gemini 로직
  return generateWithGemini(contentText, title, options);
}
```

**WebLLM 전용 함수**:
```javascript
// utils/webllm.js (신규)
import * as webllm from "@mlc-ai/web-llm";

let engine = null;

export async function initWebLLM(modelId, onProgress) {
  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: onProgress,
  });
}

export async function generateWithWebLLM(contentText, title) {
  const messages = [
    {
      role: "system",
      content: "당신은 10년 경력의 기업 교육 설계 전문가입니다. 반드시 JSON 형식으로만 응답하세요."
    },
    {
      role: "user",
      content: buildOJTPrompt(contentText, title)
    }
  ];

  const response = await engine.chat.completions.create({
    messages,
    temperature: 0.3,
    max_tokens: 8192,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}
```

### FR-704: 폴백 처리

**시나리오**: WebLLM 실패 → Gemini 자동 전환

```javascript
export async function generateContentWithFallback(content, title) {
  const engine = getSelectedEngine();

  try {
    if (engine === 'webllm') {
      return await generateWithWebLLM(content, title);
    }
    return await generateWithGemini(content, title);
  } catch (error) {
    if (engine === 'webllm') {
      console.warn('WebLLM 실패, Gemini로 폴백:', error);
      showToast('로컬 AI 실패, 클라우드 AI로 전환합니다');
      return await generateWithGemini(content, title);
    }
    throw error;
  }
}
```

---

## 3. 기술 설계

### 3.1 의존성 추가

```bash
cd src-vite
npm install @mlc-ai/web-llm
```

### 3.2 파일 구조

```
src-vite/src/
├── contexts/
│   └── AIContext.jsx              # 신규: AI 엔진 상태 관리
├── utils/
│   ├── api.js                     # 수정: 엔진 분기 추가
│   └── webllm.js                  # 신규: WebLLM 래퍼
├── components/
│   └── AIEngineSelector.jsx       # 신규: 엔진 선택 UI
└── constants.js                   # 수정: WEBLLM_CONFIG 추가
```

### 3.3 constants.js 추가 (충돌 방지: 파일 끝에 추가)

```javascript
// WebLLM Configuration (PRD-0007)
export const WEBLLM_CONFIG = {
  MODELS: {
    'qwen-2.5-3b': {
      id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      name: 'Qwen 2.5 3B',
      size: '2.4GB',
      korean: 5,  // 1-5 품질 점수
    },
    'gemma-3-2b': {
      id: 'gemma-3-2b-it-q4f16_1-MLC',
      name: 'Gemma 3 2B',
      size: '1.8GB',
      korean: 4,
    },
  },
  DEFAULT_MODEL: 'qwen-2.5-3b',
  CACHE_KEY: 'webllm_model_cache',
};
```

### 3.4 Service Worker 캐싱 (선택사항)

```javascript
// public/sw-webllm.js
const CACHE_NAME = 'webllm-models-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('huggingface.co') ||
      event.request.url.includes('mlc.ai')) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        return cached || fetch(event.request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        });
      })
    );
  }
});
```

---

## 4. 비기능 요구사항

### 4.1 성능 목표

| 지표 | Gemini | WebLLM | 허용 범위 |
|------|--------|--------|----------|
| 초기화 시간 | N/A | < 30초 (첫 로드) | - |
| 토큰 생성 속도 | 50+ tok/s | 20-30 tok/s | -50% |
| 퀴즈 생성 시간 | < 30초 | < 60초 | +100% |
| 메모리 사용 | < 100MB | < 4GB | GPU VRAM |

### 4.2 브라우저 호환성

| 브라우저 | WebGPU 지원 | 상태 |
|---------|------------|------|
| Chrome 113+ | ✅ | 권장 |
| Edge 113+ | ✅ | 권장 |
| Firefox 121+ | ⚠️ | 플래그 필요 |
| Safari 18+ | ⚠️ | 제한적 |

### 4.3 저장소

| 데이터 | 위치 | 크기 |
|--------|------|------|
| 모델 가중치 | IndexedDB (Cache Storage) | 2-4GB |
| 사용자 설정 | LocalStorage | < 1KB |

---

## 5. 테스트 계획

### 5.1 단위 테스트

| 함수 | 테스트 케이스 |
|------|-------------|
| `initWebLLM` | 성공, 모델 없음 에러, 메모리 부족 |
| `generateWithWebLLM` | JSON 생성 성공, 파싱 실패 폴백 |
| `switchEngine` | Gemini → WebLLM, WebLLM → Gemini |

### 5.2 E2E 테스트

```javascript
// tests/e2e-webllm.spec.js
test('로컬 LLM으로 콘텐츠 생성', async ({ page }) => {
  // 1. 설정에서 로컬 LLM 선택
  await page.click('[data-testid="ai-settings"]');
  await page.click('[data-testid="engine-webllm"]');

  // 2. 모델 다운로드 완료 대기 (긴 타임아웃)
  await page.waitForSelector('[data-testid="webllm-ready"]', { timeout: 120000 });

  // 3. 콘텐츠 생성
  await page.fill('[data-testid="content-input"]', '테스트 내용');
  await page.click('[data-testid="generate-button"]');

  // 4. 결과 확인
  await expect(page.locator('[data-testid="quiz-list"]')).toBeVisible();
});
```

---

## 6. 구현 마일스톤

### Phase 1: 기반 구축 (Week 1)

- [ ] `@mlc-ai/web-llm` 패키지 설치
- [ ] `utils/webllm.js` 기본 래퍼 구현
- [ ] `constants.js`에 WEBLLM_CONFIG 추가
- [ ] 단위 테스트 작성

### Phase 2: UI 통합 (Week 2)

- [ ] `AIContext.jsx` 상태 관리
- [ ] `AIEngineSelector.jsx` 컴포넌트
- [ ] MentorDashboard 통합 (PRD-0008 완료 후)
- [ ] 진행률 표시 UI

### Phase 3: 품질 검증 (Week 3)

- [ ] 한국어 퀴즈 품질 A/B 테스트
- [ ] 프롬프트 튜닝
- [ ] 폴백 로직 검증
- [ ] E2E 테스트

---

## 7. 위험 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| WebGPU 미지원 브라우저 | 높음 | Gemini 강제 사용 + 안내 메시지 |
| 모델 다운로드 실패 | 중간 | 재시도 + CDN 미러 |
| 한국어 품질 저하 | 중간 | 프롬프트 튜닝 + 모델 교체 |
| 메모리 부족 | 높음 | 작은 모델 자동 선택 |

---

## 8. 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 1.0.0 | 2025-12-05 | 초안 작성 | Claude |
