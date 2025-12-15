# PRD-0014: 톤앤매너 가이드라인 시스템

## 개요

| 항목 | 내용 |
|------|------|
| **PRD 번호** | 0014 |
| **제목** | 톤앤매너 가이드라인 시스템 |
| **상태** | Draft |
| **작성일** | 2025-12-12 |
| **관련 이슈** | - |
| **선행 PRD** | - |
| **참고 리서치** | `.claude/research/tone-and-manner-2025.md` |

---

## 1. 배경 및 목표

### 1.1 배경

OJT Master는 신입사원 온보딩 교육 플랫폼으로, 일관된 사용자 경험을 위해 체계적인 톤앤매너 가이드라인이 필요합니다.

**2025년 트렌드 분석 결과**:
- Z세대(18-24세)의 67%가 **Pragmatic & Respectful** 톤 선호
- **Mission-Based Branding**이 전 연령대에서 가장 영향력 있는 트렌드
- **진정성(Authenticity)**과 **인간적 연결**이 핵심 가치

### 1.2 현재 문제점

| 영역 | 문제점 |
|------|--------|
| **UX Writing** | 일관된 톤 가이드 부재 (페이지마다 말투 상이) |
| **색상** | 시스템적인 색상 팔레트 미정의 |
| **에러 메시지** | 기술적 메시지 그대로 노출 |
| **빈 상태(Empty State)** | 단순 "데이터 없음" 표시 |

### 1.3 목표

1. **일관된 브랜드 경험**: 모든 터치포인트에서 통일된 톤앤매너
2. **사용자 친화적 커뮤니케이션**: 교육 서비스에 맞는 격려형 톤
3. **디자인 시스템 기반 구축**: 재사용 가능한 토큰 및 컴포넌트

---

## 2. 톤앤매너 정의

### 2.1 브랜드 보이스 (Brand Voice)

| 속성 | 설명 | Do | Don't |
|------|------|-----|-------|
| **따뜻한 (Warm)** | 환영하고 격려하는 느낌 | "반가워요!", "잘하고 있어요" | "환영합니다", "완료되었습니다" |
| **실용적 (Pragmatic)** | 명확하고 도움되는 정보 | "다음 단계로 넘어가볼까요?" | "proceed to the next step" |
| **존중하는 (Respectful)** | 정중하되 딱딱하지 않은 | "~해 주세요", "~할까요?" | "~하시오", "~해야 함" |
| **격려하는 (Encouraging)** | 학습 동기를 부여 | "조금만 더 힘내요!", "대단해요!" | "실패했습니다", "오류" |

### 2.2 타겟 사용자별 톤

| 역할 | 주요 연령대 | 권장 톤 |
|------|------------|---------|
| **Mentee (신입사원)** | 20대 중후반 | 친근하고 격려하는, 존댓말 |
| **Mentor (선배사원)** | 30대 | 전문적이면서 따뜻한 |
| **Admin (관리자)** | 30-40대 | 신뢰감 있고 효율적인 |

---

## 3. 디자인 토큰 정의

### 3.1 색상 팔레트 (Color Palette)

```javascript
// src/styles/tokens/colors.js
export const colors = {
  // Primary - 신뢰, 전문성
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#3B82F6',  // Main
    600: '#2563EB',
    700: '#1D4ED8',
    800: '#1E40AF',
    900: '#1E3A8A',
  },

  // Secondary - 깊이, 안정감
  secondary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',  // Main (Indigo)
    700: '#4338CA',
  },

  // Success - 성공, 진행, 긍정
  success: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    500: '#10B981',  // Main (Emerald)
    700: '#047857',
  },

  // Warning - 주의, 알림
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    500: '#F59E0B',  // Main (Amber)
    700: '#B45309',
  },

  // Error - 에러, 위험
  error: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    500: '#F43F5E',  // Main (Rose)
    700: '#BE123C',
  },

  // Neutral - 텍스트, 배경
  neutral: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};
```

### 3.2 타이포그래피 (Typography)

```javascript
// src/styles/tokens/typography.js
export const typography = {
  fontFamily: {
    sans: ['Pretendard', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  fontSize: {
    xs: '0.75rem',    // 12px
    sm: '0.875rem',   // 14px
    base: '1rem',     // 16px
    lg: '1.125rem',   // 18px
    xl: '1.25rem',    // 20px
    '2xl': '1.5rem',  // 24px
    '3xl': '1.875rem', // 30px
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
};
```

### 3.3 간격 (Spacing)

```javascript
// src/styles/tokens/spacing.js
export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
};
```

---

## 4. UX Writing 가이드

### 4.1 상황별 메시지 템플릿

#### 성공 메시지 (Success)

| 상황 | Before (기존) | After (개선) |
|------|--------------|--------------|
| 로그인 성공 | "로그인 완료" | "반가워요! 오늘도 화이팅이에요" |
| 학습 완료 | "학습 완료되었습니다" | "훌륭해요! 이번 단계를 완료했어요" |
| 퀴즈 통과 | "합격" | "축하해요! 퀴즈를 통과했어요" |
| 저장 완료 | "저장되었습니다" | "안전하게 저장했어요" |

#### 에러 메시지 (Error)

| 상황 | Before (기존) | After (개선) |
|------|--------------|--------------|
| 네트워크 오류 | "Network Error" | "인터넷 연결을 확인해 주세요" |
| 인증 실패 | "401 Unauthorized" | "로그인이 필요해요. 다시 로그인해 주세요" |
| 필수값 누락 | "Required field" | "이 항목은 꼭 필요해요" |
| 서버 오류 | "500 Internal Server Error" | "앗, 문제가 생겼어요. 잠시 후 다시 시도해 주세요" |

#### 빈 상태 (Empty State)

| 상황 | Before (기존) | After (개선) |
|------|--------------|--------------|
| 학습 자료 없음 | "데이터 없음" | "아직 학습 자료가 없어요. 첫 번째 자료를 만들어볼까요?" |
| 검색 결과 없음 | "검색 결과 없음" | "찾으시는 내용이 없네요. 다른 키워드로 검색해 보세요" |
| 알림 없음 | "알림 없음" | "새로운 소식이 없어요. 학습을 시작해볼까요?" |

#### 확인/안내 (Confirmation)

| 상황 | Before (기존) | After (개선) |
|------|--------------|--------------|
| 삭제 확인 | "삭제하시겠습니까?" | "정말 삭제할까요? 되돌릴 수 없어요" |
| 나가기 확인 | "변경사항이 저장되지 않습니다" | "작성 중인 내용이 있어요. 저장하지 않고 나갈까요?" |
| 로딩 중 | "Loading..." | "준비 중이에요..." |

### 4.2 버튼 레이블

| 유형 | 권장 | 피하기 |
|------|------|--------|
| 긍정적 액션 | "시작하기", "저장하기", "완료" | "Submit", "OK" |
| 부정적 액션 | "취소", "나가기" | "Cancel", "Exit" |
| 탐색 | "자세히 보기", "더 알아보기" | "More", "Detail" |

---

## 5. 컴포넌트 가이드라인

### 5.1 Toast 메시지

```jsx
// 성공 토스트
<Toast type="success" message="훌륭해요! 학습을 완료했어요" />

// 에러 토스트
<Toast type="error" message="앗, 문제가 생겼어요. 다시 시도해 주세요" />

// 정보 토스트
<Toast type="info" message="새로운 학습 자료가 등록되었어요" />

// 경고 토스트
<Toast type="warning" message="30분 후 자동 로그아웃 돼요" />
```

### 5.2 Empty State 컴포넌트

```jsx
<EmptyState
  icon={<BookOpen />}
  title="아직 학습 자료가 없어요"
  description="첫 번째 학습 자료를 만들어보세요"
  action={{
    label: "자료 만들기",
    onClick: handleCreate
  }}
/>
```

### 5.3 Confirmation Dialog

```jsx
<ConfirmDialog
  title="정말 삭제할까요?"
  description="삭제하면 되돌릴 수 없어요"
  confirmLabel="삭제하기"
  cancelLabel="취소"
  variant="danger"
/>
```

---

## 6. 구현 계획

### Phase 1: 기반 구축 (Week 1)

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 디자인 토큰 정의 | `src/styles/tokens/` | P0 |
| Tailwind 설정 업데이트 | `tailwind.config.js` | P0 |
| Toast 컴포넌트 개선 | `src/components/ui/Toast.jsx` | P1 |

### Phase 2: UX Writing 적용 (Week 2)

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 메시지 상수 파일 생성 | `src/constants/messages.js` | P0 |
| 에러 메시지 개선 | 전체 에러 핸들러 | P1 |
| Empty State 컴포넌트 | `src/components/ui/EmptyState.jsx` | P1 |

### Phase 3: 전체 적용 (Week 3-4)

| 작업 | 파일 | 우선순위 |
|------|------|----------|
| 인증 관련 메시지 | `src/features/auth/` | P1 |
| 학습 관련 메시지 | `src/features/learning/` | P1 |
| 관리자 대시보드 | `src/features/admin/` | P2 |

---

## 7. 성공 지표

| 지표 | 현재 | 목표 |
|------|------|------|
| UX Writing 일관성 | 미측정 | 100% 가이드라인 준수 |
| 사용자 이탈률 (에러 페이지) | 미측정 | 20% 감소 |
| 온보딩 완료율 | 미측정 | 10% 향상 |

---

## 8. 참고 자료

- 리서치: `.claude/research/tone-and-manner-2025.md`
- [2025 UI/UX 디자인 트렌드](https://ditoday.com/previewing-ui-ux-design-trends/)
- [Top Branding Trends 2025](https://looka.com/blog/branding-trends/)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 | 작성자 |
|------|------|----------|--------|
| 0.1.0 | 2025-12-12 | 초안 작성 | Claude |
