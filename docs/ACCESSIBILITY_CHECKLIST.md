# 접근성(a11y) 및 UX 개선 체크리스트

**프로젝트**: OJT Master v2
**작성일**: 2025-12-07
**대상**: WCAG 2.1 AA 준수
**기술 스택**: React 19, Vite 7, TailwindCSS 4

---

## 목차

1. [WCAG 2.1 AA 준수 체크리스트](#1-wcag-21-aa-준수-체크리스트)
2. [키보드 네비게이션 패턴](#2-키보드-네비게이션-패턴)
3. [스크린 리더 지원](#3-스크린-리더-지원)
4. [색상 대비 가이드라인](#4-색상-대비-가이드라인)
5. [폼 접근성 패턴](#5-폼-접근성-패턴)
6. [로딩/에러 상태 UX](#6-로딩에러-상태-ux)
7. [권장 오픈소스 도구](#7-권장-오픈소스-도구)
8. [현재 프로젝트 분석](#8-현재-프로젝트-분석)
9. [우선순위별 개선 로드맵](#9-우선순위별-개선-로드맵)

---

## 1. WCAG 2.1 AA 준수 체크리스트

### 1.1 핵심 준수 기준

WCAG 2.1은 8가지 핵심 영역으로 구성되며, Level AA는 대부분의 접근성 문제를 해결합니다.

| 영역 | WCAG 기준 | 현재 상태 | 우선순위 |
|------|-----------|----------|----------|
| **Text Alternatives** | 1.1.1 (A) | ⚠️ 부분 구현 | HIGH |
| **Keyboard Navigation** | 2.1.1 (A), 2.4.7 (AA) | ❌ 미구현 | CRITICAL |
| **Color Contrast** | 1.4.3 (AA) | ⚠️ 검증 필요 | HIGH |
| **Semantic HTML** | 4.1.2 (A) | ⚠️ 부분 구현 | MEDIUM |
| **Accessible Forms** | 3.3.1, 3.3.2 (A) | ❌ 미구현 | HIGH |
| **Multimedia Content** | 1.2.1-1.2.5 (A/AA) | N/A | - |
| **Responsive Design** | 1.4.10 (AA) | ✅ 구현됨 | - |
| **ARIA Implementation** | 4.1.3 (AA) | ❌ 미구현 | CRITICAL |

### 1.2 2025년 주요 규제 변경사항

#### European Accessibility Act (EAA)
- **시행일**: 2025년 6월 28일
- **대상**: EU 내 디지털 서비스 제공 기업 (직원 10명 이상 또는 매출 €2M 이상)
- **기준**: WCAG 2.1 AA (EN 301 549 표준, 2025년 WCAG 2.2 채택 예정)
- **불이행 시**: EU 시장 진입 제한

#### ADA Title II (미국)
- **준수 기한**: 2026년 4월 24일 (대규모 기관), 2027년 4월 26일 (소규모)
- **기준**: WCAG 2.1 Level AA
- **영향**: 2024년 ADA 소송 4,605건 (전년 대비 증가)

#### WCAG 2.2 업데이트 (2023년 권고 → 2025년 표준)
- **새로운 9개 기준** 추가:
  - Focus Appearance (Enhanced)
  - Dragging Movements
  - **Target Size (Minimum)**: 터치/클릭 타겟 최소 24x24 CSS pixels
  - Accessible Authentication
  - Redundant Entry

### 1.3 준수 체크리스트 (WCAG 2.1 AA 기준)

#### Perceivable (인식 가능성)

- [ ] **1.1.1 (A)**: 모든 이미지에 대체 텍스트 (`alt` 속성) 제공
  - 현재: 로고 이미지만 제공, 아이콘 버튼 누락
- [ ] **1.3.1 (A)**: 의미 있는 구조에 시맨틱 HTML 사용 (`<nav>`, `<main>`, `<article>`)
  - 현재: `<div>` 중심 구조, 개선 필요
- [ ] **1.4.3 (AA)**: 최소 색상 대비 4.5:1 (일반 텍스트), 3:1 (대형 텍스트/UI 컴포넌트)
  - 현재: 검증 필요 (TailwindCSS gray-500/600 사용)
- [ ] **1.4.10 (AA)**: Reflow - 모바일 뷰포트 320px에서 가로스크롤 없이 작동
  - 현재: ✅ Responsive 구현됨

#### Operable (조작 가능성)

- [ ] **2.1.1 (A)**: 모든 기능을 키보드로 접근 가능
  - 현재: ❌ 키보드 전용 사용자 테스트 필요
- [ ] **2.1.2 (A)**: 키보드 트랩 없음 (모달, 드롭다운에서 Esc로 탈출 가능)
  - 현재: ❌ 모달 키보드 네비게이션 미구현
- [ ] **2.4.3 (A)**: 논리적인 포커스 순서
  - 현재: ⚠️ tabIndex 미사용, 검증 필요
- [ ] **2.4.7 (AA)**: 포커스 표시기 (visible focus indicator)
  - 현재: ❌ TailwindCSS `outline-none` 사용으로 포커스 숨김 가능성
- [ ] **2.5.5 (AAA/Best Practice)**: Target Size - 터치 타겟 최소 44x44px
  - 현재: ⚠️ 버튼 크기 검증 필요

#### Understandable (이해 가능성)

- [ ] **3.2.1 (A)**: 포커스 시 예기치 않은 컨텍스트 변경 없음
  - 현재: ✅ 구현됨
- [ ] **3.3.1 (A)**: 에러 식별 - 입력 오류 발생 시 명확한 에러 메시지
  - 현재: ⚠️ Toast 메시지만 제공, 폼 필드 연결 필요
- [ ] **3.3.2 (A)**: 레이블 또는 지시사항 - 모든 입력 필드에 `<label>` 또는 `aria-label`
  - 현재: ❌ placeholder만 사용 (WCAG 위반)
- [ ] **3.3.3 (AA)**: 에러 수정 제안 - 자동 수정 또는 명확한 가이드 제공

#### Robust (견고성)

- [ ] **4.1.2 (A)**: Name, Role, Value - 모든 UI 컴포넌트에 ARIA 속성
  - 현재: ❌ ARIA 구현 거의 없음
- [ ] **4.1.3 (AA)**: 상태 메시지 - 동적 콘텐츠 변경 시 스크린 리더 알림 (`aria-live`)
  - 현재: ❌ 로딩/에러 상태 ARIA 미구현

---

## 2. 키보드 네비게이션 패턴

### 2.1 기본 키보드 동작

| 키 | 동작 | 적용 대상 |
|---|------|-----------|
| **Tab** | 다음 포커스 가능 요소로 이동 | 버튼, 링크, 입력 필드 |
| **Shift + Tab** | 이전 포커스 가능 요소로 이동 | 모든 인터랙티브 요소 |
| **Enter / Space** | 활성화 (클릭 상당) | 버튼, 링크 |
| **Esc** | 모달/드롭다운 닫기 | Overlay 컴포넌트 |
| **Arrow Keys** | 탭/리스트 네비게이션 | Tabs, Listbox, Dropdown |
| **Home / End** | 첫/마지막 요소로 이동 | 리스트, 그리드 |

### 2.2 React 구현 패턴

#### 2.2.1 포커스 관리 (Focus Management)

```jsx
import { useRef, useEffect } from 'react';

function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // 모달 열릴 때: 이전 포커스 저장 & 첫 버튼에 포커스
      previousFocusRef.current = document.activeElement;
      const firstButton = modalRef.current?.querySelector('button');
      firstButton?.focus();
    } else {
      // 모달 닫힐 때: 이전 포커스로 복원
      previousFocusRef.current?.focus();
    }
  }, [isOpen]);

  // Esc 키 핸들러
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div ref={modalRef} role="dialog" aria-modal="true">
      {children}
    </div>
  );
}
```

#### 2.2.2 탭 네비게이션 (WAI-ARIA Tabs 패턴)

```jsx
function Tabs({ tabs }) {
  const [activeIndex, setActiveIndex] = useState(0);

  const handleKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') {
      setActiveIndex((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      setActiveIndex((index - 1 + tabs.length) % tabs.length);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="메인 탭">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={index === activeIndex}
            aria-controls={`panel-${tab.id}`}
            tabIndex={index === activeIndex ? 0 : -1}
            onClick={() => setActiveIndex(index)}
            onKeyDown={(e) => handleKeyDown(e, index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tabs[activeIndex].id}`}>
        {tabs[activeIndex].content}
      </div>
    </div>
  );
}
```

#### 2.2.3 Skip Links (건너뛰기 링크)

```jsx
// App.jsx 최상단에 추가
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

// TailwindCSS에 sr-only 클래스 추가 (globals.css)
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

### 2.3 OJT Master 적용 예시

#### Header.jsx 개선

```jsx
// 현재: onClick만 있는 버튼
<button onClick={handleLogout} className="...">로그아웃</button>

// 개선: 키보드 접근성 추가
<button
  onClick={handleLogout}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleLogout();
    }
  }}
  aria-label="로그아웃"
  className="..."
>
  로그아웃
</button>
```

#### 모드 전환 드롭다운 개선

```jsx
// 현재: showModeMenu 상태만 사용
{showModeMenu && <div>...</div>}

// 개선: Esc 키 지원 + 포커스 트랩
useEffect(() => {
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && showModeMenu) {
      setShowModeMenu(false);
    }
  };
  document.addEventListener('keydown', handleKeyDown);
  return () => document.removeEventListener('keydown', handleKeyDown);
}, [showModeMenu]);
```

---

## 3. 스크린 리더 지원

### 3.1 ARIA 기본 원칙

> **첫 번째 규칙**: "Native HTML을 사용할 수 있다면 ARIA를 사용하지 마세요."

- 잘못된 ARIA는 ARIA가 없는 것보다 나쁩니다 (WebAIM 조사: ARIA 사용 페이지는 평균 41% 더 많은 오류)
- ARIA는 시맨틱 HTML로 해결 불가능한 경우에만 사용

### 3.2 ARIA 속성 우선순위

#### 레이블링 우선순위 (Label Hierarchy)

1. **Native HTML 텍스트** (최우선)
   ```html
   <button>제출</button>
   ```

2. **`<label>` 연결** (폼 필드)
   ```html
   <label for="name">이름</label>
   <input id="name" type="text" />
   ```

3. **`aria-labelledby`** (기존 visible 텍스트 참조)
   ```html
   <h2 id="modal-title">문서 삭제 확인</h2>
   <div role="dialog" aria-labelledby="modal-title">...</div>
   ```

4. **`aria-label`** (visible 레이블이 없을 때만)
   ```html
   <button aria-label="검색">🔍</button>
   ```

⚠️ **피해야 할 패턴**:
- `placeholder`를 레이블로 사용 (WCAG 위반)
- `aria-label`과 visible 텍스트가 다름 (WCAG 2.5.3 Label in Name 위반)
- 빈 `aria-label=""` 또는 중복 레이블

### 3.3 핵심 ARIA Roles

| Role | 용도 | HTML 대체 |
|------|------|-----------|
| `role="dialog"` | 모달 창 | `<dialog>` (HTML5) |
| `role="navigation"` | 네비게이션 | `<nav>` |
| `role="main"` | 메인 콘텐츠 | `<main>` |
| `role="banner"` | 헤더 | `<header>` (페이지 최상위) |
| `role="contentinfo"` | 푸터 | `<footer>` |
| `role="button"` | 버튼 | `<button>` |
| `role="status"` | 상태 메시지 | - (ARIA 필수) |
| `role="alert"` | 긴급 알림 | - (ARIA 필수) |

### 3.4 동적 콘텐츠 알림 (Live Regions)

#### `aria-live` 속성

```jsx
// 로딩 상태 알림
function LoadingIndicator({ isLoading, message }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={isLoading ? '' : 'sr-only'}
    >
      {isLoading ? message : '로딩 완료'}
    </div>
  );
}

// 에러 메시지 알림
function ErrorMessage({ error }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-red-600"
    >
      {error}
    </div>
  );
}
```

| `aria-live` 값 | 알림 우선순위 | 사용 예시 |
|----------------|--------------|-----------|
| `off` (기본값) | 알림 안 함 | 정적 콘텐츠 |
| `polite` | 스크린 리더가 현재 말을 마친 후 | 로딩 상태, 성공 메시지 |
| `assertive` | 즉시 알림 | 에러, 경고 |

#### `aria-busy` 사용 (로딩 중)

```jsx
function DataTable({ isLoading, data }) {
  return (
    <div aria-busy={isLoading} aria-live="polite">
      {isLoading ? (
        <p>데이터 로딩 중...</p>
      ) : (
        <table>...</table>
      )}
    </div>
  );
}
```

### 3.5 폼 에러 메시지 (WCAG 3.3.1)

#### `aria-invalid` + `aria-describedby`

```jsx
function FormField({ id, label, error, ...props }) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
        {...props}
      />
      {error && (
        <span id={errorId} role="alert" className="text-red-600">
          {error}
        </span>
      )}
    </div>
  );
}
```

#### `aria-errormessage` (최신 권장)

```jsx
// WCAG 2.2 권장: aria-describedby 대신 aria-errormessage 사용
<input
  id="email"
  type="email"
  aria-invalid={hasError}
  aria-errormessage={hasError ? "email-error" : undefined}
/>
{hasError && (
  <span id="email-error" role="alert">
    유효한 이메일을 입력하세요.
  </span>
)}
```

### 3.6 스크린 리더 테스트 환경 (2025년 5월 기준)

| OS | 스크린 리더 | 브라우저 | 무료 여부 |
|---|------------|---------|-----------|
| **Windows 11** | NVDA 2025 | Chrome, Firefox, Edge | ✅ 무료 |
| **Windows 11** | JAWS 2025 | Chrome, Firefox, Edge | ❌ 유료 |
| **Windows 11** | Narrator | Edge | ✅ 내장 |
| **macOS Sequoia** | VoiceOver | Safari, Chrome, Firefox | ✅ 내장 |
| **Android 15** | TalkBack 15.2 | Chrome | ✅ 내장 |
| **iOS** | VoiceOver | Safari | ✅ 내장 |

**권장 테스트 조합**: NVDA + Chrome (무료, 가장 널리 사용됨)

---

## 4. 색상 대비 가이드라인

### 4.1 WCAG 대비 비율 기준

| Level | 일반 텍스트 | 대형 텍스트* | UI 컴포넌트 | 예시 |
|-------|-------------|-------------|-------------|------|
| **AA (필수)** | **4.5:1** | **3:1** | **3:1** | 표준 준수 |
| AAA (권장) | 7:1 | 4.5:1 | - | 더 나은 접근성 |

*대형 텍스트 = 18pt (24px) 이상 또는 14pt (18.67px) Bold

### 4.2 2025년 통계

- **색상 대비는 웹 접근성 위반 1위**: 83.6% 웹사이트에서 문제 발견 (WebAIM Million 2024)
- **ADA 소송 급증**: 2024년 4,605건 (색상 대비 관련 다수)

### 4.3 TailwindCSS 색상 대비 검증

#### 현재 프로젝트에서 사용 중인 색상

```jsx
// Header.jsx 예시
text-gray-600  // AI 상태 텍스트
text-gray-500  // 서브 텍스트
text-gray-800  // 메인 텍스트
```

#### 검증 필요 조합

| 텍스트 색상 | 배경 색상 | 대비 비율 | WCAG AA 통과 |
|------------|----------|----------|--------------|
| `gray-600` (#4B5563) | `white` | **7.0:1** | ✅ 통과 |
| `gray-500` (#6B7280) | `white` | **4.6:1** | ✅ 통과 |
| `gray-400` (#9CA3AF) | `white` | **2.8:1** | ❌ 실패 |
| `amber-600` (#D97706) | `amber-50` (#FFFBEB) | **6.9:1** | ✅ 통과 |
| `blue-600` (#2563EB) | `blue-50` (#EFF6FF) | **8.2:1** | ✅ 통과 |

#### 개선 권장사항

```jsx
// ❌ 피해야 할 패턴
<p className="text-gray-400">중요한 정보</p>  // 대비 2.8:1 (실패)

// ✅ 권장 패턴
<p className="text-gray-600">중요한 정보</p>  // 대비 7.0:1 (통과)
```

### 4.4 색상 대비 검증 도구

#### 온라인 도구

1. **WebAIM Contrast Checker** (https://webaim.org/resources/contrastchecker/)
   - API 지원: URL에 `&api` 추가 → JSON 반환
   - Bookmarklet: 브라우저에서 실시간 검증

2. **Accessible Web Color Contrast Checker** (https://accessibleweb.com/color-contrast-checker/)
   - WCAG 2.1 AA/AAA 동시 검증
   - TailwindCSS 색상 입력 지원

3. **Firefox Developer Tools**
   - 접근성 검사기 내장 (F12 → Accessibility)
   - 실시간 대비 비율 표시

#### 자동화 도구

```bash
# axe-core로 대비 검증 (CI/CD 통합)
npm install --save-dev axe-core
```

```javascript
// Playwright 테스트에 통합
import AxeBuilder from '@axe-core/playwright';

test('색상 대비 검증', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2aa', 'wcag21aa'])
    .analyze();

  expect(results.violations.filter(v => v.id === 'color-contrast')).toEqual([]);
});
```

### 4.5 그라디언트 및 이미지 위 텍스트

```jsx
// ❌ 나쁜 예: 그라디언트 위 흰색 텍스트 (대비 불확실)
<div className="bg-gradient-to-br from-green-500 to-emerald-600">
  <span className="text-white">OJT</span>
</div>

// ✅ 좋은 예: 솔리드 배경 또는 오버레이 추가
<div className="bg-gradient-to-br from-green-500 to-emerald-600">
  <span className="text-white drop-shadow-lg">OJT</span>  {/* 그림자 추가 */}
</div>

// 또는 반투명 배경 추가
<div className="relative bg-gradient-to-br from-green-500 to-emerald-600">
  <div className="absolute inset-0 bg-black/30"></div>  {/* 오버레이 */}
  <span className="relative text-white">OJT</span>
</div>
```

### 4.6 예외 사항

WCAG 색상 대비 기준에서 제외되는 요소:
- **로고**: 브랜드 아이덴티티 유지 가능
- **비활성 UI**: `disabled` 버튼
- **장식 요소**: 정보 전달하지 않는 디자인 요소

---

## 5. 폼 접근성 패턴

### 5.1 기본 원칙

- ✅ **모든 입력 필드에 `<label>` 연결**
- ❌ **`placeholder`를 레이블로 사용 금지** (WCAG 3.3.2 위반)
- ✅ **필수 필드에 `required` 및 `aria-required="true"` 추가**
- ✅ **에러 메시지는 `aria-invalid` + `aria-describedby`로 연결**

### 5.2 올바른 폼 구조

```jsx
function AccessibleForm() {
  const [errors, setErrors] = useState({});

  return (
    <form onSubmit={handleSubmit} aria-label="OJT 문서 생성">
      {/* 텍스트 입력 */}
      <div>
        <label htmlFor="doc-title">
          문서 제목 <span aria-label="필수">*</span>
        </label>
        <input
          id="doc-title"
          type="text"
          required
          aria-required="true"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          placeholder="예: React 기초"  {/* 보조 설명으로만 사용 */}
        />
        {errors.title && (
          <span id="title-error" role="alert" className="text-red-600">
            {errors.title}
          </span>
        )}
      </div>

      {/* 라디오 버튼 그룹 */}
      <fieldset>
        <legend>입력 방식 선택</legend>
        <div>
          <input
            type="radio"
            id="input-text"
            name="inputType"
            value="text"
            checked={inputType === 'text'}
            onChange={(e) => setInputType(e.target.value)}
          />
          <label htmlFor="input-text">직접 작성</label>
        </div>
        <div>
          <input
            type="radio"
            id="input-url"
            name="inputType"
            value="url"
            checked={inputType === 'url'}
            onChange={(e) => setInputType(e.target.value)}
          />
          <label htmlFor="input-url">URL 입력</label>
        </div>
      </fieldset>

      {/* 체크박스 */}
      <div>
        <input
          type="checkbox"
          id="auto-split"
          checked={autoSplit}
          onChange={(e) => setAutoSplit(e.target.checked)}
        />
        <label htmlFor="auto-split">자동 분할 활성화</label>
      </div>

      {/* 제출 버튼 */}
      <button
        type="submit"
        disabled={isProcessing}
        aria-busy={isProcessing}
      >
        {isProcessing ? '생성 중...' : '생성하기'}
      </button>
    </form>
  );
}
```

### 5.3 현재 프로젝트 개선 포인트

#### MentorDashboard.jsx 폼 개선

```jsx
// ❌ 현재 코드 (접근성 문제)
<textarea
  value={rawInput}
  onChange={(e) => setRawInput(e.target.value)}
  placeholder="교육 자료로 만들고 싶은 텍스트를 입력하세요..."
  className="w-full h-40 p-3 border rounded-lg"
/>

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
    placeholder="예: React Hooks의 useState는..." // 보조 설명
    required
    aria-required="true"
    aria-invalid={!rawInput.trim() && submitted}
    aria-describedby="raw-input-help"
    className="w-full h-40 p-3 border rounded-lg"
  />
  <span id="raw-input-help" className="text-sm text-gray-600">
    최소 100자 이상 입력 권장 (현재: {rawInput.length}자)
  </span>
</div>
```

### 5.4 인라인 검증 (Inline Validation)

```jsx
function EmailInput() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [validating, setValidating] = useState(false);

  const validateEmail = async (value) => {
    setValidating(true);
    // 비동기 검증 로직
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    setError(isValid ? '' : '유효한 이메일 주소를 입력하세요.');
    setValidating(false);
  };

  return (
    <div>
      <label htmlFor="email">이메일</label>
      <input
        id="email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => validateEmail(email)}
        aria-invalid={!!error}
        aria-describedby={error ? "email-error" : undefined}
        aria-busy={validating}
      />
      {error && (
        <span id="email-error" role="alert" className="text-red-600">
          {error}
        </span>
      )}
      {validating && (
        <span role="status" aria-live="polite">
          검증 중...
        </span>
      )}
    </div>
  );
}
```

---

## 6. 로딩/에러 상태 UX

### 6.1 로딩 상태 패턴

#### 6.1.1 기본 로딩 인디케이터

```jsx
function LoadingSpinner({ message = "로딩 중..." }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      <span className="sr-only">{message}</span>  {/* 스크린 리더용 */}
    </div>
  );
}
```

#### 6.1.2 진행률 표시 (Progress Bar)

```jsx
function ProgressBar({ progress, message }) {
  return (
    <div role="status" aria-live="polite">
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
      <p className="text-sm text-gray-600 mt-2">{message} ({progress}%)</p>
    </div>
  );
}
```

#### 6.1.3 현재 프로젝트 개선 (MentorDashboard)

```jsx
// ❌ 현재 코드
{isProcessing && <p className="text-sm text-gray-600">{processingStatus}</p>}

// ✅ 개선 코드
{isProcessing && (
  <div role="status" aria-live="polite" aria-busy="true">
    <ProgressBar progress={webllmStatus.progress || 0} message={processingStatus} />
  </div>
)}
```

### 6.2 에러 상태 패턴

#### 6.2.1 인라인 에러 (Form 필드 관련)

```jsx
function ErrorMessage({ message, fieldId }) {
  if (!message) return null;

  return (
    <div
      id={`${fieldId}-error`}
      role="alert"
      className="mt-1 text-sm text-red-600 flex items-center gap-1"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span>{message}</span>
    </div>
  );
}
```

#### 6.2.2 글로벌 에러 알림 (Toast 대체)

```jsx
// react-hot-toast는 접근성이 부족함 (aria-live 미지원)
// 대안: 커스텀 Toast with ARIA

function AccessibleToast({ message, type = 'info', onClose }) {
  const ariaLive = type === 'error' ? 'assertive' : 'polite';

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={ariaLive}
      className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg ${
        type === 'error' ? 'bg-red-600' : 'bg-green-600'
      } text-white`}
    >
      <p>{message}</p>
      <button
        onClick={onClose}
        aria-label="알림 닫기"
        className="ml-4 text-white/80 hover:text-white"
      >
        ✕
      </button>
    </div>
  );
}
```

#### 6.2.3 재시도 메커니즘

```jsx
function ErrorWithRetry({ error, onRetry }) {
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-red-800 font-semibold">오류 발생</h3>
      <p className="text-red-700 mt-2">{error.message}</p>
      <button
        onClick={onRetry}
        className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        다시 시도
      </button>
    </div>
  );
}
```

### 6.3 로딩 완료 알림

```jsx
// ❌ 시각적으로만 표시
{!isLoading && <p>완료!</p>}

// ✅ 스크린 리더에도 알림
function LoadingComplete({ message = "로딩 완료" }) {
  const [announced, setAnnounced] = useState(false);

  useEffect(() => {
    // 로딩 완료 후 1초간만 알림 표시
    setAnnounced(true);
    const timer = setTimeout(() => setAnnounced(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={announced ? '' : 'sr-only'}
    >
      {message}
    </div>
  );
}
```

### 6.4 빈 상태 (Empty State)

```jsx
function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12" role="status">
      <div className="text-6xl mb-4" aria-hidden="true">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      <p className="text-gray-600 mt-2">{description}</p>
      {action && (
        <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg">
          {action.label}
        </button>
      )}
    </div>
  );
}

// 사용 예시
<EmptyState
  icon="📚"
  title="문서가 없습니다"
  description="첫 번째 OJT 문서를 만들어보세요."
  action={{ label: "문서 생성하기", onClick: handleCreate }}
/>
```

---

## 7. 권장 오픈소스 도구

### 7.1 React 접근성 라이브러리

#### 7.1.1 React Aria (Adobe) ⭐ 권장

- **GitHub**: https://github.com/adobe/react-spectrum
- **라이선스**: Apache 2.0
- **Downloads**: 1.1M+ (npm)
- **버전**: v3.39.0 (2025년 4월 기준)
- **컴포넌트**: 53개 (Headless, 스타일 없음)

**주요 기능**:
- WAI-ARIA 패턴 자동 구현
- 키보드 네비게이션, 포커스 관리 내장
- 스크린 리더 지원 완전 자동화
- 국제화(i18n) 지원

**설치 및 사용**:

```bash
npm install react-aria
```

```jsx
import { useButton } from 'react-aria';
import { useRef } from 'react';

function Button({ onPress, children }) {
  const ref = useRef();
  const { buttonProps } = useButton({ onPress }, ref);

  return (
    <button {...buttonProps} ref={ref} className="px-4 py-2 bg-blue-600 text-white">
      {children}
    </button>
  );
}

// 자동으로 키보드(Enter/Space), 포커스 관리됨
```

**OJT Master 적용 예시**:

```bash
npm install react-aria
```

```jsx
// MentorDashboard.jsx - 탭 네비게이션 개선
import { useTabList, useTab, useTabPanel } from 'react-aria';

function Tabs({ tabs, activeTab, onChange }) {
  const state = useTabListState({ tabs, selectedKey: activeTab, onSelectionChange: onChange });
  const ref = useRef();
  const { tabListProps } = useTabList({ tabs }, state, ref);

  return (
    <div>
      <div {...tabListProps} ref={ref} className="flex gap-2">
        {tabs.map((tab) => (
          <Tab key={tab.id} state={state} item={tab} />
        ))}
      </div>
      <TabPanel key={state.selectedItem.key} state={state} />
    </div>
  );
}
```

#### 7.1.2 Radix UI ⭐ 권장

- **GitHub**: https://github.com/radix-ui/primitives
- **라이선스**: MIT
- **유지보수**: WorkOS (이전 Modulz)

**주요 특징**:
- Headless 컴포넌트 (완전한 스타일링 자유도)
- WAI-ARIA 자동 구현
- Tree-shakeable (사용한 컴포넌트만 번들에 포함)
- shadcn/ui 기반 기술

**설치 및 사용**:

```bash
npm install @radix-ui/react-dialog
```

```jsx
import * as Dialog from '@radix-ui/react-dialog';

function Modal({ isOpen, onClose, title, children }) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Description>{children}</Dialog.Description>
          <Dialog.Close asChild>
            <button>닫기</button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// 자동으로 포커스 트랩, Esc 키, aria-modal 처리됨
```

**OJT Master 적용 가능 컴포넌트**:
- `@radix-ui/react-dialog` - 문서 삭제 확인 모달
- `@radix-ui/react-dropdown-menu` - Header 모드 전환 드롭다운
- `@radix-ui/react-progress` - WebLLM 로딩 프로그레스바
- `@radix-ui/react-toast` - react-hot-toast 대체

#### 7.1.3 ARIAKit (React Advanced 2025 발표)

- **GitHub**: https://github.com/ariakit/ariakit
- **사용처**: WordPress Gutenberg, WooCommerce
- **특징**: 자동 ARIA 속성, 키보드 네비게이션

### 7.2 접근성 테스트 도구

#### 7.2.1 axe-core ⭐ 필수

- **GitHub**: https://github.com/dequelabs/axe-core
- **라이선스**: MPL-2.0
- **다운로드**: 861개 프로젝트에서 사용 중
- **버전**: 4.11.0

**주요 기능**:
- WCAG 2.0/2.1/2.2 Level A/AA/AAA 자동 검증
- 평균 57% WCAG 이슈 자동 발견
- CI/CD 파이프라인 통합 가능

**설치 및 사용**:

```bash
# Playwright 통합
npm install --save-dev @axe-core/playwright

# Vitest 통합
npm install --save-dev axe-core vitest-axe
```

```javascript
// tests/accessibility.spec.js (Playwright)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('홈페이지 접근성 검증', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('.third-party-widget')  // 외부 위젯 제외
    .analyze();

  expect(results.violations).toEqual([]);
});

test('특정 이슈 검증 (색상 대비)', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const results = await new AxeBuilder({ page })
    .include('.main-content')
    .analyze();

  const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');
  expect(contrastViolations).toEqual([]);
});
```

```javascript
// src-vite/src/utils/test-helpers.js (Vitest)
import { axe, toHaveNoViolations } from 'vitest-axe';
import { render } from '@testing-library/react';

expect.extend(toHaveNoViolations);

export async function testA11y(component) {
  const { container } = render(component);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}

// 사용 예시
test('Header 접근성 검증', async () => {
  await testA11y(<Header />);
});
```

#### 7.2.2 eslint-plugin-jsx-a11y

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```javascript
// eslint.config.js 업데이트
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  {
    plugins: {
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...jsxA11y.configs.recommended.rules,
      // 커스텀 규칙
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/img-redundant-alt': 'warn',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
    },
  },
];
```

#### 7.2.3 axe DevTools (브라우저 확장)

- **Chrome/Firefox/Edge**: 무료 확장 프로그램
- **사용자**: 수십만 명
- **실시간 검증**: 페이지 로드 시 자동 분석

**설치**:
- Chrome Web Store: "axe DevTools - Web Accessibility Testing"
- 사용법: F12 → "axe DevTools" 탭 → Scan

#### 7.2.4 Lighthouse (Chrome DevTools 내장)

```bash
# CLI로 실행
npm install -g lighthouse
lighthouse https://ggp-ojt-v2.vercel.app --only-categories=accessibility --view
```

**Playwright 통합**:

```javascript
import { playAudit } from 'playwright-lighthouse';

test('Lighthouse 접근성 점수 90 이상', async ({ page }) => {
  await page.goto('http://localhost:5173');

  await playAudit({
    page,
    thresholds: {
      accessibility: 90,
    },
  });
});
```

### 7.3 도구 비교 및 추천

| 도구 | 용도 | 단계 | 권장 여부 |
|------|------|------|-----------|
| **eslint-plugin-jsx-a11y** | 코딩 중 실시간 린팅 | 개발 | ⭐⭐⭐ 필수 |
| **axe DevTools 확장** | 수동 테스트, 디버깅 | 개발/QA | ⭐⭐⭐ 필수 |
| **axe-core (Playwright)** | 자동화 E2E 테스트 | CI/CD | ⭐⭐⭐ 필수 |
| **Lighthouse** | 종합 성능 + 접근성 | CI/CD | ⭐⭐ 권장 |
| **NVDA (스크린 리더)** | 실제 사용자 경험 테스트 | QA | ⭐⭐ 권장 |
| **WAVE** | 시각적 피드백 | 개발/QA | ⭐ 선택 |

---

## 8. 현재 프로젝트 분석

### 8.1 접근성 현황 평가

#### 8.1.1 ARIA 사용 현황

```bash
# 조사 결과 (Grep)
- 전체 ARIA 관련 코드: 11건 (4개 파일)
- aria-* 속성: 거의 없음
- role 속성: 거의 없음
```

**발견된 파일**:
1. `src-vite/src/assets/react.svg` - 1건 (이미지 파일)
2. `src-vite/src/utils/cors-proxy.js` - 3건 (주석 또는 문자열)
3. `src-vite/src/features/docs/components/UrlPreviewPanel.jsx` - 2건
4. `src-vite/src/features/admin/components/AdminDashboard.jsx` - 5건

**결론**: ARIA 구현이 거의 없음 → **CRITICAL 우선순위**

#### 8.1.2 시맨틱 HTML 사용

```jsx
// Header.jsx 분석
<header className="bg-white shadow-sm border-b">  // ✅ 시맨틱 헤더
  <div className="container mx-auto px-4 py-3">   // ❌ <nav> 누락
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">    // ❌ 로고 링크 없음
        <div className="w-10 h-10 ...">            // ❌ <img> 대신 <div>
          <span className="text-white ...">OJT</span>
        </div>
```

**개선 필요**:
- 로고를 `<img>` 또는 `<svg>`로 변경하고 `alt` 추가
- 네비게이션 영역에 `<nav>` 사용
- 메인 콘텐츠 영역에 `<main>` 사용

#### 8.1.3 키보드 네비게이션

```jsx
// Header.jsx - 드롭다운 메뉴
<button onClick={() => setShowModeMenu(!showModeMenu)}>모드</button>
{showModeMenu && (
  <div className="absolute right-0 mt-2 ...">  // ❌ Esc 키 미지원
    <button onClick={...}>Admin 대시보드</button>
  </div>
)}
```

**문제점**:
- Esc 키로 드롭다운 닫기 불가
- 포커스 트랩 없음 (Tab으로 벗어날 수 있음)
- Arrow 키 네비게이션 없음

#### 8.1.4 폼 접근성

```jsx
// MentorDashboard.jsx
<textarea
  value={rawInput}
  onChange={(e) => setRawInput(e.target.value)}
  placeholder="교육 자료로 만들고 싶은 텍스트를 입력하세요..."  // ❌ placeholder를 레이블로 사용
  className="w-full h-40 p-3 border rounded-lg"
/>
```

**문제점**:
- `<label>` 없음 (WCAG 3.3.2 위반)
- `placeholder`만으로는 스크린 리더에서 불명확
- `aria-invalid`, `aria-describedby` 없음

#### 8.1.5 로딩 상태

```jsx
// MentorDashboard.jsx
{isProcessing && <p className="text-sm text-gray-600">{processingStatus}</p>}
```

**문제점**:
- `role="status"` 없음
- `aria-live` 없음 → 스크린 리더에서 알림 안 됨
- 진행률 표시 없음 (WebLLM은 progress 제공하지만 미사용)

### 8.2 색상 대비 검증 필요 영역

| 컴포넌트 | 텍스트 색상 | 배경 색상 | 검증 상태 |
|---------|------------|----------|----------|
| Header - AI 상태 | `text-gray-600` | `bg-white` | ✅ 7.0:1 (통과) |
| Header - 서브텍스트 | `text-gray-500` | `bg-white` | ✅ 4.6:1 (통과) |
| 로고 (그라디언트) | `text-white` | `from-green-500 to-emerald-600` | ⚠️ 수동 검증 필요 |
| Mentor Mode 배너 | `text-amber-700` | `bg-amber-50` | ⚠️ 수동 검증 필요 |

### 8.3 E2E 테스트 접근성 통합 현황

```javascript
// playwright.config.js 분석
- axe-core 통합: ❌ 없음
- 접근성 테스트: ❌ 없음
```

**현재 테스트 파일** (5개):
1. `e2e-homepage.spec.js` - 로그인 플로우
2. `e2e-admin-mode.spec.js` - Admin 대시보드
3. `e2e-issue34-source-field.spec.js` - 소스 필드 검증
4. `performance.spec.js` - 성능 테스트
5. `debug-console.spec.js` - 디버그 로그

**개선**: 각 테스트에 axe-core 검증 추가 필요

---

## 9. 우선순위별 개선 로드맵

### Phase 1: Critical (WCAG 2.1 AA 법적 준수) - 1-2주

#### 작업 항목

1. **eslint-plugin-jsx-a11y 설정** (1일)
   ```bash
   npm install --save-dev eslint-plugin-jsx-a11y
   ```
   - eslint.config.js 업데이트
   - 기존 위반사항 수정 (최대 50개 경고 허용)

2. **폼 레이블 추가** (2-3일)
   - MentorDashboard.jsx: 모든 input/textarea에 `<label>` 추가
   - RoleSelectionPage.jsx: 라디오 버튼에 `<fieldset>` + `<legend>`
   - `aria-required`, `aria-invalid`, `aria-describedby` 구현

3. **키보드 네비게이션** (3-4일)
   - Header 드롭다운: Esc 키 지원
   - 모달: 포커스 트랩 구현 (Radix Dialog 도입)
   - Skip Link 추가 (메인 콘텐츠로 바로가기)

4. **ARIA Live Regions** (2일)
   - 로딩 상태: `role="status"`, `aria-live="polite"`
   - 에러 메시지: `role="alert"`, `aria-live="assertive"`
   - Toast 컨텍스트 개선 (react-hot-toast → 커스텀)

5. **색상 대비 검증** (1일)
   - WebAIM Contrast Checker로 전체 검증
   - `gray-400` → `gray-600` 변경 (필요 시)
   - 그라디언트 위 텍스트에 drop-shadow 추가

**예상 효과**:
- WCAG 2.1 AA 준수율: 30% → 80%
- axe-core 자동 검증 통과율: 0% → 60%

### Phase 2: High (사용자 경험 개선) - 2-3주

#### 작업 항목

1. **React Aria 또는 Radix UI 도입** (5일)
   ```bash
   npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-progress
   ```
   - Dialog (문서 삭제 모달)
   - DropdownMenu (Header 모드 전환)
   - Progress (WebLLM 로딩)

2. **axe-core 테스트 통합** (3일)
   ```bash
   npm install --save-dev @axe-core/playwright
   ```
   - 모든 E2E 테스트에 접근성 검증 추가
   - CI/CD 파이프라인에 통합 (실패 시 빌드 중단)

3. **시맨틱 HTML 리팩토링** (4일)
   - Header: `<nav>`, 로고 `<img>`
   - MentorDashboard/MenteeList: `<main>`, `<article>`
   - AdminDashboard: `<section>`, `<h2>`-`<h3>` 구조화

4. **로딩 UX 개선** (3일)
   - 프로그레스바 컴포넌트 (Radix Progress)
   - Skeleton 로딩 (문서 리스트)
   - "로딩 완료" 알림 (aria-live)

5. **에러 핸들링 개선** (2일)
   - 인라인 폼 에러 (aria-errormessage)
   - 재시도 버튼 (ErrorWithRetry 컴포넌트)
   - 네트워크 오프라인 감지 + 알림

**예상 효과**:
- WCAG 2.1 AA 준수율: 80% → 95%
- 스크린 리더 사용자 경험 크게 개선
- CI/CD에서 접근성 회귀 방지

### Phase 3: Medium (Best Practices) - 1-2주

#### 작업 항목

1. **WCAG 2.2 준수** (3일)
   - Target Size: 모든 버튼 최소 44x44px
   - Focus Appearance: 포커스 표시기 2px 이상
   - Accessible Authentication: 로그인 UX 개선

2. **다국어 지원 (i18n)** (4일)
   - React Aria i18n 활용
   - `lang="ko"` 속성 추가
   - 날짜/시간 포맷 로케일 대응

3. **접근성 문서화** (2일)
   - 컴포넌트별 ARIA 속성 가이드
   - Storybook 통합 (접근성 테스트 자동화)

4. **성능 최적화** (2일)
   - Code Splitting (React.lazy)
   - 이미지 최적화 (WebP, lazy loading)
   - Lighthouse 접근성 점수 95+ 목표

**예상 효과**:
- WCAG 2.2 준수
- Lighthouse 접근성 점수: 70점대 → 95+
- 유지보수성 향상

### Phase 4: Optional (Advanced) - 지속적 개선

1. **고대비 모드 (High Contrast Mode)** 지원
2. **음성 제어** 테스트 (Dragon NaturallySpeaking)
3. **ARIA 1.3 최신 기능** 적용
4. **자동 접근성 리포트** (주간 CI 리포트)

---

## 10. 구현 예시: 우선순위 TOP 5

### 10.1 MentorDashboard 폼 개선 (CRITICAL)

```jsx
// src-vite/src/features/docs/components/MentorDashboard.jsx
export default function MentorDashboard() {
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (inputType === 'text' && !rawInput.trim()) {
      newErrors.rawInput = '텍스트를 입력해주세요.';
    }
    if (inputType === 'url' && !urlInput.trim()) {
      newErrors.urlInput = 'URL을 입력해주세요.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerate = async () => {
    setSubmitted(true);
    if (!validateForm()) return;
    // ... 기존 로직
  };

  return (
    <main id="main-content" className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold mb-6">AI 콘텐츠 생성</h1>

      <form onSubmit={(e) => { e.preventDefault(); handleGenerate(); }} aria-label="OJT 문서 생성 폼">
        {/* 제목 입력 */}
        <div className="mb-4">
          <label htmlFor="input-title" className="block text-sm font-medium mb-2">
            문서 제목
            <span className="text-red-600" aria-label="필수">*</span>
          </label>
          <input
            id="input-title"
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="예: React Hooks 기초"
            required
            aria-required="true"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>

        {/* 입력 방식 선택 */}
        <fieldset className="mb-4">
          <legend className="text-sm font-medium mb-2">입력 방식</legend>
          <div className="flex gap-4">
            <div>
              <input
                type="radio"
                id="input-text"
                name="inputType"
                value="text"
                checked={inputType === 'text'}
                onChange={(e) => setInputType(e.target.value)}
              />
              <label htmlFor="input-text" className="ml-2">직접 작성</label>
            </div>
            <div>
              <input
                type="radio"
                id="input-url"
                name="inputType"
                value="url"
                checked={inputType === 'url'}
                onChange={(e) => setInputType(e.target.value)}
              />
              <label htmlFor="input-url" className="ml-2">URL 입력</label>
            </div>
          </div>
        </fieldset>

        {/* 텍스트 입력 */}
        {inputType === 'text' && (
          <div className="mb-4">
            <label htmlFor="raw-input" className="block text-sm font-medium mb-2">
              교육 자료 텍스트
              <span className="text-red-600" aria-label="필수">*</span>
            </label>
            <textarea
              id="raw-input"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="예: React Hooks는 함수 컴포넌트에서 state를 사용하게 해주는..."
              required
              aria-required="true"
              aria-invalid={!!errors.rawInput}
              aria-describedby={errors.rawInput ? "raw-input-error raw-input-help" : "raw-input-help"}
              className="w-full h-40 p-3 border rounded-lg"
            />
            <span id="raw-input-help" className="text-sm text-gray-600">
              최소 100자 이상 권장 (현재: {rawInput.length}자)
            </span>
            {errors.rawInput && (
              <span id="raw-input-error" role="alert" className="block text-sm text-red-600 mt-1">
                {errors.rawInput}
              </span>
            )}
          </div>
        )}

        {/* URL 입력 */}
        {inputType === 'url' && (
          <div className="mb-4">
            <label htmlFor="url-input" className="block text-sm font-medium mb-2">
              URL 주소
              <span className="text-red-600" aria-label="필수">*</span>
            </label>
            <input
              id="url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article"
              required
              aria-required="true"
              aria-invalid={!!errors.urlInput}
              aria-describedby={errors.urlInput ? "url-input-error" : undefined}
              className="w-full px-3 py-2 border rounded-lg"
            />
            {errors.urlInput && (
              <span id="url-input-error" role="alert" className="block text-sm text-red-600 mt-1">
                {errors.urlInput}
              </span>
            )}
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isProcessing || !webllmStatus.loaded}
          aria-busy={isProcessing}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
        >
          {isProcessing ? '생성 중...' : 'AI 생성 시작'}
        </button>
      </form>

      {/* 로딩 상태 */}
      {isProcessing && (
        <div role="status" aria-live="polite" className="mt-4">
          <ProgressBar progress={webllmStatus.progress || 0} message={processingStatus} />
        </div>
      )}
    </main>
  );
}
```

### 10.2 Header 키보드 네비게이션 (CRITICAL)

```jsx
// src-vite/src/layouts/Header.jsx
import { useState, useEffect, useRef } from 'react';

export default function Header() {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  // Esc 키로 메뉴 닫기
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

  // 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowModeMenu(false);
      }
    };
    if (showModeMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showModeMenu]);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center justify-between" aria-label="메인 네비게이션">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3">
            <img
              src="/logo.svg"
              alt="OJT Master 로고"
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-xl font-bold text-gray-800">OJT Master</h1>
              <p className="text-xs text-gray-500">v2.10.0 (WebLLM)</p>
            </div>
          </a>

          <div className="flex items-center gap-4">
            {/* Mode Switch */}
            {isAdmin && (
              <div className="relative" ref={menuRef}>
                <button
                  ref={buttonRef}
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setShowModeMenu(!showModeMenu);
                    }
                  }}
                  aria-haspopup="true"
                  aria-expanded={showModeMenu}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  모드 전환
                </button>
                {showModeMenu && (
                  <div
                    role="menu"
                    aria-label="모드 선택"
                    className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-50"
                  >
                    <button
                      role="menuitem"
                      onClick={() => {
                        handleModeSwitch('admin');
                        setShowModeMenu(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          handleModeSwitch('admin');
                          setShowModeMenu(false);
                        }
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Admin 대시보드
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => {
                        handleModeSwitch('mentor');
                        setShowModeMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                    >
                      Mentor 작업실
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Logout */}
            <button
              onClick={handleLogout}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleLogout();
                }
              }}
              aria-label="로그아웃"
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
            >
              로그아웃
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
}
```

### 10.3 로딩 상태 개선 (HIGH)

```jsx
// src-vite/src/components/ProgressBar.jsx (신규 파일)
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

// 사용 예시 (MentorDashboard.jsx)
{isProcessing && (
  <ProgressBar progress={webllmStatus.progress || 0} message={processingStatus} />
)}
```

### 10.4 axe-core 테스트 통합 (HIGH)

```bash
npm install --save-dev @axe-core/playwright
```

```javascript
// tests/accessibility.spec.js (신규 파일)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('접근성 검증', () => {
  test('홈페이지 (로그인 전)', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('Mentor Dashboard', async ({ page }) => {
    // 로그인 로직
    await page.goto('/');
    await page.click('text=Google로 로그인');
    // ... 로그인 완료 대기

    await page.goto('/mentor');

    const results = await new AxeBuilder({ page })
      .exclude('.third-party-widget')
      .analyze();

    // Critical/Serious 위반만 실패 처리 (Minor는 경고)
    const criticalViolations = results.violations.filter(
      v => v.impact === 'critical' || v.impact === 'serious'
    );
    expect(criticalViolations).toEqual([]);
  });

  test('색상 대비 검증', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .include('main')
      .analyze();

    const contrastIssues = results.violations.filter(v => v.id === 'color-contrast');
    expect(contrastIssues).toEqual([]);
  });
});
```

```javascript
// tests/e2e-homepage.spec.js (기존 파일 업데이트)
import AxeBuilder from '@axe-core/playwright';

test('로그인 플로우', async ({ page }) => {
  await page.goto('/');

  // 기존 E2E 테스트
  // ...

  // 접근성 검증 추가
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations.filter(v => v.impact === 'critical')).toEqual([]);
});
```

### 10.5 eslint-plugin-jsx-a11y 설정 (CRITICAL)

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```javascript
// eslint.config.js
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-plugin-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default [
  { ignores: ['dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      prettier,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,

      // React Refresh
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Accessibility (강제)
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/aria-proptypes': 'error',
      'jsx-a11y/aria-unsupported-elements': 'error',
      'jsx-a11y/click-events-have-key-events': 'warn',
      'jsx-a11y/label-has-associated-control': 'error',
      'jsx-a11y/no-autofocus': 'warn',
      'jsx-a11y/no-static-element-interactions': 'warn',

      // General
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'warn',
      'no-var': 'error',

      // Prettier
      'prettier/prettier': 'warn',
    },
  },
];
```

```bash
# 기존 위반사항 확인
npm run lint

# 자동 수정 가능한 항목 수정
npm run lint:fix

# 수동 수정 필요한 항목 확인
npm run lint -- --max-warnings 0
```

---

## 11. 체크리스트 요약

### 개발자 일일 체크리스트

- [ ] 새 컴포넌트 작성 시 `eslint-plugin-jsx-a11y` 경고 0개
- [ ] 모든 `<img>`에 `alt` 속성 추가
- [ ] 모든 `<input>`/`<textarea>`에 `<label>` 연결
- [ ] 버튼은 `<button>` 사용 (div onClick 금지)
- [ ] 키보드로 모든 인터랙션 테스트 (Tab, Enter, Esc)
- [ ] 색상 대비 4.5:1 이상 (WebAIM Checker)

### QA 테스트 체크리스트

- [ ] Chrome DevTools → Lighthouse 접근성 점수 90+
- [ ] axe DevTools 확장으로 전체 페이지 스캔 (위반 0개)
- [ ] 키보드 전용 네비게이션 테스트
- [ ] NVDA 스크린 리더로 주요 플로우 테스트
- [ ] 모바일 (320px 너비)에서 가로스크롤 없이 작동

### CI/CD 자동 체크

- [ ] `npm run lint` 통과 (max-warnings 50)
- [ ] Playwright 접근성 테스트 통과 (axe-core)
- [ ] 색상 대비 자동 검증 통과

---

## 12. 참고 자료

### 공식 문서

- [WCAG 2.1 Guidelines](https://www.w3.org/TR/WCAG21/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [React Aria Documentation](https://react-spectrum.adobe.com/react-aria/)
- [Radix UI Primitives](https://www.radix-ui.com/primitives)
- [axe-core GitHub](https://github.com/dequelabs/axe-core)

### 도구 및 체커

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools (Chrome)](https://chromewebstore.google.com/detail/axe-devtools-web-accessib/lhdoppojpmngadmnindnejefpokejbdd)
- [NVDA 스크린 리더 (무료)](https://www.nvaccess.org/download/)
- [Accessible Web Color Contrast Checker](https://accessibleweb.com/color-contrast-checker/)

### 법적 규제

- [European Accessibility Act (EAA) - 2025년 6월 28일 시행](https://innowise.com/blog/wcag-21-aa/)
- [ADA Title II Rule - 2026년 4월 24일 준수](https://www.manilatimes.net/2025/12/03/tmt-newswire/globenewswire/ai-media-launches-ada-title-ii-compliance-initiative-to-support-public-entities-meeting-wcag-21-aa-deadlines/2235671)
- [WCAG 2.2 Summary](https://www.wcag.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/)

### 블로그 및 튜토리얼

- [Accessibility Quick Wins in React 2025](https://medium.com/@sureshdotariya/accessibility-quick-wins-in-reactjs-2025-skip-links-focus-traps-aria-live-regions-c926b9e44593)
- [Keyboard Accessibility for Complex React](https://www.freecodecamp.org/news/designing-keyboard-accessibility-for-complex-react-experiences/)
- [Screen Reader Support Best Practices](https://blog.greeden.me/en/2025/08/18/complete-guide-to-screen-reader-support-fundamentals-implementation-tips-nvda-voiceover-talkback/)

---

## Sources

- [WCAG 2.1 AA compliance: Guidelines, checklist, and deadlines explained](https://innowise.com/blog/wcag-21-aa/)
- [WCAG 2.1 AA & ADA Compliance Checklist for Shopify, WordPress & E-commerce | Netkodo 2025](https://netkodo.com/blog/how-to-check-if-your-website-is-wcag-21-aa--ada-compliant-before-june-2025)
- [Web Content Accessibility Guidelines (WCAG) 2.1](https://www.w3.org/TR/WCAG21/)
- [The ultimate WCAG 2.1 and 2.2 Level AA checklist](https://accessibe.com/blog/knowledgebase/wcag-checklist)
- [Accessibility – React](https://legacy.reactjs.org/docs/accessibility.html)
- [How to Design Keyboard Accessibility for Complex React Experiences](https://www.freecodecamp.org/news/designing-keyboard-accessibility-for-complex-react-experiences/)
- [Accessibility with Interactive Components at React Advanced Conf](https://www.infoq.com/news/2025/12/accessibility-ariakit-react/)
- [Accessibility – React Aria](https://react-spectrum.adobe.com/react-aria/accessibility.html)
- [ARIA - Accessibility | MDN](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA)
- [Mastering ARIA Accessibility for Modern Web Design](https://beaccessible.com/post/aria-accessibility/)
- [Complete Guide to Screen Reader Support](https://blog.greeden.me/en/2025/08/18/complete-guide-to-screen-reader-support-fundamentals-implementation-tips-nvda-voiceover-talkback/)
- [WebAIM: Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Color Contrast Accessibility: Complete WCAG 2025 Guide](https://www.allaccessible.org/blog/color-contrast-accessibility-wcag-guide-2025)
- [ARIA Labels for Web Accessibility: Complete 2025 Implementation Guide](https://www.allaccessible.org/blog/implementing-aria-labels-for-web-accessibility)
- [Build Accessible Web Forms with ARIA Labels](https://primeinspire.com/blog/build-accessible-web-forms-with-aria-labels)
- [Essential UX Accessibility Tips for Designers in 2025](https://www.wcag.com/resource/ux-quick-tips-for-designers/)
- [Loading Feedback Patterns – accessibility](https://accessibility.perpendicularangel.com/tests-by-component/loading-feedback-patterns/)
- [React Aria](https://react-spectrum.adobe.com/react-aria/index.html)
- [GitHub - adobe/react-spectrum](https://github.com/adobe/react-spectrum)
- [Accessibility – Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/accessibility)
- [Radix Primitives](https://www.radix-ui.com/primitives)
- [GitHub - dequelabs/axe-core](https://github.com/dequelabs/axe-core)
- [Accessibility Testing Tools & Software: Axe](https://www.deque.com/axe/)
- [Automate Accessibility Testing With axe DevTools](https://www.deque.com/axe/devtools/)
