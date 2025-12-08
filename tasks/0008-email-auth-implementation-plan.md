# Task 0008: Email 인증 + 관리자 승인 시스템 구현 계획

**PRD**: `tasks/prds/0008-email-auth-admin-approval.md`
**Issue**: #105 (Docker OAuth 리디렉션 문제 해결)
**Created**: 2025-12-08
**Status**: Planning

---

## 1. 병렬 작업 그룹 및 의존성

### 의존성 그래프

```
Phase 1 (순차) ──────────────────────────────────────────────────────────
│
├─[A1] DB 스키마 추가
│      └─ users 테이블: auth_provider, status, approved_by, approved_at
│              │
│              ▼
├─[A2] RLS 정책 업데이트
│      └─ status IS NULL OR status = 'approved' 체크
│              │
│              ▼
├─[A3] 기존 Google OAuth 로그인 검증 ⭐ GATE
│      └─ 실패 시 STOP, 롤백
│
Phase 2 (병렬 2개) ──────────────────────────────────────────────────────
│
├─[B1] AuthLoginPage.jsx (통합 컴포넌트)        ─┬─ 병렬 가능
│      └─ LoginForm + SignupForm + 탭 전환 UI   │
│                                               │
├─[B2] AuthContext.jsx 수정                    ─┘
│      └─ handleEmailLogin, handleEmailSignup 추가
│              │
│              ▼
├─[B3] Vercel 배포 후 Google OAuth 재검증 ⭐ GATE
│
Phase 3 (병렬 2개) ──────────────────────────────────────────────────────
│
├─[C1] PendingApprovalPage.jsx (신규)          ─┬─ 병렬 가능
│      └─ 승인 대기 화면                        │
│                                               │
├─[C2] UserApprovalTab.jsx (신규)              ─┘
│      └─ Admin 승인 대기 목록 (별도 탭)
│              │
│              ▼
├─[C3] useUserProfile.js 수정 (순차)
│      └─ status 체크 로직 (Email 사용자만)
│              │
│              ▼
├─[C4] App.jsx + constants.js 수정 (순차)
│      └─ PENDING_APPROVAL viewState 추가
│              │
│              ▼
├─[C5] 전체 로그인 흐름 검증 ⭐ GATE
│
Phase 4 (병렬 2개) ──────────────────────────────────────────────────────
│
├─[D1] Admin 비밀번호 리셋 기능                 ─┬─ 병렬 가능
│      └─ UserDetailPanel.jsx 수정              │
│                                               │
├─[D2] Admin 승인 대기 알림 뱃지               ─┘
│      └─ AdminDashboard.jsx 수정
│
Phase 5 (병렬 3개) ──────────────────────────────────────────────────────
│
├─[E1] 환경변수 VITE_AUTH_MODE 분기            ─┬─
│                                               │
├─[E2] E2E 테스트 추가                         ─┼─ 병렬 가능
│                                               │
├─[E3] Docker 환경 테스트 + 문서               ─┘
│
└─ 완료
```

---

## 2. 충돌 가능성 분석

### 파일별 수정 매트릭스

| 파일 | 작업 | 충돌 위험 | 회피 전략 |
|------|------|:--------:|----------|
| `[NEW] AuthLoginPage.jsx` | B1 | ✅ 없음 | 신규 파일 |
| `AuthContext.jsx` | B2 | 🟡 낮음 | spread 연산자로 기존 value 유지 |
| `useUserProfile.js` | C3 | 🟡 낮음 | 조건문 추가만 |
| `[NEW] PendingApprovalPage.jsx` | C1 | ✅ 없음 | 신규 파일 |
| `[NEW] UserApprovalTab.jsx` | C2 | ✅ 없음 | 신규 파일 |
| `App.jsx` | C4 | 🟡 낮음 | viewState 분기 추가만 |
| `constants.js` | C4 | ✅ 없음 | 상수 추가만 |
| `UserDetailPanel.jsx` | D1 | 🟡 낮음 | 버튼 추가만 |
| `AdminDashboard.jsx` | C2, D2 | ⚠️ 순차 필요 | C2 완료 후 D2 |
| `RoleSelectionPage.jsx` | B1 (import) | 🟡 낮음 | import + 조건부 렌더링만 |

### 동시 수정 충돌 회피

```
❌ 병렬 불가 조합:
├─ [C2] UserApprovalTab + [D2] AdminDashboard 알림 뱃지
│    └─ 같은 AdminDashboard.jsx 탭 영역 수정
│
└─ [B1] AuthLoginPage + [B2] AuthContext
     └─ 의존성은 없지만 테스트 시 함께 필요

✅ 안전한 병렬 조합:
├─ [B1] AuthLoginPage ∥ [B2] AuthContext (테스트는 순차)
├─ [C1] PendingApprovalPage ∥ [C2] UserApprovalTab
├─ [D1] 비밀번호 리셋 ∥ [D2] 알림 뱃지 (다른 영역)
└─ [E1] ∥ [E2] ∥ [E3] (완전 독립)
```

---

## 3. 기존 로그인 기능 영향 분석 (인과 관계)

### 🔴 CRITICAL: 기존 Google OAuth 깨질 수 있는 지점

#### 3.1 DB 스키마 변경

| 변경 | 위험 | 인과 관계 | 안전 조치 |
|------|:----:|----------|----------|
| `status` 컬럼 추가 | 🔴 HIGH | 기존 사용자 status=NULL → 로그인 차단 | `DEFAULT 'approved'` 필수 |
| `auth_provider` 컬럼 | 🟡 MED | NULL 시 체크 로직 오류 가능 | `DEFAULT 'google'` 필수 |

```sql
-- ✅ 안전한 마이그레이션
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'google',
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- 기존 사용자 명시적 업데이트 (안전장치)
UPDATE users
SET
  status = COALESCE(status, 'approved'),
  auth_provider = COALESCE(auth_provider, 'google')
WHERE status IS NULL OR auth_provider IS NULL;
```

#### 3.2 RLS 정책 변경

| 변경 | 위험 | 인과 관계 | 안전 조치 |
|------|:----:|----------|----------|
| `status='approved'` 체크 | 🔴 CRIT | NULL 사용자 데이터 접근 차단 | `status IS NULL OR` 조건 추가 |

```sql
-- ✅ 안전한 RLS (NULL 허용)
CREATE POLICY "users_select_approved" ON users FOR SELECT
  USING (
    auth.uid() = id  -- 본인 데이터는 항상 접근
    OR status IS NULL  -- 기존 사용자 (마이그레이션 전)
    OR status = 'approved'  -- 승인된 사용자
  );
```

#### 3.3 useUserProfile.js 수정

| 변경 | 위험 | 인과 관계 | 안전 조치 |
|------|:----:|----------|----------|
| status 체크 로직 | 🔴 HIGH | 조건문 오류 시 전체 로그인 실패 | Email 사용자만 체크 |

```javascript
// ✅ 안전한 status 체크 (Email 사용자만)
if (profile?.role) {
  // Email 가입자만 승인 상태 체크
  if (profile.auth_provider === 'email' && profile.status !== 'approved') {
    setViewState(VIEW_STATES.PENDING_APPROVAL);
    setIsLoading(false);
    return;
  }

  // Google OAuth 사용자 또는 승인된 Email 사용자 → 정상 진행
  // ... 기존 로직 유지 ...
}
```

#### 3.4 AuthContext.jsx value 객체

| 변경 | 위험 | 인과 관계 | 안전 조치 |
|------|:----:|----------|----------|
| 새 메서드 추가 | 🟡 MED | 기존 export 누락 시 useAuth() 에러 | spread 연산자 사용 |

```javascript
// ✅ 안전한 value 확장
const value = {
  // 기존 값 모두 유지
  user,
  viewState,
  setViewState,
  sessionMode,
  displayRole,
  isLoading,
  handleGoogleLogin,  // ⚠️ 반드시 유지!
  handleLogout,
  handleRoleSelect,
  handleModeSwitch,
  // 새 메서드 추가
  handleEmailLogin,
  handleEmailSignup,
};
```

---

## 4. 검증 게이트 (GATE) 정의

### GATE A3: Phase 1 완료 후 검증

```bash
# 검증 항목
□ 기존 Google 사용자 로그인 성공
□ 기존 사용자 데이터 조회 성공 (RLS 통과)
□ 기존 사용자 status = 'approved' 확인
□ 기존 사용자 auth_provider = 'google' 확인
```

```sql
-- 검증 쿼리
SELECT id, name, auth_provider, status
FROM users
WHERE status IS NULL OR auth_provider IS NULL;
-- 결과: 0 rows (모든 사용자 값 있음)
```

### GATE B3: Phase 2 완료 후 검증

```bash
# 검증 항목
□ Google OAuth 로그인 정상 작동
□ Email 회원가입 폼 표시
□ Email 로그인 폼 표시
□ useAuth() hook 모든 메서드 사용 가능
```

### GATE C5: Phase 3 완료 후 검증

```bash
# 검증 항목
□ Google 사용자: status 체크 스킵, 정상 로그인
□ Email 사용자 (approved): 정상 로그인
□ Email 사용자 (pending): PendingApprovalPage 표시
□ Email 사용자 (rejected): 적절한 에러 메시지
□ Admin: 승인 대기 목록 조회 가능
□ Admin: 사용자 승인/거부 가능
```

---

## 5. 롤백 계획

### Phase 1 롤백 (DB)

```sql
-- 컬럼 제거 (데이터 손실 주의)
ALTER TABLE users
  DROP COLUMN IF EXISTS auth_provider,
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS approved_at;
```

### Phase 2-5 롤백 (코드)

```bash
# Git 롤백
git revert <commit-hash>
# 또는 특정 파일만
git checkout <commit-hash> -- src/features/auth/
```

### 긴급 롤백 순서

```
1. [E] Phase 5 코드 롤백
2. [D] Phase 4 코드 롤백
3. [C] Phase 3 코드 롤백 + App.jsx 원복
4. [B] Phase 2 코드 롤백 + AuthContext 원복
5. [A] Phase 1 DB 롤백 (최후 수단)
```

---

## 6. 상세 작업 목록

### Phase 1: DB + RLS (순차, ~30분)

| ID | 작업 | 파일 | 체크 |
|----|------|------|:----:|
| A1-1 | users 테이블 컬럼 추가 SQL 작성 | `database/migrations/20251208_email_auth.sql` | ☐ |
| A1-2 | Supabase SQL Editor에서 실행 | - | ☐ |
| A1-3 | 기존 사용자 데이터 업데이트 확인 | - | ☐ |
| A2-1 | RLS 정책 업데이트 SQL 작성 | `database/migrations/20251208_email_auth.sql` | ☐ |
| A2-2 | RLS 정책 적용 | - | ☐ |
| A3-1 | **GATE: 기존 Google 로그인 테스트** | - | ☐ |
| A3-2 | **GATE: 기존 사용자 데이터 조회 테스트** | - | ☐ |

### Phase 2: Email 인증 기본 (병렬 2개, ~2시간)

| ID | 작업 | 파일 | 병렬 그룹 | 체크 |
|----|------|------|:--------:|:----:|
| B1-1 | AuthLoginPage.jsx 생성 | `features/auth/components/AuthLoginPage.jsx` | B1 | ☐ |
| B1-2 | LoginForm 컴포넌트 (탭 내) | 위 파일 | B1 | ☐ |
| B1-3 | SignupForm 컴포넌트 (탭 내) | 위 파일 | B1 | ☐ |
| B1-4 | RoleSelectionPage 수정 (import) | `features/auth/components/RoleSelectionPage.jsx` | B1 | ☐ |
| B2-1 | handleEmailLogin 구현 | `features/auth/hooks/AuthContext.jsx` | B2 | ☐ |
| B2-2 | handleEmailSignup 구현 | 위 파일 | B2 | ☐ |
| B2-3 | value 객체 확장 | 위 파일 | B2 | ☐ |
| B3-1 | **GATE: Google OAuth 재검증** | - | - | ☐ |
| B3-2 | **GATE: Email 폼 표시 확인** | - | - | ☐ |

### Phase 3: 승인 시스템 (병렬 2개 → 순차 2개, ~3시간)

| ID | 작업 | 파일 | 병렬 그룹 | 체크 |
|----|------|------|:--------:|:----:|
| C1-1 | PendingApprovalPage.jsx 생성 | `features/auth/components/PendingApprovalPage.jsx` | C1 | ☐ |
| C2-1 | UserApprovalTab.jsx 생성 | `features/admin/components/users/UserApprovalTab.jsx` | C2 | ☐ |
| C2-2 | AdminDashboard 탭 추가 | `features/admin/components/AdminDashboard.jsx` | C2 | ☐ |
| C3-1 | VIEW_STATES.PENDING_APPROVAL 추가 | `constants.js` | 순차 | ☐ |
| C3-2 | useUserProfile status 체크 추가 | `features/auth/hooks/useUserProfile.js` | 순차 | ☐ |
| C4-1 | App.jsx viewState 분기 추가 | `App.jsx` | 순차 | ☐ |
| C5-1 | **GATE: Google 로그인 검증** | - | - | ☐ |
| C5-2 | **GATE: Email pending 사용자 검증** | - | - | ☐ |
| C5-3 | **GATE: Admin 승인 기능 검증** | - | - | ☐ |

### Phase 4: Admin 기능 (병렬 2개, ~1시간)

| ID | 작업 | 파일 | 병렬 그룹 | 체크 |
|----|------|------|:--------:|:----:|
| D1-1 | 비밀번호 리셋 버튼 추가 | `features/admin/components/users/UserDetailPanel.jsx` | D1 | ☐ |
| D1-2 | handleResetPassword 구현 | 위 파일 | D1 | ☐ |
| D2-1 | 승인 대기 알림 뱃지 추가 | `features/admin/components/AdminDashboard.jsx` | D2 | ☐ |
| D2-2 | 대기 사용자 수 조회 훅 | `features/admin/hooks/usePendingUsers.js` | D2 | ☐ |

### Phase 5: 환경 분기 + 테스트 (병렬 3개, ~2시간)

| ID | 작업 | 파일 | 병렬 그룹 | 체크 |
|----|------|------|:--------:|:----:|
| E1-1 | VITE_AUTH_MODE 환경변수 | `.env.example`, `constants.js` | E1 | ☐ |
| E1-2 | AuthLoginPage 분기 로직 | `features/auth/components/AuthLoginPage.jsx` | E1 | ☐ |
| E2-1 | Email 로그인 E2E 테스트 | `tests/e2e-email-auth.spec.js` | E2 | ☐ |
| E2-2 | 승인 흐름 E2E 테스트 | 위 파일 | E2 | ☐ |
| E3-1 | Docker .env 업데이트 | `local-ai-server/.env` | E3 | ☐ |
| E3-2 | Docker 빌드 테스트 | - | E3 | ☐ |
| E3-3 | 문서 업데이트 | `docs/issues/issue-105-docker-oauth-redirect.md` | E3 | ☐ |

---

## 7. 예상 소요 시간

| Phase | 작업 | 병렬 | 예상 시간 |
|:-----:|------|:----:|:---------:|
| 1 | DB + RLS + 검증 | 순차 | 30분 |
| 2 | Email 인증 기본 | 2개 | 2시간 |
| 3 | 승인 시스템 | 2개+순차 | 3시간 |
| 4 | Admin 기능 | 2개 | 1시간 |
| 5 | 환경 + 테스트 | 3개 | 2시간 |
| **총계** | | | **~8.5시간** |

순차 실행 시: 14시간+ → **병렬화로 40% 단축**

---

## 8. 커밋 전략

```bash
# Phase 1
git commit -m "feat(db): Email 인증용 users 테이블 스키마 확장 (#105)"

# Phase 2
git commit -m "feat(auth): Email 로그인/회원가입 UI 및 AuthContext 확장 (#105)"

# Phase 3
git commit -m "feat(auth): 관리자 승인 시스템 - PendingApproval + UserApprovalTab (#105)"

# Phase 4
git commit -m "feat(admin): 비밀번호 리셋 및 승인 대기 알림 기능 (#105)"

# Phase 5
git commit -m "feat(config): AUTH_MODE 환경 분기 + E2E 테스트 (#105)"
```

---

## 9. 참조 문서

- PRD: `tasks/prds/0008-email-auth-admin-approval.md`
- Issue: `docs/issues/issue-105-docker-oauth-redirect.md`
- 기존 Auth 구현: `src-vite/src/features/auth/`
- Admin 구현: `src-vite/src/features/admin/`
