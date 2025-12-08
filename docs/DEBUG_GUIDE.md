# OJT Master 디버깅 가이드

## v2.6.9 수정 사항 (Issue #34 완전 해결)

### 중앙 집중식 필드 매핑 도입

**문제**: snake_case ↔ camelCase 매핑이 여러 곳에서 중복되어 불일치 발생

**해결**: `toCamelCaseDoc()` 함수로 매핑 로직 통합 (라인 258-276)

```javascript
const toCamelCaseDoc = (doc) => {
  if (!doc) return doc;
  return {
    ...doc,
    authorId: doc.author_id ?? doc.authorId,
    author: doc.author_name ?? doc.author,
    estimatedMinutes: doc.estimated_minutes ?? doc.estimatedMinutes,
    sourceType: doc.source_type ?? doc.sourceType,
    sourceUrl: doc.source_url ?? doc.sourceUrl,
    sourceFile: doc.source_file ?? doc.sourceFile,
    createdAt: doc.created_at ?? doc.createdAt,
    updatedAt: doc.updated_at ?? doc.updatedAt,
    teamId: doc.team_id ?? doc.teamId,
  };
};
```

**적용 위치**:
- `dbGetAll()` 반환 시 자동 적용 (라인 956)
- 이후 `loadMyDocs`, `loadPublicDocs`, `handleSaveToDB`, `handleEditDoc` 등에서 중복 매핑 제거

---

## 디버깅 시스템 개요

설계 문제를 검증하기 위한 디버깅 코드가 `index.html`에 추가되었습니다.

**활성화/비활성화**: 브라우저 콘솔에서
```javascript
DEBUG.enabled = false;  // 비활성화
DEBUG.enabled = true;   // 활성화
```

## 검증 대상 문제

### 문제 1: snake_case ↔ camelCase 매핑 불일치

**가설**: `dbGetAll()` 응답이 snake_case (`author_id`)이지만 UI에서 camelCase (`authorId`)로 접근하여 필터 실패

**디버깅 포인트**:
1. `dbGetAll → ojt_docs 반환 전` - Supabase/캐시에서 가져온 원본 데이터
2. `저장 후 첫 번째 문서 (매핑 전)` - 저장 직후 새로고침 데이터
3. `매핑 후 첫 번째 문서` - 수동 매핑 적용 후 데이터

**콘솔에서 확인할 내용**:
```
🔍 [MAPPING] dbGetAll 결과 (첫 번째 문서)
  원본 객체: {...}
  author_id: ✅ (uuid-xxx)
  authorId: ❌ (undefined)
  ⚠️ 매핑 불일치 발견:
    ❌ "author_id" 있지만 "authorId" 없음 → 매핑 누락!
```

### 문제 2: 데이터 흐름 추적

**가설**: 데이터가 어느 단계에서 변형/손실되는지 확인

**디버깅 포인트**:
1. `loadMyDocs → dbGetAll 결과` - 초기 로드 시
2. `handleSaveToDB → 저장 후 dbGetAll 결과` - 저장 후
3. `handleSaveToDB → 필터링 후` - 필터 적용 후

**콘솔에서 확인할 내용**:
```
📊 [DATA FLOW] loadMyDocs → dbGetAll 결과
  데이터: [{...}, {...}]
  메타정보: { stage: '초기 로드', filter: { authorId: 'xxx' } }
  타입: Array(5)
  첫 번째 항목 키: ['id', 'title', 'author_id', ...]
```

### 문제 3: 상태 변경 추적

**가설**: viewState 전환이 예상과 다르게 동작

**디버깅 포인트**: 모든 `setViewState()` 호출

**콘솔에서 확인할 내용**:
```
🔄 [STATE] viewState 변경
  변경 전: mentor_dashboard
  변경 후: mentee_list
  트리거: at handleModeSwitch (index.html:2243)
```

### 문제 4: 렌더링 조건 검증

**가설**: `source_type`, `source_url` 필드가 존재하지만 조건문에서 false로 평가됨

**디버깅 포인트**:
1. `Mentor 미리보기 - 원문 보기 버튼`
2. `Mentee 학습 - 원문 보기 버튼`

**콘솔에서 확인할 내용**:
```
🎨 [RENDER] Mentee 학습 - 원문 보기 버튼
  selectedDoc 전체 키: ['id', 'title', 'source_type', 'source_url', ...]
  source_type: url (string)
  source_url: https://example.com (string)
  URL 조건 (source_type===url && source_url): true (boolean)
```

## 디버깅 시나리오

### 시나리오 1: URL 문서 저장 후 원문 보기 버튼 확인

1. Mentor로 로그인
2. URL 입력 → 문서 생성 → 저장
3. 콘솔에서 다음 확인:
   - `handleSaveToDB → 저장 후 dbGetAll 결과` 에서 `source_type`, `source_url` 존재 여부
   - 매핑 후 필드 유지 여부
4. 미리보기 탭에서 원문 보기 버튼 표시 여부
5. 콘솔에서 렌더링 조건 확인

### 시나리오 2: 내 문서 목록 필터링 확인

1. Mentor로 로그인
2. 콘솔에서 `loadMyDocs` 로그 확인
3. `필터링 후` 데이터에서:
   - `beforeFilter` vs `afterFilter` 비교
   - "필터 불일치" 경고 메시지 확인

### 시나리오 3: Mentee 학습 화면 확인

1. Mentee로 로그인
2. URL 자료 선택
3. 콘솔에서 `Mentee 학습 - 원문 보기 버튼` 로그 확인
4. `source_type`, `source_url` 값과 조건 결과 확인

## 디버깅 함수 설명

### DEBUG.checkFieldMapping(context, obj, expectedFields)

snake_case와 camelCase 필드 존재 여부를 검사합니다.

```javascript
DEBUG.checkFieldMapping('테스트', myDoc, [
  { snake: 'author_id', camel: 'authorId' },
  { snake: 'source_type', camel: 'sourceType' }
]);
```

### DEBUG.trackDataFlow(stage, data, meta)

데이터 흐름을 추적합니다.

```javascript
DEBUG.trackDataFlow('API 응답', responseData, { endpoint: '/api/docs' });
```

### DEBUG.trackStateChange(stateName, oldValue, newValue, trigger)

React 상태 변경을 추적합니다.

```javascript
DEBUG.trackStateChange('viewState', 'login', 'mentor_dashboard', 'handleLogin');
```

### DEBUG.checkRenderCondition(componentName, conditions)

조건부 렌더링의 조건 값을 출력합니다.

```javascript
DEBUG.checkRenderCondition('원문 버튼', {
  'source_type': doc.source_type,
  '조건 결과': doc.source_type === 'url'
});
```

## 예상 결과 vs 실제 결과

### 정상인 경우

```
🔍 [MAPPING] dbGetAll 결과 (첫 번째 문서)
  author_id: ✅ (uuid-xxx)
  authorId: ✅ (uuid-xxx)    ← 매핑 후 둘 다 존재
  ✅ 모든 필드 매핑 정상
```

### 문제가 있는 경우

```
🔍 [MAPPING] dbGetAll 결과 (첫 번째 문서)
  author_id: ✅ (uuid-xxx)
  authorId: ❌ (undefined)   ← 매핑 누락!
  ⚠️ 매핑 불일치 발견:
    ❌ "author_id" 있지만 "authorId" 없음 → 매핑 누락!
```

## 문제 해결 후 비활성화

디버깅 완료 후 프로덕션 배포 전:

1. 콘솔에서: `DEBUG.enabled = false`
2. 또는 코드에서: `enabled: false` 로 변경

## 관련 파일

- `D:\AI\claude01\ggp_ojt_v2\index.html` - 디버깅 코드 위치
  - 라인 146-252: DEBUG 객체 정의
  - 라인 915-924: dbGetAll 디버깅
  - 라인 2118-2151: loadMyDocs 디버깅
  - 라인 2503-2549: handleSaveToDB 디버깅
  - 라인 4200-4208: Mentor 미리보기 렌더링 디버깅
  - 라인 4473-4484: Mentee 학습 렌더링 디버깅

---

## AI 엔진 트러블슈팅 (Issue #96)

### 엔진 우선순위

```
Chrome AI (Gemini Nano) → WebLLM → 에러 표시
```

### Chrome AI 디버깅

**지원 여부 확인** (브라우저 콘솔):
```javascript
// Chrome AI API 존재 확인
console.log('window.ai:', !!window.ai);
console.log('languageModel:', !!window.ai?.languageModel);

// Capabilities 확인
const caps = await window.ai.languageModel.capabilities();
console.log('available:', caps.available);
// 'readily' = 즉시 사용 가능
// 'after-download' = 다운로드 필요
// 'no' = 미지원
```

**Chrome AI 상태값**:
| 상태 | 의미 |
|------|------|
| `NOT_SUPPORTED` | 브라우저 미지원 (Chrome 138 미만) |
| `NOT_DOWNLOADED` | 모델 다운로드 필요 |
| `DOWNLOADING` | 다운로드 진행 중 |
| `READY` | 사용 가능 |

**Chrome 버전 확인**:
```javascript
// Chrome 버전 확인
const match = navigator.userAgent.match(/Chrome\/(\d+)/);
console.log('Chrome version:', match ? match[1] : 'Not Chrome');
// 138 이상 필요
```

### WebLLM 디버깅

**독립 테스트 파일**: `test-webllm.html`

```bash
# 로컬 서버로 테스트 (CORS 방지)
npx serve . -p 8080
# http://localhost:8080/test-webllm.html 접속
```

**WebGPU 지원 확인** (브라우저 콘솔):
```javascript
// WebGPU API 존재
console.log('navigator.gpu:', !!navigator.gpu);

// GPU Adapter 획득
const adapter = await navigator.gpu?.requestAdapter();
console.log('adapter:', adapter);

// Adapter 정보
if (adapter) {
  const info = await adapter.requestAdapterInfo();
  console.log('GPU:', info.vendor, info.architecture);
  console.log('Max buffer:', adapter.limits.maxBufferSize / 1024 / 1024 / 1024, 'GB');
}
```

**에러 유형별 해결책**:

| 에러 타입 | 메시지 예시 | 해결책 |
|-----------|------------|--------|
| `WEBGPU_NOT_SUPPORTED` | "WebGPU를 지원하지 않습니다" | Chrome 113+ 업데이트 |
| `NETWORK_ERROR` | "네트워크 오류" | 인터넷 연결, VPN 해제 |
| `OUT_OF_MEMORY` | "메모리가 부족합니다" | 더 작은 모델 선택 (0.5B) |
| `MODEL_LOAD_FAILED` | "모델 로드 실패" | 페이지 새로고침, 캐시 삭제 |
| `GENERATION_FAILED` | "생성 실패" | 입력 텍스트 길이 축소 |

**모델 캐시 확인**:
```javascript
// 캐시된 모델 확인
const cache = await caches.open('webllm-models');
const keys = await cache.keys();
console.log('Cached models:', keys.map(k => k.url));
```

**모델 캐시 삭제** (문제 발생 시):
```javascript
// WebLLM 캐시 삭제
await caches.delete('webllm-models');
console.log('Cache cleared');
```

### AIContext 상태 확인

React 컴포넌트에서:
```javascript
import { useAI } from '@features/ai/hooks/AIContext';

const { aiStatus, isSupported, isReady, isLoading, error } = useAI();
console.log('AI Status:', {
  supported: isSupported,
  ready: isReady,
  loading: isLoading,
  error: error,
  status: aiStatus.status,
});
```

### 테스트 시나리오

#### 시나리오 1: Chrome AI 정상 동작 확인
1. Chrome 138+ 사용
2. 콘솔에서 `window.ai.languageModel.capabilities()` 확인
3. `available: 'readily'` 또는 `'after-download'` 확인
4. Mentor 대시보드에서 AI 콘텐츠 생성 테스트

#### 시나리오 2: WebLLM Fallback 테스트
1. Chrome 138 미만 또는 Firefox 사용 (Chrome AI 미지원)
2. `test-webllm.html` 열기
3. 환경 체크에서 WebGPU 지원 확인
4. 0.5B 모델로 로드 테스트
5. 텍스트 생성 테스트

#### 시나리오 3: 둘 다 실패 케이스
1. Safari 또는 구형 브라우저 사용
2. 에러 메시지 확인: "AI 기능을 사용할 수 없습니다"
3. 사용자에게 브라우저 업그레이드 안내 표시 확인

### 관련 파일

- `src-vite/src/features/ai/services/chromeAI.js` - Chrome AI 서비스
- `src-vite/src/features/ai/services/webllm.js` - WebLLM 서비스
- `src-vite/src/features/ai/hooks/AIContext.jsx` - AI 상태 관리
- `src-vite/src/features/ai/services/contentGenerator.js` - 콘텐츠 생성
- `test-webllm.html` - WebLLM 독립 테스트 페이지
