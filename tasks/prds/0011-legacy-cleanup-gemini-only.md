# PRD-0011: 레거시 정리 - Gemini 단일 엔진 전환

> **Issue**: #199, #27, #50, #126
> **Status**: Draft
> **Author**: Claude Code
> **Created**: 2025-12-11
> **Priority**: High

## 1. 개요

### 1.1 배경

OJT Master 프로젝트는 여러 차례 AI 엔진 마이그레이션을 거쳤습니다:
- v2.8.0 이전: vLLM (외부 서버)
- v2.8.0~현재: Gemini API + WebLLM (이중 구조)
- **목표**: Gemini API 단일 엔진

현재 코드에 WebLLM 관련 레거시 코드가 남아있어:
1. Header에 "AI 오프라인" 잘못 표시 (#199)
2. 불필요한 복잡성 (AIEngineSelector, webllm.js 등)
3. 문서(CLAUDE.md)와 코드 불일치

### 1.2 목표

1. WebLLM 관련 코드 완전 제거
2. AIContext/Header를 Gemini 전용으로 단순화
3. 문서 업데이트 (CLAUDE.md)
4. 관련 이슈 정리

### 1.3 범위

| 구분 | 대상 | 작업 |
|------|------|------|
| 삭제 | `utils/webllm.js` | 파일 삭제 |
| 삭제 | `features/ai/services/webllm.js` | 파일 삭제 |
| 삭제 | `features/ai/components/AIEngineSelector.jsx` | 파일 삭제 |
| 수정 | `contexts/AIContext.jsx` | Gemini 전용 단순화 |
| 수정 | `constants.js` | WEBLLM_CONFIG 제거 |
| 수정 | `utils/api.js` | WebLLM 분기 제거 |
| 수정 | `App.jsx` | AIContext 사용 단순화 |
| 수정 | `shared/layouts/Header.jsx` | Gemini 상태 표시 |
| 수정 | `components/Header.jsx` | Gemini 상태 표시 |
| 수정 | `ContentInputPanel.jsx` | WebLLM 옵션 제거 |
| 수정 | `features/ai/index.js` | WebLLM export 제거 |
| 문서 | `CLAUDE.md` | Gemini 단일 엔진 문서화 |

---

## 2. 기능 요구사항

### 2.1 AIContext 단순화 (FR-011-1)

**Before (현재):**
```javascript
// 복잡한 이중 엔진 구조
const [engine, setEngine] = useState('gemini');
const [webllmStatus, setWebllmStatus] = useState({...});
const [webgpuSupported, setWebgpuSupported] = useState(null);
const [selectedModel, setSelectedModel] = useState(WEBLLM_CONFIG.DEFAULT_MODEL);
```

**After (목표):**
```javascript
// Gemini 전용 단순 구조
import { useState, useEffect, createContext, useContext } from 'react';
import { checkAIStatus } from '@/utils/api';

const AIContext = createContext(null);

export function AIProvider({ children }) {
  const [aiStatus, setAiStatus] = useState({
    online: false,
    model: '',
    latency: null,
    error: null,
  });

  // 1분마다 Gemini 상태 확인
  useEffect(() => {
    const checkStatus = async () => {
      const status = await checkAIStatus();
      setAiStatus(status);
    };

    checkStatus();
    const interval = setInterval(checkStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AIContext.Provider value={{ aiStatus }}>
      {children}
    </AIContext.Provider>
  );
}

export function useAI() {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error('useAI must be used within AIProvider');
  }
  return context;
}
```

### 2.2 Header AI 상태 표시 (FR-011-2)

**Before:**
```jsx
<span>{aiStatus.online ? 'Gemini 온라인' : 'AI 오프라인'}</span>
```

**After:**
```jsx
import { useAI } from '@features/ai';

export default function Header() {
  const { aiStatus } = useAI();

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${
        aiStatus.online ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span className="text-sm text-gray-600">
        {aiStatus.online
          ? `Gemini (${aiStatus.latency}ms)`
          : 'Gemini 오프라인'}
      </span>
    </div>
  );
}
```

### 2.3 api.js 단순화 (FR-011-3)

**Before:**
```javascript
export async function generateOJTContent(
  contentText, title, stepNumber, totalSteps, onProgress, options = {}
) {
  const { engine = 'gemini', fallbackEnabled = true } = options;

  // WebLLM 분기
  if (engine === 'webllm') {
    try {
      const { generateWithWebLLM } = await import('./webllm.js');
      // ...
    } catch (error) {
      if (!fallbackEnabled) throw error;
    }
  }

  // Gemini 호출
  return geminiGenerateOJTContent({...});
}
```

**After:**
```javascript
export async function generateOJTContent(
  contentText, title, stepNumber, totalSteps, onProgress
) {
  // Gemini 직접 호출 (단일 엔진)
  return geminiGenerateOJTContent({
    contentText,
    title,
    onProgress,
    options: { stepNumber, totalSteps, quizCount: 20 }
  });
}
```

### 2.4 constants.js 정리 (FR-011-4)

**제거 항목:**
```javascript
// 삭제
export const WEBLLM_CONFIG = {
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
  AVAILABLE_MODELS: [...],
};

// 삭제
export const AI_ENGINE_CONFIG = {
  DEFAULT_ENGINE: 'gemini',
  FALLBACK_ENABLED: true,
  STORAGE_KEY: 'ojt_ai_engine',
};
```

**유지 항목:**
```javascript
// Gemini API 설정 (유지)
export const GEMINI_CONFIG = {
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  MODEL: 'gemini-2.0-flash-exp',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};
```

---

## 3. 기술 설계

### 3.1 파일 삭제 목록

```
src-vite/src/
├── utils/
│   └── webllm.js                    # 삭제
├── features/ai/
│   ├── services/
│   │   └── webllm.js                # 삭제
│   └── components/
│       └── AIEngineSelector.jsx     # 삭제
```

### 3.2 파일 수정 목록

| 파일 | 변경 내용 |
|------|----------|
| `contexts/AIContext.jsx` | WebLLM 상태/함수 제거, Gemini 상태만 관리 |
| `constants.js` | WEBLLM_CONFIG, AI_ENGINE_CONFIG 제거 |
| `utils/api.js` | engine 옵션 제거, Gemini 직접 호출 |
| `App.jsx` | 기존 aiStatus 로직을 AIContext로 통합 |
| `shared/layouts/Header.jsx` | useAI() 사용, Gemini 상태 표시 |
| `components/Header.jsx` | useAI() 사용, Gemini 상태 표시 |
| `ContentInputPanel.jsx` | engine 옵션 제거, AIEngineSelector import 제거 |
| `ContentInputPanel.test.jsx` | WebLLM mock 제거 |
| `features/ai/index.js` | AIEngineSelector export 제거 |

### 3.3 의존성 제거

**package.json에서 제거:**
```json
{
  "dependencies": {
    "@mlc-ai/web-llm": "^0.2.80"  // 삭제
  }
}
```

---

## 4. 구현 계획

### Phase 1: 파일 삭제 (10분)

1. `utils/webllm.js` 삭제
2. `features/ai/services/webllm.js` 삭제
3. `features/ai/components/AIEngineSelector.jsx` 삭제

### Phase 2: AIContext 단순화 (15분)

1. `contexts/AIContext.jsx` 재작성 (Gemini 전용)
2. `features/ai/index.js` 수정 (AIEngineSelector 제거)
3. `constants.js` 정리 (WEBLLM_CONFIG 제거)

### Phase 3: 컴포넌트 수정 (20분)

1. `App.jsx` - aiStatus 로직을 AIContext로 이동
2. `Header.jsx` (shared/layouts) - useAI() 사용
3. `Header.jsx` (components) - useAI() 사용
4. `ContentInputPanel.jsx` - engine 옵션 제거

### Phase 4: API 단순화 (10분)

1. `utils/api.js` - WebLLM 분기 제거

### Phase 5: 테스트 및 문서 (15분)

1. `ContentInputPanel.test.jsx` 수정
2. `npm run test:run` 실행
3. `npm run lint:fix` 실행
4. `npm run build` 검증
5. `CLAUDE.md` 업데이트

### Phase 6: 의존성 정리 (5분)

1. `pnpm remove @mlc-ai/web-llm`
2. `pnpm install` 검증

**총 예상 소요 시간**: 75분

---

## 5. 테스트 계획

### 5.1 단위 테스트

| 테스트 | 파일 | 검증 항목 |
|--------|------|----------|
| AIContext | AIContext.test.jsx (신규) | Gemini 상태 관리 |
| ContentInputPanel | ContentInputPanel.test.jsx | WebLLM 옵션 제거 확인 |
| api.js | api.test.js | generateOJTContent 단순화 |

### 5.2 빌드 검증

```bash
npm run lint:fix
npm run build
```

### 5.3 수동 검증

1. Header에 "Gemini 온라인" 표시 확인
2. 콘텐츠 생성 기능 정상 동작
3. AIEngineSelector UI 제거 확인

---

## 6. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 숨겨진 WebLLM 참조 | 빌드 실패 | grep으로 전체 검색 후 제거 |
| AIContext 의존 컴포넌트 | 런타임 에러 | Provider 계층 확인 |
| 테스트 실패 | CI 실패 | mock 업데이트 |

---

## 7. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| WebLLM 참조 | 0개 | `grep -r "webllm\|WebLLM"` |
| 빌드 성공 | 통과 | `npm run build` |
| 테스트 통과 | 100% | `npm run test:run` |
| 번들 크기 감소 | -500KB+ | web-llm 제거 효과 |

---

## 8. 관련 이슈

| 이슈 | 제목 | 처리 |
|------|------|------|
| #199 | AI 상태 표시가 항상 '오프라인'으로 표시됨 | 해결 |
| #27 | Audit docs for legacy Gemini references | 해결 |
| #50 | Remove Gemini assistant in menu | 해결 |
| #126 | Archive deprecated tooling | 부분 해결 |

---

## 9. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| 작성자 | Claude Code | 2025-12-11 |
| 검토자 | - | - |
| 승인자 | - | - |
