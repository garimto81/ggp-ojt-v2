# PRD 0006: Gemini API Cloud Fallback (Phase 2)

**Version**: 1.0
**Date**: 2025-12-08
**Author**: Claude Code
**Status**: Draft
**Related Issue**: #96

---

## 1. 개요

### 1.1 배경
Issue #96에서 WebLLM의 느린 로드 시간 문제를 해결하기 위해 Chrome Prompt API (Gemini Nano)를 1순위 대안으로 구현했습니다. 그러나 Chrome 138+ 미지원 브라우저 사용자나 WebGPU 미지원 환경에서는 여전히 AI 기능을 사용할 수 없습니다.

Phase 2에서는 Gemini API (Cloud)를 추가 폴백으로 구현하여, 브라우저 내 AI 엔진을 사용할 수 없는 경우에도 클라우드 API를 통해 AI 기능을 제공합니다.

### 1.2 목적
- 모든 사용자에게 AI 기능 제공 (브라우저 제약 없음)
- 네트워크 연결만 있으면 동작하는 폴백 옵션
- 유료 API 비용을 최소화하기 위한 스마트 라우팅

### 1.3 현재 AI 엔진 우선순위
1. **Chrome AI (Gemini Nano)** - 브라우저 내장, 무료, Chrome 138+
2. **WebLLM** - 브라우저 내 LLM, 무료, WebGPU 필요
3. **[NEW] Gemini API (Cloud)** - 클라우드 API, 유료, 네트워크 필요

---

## 2. 기능 요구사항

### 2.1 FR-001: Gemini API 서비스 모듈
```javascript
// src/features/ai/services/geminiAPI.js
export async function generateWithGeminiAPI(prompt, options);
export async function checkGeminiAPIStatus();
export function getGeminiAPIConfig();
```

**요구사항**:
- Gemini 2.0 Flash 또는 1.5 Flash 모델 사용 (비용 효율)
- API 키는 환경 변수로 관리 (`VITE_GEMINI_API_KEY`)
- Rate limiting 및 에러 핸들링
- 응답 스트리밍 지원

### 2.2 FR-002: API 키 관리
- 클라이언트 사이드에서 API 키 노출 최소화
- 선택사항: Supabase Edge Function 프록시로 보안 강화
- 사용량 모니터링 및 일일 한도 설정

### 2.3 FR-003: 스마트 엔진 라우팅
```javascript
// 우선순위 로직
1. Chrome AI (ready) → 사용
2. Chrome AI (download 필요) + WebLLM (cached) → WebLLM 사용
3. WebLLM (loaded) → 사용
4. Gemini API (configured) → 사용
5. 모두 실패 → Fallback Content (원문 그대로)
```

### 2.4 FR-004: 사용자 설정
- 관리자가 Gemini API 활성화/비활성화 가능
- API 키 설정 UI (관리자 전용)
- 일일 사용량 한도 설정

### 2.5 FR-005: 사용량 추적
```sql
-- admin_settings에 추가
- gemini_api_enabled: boolean
- gemini_api_key: encrypted string
- gemini_daily_limit: number (default: 100)
- gemini_daily_usage: number (자동 리셋)
```

---

## 3. 기술 스펙

### 3.1 Gemini API 호출 예시
```javascript
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

const response = await fetch(GEMINI_API_URL + '?key=' + apiKey, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 4096,
    }
  })
});
```

### 3.2 비용 최적화
| 모델 | Input (1M tokens) | Output (1M tokens) |
|------|------------------|-------------------|
| Gemini 2.0 Flash | $0.10 | $0.40 |
| Gemini 1.5 Flash | $0.075 | $0.30 |

예상 비용: 콘텐츠 1개 생성 당 약 $0.001~$0.005

### 3.3 보안 고려사항
1. **클라이언트 직접 호출** (간단, 보안 낮음)
   - API 키가 브라우저에서 노출될 수 있음
   - 개발/테스트 환경에 적합

2. **Supabase Edge Function 프록시** (권장, 보안 높음)
   - API 키는 서버에만 저장
   - Rate limiting 서버에서 처리
   - 프로덕션 권장

---

## 4. AIContext 수정 (확장)

```javascript
// constants.js 추가
export const GEMINI_API_CONFIG = {
  MODEL: 'gemini-2.0-flash',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
  DAILY_LIMIT: 100,
};

// AI_ENGINE_CONFIG 수정
export const AI_ENGINE_CONFIG = {
  ENGINES: {
    CHROME_AI: 'chromeai',
    WEBLLM: 'webllm',
    GEMINI_API: 'geminiapi', // 추가
  },
  DEFAULT_ENGINE: 'auto',
  STORAGE_KEY: 'ojt_ai_engine',
};
```

---

## 5. UI 변경사항

### 5.1 AIEngineSelector 수정
- Gemini API 상태 표시 (설정됨/미설정)
- API 키 미설정 시 안내 메시지

### 5.2 관리자 설정 페이지
```jsx
// SystemSettings.jsx 추가
<div className="space-y-2">
  <label>Gemini API 설정</label>
  <input
    type="password"
    placeholder="API Key"
    value={geminiApiKey}
    onChange={...}
  />
  <input
    type="number"
    placeholder="일일 한도"
    value={dailyLimit}
    onChange={...}
  />
</div>
```

---

## 6. 구현 계획

### Phase 2-1: 기본 구현 (2-3시간)
1. `geminiAPI.js` 서비스 모듈 생성
2. `AIContext` 확장 (Gemini API 상태 추가)
3. `contentGenerator.js` 연동

### Phase 2-2: 관리자 설정 (1-2시간)
1. `admin_settings` 테이블 스키마 추가
2. `SystemSettings.jsx` UI 추가
3. API 키 암호화 저장

### Phase 2-3: 보안 강화 (선택, 2-3시간)
1. Supabase Edge Function 프록시 구현
2. Rate limiting 서버 사이드 처리
3. 사용량 모니터링 대시보드

---

## 7. 테스트 계획

### 7.1 단위 테스트
- `geminiAPI.js` API 호출 테스트
- 에러 핸들링 테스트
- Rate limiting 테스트

### 7.2 통합 테스트
- 엔진 자동 선택 로직 테스트
- 폴백 시나리오 테스트
- 사용량 추적 테스트

### 7.3 E2E 테스트
- Chrome AI → Gemini API 폴백 시나리오
- API 키 미설정 시 동작

---

## 8. 리스크 및 완화

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| API 비용 초과 | 높음 | 일일 한도 설정, 사용량 알림 |
| API 키 노출 | 높음 | Edge Function 프록시 사용 |
| API 다운타임 | 중간 | 재시도 로직, 캐싱 |
| Rate Limit | 중간 | 요청 큐잉, 백오프 |

---

## 9. 성공 지표

- [ ] Chrome AI 미지원 브라우저에서도 AI 기능 동작
- [ ] API 비용이 일일 한도 내에서 유지
- [ ] 평균 응답 시간 5초 이내
- [ ] 에러율 1% 미만

---

## 10. 참고 자료

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini API Pricing](https://ai.google.dev/pricing)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
