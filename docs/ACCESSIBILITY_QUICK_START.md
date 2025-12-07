# 접근성 개선 Quick Start Guide

**대상**: OJT Master v2 개발팀
**소요 시간**: Phase 1 (1-2주), Phase 2 (2-3주)
**목표**: WCAG 2.1 AA 준수 80% → 95%

---

## 1일차: 도구 설정 (2시간)

### 1. ESLint 접근성 플러그인 설치

```bash
cd src-vite
npm install --save-dev eslint-plugin-jsx-a11y
```

### 2. ESLint 설정 업데이트

```javascript
// eslint.config.js에 추가
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/label-has-associated-control': 'error',
    },
  },
];
```

### 3. 린트 실행 및 경고 확인

```bash
npm run lint
# 예상: 50-100개 경고 발생 (현재 max-warnings 50 설정)
```

### 4. axe DevTools 브라우저 확장 설치

- Chrome: https://chromewebstore.google.com/detail/lhdoppojpmngadmnindnejefpokejbdd
- 설치 후 F12 → axe DevTools 탭 → Scan

---

## 2-3일차: 폼 접근성 개선 (6-8시간)

### 우선순위 1: MentorDashboard.jsx

#### 문제

```jsx
// ❌ 현재 코드
<textarea
  placeholder="교육 자료로 만들고 싶은 텍스트를 입력하세요..."
  value={rawInput}
  onChange={(e) => setRawInput(e.target.value)}
/>
```

#### 해결

```jsx
// ✅ 개선 코드
<div>
  <label htmlFor="raw-input" className="block text-sm font-medium mb-2">
    교육 자료 텍스트 입력
    <span className="text-red-600" aria-label="필수">*</span>
  </label>
  <textarea
    id="raw-input"
    value={rawInput}
    onChange={(e) => setRawInput(e.target.value)}
    placeholder="예: React Hooks의 useState는..."
    required
    aria-required="true"
    aria-describedby="raw-input-help"
    className="w-full h-40 p-3 border rounded-lg"
  />
  <span id="raw-input-help" className="text-sm text-gray-600">
    최소 100자 이상 권장 (현재: {rawInput.length}자)
  </span>
</div>
```

### 적용 대상

1. `rawInput` (텍스트 입력)
2. `urlInput` (URL 입력)
3. `inputTitle` (문서 제목)
4. 라디오 버튼 (inputType 선택) → `<fieldset>` + `<legend>`
5. 체크박스 (autoSplit) → `<label>` 연결

---

## 4-5일차: 키보드 네비게이션 (8시간)

### 1. Skip Link 추가 (30분)

```jsx
// App.jsx 최상단
function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
                 focus:rounded-lg"
    >
      본문으로 건너뛰기
    </a>
  );
}

// src/index.css에 추가
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 2. Header 드롭다운 Esc 키 지원 (2시간)

```jsx
// Header.jsx
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showModeMenu) {
      setShowModeMenu(false);
      buttonRef.current?.focus(); // 포커스 복원
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showModeMenu]);
```

### 3. Radix Dialog 도입 (4시간)

```bash
npm install @radix-ui/react-dialog
```

```jsx
// components/DeleteConfirmDialog.jsx (신규)
import * as Dialog from '@radix-ui/react-dialog';

export function DeleteConfirmDialog({ isOpen, onClose, onConfirm, docTitle }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg max-w-md">
          <Dialog.Title className="text-lg font-bold mb-4">
            문서 삭제 확인
          </Dialog.Title>
          <Dialog.Description className="text-gray-600 mb-6">
            "{docTitle}" 문서를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
          </Dialog.Description>
          <div className="flex gap-3 justify-end">
            <Dialog.Close asChild>
              <button className="px-4 py-2 bg-gray-200 rounded-lg">
                취소
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-red-600 text-white rounded-lg"
            >
              삭제
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

---

## 6-7일차: ARIA Live Regions (4-6시간)

### 1. 로딩 상태 개선

```jsx
// components/ProgressBar.jsx (신규)
export function ProgressBar({ progress, message }) {
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${message} - ${progress}% 완료`}
        />
      </div>
      <p className="text-sm text-gray-600 mt-2">
        {message} ({progress}%)
      </p>
    </div>
  );
}
```

### 2. Toast 개선 (react-hot-toast는 aria-live 미지원)

```jsx
// contexts/ToastContext.jsx 개선
import { toast as hotToast } from 'react-hot-toast';

const ToastContent = ({ message, type }) => (
  <div
    role={type === 'error' ? 'alert' : 'status'}
    aria-live={type === 'error' ? 'assertive' : 'polite'}
  >
    {message}
  </div>
);

export const Toast = {
  success: (msg) => hotToast.custom(<ToastContent message={msg} type="success" />),
  error: (msg) => hotToast.custom(<ToastContent message={msg} type="error" />),
  warning: (msg) => hotToast.custom(<ToastContent message={msg} type="warning" />),
};
```

---

## 8일차: 색상 대비 검증 (2시간)

### 1. WebAIM Contrast Checker로 검증

1. https://webaim.org/resources/contrastchecker/ 접속
2. 현재 사용 중인 색상 조합 확인:

| 텍스트 | 배경 | TailwindCSS | 확인 |
|--------|------|-------------|------|
| #4B5563 | #FFFFFF | gray-600 / white | ✅ 7.0:1 |
| #6B7280 | #FFFFFF | gray-500 / white | ✅ 4.6:1 |
| #9CA3AF | #FFFFFF | gray-400 / white | ❌ 2.8:1 |

3. **수정**: `text-gray-400` → `text-gray-600`으로 변경

### 2. 자동화 테스트 추가

```bash
npm install --save-dev @axe-core/playwright
```

```javascript
// tests/accessibility.spec.js (신규)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('색상 대비 검증', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const results = await new AxeBuilder({ page })
    .include('main')
    .analyze();

  const contrastIssues = results.violations.filter(v => v.id === 'color-contrast');
  expect(contrastIssues).toEqual([]);
});
```

---

## 9-10일차: E2E 테스트 접근성 통합 (4시간)

### 기존 테스트 파일 업데이트

```javascript
// tests/e2e-homepage.spec.js
import AxeBuilder from '@axe-core/playwright';

test('로그인 플로우', async ({ page }) => {
  await page.goto('/');

  // 기존 E2E 로직
  await page.click('text=Google로 로그인');
  // ...

  // 접근성 검증 추가 (Critical/Serious만)
  const results = await new AxeBuilder({ page }).analyze();
  const criticalViolations = results.violations.filter(
    v => v.impact === 'critical' || v.impact === 'serious'
  );
  expect(criticalViolations).toEqual([]);
});
```

### CI/CD 통합

```yaml
# .github/workflows/ci.yml
- name: Run E2E + A11y Tests
  run: |
    npm test  # Playwright 테스트 (접근성 포함)
    npm run test:run  # Vitest 단위 테스트
```

---

## Phase 1 완료 체크리스트 (1-2주 후)

- [ ] `npm run lint` 통과 (max-warnings 50 이하)
- [ ] axe DevTools 스캔: Critical/Serious 위반 0개
- [ ] 키보드 전용 네비게이션 테스트 통과
- [ ] 색상 대비 4.5:1 이상 (자동 테스트 통과)
- [ ] 모든 폼 필드에 `<label>` 또는 `aria-label`
- [ ] 로딩 상태에 `aria-live` 구현
- [ ] Playwright 접근성 테스트 통과

**예상 성과**:
- WCAG 2.1 AA 준수율: 30% → **80%**
- axe-core 자동 검증 통과율: 0% → **60%**
- Lighthouse 접근성 점수: 70점대 → **85점+**

---

## Phase 2 시작 (2주차)

### 1. React Aria 또는 Radix UI 전체 도입 (5일)

- Dialog (모달)
- DropdownMenu (Header)
- Progress (WebLLM 로딩)
- Tabs (Dashboard 탭)

### 2. 시맨틱 HTML 리팩토링 (4일)

- `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`
- 로고를 `<img>` 또는 `<svg>`로 변경

### 3. Lighthouse 목표: 95점 이상

```bash
lighthouse http://localhost:5173 --only-categories=accessibility --view
```

---

## 일일 개발 루틴

### 코딩 시

1. 새 컴포넌트 작성 후: `npm run lint` 실행
2. `<img>` 추가 시: `alt` 속성 필수
3. `<input>` 추가 시: `<label>` 연결 필수
4. 버튼은 `<button>` 사용 (div onClick 금지)

### 테스트 시

1. Tab 키로 전체 페이지 네비게이션 테스트
2. F12 → axe DevTools → Scan
3. 에러 0개 확인 후 커밋

### 커밋 전

```bash
npm run lint
npm test  # Playwright 테스트 (접근성 포함)
```

---

## 자주 묻는 질문

### Q1. placeholder를 레이블로 사용하면 안 되나요?

**A**: WCAG 3.3.2 위반입니다. placeholder는 보조 설명으로만 사용하고, 반드시 `<label>`을 추가하세요.

```jsx
// ❌ 나쁜 예
<input placeholder="이름을 입력하세요" />

// ✅ 좋은 예
<label htmlFor="name">이름</label>
<input id="name" placeholder="예: 홍길동" />
```

### Q2. div onClick은 왜 안 되나요?

**A**: 키보드 접근 불가, 스크린 리더 인식 불가. 반드시 `<button>`을 사용하세요.

```jsx
// ❌ 나쁜 예
<div onClick={handleClick}>클릭</div>

// ✅ 좋은 예
<button onClick={handleClick}>클릭</button>
```

### Q3. aria-label을 항상 써야 하나요?

**A**: 아니오. Native HTML 텍스트나 `<label>`로 해결 가능하면 ARIA를 사용하지 마세요.

**ARIA 우선순위**:
1. Native HTML 텍스트 (`<button>제출</button>`)
2. `<label>` 연결
3. `aria-labelledby` (기존 텍스트 참조)
4. `aria-label` (visible 레이블 없을 때만)

### Q4. 색상 대비는 어떻게 확인하나요?

**A**: https://webaim.org/resources/contrastchecker/ 또는 axe DevTools 사용

- 일반 텍스트: 4.5:1 이상
- 대형 텍스트 (18pt+): 3:1 이상
- UI 컴포넌트: 3:1 이상

### Q5. 테스트가 너무 느려요.

**A**: axe-core 테스트는 E2E의 일부로만 실행하세요. 단위 테스트에는 추가하지 마세요.

```javascript
// ✅ E2E에만 추가
test('홈페이지 접근성', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

// ❌ 단위 테스트에는 불필요
test('Button 컴포넌트', () => {
  render(<Button>Click</Button>);
  // axe-core 호출 금지 (느림)
});
```

---

## 추가 리소스

- **WCAG 2.1 체크리스트**: `docs/ACCESSIBILITY_CHECKLIST.md`
- **React Aria 공식 문서**: https://react-spectrum.adobe.com/react-aria/
- **Radix UI**: https://www.radix-ui.com/primitives
- **axe-core GitHub**: https://github.com/dequelabs/axe-core
- **NVDA 스크린 리더 (무료)**: https://www.nvaccess.org/download/

---

## 문제 발생 시

1. **ESLint 경고 너무 많음**: `max-warnings` 값을 100으로 임시 상향 후 점진적 개선
2. **axe-core 테스트 실패**: `--exclude` 옵션으로 외부 위젯 제외
3. **NVDA 설치 문제**: Chrome + axe DevTools로 대체 가능
4. **색상 변경 불가 (브랜드)**: AAA 레벨 대신 AA 레벨 목표 (4.5:1)

---

## 다음 단계

Phase 1 완료 후:
1. WCAG 2.2 준수 (Target Size 24x24px)
2. i18n 지원 (React Aria i18n)
3. Lighthouse 점수 95+ 목표
4. Storybook 접근성 테스트 자동화
