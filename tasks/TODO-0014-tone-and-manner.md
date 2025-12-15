# TODO: PRD-0014 톤앤매너 가이드라인 시스템

**PRD**: `tasks/prds/0014-tone-and-manner-guideline.md`
**리서치**: `.claude/research/tone-and-manner-2025.md`
**시작일**: 2025-12-12
**상태**: 🟢 Phase 1-2 완료

---

## Phase 1: 기반 구축 (Priority: P0) ✅ 완료

### 1.1 디자인 토큰 정의 ✅

> **구현 방식 변경**: Tailwind CSS 4에서는 `@theme` 지시어를 사용해 CSS에서 직접 정의합니다.
> 별도 JS 토큰 파일 대신 `src/index.css`에 통합 정의했습니다.

- [x] **색상 토큰 정의**
  - 파일: `src-vite/src/index.css` (@theme 지시어)
  - 내용: Primary (Blue), Secondary (Indigo), Success (Emerald), Warning (Amber), Error (Rose)
  - 전체 스케일: 50-900

- [x] **타이포그래피 토큰 정의**
  - 파일: `src-vite/src/index.css`
  - 내용: `--font-sans` (Pretendard), `--font-mono` (JetBrains Mono)
  - CDN: jsdelivr Pretendard Variable

- [ ] **간격 토큰 정의** (선택적)
  - Tailwind 기본 spacing 사용 중
  - 필요시 @theme에 추가 가능

### 1.2 Tailwind 설정 ✅

- [x] **Tailwind CSS 4 @theme 설정**
  - 파일: `src-vite/src/index.css`
  - 방식: CSS-first 설정 (tailwind.config.js 불필요)
  - 결과: `bg-primary-500`, `text-success-500` 등 유틸리티 클래스 사용 가능

---

## Phase 2: UX Writing 적용 (Priority: P1) ✅ 완료

### 2.1 메시지 상수 파일 ✅

- [x] **메시지 상수 파일 생성**
  - 파일: `src-vite/src/constants/messages.js`
  - 내용:
    - `SUCCESS`: 성공 메시지 (퀴즈 통과, 학습 완료, 저장 등)
    - `ERROR`: 에러 메시지 (네트워크, 인증, 서버 등)
    - `WARNING`: 경고 메시지
    - `INFO`: 정보 메시지
    - `EMPTY`: 빈 상태 메시지
    - `CONFIRM`: 확인 메시지
    - `LOADING`: 로딩 메시지
    - `BUTTON`: 버튼 레이블

- [x] **메시지 상수 인덱스**
  - 파일: `src-vite/src/constants/index.js`
  - 내용: barrel export

### 2.2 컴포넌트 개선 ✅

- [x] **Toast 컴포넌트 개선**
  - 파일: `src-vite/src/contexts/ToastContext.jsx`
  - 변경:
    - DESIGN_TOKENS 객체로 색상 정의
    - 밝은 배경 + 테두리 스타일 (Success: 연두, Error: 연분홍)
    - 12px 둥근 모서리, 부드러운 그림자
    - 시맨틱 컬러 적용 (success/error/warning/info)

- [x] **EmptyState 컴포넌트 개선**
  - 파일: `src-vite/src/components/ui/EmptyState.jsx`
  - 변경:
    - 아이콘 추가: `learning`, `quiz`
    - 기본 메시지 변경: "아직 데이터가 없어요"
    - variant 지원: `default` (카드형), `subtle` (배경 없음)
    - 원형 아이콘 배경 (bg-primary-50)

- [ ] **ConfirmDialog 컴포넌트 개선**
  - 파일: `src-vite/src/components/ui/ConfirmDialog.jsx`
  - 상태: 미구현 (필요시 추가)

---

## Phase 3: 기능별 적용 (Priority: P2) 🟡 부분 완료

### 3.1 인증 관련 (auth) ✅

- [x] **로그인/역할 선택 메시지 개선**
  - 파일: `src-vite/src/features/auth/components/RoleSelectionPage.jsx`
  - 변경: 역할 등록 메시지 톤앤매너 적용

### 3.2 학습 관련 (learning) ✅

- [x] **학습 완료 메시지**
  - 파일: `src-vite/src/features/learning/quiz/hooks/useLearningRecord.js`
  - 변경: 퀴즈 통과/실패 메시지 개선

- [x] **퀴즈 결과 메시지**
  - 파일: `src-vite/src/features/learning/quiz/components/QuizSession.jsx`
  - 변경: 답 선택 경고 메시지 개선

- [x] **빈 상태 적용**
  - 파일: `src-vite/src/features/learning/study/components/MenteeStudyRefactored.jsx`
  - 변경: 퀴즈 없음 경고 메시지

### 3.3 콘텐츠 관련 (content) ✅

- [x] **문서 생성 메시지**
  - 파일: `src-vite/src/features/content/create/components/ContentInputPanel.jsx`
  - 변경: PDF 선택, 텍스트 입력 안내 메시지 개선

### 3.4 관리자 대시보드 (admin)

- [ ] **사용자 승인 메시지**
  - 상태: 미구현

- [ ] **통계 빈 상태**
  - 상태: 미구현

---

## Phase 4: 문서화 및 검증 (Priority: P3)

### 4.1 가이드 문서

- [ ] **톤앤매너 가이드 문서**
  - 파일: `docs/TONE_AND_MANNER_GUIDE.md`
  - 내용: 개발자용 UX Writing 가이드

- [ ] **디자인 토큰 문서**
  - 파일: `docs/DESIGN_TOKENS.md`
  - 내용: 색상, 타이포그래피, 간격 사용법

### 4.2 검증

- [x] **빌드 검증**
  - 결과: 성공

- [x] **테스트 검증**
  - 결과: 160/164 통과 (4개 실패는 기존 네트워크 플래키 테스트)

- [ ] **일관성 검토**
  - 내용: 전체 앱에서 메시지 일관성 확인

---

## 구현 파일 요약

| 파일 | 변경 내용 |
|------|----------|
| `src/index.css` | 디자인 토큰 (@theme), Pretendard 폰트 |
| `src/contexts/ToastContext.jsx` | Toast 리디자인 |
| `src/components/ui/EmptyState.jsx` | EmptyState 개선 |
| `src/constants/messages.js` | UX Writing 메시지 상수 |
| `src/constants/index.js` | barrel export |
| `useLearningRecord.js` | 학습 완료 메시지 |
| `QuizSession.jsx` | 퀴즈 메시지 |
| `RoleSelectionPage.jsx` | 인증 메시지 |
| `ContentInputPanel.jsx` | 콘텐츠 생성 메시지 |

---

## 완료 기준

- [x] Phase 1 작업 완료
- [x] Phase 2 작업 완료 (ConfirmDialog 제외)
- [x] Phase 3 주요 모듈 완료 (auth, learning, content)
- [x] 린트/빌드 오류 없음
- [x] 기존 기능 정상 동작 확인
- [ ] Phase 4 문서화 (선택적)

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-12-12 | 초안 작성 |
| 2025-12-12 | Phase 1-2 구현 완료, Phase 3 부분 완료 (PR #226) |
