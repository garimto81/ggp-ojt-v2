# TODO: PRD-0014 톤앤매너 가이드라인 시스템

**PRD**: `tasks/prds/0014-tone-and-manner-guideline.md`
**리서치**: `.claude/research/tone-and-manner-2025.md`
**시작일**: 2025-12-12
**상태**: 🟡 진행 전

---

## Phase 1: 기반 구축 (Priority: P0)

### 1.1 디자인 토큰 정의

- [ ] **색상 토큰 파일 생성**
  - 파일: `src-vite/src/styles/tokens/colors.js`
  - 내용: Primary, Secondary, Success, Warning, Error, Neutral 팔레트
  - 참고: PRD Section 3.1

- [ ] **타이포그래피 토큰 파일 생성**
  - 파일: `src-vite/src/styles/tokens/typography.js`
  - 내용: fontFamily, fontSize, fontWeight
  - 참고: PRD Section 3.2

- [ ] **간격 토큰 파일 생성**
  - 파일: `src-vite/src/styles/tokens/spacing.js`
  - 내용: spacing scale (4px 단위)
  - 참고: PRD Section 3.3

- [ ] **토큰 인덱스 파일**
  - 파일: `src-vite/src/styles/tokens/index.js`
  - 내용: 모든 토큰 re-export

### 1.2 Tailwind 설정 업데이트

- [ ] **tailwind.config.js 수정**
  - 파일: `src-vite/tailwind.config.js`
  - 내용: 디자인 토큰을 Tailwind 테마에 통합
  - 예시:
    ```js
    theme: {
      extend: {
        colors: {
          primary: { ... },
          success: { ... },
        }
      }
    }
    ```

---

## Phase 2: UX Writing 적용 (Priority: P1)

### 2.1 메시지 상수 파일

- [ ] **메시지 상수 파일 생성**
  - 파일: `src-vite/src/constants/messages.js`
  - 내용:
    ```js
    export const MESSAGES = {
      success: {
        login: "반가워요! 오늘도 화이팅이에요",
        save: "안전하게 저장했어요",
        // ...
      },
      error: {
        network: "인터넷 연결을 확인해 주세요",
        auth: "로그인이 필요해요. 다시 로그인해 주세요",
        // ...
      },
      empty: {
        docs: "아직 학습 자료가 없어요. 첫 번째 자료를 만들어볼까요?",
        // ...
      },
      confirm: {
        delete: "정말 삭제할까요? 되돌릴 수 없어요",
        // ...
      }
    };
    ```

### 2.2 컴포넌트 개선

- [ ] **Toast 컴포넌트 개선**
  - 파일: `src-vite/src/components/ui/Toast.jsx` (또는 신규 생성)
  - 내용: 톤앤매너 적용된 Toast
  - 의존: ToastContext

- [ ] **EmptyState 컴포넌트 생성**
  - 파일: `src-vite/src/components/ui/EmptyState.jsx`
  - Props: `icon`, `title`, `description`, `action`
  - 스타일: 톤앤매너 가이드라인 준수

- [ ] **ConfirmDialog 컴포넌트 개선**
  - 파일: `src-vite/src/components/ui/ConfirmDialog.jsx`
  - 내용: 친근한 확인 메시지 적용

---

## Phase 3: 기능별 적용 (Priority: P2)

### 3.1 인증 관련 (auth)

- [ ] **로그인 메시지 개선**
  - 파일: `src-vite/src/features/auth/components/LoginForm.jsx`
  - 변경: 성공/에러 메시지 톤앤매너 적용

- [ ] **회원가입 메시지 개선**
  - 파일: `src-vite/src/features/auth/components/SignUpForm.jsx`
  - 변경: 안내 메시지, 검증 메시지 개선

- [ ] **승인 대기 화면 개선**
  - 파일: 관련 컴포넌트
  - 변경: 대기 상태 안내 메시지 친근하게

### 3.2 학습 관련 (learning)

- [ ] **학습 완료 메시지**
  - 파일: `src-vite/src/features/learning/`
  - 변경: 격려 메시지 적용

- [ ] **퀴즈 결과 메시지**
  - 파일: 퀴즈 관련 컴포넌트
  - 변경: 통과/실패 메시지 개선

- [ ] **빈 상태 적용**
  - 파일: 학습 목록 컴포넌트
  - 변경: EmptyState 컴포넌트 사용

### 3.3 콘텐츠 관련 (content)

- [ ] **문서 생성 메시지**
  - 파일: `src-vite/src/features/content/`
  - 변경: 생성/수정/삭제 메시지 개선

- [ ] **AI 생성 관련 메시지**
  - 파일: AI 관련 컴포넌트
  - 변경: 로딩, 성공, 실패 메시지 개선

### 3.4 관리자 대시보드 (admin)

- [ ] **사용자 승인 메시지**
  - 파일: `src-vite/src/features/admin/`
  - 변경: 승인/거부 확인 메시지 개선

- [ ] **통계 빈 상태**
  - 파일: 대시보드 컴포넌트
  - 변경: 데이터 없을 때 안내 메시지

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

- [ ] **일관성 검토**
  - 내용: 전체 앱에서 메시지 일관성 확인
  - 체크리스트: PRD Section 4 기준

- [ ] **사용자 피드백 수집 준비**
  - 내용: A/B 테스트 또는 피드백 수집 방안

---

## 작업 순서 권장

```
1. Phase 1.1 (디자인 토큰) ─────┐
2. Phase 1.2 (Tailwind 설정) ──┤
3. Phase 2.1 (메시지 상수) ────┼─ 기반 작업
4. Phase 2.2 (공통 컴포넌트) ──┘
5. Phase 3.x (기능별 적용) ────── 점진적 적용
6. Phase 4 (문서화) ───────────── 마무리
```

---

## 참고 파일

| 파일 | 용도 |
|------|------|
| `tasks/prds/0014-tone-and-manner-guideline.md` | PRD 상세 |
| `.claude/research/tone-and-manner-2025.md` | 리서치 결과 |
| `src-vite/src/contexts/ToastContext.jsx` | 기존 Toast 시스템 |
| `src-vite/tailwind.config.js` | Tailwind 설정 |

---

## 완료 기준

- [ ] 모든 Phase 1 작업 완료
- [ ] 모든 Phase 2 작업 완료
- [ ] Phase 3에서 최소 인증(auth) 모듈 완료
- [ ] 린트/빌드 오류 없음
- [ ] 기존 기능 정상 동작 확인

---

## 변경 이력

| 날짜 | 내용 |
|------|------|
| 2025-12-12 | 초안 작성 |
