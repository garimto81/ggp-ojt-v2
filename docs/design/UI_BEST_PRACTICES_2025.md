# OJT Master UI 베스트 프랙티스 & 개선 제안서

> **버전**: v2.10.0 | **작성일**: 2025-12-07
> **목적**: 2025년 최신 UI/UX 트렌드 기반 OJT Master 개선 가이드

---

## Executive Summary

5개 병렬 에이전트 리서치 결과를 종합하여, OJT Master의 UI를 2025년 베스트 프랙티스에 맞게 개선하기 위한 전략을 제시합니다.

### 핵심 발견사항

| 영역 | 현재 상태 | 목표 | 우선순위 |
|------|----------|------|----------|
| **디자인 시스템** | 없음 (Ad-hoc 스타일링) | CVA + 디자인 토큰 | CRITICAL |
| **컴포넌트 재사용성** | 매우 낮음 | 15개 공통 컴포넌트 | CRITICAL |
| **접근성 (a11y)** | WCAG 30% 준수 | WCAG 2.1 AA 95% | HIGH |
| **Admin 대시보드** | 기본 구현 | Tremor + TanStack Table | HIGH |
| **모바일 대응** | 부분적 | Mobile-First 완성 | MEDIUM |

### 권장 라이브러리 스택

| 용도 | 추천 | 라이선스 | 비고 |
|------|------|----------|------|
| **UI 컴포넌트** | Tremor | MIT | Vercel 인수, Tailwind 기반 |
| **Headless UI** | Radix UI | MIT | 접근성 내장, shadcn/ui 기반 |
| **테이블** | TanStack Table | MIT | Headless, 15KB |
| **차트** | Chart.js (유지) | MIT | 현재 사용 중 |
| **애니메이션** | Framer Motion | MIT | React 친화적 |
| **Variant 관리** | CVA | MIT | class-variance-authority |

---

## 1. 현재 UI 구조 분석

### 1.1 컴포넌트별 문제점

| 컴포넌트 | 문제점 | 심각도 |
|----------|--------|--------|
| **전체** | Button, Card, Input 스타일 반복 | HIGH |
| **전체** | 색상 체계 정의 없음 (ad-hoc) | HIGH |
| **AdminDashboard** | 통계 카드에 트렌드 지표 없음 | MEDIUM |
| **MentorDashboard** | 반응형 레이아웃 없음 (col-span-2 고정) | HIGH |
| **모든 테이블** | 모바일 대응 overflow-x-auto만 | MEDIUM |
| **모든 폼** | placeholder만 사용 (WCAG 위반) | HIGH |

### 1.2 일관성 문제

```
색상 혼재:
- Primary: blue-500/600 (OK)
- Success: green-500/600 (OK)
- 통계 카드: blue/green/purple/orange-50 혼용 (문제)
- Slate vs Gray 혼용 (AIEngineSelector)

버튼 스타일 불일치:
- AdminDashboard: "text-xs px-2 py-1 rounded"
- MentorDashboard: "w-full py-3 rounded-lg"
- MenteeStudy: "px-6 py-3 rounded-lg"
```

---

## 2. 2025 교육 플랫폼 UI 트렌드

### 2.1 핵심 트렌드 7가지

| 트렌드 | 설명 | OJT Master 적용 |
|--------|------|-----------------|
| **Mobile-First** | Thumb-First 디자인, 스와이프 네비게이션 | 하단 네비게이션, 큰 터치 영역 |
| **AI 개인화** | 학습자 성과 기반 적응형 경로 | WebLLM 기반 퀴즈 난이도 조절 |
| **마이크로러닝** | 짧고 집중적인 콘텐츠 모듈 | Step 분할 강화 |
| **미니멀리즘** | 콘텐츠 중심, 인지 부하 감소 | 여백 확보, 불필요한 장식 제거 |
| **데이터 시각화** | 실시간 진행률, 성과 지표 | 통계 탭 차트 개선 |
| **게이미피케이션** | 점수, 레벨, 보상 시스템 | 퀴즈 통과 시 애니메이션 |
| **접근성** | WCAG 2.1 AA, 스크린 리더 지원 | ARIA, 키보드 네비게이션 |

### 2.2 플랫폼 벤치마크

| 플랫폼 | 강점 | OJT Master 적용 가능 |
|--------|------|---------------------|
| **Coursera** | 깔끔한 디자인, 진행률 추적 | 통계 대시보드 레이아웃 |
| **Udemy** | 직관적 인터페이스 | 코스 카드 디자인 |
| **Duolingo** | 게임화, 단계별 보상 | 퀴즈 피드백 애니메이션 |

---

## 3. 디자인 시스템 구축 전략

### 3.1 Atomic Design Light 구조

```
src/
├── components/
│   ├── ui/                    # Atoms + Molecules
│   │   ├── button.jsx         # CVA 패턴
│   │   ├── input.jsx
│   │   ├── card.jsx
│   │   ├── badge.jsx
│   │   ├── select.jsx         # Radix 기반
│   │   ├── dialog.jsx         # Radix 기반
│   │   ├── toast.jsx
│   │   └── index.js
│   ├── layout/                # Organisms
│   │   ├── page-header.jsx
│   │   ├── section.jsx
│   │   └── index.js
│   └── feedback/              # Organisms
│       ├── loading-spinner.jsx
│       ├── empty-state.jsx
│       └── error-boundary.jsx
├── features/                  # 기존 Feature 구조 유지
└── styles/
    └── tokens.css             # 디자인 토큰
```

### 3.2 디자인 토큰 (Tailwind CSS 4.x @theme)

```css
@theme {
  /* Brand Colors */
  --color-brand-primary: #2563eb;
  --color-brand-primary-hover: #1d4ed8;
  --color-brand-secondary: #10b981;

  /* Semantic Colors */
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* Neutral Scale */
  --color-neutral-50: #f9fafb;
  --color-neutral-100: #f3f4f6;
  --color-neutral-500: #6b7280;
  --color-neutral-900: #111827;

  /* Spacing (8px grid) */
  --spacing-2: 0.5rem;
  --spacing-4: 1rem;
  --spacing-6: 1.5rem;

  /* Border Radius */
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
}
```

### 3.3 CVA Button 예시

```jsx
import { cva } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-[--color-brand-primary] text-white hover:bg-[--color-brand-primary-hover]',
        secondary: 'bg-[--color-neutral-200] text-[--color-neutral-900] hover:bg-[--color-neutral-300]',
        outline: 'border border-[--color-neutral-300] bg-transparent hover:bg-[--color-neutral-100]',
        danger: 'bg-[--color-error] text-white hover:bg-red-600',
        success: 'bg-[--color-success] text-white hover:bg-green-600',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export function Button({ variant, size, className, ...props }) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
  );
}
```

---

## 4. Admin 대시보드 개선안

### 4.1 KPI 카드 개선

**현재:**
```jsx
<div className="bg-white rounded-xl p-4 shadow-sm">
  <p className="text-sm text-gray-500">총 사용자</p>
  <p className="text-2xl font-bold">{stats.totalUsers}</p>
</div>
```

**개선 (Tremor):**
```jsx
import { Card, Metric, Text, Flex, BadgeDelta, ProgressBar } from '@tremor/react';

<Card decoration="top" decorationColor="blue">
  <Flex justifyContent="between" alignItems="center">
    <Text>총 사용자</Text>
    <BadgeDelta deltaType="increase">+12%</BadgeDelta>
  </Flex>
  <Metric>{stats.totalUsers}</Metric>
  <Text className="mt-2">전월 대비 +15명</Text>
  <ProgressBar value={75} className="mt-3" />
</Card>
```

### 4.2 테이블 개선 (TanStack Table)

**장점:**
- 정렬/필터/페이지네이션 로직 단순화
- Headless → 현재 Tailwind 디자인 유지
- 번들 크기 15KB

```jsx
import { useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table';

const columns = [
  { accessorKey: 'name', header: '이름', enableSorting: true },
  { accessorKey: 'role', header: '역할', cell: RoleSelectCell },
  { accessorKey: 'department', header: '부서' },
  { accessorKey: 'created_at', header: '가입일' },
  { id: 'actions', cell: ActionsCell },
];

const table = useReactTable({
  data: users,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
```

### 4.3 추가 개선 사항

| 기능 | 현재 | 개선안 |
|------|------|--------|
| **URL 필터** | 미구현 | `useSearchParams`로 필터 상태 저장 |
| **기간 필터** | 없음 | 최근 7일/30일/90일 선택 |
| **필터 초기화** | 없음 | 초기화 버튼 + 활성 필터 개수 표시 |
| **CSV 내보내기** | 없음 | 데이터 다운로드 기능 |

---

## 5. 접근성 (a11y) 개선 체크리스트

### 5.1 WCAG 2.1 AA 필수 항목

| 항목 | 현재 상태 | 수정 방법 |
|------|----------|----------|
| **폼 레이블** | placeholder만 사용 | `<label>` + `htmlFor` 추가 |
| **색상 대비** | 검증 필요 (gray-400 문제) | gray-400 → gray-600 |
| **키보드 네비게이션** | Esc 키 미지원 | Radix Dialog 도입 |
| **ARIA Live** | 로딩 상태 알림 없음 | `role="status"` 추가 |
| **Skip Link** | 없음 | 메인 콘텐츠 건너뛰기 링크 |

### 5.2 권장 도구

```bash
# 개발 시 실시간 린팅
npm install --save-dev eslint-plugin-jsx-a11y

# E2E 접근성 테스트
npm install --save-dev @axe-core/playwright

# 컴포넌트 접근성 (Radix 기반)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
```

### 5.3 Quick Win (1주 내 적용)

```jsx
// Before (WCAG 위반)
<input placeholder="이름 검색..." />

// After (WCAG 준수)
<div>
  <label htmlFor="user-search" className="sr-only">사용자 검색</label>
  <input
    id="user-search"
    placeholder="이름 검색..."
    aria-describedby="search-hint"
  />
  <span id="search-hint" className="sr-only">이름으로 사용자를 검색합니다</span>
</div>
```

---

## 6. 모바일 최적화 전략

### 6.1 Thumb-First 디자인

```
                    ┌─────────────────────┐
  Easy to reach → │                     │
                    │    MAIN CONTENT     │
                    │                     │
                    │                     │
  Natural reach → │   [Action Button]   │ ← 하단 고정
                    │                     │
  Hard to reach → │                     │
                    ├─────────────────────┤
                    │ [Tab1] [Tab2] [Tab3]│ ← 하단 네비게이션
                    └─────────────────────┘
```

### 6.2 반응형 그리드 개선

**현재 (MentorDashboard):**
```jsx
<div className="grid grid-cols-3 gap-6">  {/* 고정 3열 */}
```

**개선:**
```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
```

### 6.3 터치 타겟 크기

WCAG 2.2 기준: 최소 24x24px (권장 44x44px)

```jsx
// 버튼 최소 크기 보장
<button className="min-h-[44px] min-w-[44px] p-3">
  액션
</button>
```

---

## 7. 애니메이션 & 피드백

### 7.1 Framer Motion 적용

```jsx
import { motion } from 'framer-motion';

// 퀴즈 정답 피드백
<motion.div
  initial={{ scale: 0, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  transition={{ type: "spring", stiffness: 260, damping: 20 }}
  className="bg-green-100 p-4 rounded-lg"
>
  정답입니다!
</motion.div>

// 페이지 전환
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -20 }}
>
  {children}
</motion.div>
```

### 7.2 로딩 상태 개선

```jsx
// aria-live로 스크린 리더 알림
<div role="status" aria-live="polite" className="flex items-center gap-2">
  <Spinner size="sm" />
  <span>콘텐츠를 생성하는 중...</span>
</div>
```

---

## 8. 구현 로드맵

### Phase 1: 기반 구축 (1-2주)

```bash
# 의존성 설치
npm install class-variance-authority clsx tailwind-merge
npm install @radix-ui/react-dialog @radix-ui/react-select
npm install --save-dev eslint-plugin-jsx-a11y
```

**작업 목록:**
- [ ] `src/utils/cn.js` 생성
- [ ] `src/styles/tokens.css` 디자인 토큰 정의
- [ ] `src/components/ui/button.jsx` CVA 패턴 적용
- [ ] `src/components/ui/input.jsx` 접근성 개선
- [ ] `src/components/ui/card.jsx` 통일

### Phase 2: 핵심 컴포넌트 (2-3주)

**작업 목록:**
- [ ] Badge, Select, Dialog 컴포넌트 생성
- [ ] Toast 컴포넌트 (Radix Toast 기반)
- [ ] Loading Spinner 통일
- [ ] Empty State 컴포넌트

### Phase 3: 페이지 리팩토링 (2-3주)

**작업 목록:**
- [ ] AdminDashboard → Tremor 카드 + TanStack Table
- [ ] MentorDashboard → 반응형 레이아웃
- [ ] MenteeList → 카드 컴포넌트 적용
- [ ] MenteeStudy → 애니메이션 추가

### Phase 4: 접근성 & 최적화 (1-2주)

**작업 목록:**
- [ ] 전체 폼 레이블 추가
- [ ] 키보드 네비게이션 검증
- [ ] axe-core 테스트 통합
- [ ] Lighthouse 접근성 95+ 달성

---

## 9. 예상 효과

| 지표 | 현재 | 목표 (3개월 후) |
|------|------|------------------|
| **재사용 컴포넌트** | 0개 | 15개 |
| **코드 중복률** | 높음 | 5% 이하 |
| **WCAG 준수율** | ~30% | 95% |
| **Lighthouse 접근성** | 측정 필요 | 95+ |
| **모바일 사용성** | 부분적 | 완전 대응 |
| **신규 페이지 개발 시간** | 기준 | 50% 단축 |

---

## 10. 참고 자료

### 디자인 시스템
- [Tremor - Tailwind Dashboard Components](https://www.tremor.so/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [CVA - Class Variance Authority](https://cva.style/docs)

### 접근성
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [React Aria (Adobe)](https://react-spectrum.adobe.com/react-aria/)
- [axe-core](https://github.com/dequelabs/axe-core)

### UI 트렌드
- [LMS UI/UX Design Best Practices 2025](https://techhbs.com/designing-lms-ui-ux-best-practices/)
- [Mobile App Design Trends 2025](https://spdload.com/blog/mobile-app-ui-ux-design-trends/)

---

## 변경 이력

| 버전 | 날짜 | 작성자 | 내용 |
|------|------|--------|------|
| 1.0 | 2025-12-07 | Claude | 초안 작성 (5개 병렬 리서치 종합) |
