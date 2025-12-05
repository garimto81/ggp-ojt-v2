# 병렬 개발 가이드: PRD-0007 vs PRD-0008

**목적**: 두 개의 Claude Code 인스턴스가 동시에 작업할 때 충돌 방지

---

## 🎯 역할 분담

| 인스턴스 | PRD | 작업 범위 | 브랜치 |
|---------|-----|----------|--------|
| **Claude A** | 0007 | WebLLM 오픈소스 LLM 통합 | `feat/issue-45-webllm` |
| **Claude B** | 0008 | URL/PDF 최적화 및 UI 개선 | `feat/issue-46-url-pdf-opt` |

---

## 🚫 절대 건드리면 안 되는 파일 (상대방 전용)

### Claude A (LLM 작업) - 다음 파일 수정 금지:
```
❌ src-vite/src/utils/cors-proxy.js
❌ src-vite/src/utils/pdf-ocr.js
❌ src-vite/src/components/PdfViewer.jsx
❌ src-vite/src/components/PdfPreview.jsx
❌ src-vite/src/components/UrlPreviewPanel.jsx
❌ src-vite/src/components/SplitViewLayout.jsx
❌ ojt-r2-upload/src/cors-proxy.js
```

### Claude B (URL/PDF 작업) - 다음 파일 수정 금지:
```
❌ src-vite/src/utils/webllm.js
❌ src-vite/src/contexts/AIContext.jsx
❌ src-vite/src/components/AIEngineSelector.jsx
```

---

## ⚠️ 공유 파일 수정 규칙

### 1. `constants.js` - 블록 분리

각자 **파일 끝에 새 블록 추가** (기존 내용 수정 금지)

**Claude A (LLM)**:
```javascript
// === WEBLLM CONFIG (PRD-0007) ===
export const WEBLLM_CONFIG = {
  // ... LLM 설정
};
```

**Claude B (URL/PDF)**:
```javascript
// === CORS/PDF CONFIG (PRD-0008) ===
export const CORS_CONFIG = {
  // ... CORS 설정
};
export const PDF_CONFIG = {
  // ... PDF 설정
};
```

### 2. `MentorDashboard.jsx` - 순차 수정

| 순서 | 작업자 | 내용 |
|------|--------|------|
| 1️⃣ | **Claude B 먼저** | PDF/URL UI 개선 (Split View, 미리보기 등) |
| 2️⃣ | **Claude A 나중에** | AI 엔진 선택 UI 추가 |

**⚠️ Claude A는 Claude B가 MentorDashboard 작업 완료 후 진행**

### 3. `api.js` - 함수 추가만

- **기존 함수 수정 금지**
- 새 함수만 추가 (각자 다른 함수명)
  - Claude A: `generateWithWebLLM()`, `initWebLLM()`
  - Claude B: `extractUrlContent()` 개선 (자체 프록시 사용)

---

## 📂 각자 전용 영역

### Claude A (LLM) 전용 파일:
```
src-vite/src/
├── utils/webllm.js                 # 신규 생성
├── contexts/AIContext.jsx          # 신규 생성
└── components/AIEngineSelector.jsx # 신규 생성
```

### Claude B (URL/PDF) 전용 파일:
```
src-vite/src/
├── utils/cors-proxy.js             # 신규 생성
├── utils/pdf-ocr.js                # 신규 생성 (선택)
├── components/PdfViewer.jsx        # 수정
├── components/PdfPreview.jsx       # 수정
├── components/UrlPreviewPanel.jsx  # 수정
└── components/SplitViewLayout.jsx  # 수정

ojt-r2-upload/src/
├── index.js                        # /proxy 라우트 추가
└── cors-proxy.js                   # 신규 생성
```

---

## 🌿 브랜치 전략

```
main
 │
 ├── feat/issue-46-url-pdf-opt  ← Claude B (URL/PDF) - 먼저 머지
 │       │
 │       └── PR #1: URL/PDF 최적화
 │
 └── feat/issue-45-webllm       ← Claude A (LLM) - 나중에 머지
         │
         └── PR #2: WebLLM 통합 (PR #1 머지 후 rebase)
```

### 머지 순서:
1. **Claude B** 작업 완료 → PR 생성 → 머지
2. **Claude A** rebase (`git rebase main`) → PR 생성 → 머지

---

## 📡 작업 상태 신호

### 파일 기반 동기화 (tasks/ 폴더)

**Claude B가 생성** (MentorDashboard 작업 완료 시):
```bash
# tasks/signals/prd-0008-mentor-dashboard-done.txt
echo "MentorDashboard UI 수정 완료 - $(date)" > tasks/signals/prd-0008-mentor-dashboard-done.txt
git add tasks/signals/ && git commit -m "signal: PRD-0008 MentorDashboard 완료"
git push
```

**Claude A가 확인** (MentorDashboard 통합 전):
```bash
# 신호 파일 존재 확인
if (Test-Path "tasks/signals/prd-0008-mentor-dashboard-done.txt") {
  Write-Host "✅ PRD-0008 MentorDashboard 완료 - 통합 진행 가능"
} else {
  Write-Host "⏳ PRD-0008 대기 중 - MentorDashboard 수정 보류"
}
```

---

## 📋 체크리스트

### Claude A (LLM) 시작 전:
- [ ] `feat/issue-45-webllm` 브랜치 생성
- [ ] PRD-0007 확인 (`tasks/prds/0007-webllm-integration.md`)
- [ ] 전용 파일만 생성/수정 확인

### Claude B (URL/PDF) 시작 전:
- [ ] `feat/issue-46-url-pdf-opt` 브랜치 생성
- [ ] PRD-0008 확인 (`tasks/prds/0008-url-pdf-optimization.md`)
- [ ] MentorDashboard 수정 후 신호 파일 생성

### 통합 전 (Claude A):
- [ ] `tasks/signals/prd-0008-mentor-dashboard-done.txt` 존재 확인
- [ ] `git pull origin main` 후 rebase
- [ ] constants.js 충돌 해결 (블록 병합)

---

## 🔧 충돌 해결 가이드

### constants.js 충돌 시:
```javascript
// 두 블록 모두 유지
// === CORS/PDF CONFIG (PRD-0008) ===
export const CORS_CONFIG = { ... };
export const PDF_CONFIG = { ... };

// === WEBLLM CONFIG (PRD-0007) ===
export const WEBLLM_CONFIG = { ... };
```

### MentorDashboard.jsx 충돌 시:
1. Claude B의 변경 사항 모두 유지
2. Claude A의 `<AIEngineSelector />` 컴포넌트만 추가
3. import 문 병합

---

## ⏱️ 예상 타임라인

```
Day 1-2: 병렬 작업 (독립 파일)
├── Claude A: webllm.js, AIContext.jsx, AIEngineSelector.jsx
└── Claude B: cors-proxy.js, PdfViewer.jsx, R2 Worker

Day 2-3: Claude B MentorDashboard 수정 → 신호 파일 생성

Day 3-4: Claude A MentorDashboard 통합

Day 4-5: 각자 PR 생성, 순차 머지
```

---

## 📞 문제 발생 시

1. **같은 파일 수정 필요**: 작업 중단 → 사용자에게 문의
2. **rebase 충돌 심각**: 수동 해결 요청
3. **기능 의존성 발견**: PRD 업데이트 후 재조정
