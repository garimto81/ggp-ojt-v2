# PRD 0008: Email 인증 + 관리자 승인 시스템

**Version**: 1.0
**Date**: 2025-12-08
**Author**: Claude Code
**Status**: Draft
**Issue**: #105 (Docker OAuth 리디렉션 문제 해결)

---

## 1. 배경 및 목적

### 1.1 문제 상황

Docker 사내 배포 (`http://10.10.100.209:3000`)에서 Google OAuth 로그인이 불가능:

- **Google OAuth 제한**: `http://` 스킴에서 `localhost`만 리디렉션 URI로 허용
- **내부 IP 등록 불가**: `http://10.10.100.209:3000`은 Google Cloud Console에 등록 불가

### 1.2 해결 목적

- Docker/사내 환경에서 OAuth 없이 인증 가능하도록 **Email 인증 추가**
- **관리자 승인 방식**으로 무분별한 가입 방지
- Vercel 배포에서는 기존 Google OAuth 유지 (Hybrid 인증)

---

## 2. 요구사항

### 2.1 Functional Requirements

| ID | 요구사항 | 우선순위 | 설명 |
|----|---------|:--------:|------|
| FR-01 | Email 회원가입 폼 | **P0** | 이메일/비밀번호 입력 폼 |
| FR-02 | Email 로그인 폼 | **P0** | 기존 Google 버튼 + Email 탭 추가 |
| FR-03 | 관리자 승인 대기 상태 | **P0** | 가입 후 Admin 승인 전까지 로그인 차단 |
| FR-04 | Admin 승인/거부 UI | **P0** | Admin Dashboard에서 승인 관리 |
| FR-05 | Admin 비밀번호 리셋 | **P1** | Admin이 사용자 비밀번호 재설정 |
| FR-06 | 환경별 인증 분기 | **P1** | Docker: Email 우선, Vercel: OAuth 우선 |

### 2.2 Non-Functional Requirements

| ID | 요구사항 | 기준 |
|----|---------|------|
| NFR-01 | 보안 | Supabase Auth 사용 (bcrypt 해싱, JWT) |
| NFR-02 | UX | 승인 대기 시 명확한 안내 메시지 |
| NFR-03 | 호환성 | 기존 Google OAuth 사용자 영향 없음 |

---

## 3. 시스템 설계

### 3.1 인증 흐름 (Email + 관리자 승인)

```
[신규 사용자]
     │
     ▼
[Email 회원가입] ─────────────────────────────────┐
     │                                            │
     ▼                                            ▼
[Supabase Auth 계정 생성]              [users 테이블 생성]
     │                                   status: 'pending'
     │                                            │
     └────────────────────┬───────────────────────┘
                          │
                          ▼
              [로그인 시도] → [status 확인]
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    [pending]        [approved]       [rejected]
    "승인 대기중"     → 정상 로그인     "승인 거부됨"
```

### 3.2 데이터베이스 스키마 변경

```sql
-- users 테이블에 컬럼 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS
  auth_provider VARCHAR(20) DEFAULT 'google';  -- 'google' | 'email'

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  status VARCHAR(20) DEFAULT 'approved';  -- 'pending' | 'approved' | 'rejected'

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  approved_by UUID REFERENCES users(id);  -- 승인한 Admin ID

ALTER TABLE users ADD COLUMN IF NOT EXISTS
  approved_at TIMESTAMPTZ;  -- 승인 일시

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
```

### 3.3 컴포넌트 구조

```
src/features/auth/
├── components/
│   ├── RoleSelectionPage.jsx      # 기존 (수정)
│   ├── LoginForm.jsx              # NEW: Email 로그인 폼
│   ├── SignupForm.jsx             # NEW: Email 회원가입 폼
│   └── PendingApprovalPage.jsx    # NEW: 승인 대기 화면
├── hooks/
│   ├── AuthContext.jsx            # 기존 (수정)
│   └── useEmailAuth.js            # NEW: Email 인증 로직
└── services/
    └── emailAuthService.js        # NEW: Supabase Email Auth API
```

### 3.4 Admin Dashboard 추가 UI

```
src/features/admin/components/
├── AdminDashboard.jsx             # 기존 (수정)
├── UserApprovalList.jsx           # NEW: 승인 대기 사용자 목록
└── UserManagement.jsx             # 기존 (수정: 비밀번호 리셋 추가)
```

---

## 4. UI/UX 설계

### 4.1 로그인 페이지 (수정)

```
┌──────────────────────────────────────────┐
│              OJT Master                   │
│                                          │
│   ┌────────────┬────────────┐            │
│   │  Google    │   Email    │  ← 탭 전환  │
│   └────────────┴────────────┘            │
│                                          │
│   [Email Tab 선택 시]                     │
│   ┌──────────────────────────┐           │
│   │ 이메일                    │           │
│   │ ________________________  │           │
│   │                          │           │
│   │ 비밀번호                  │           │
│   │ ________________________  │           │
│   │                          │           │
│   │   [ 로그인 ]              │           │
│   │                          │           │
│   │   계정이 없으신가요?       │           │
│   │   → 회원가입              │           │
│   └──────────────────────────┘           │
└──────────────────────────────────────────┘
```

### 4.2 회원가입 페이지 (신규)

```
┌──────────────────────────────────────────┐
│           회원가입                        │
│                                          │
│   이름                                    │
│   ________________________               │
│                                          │
│   이메일                                  │
│   ________________________               │
│                                          │
│   비밀번호 (8자 이상)                     │
│   ________________________               │
│                                          │
│   비밀번호 확인                           │
│   ________________________               │
│                                          │
│   역할 선택                               │
│   ○ Mentor (교육 담당자)                  │
│   ○ Mentee (학습자)                       │
│                                          │
│   [ 회원가입 신청 ]                       │
│                                          │
│   ⚠️ 관리자 승인 후 로그인 가능합니다       │
└──────────────────────────────────────────┘
```

### 4.3 승인 대기 페이지 (신규)

```
┌──────────────────────────────────────────┐
│              ⏳                           │
│                                          │
│       승인 대기 중                        │
│                                          │
│   회원가입이 완료되었습니다.               │
│   관리자 승인 후 로그인할 수 있습니다.      │
│                                          │
│   문의: admin@company.com                │
│                                          │
│        [ 로그인 페이지로 ]                │
└──────────────────────────────────────────┘
```

### 4.4 Admin 승인 관리 UI

```
┌──────────────────────────────────────────────────────────┐
│  Admin Dashboard > 사용자 승인 관리                        │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  승인 대기 (3)                                            │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 이름        이메일              역할    신청일       │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ 홍길동      hong@company.com   Mentee  2025-12-08  │  │
│  │                                [승인] [거부]       │  │
│  ├────────────────────────────────────────────────────┤  │
│  │ 김철수      kim@company.com    Mentor  2025-12-07  │  │
│  │                                [승인] [거부]       │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  최근 처리 내역                                           │
│  ┌────────────────────────────────────────────────────┐  │
│  │ 이영희 - 승인됨 (Admin: 박관리) - 2025-12-06       │  │
│  │ 최민수 - 거부됨 (Admin: 박관리) - 2025-12-05       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. API 설계

### 5.1 Email 인증 (Supabase Auth)

```javascript
// 회원가입
const { data, error } = await supabase.auth.signUp({
  email: 'user@company.com',
  password: 'password123',
  options: {
    data: {
      name: '홍길동',
      role: 'mentee',
    },
  },
});

// 로그인
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@company.com',
  password: 'password123',
});
```

### 5.2 승인 관리 API

```javascript
// 승인 대기 사용자 조회 (Admin)
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('status', 'pending')
  .eq('auth_provider', 'email');

// 사용자 승인
const { error } = await supabase
  .from('users')
  .update({
    status: 'approved',
    approved_by: adminUserId,
    approved_at: new Date().toISOString(),
  })
  .eq('id', userId);

// 사용자 거부
const { error } = await supabase
  .from('users')
  .update({ status: 'rejected' })
  .eq('id', userId);
```

### 5.3 비밀번호 리셋 (Admin)

```javascript
// Admin이 사용자 비밀번호 리셋 (Supabase Admin API)
// 주의: 서버사이드에서만 가능 (Service Role Key 필요)
// → Edge Function 또는 별도 API 서버 필요

// 대안: 임시 비밀번호 발송 (이메일)
const { error } = await supabase.auth.resetPasswordForEmail(
  'user@company.com',
  { redirectTo: window.location.origin + '/reset-password' }
);
```

---

## 6. 환경별 분기

### 6.1 환경 변수

```bash
# .env
VITE_AUTH_MODE=hybrid  # 'google' | 'email' | 'hybrid'
```

### 6.2 분기 로직

```javascript
// AuthContext.jsx
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'hybrid';

const showGoogleLogin = AUTH_MODE !== 'email';
const showEmailLogin = AUTH_MODE !== 'google';
```

### 6.3 배포별 설정

| 환경 | AUTH_MODE | Google | Email |
|------|-----------|:------:|:-----:|
| Vercel (프로덕션) | `hybrid` | ✅ | ✅ |
| Docker (사내) | `email` | ❌ | ✅ |
| 로컬 개발 | `hybrid` | ✅ | ✅ |

---

## 7. 구현 단계

### Phase 1: DB 스키마 (Day 1)
- [ ] users 테이블 컬럼 추가 (auth_provider, status, approved_by, approved_at)
- [ ] RLS 정책 업데이트

### Phase 2: Email 인증 기본 (Day 2-3)
- [ ] Supabase Email Provider 설정
- [ ] LoginForm.jsx 구현
- [ ] SignupForm.jsx 구현
- [ ] AuthContext.jsx 수정 (signInWithPassword 추가)

### Phase 3: 승인 시스템 (Day 4-5)
- [ ] PendingApprovalPage.jsx 구현
- [ ] UserApprovalList.jsx 구현 (Admin)
- [ ] 승인/거부 로직 구현
- [ ] 로그인 시 status 체크 로직

### Phase 4: Admin 기능 (Day 6)
- [ ] 비밀번호 리셋 기능 (임시 비밀번호 발송)
- [ ] Admin Dashboard에 승인 대기 알림

### Phase 5: 테스트 & 배포 (Day 7)
- [ ] E2E 테스트 추가
- [ ] Docker 환경 테스트
- [ ] 문서 업데이트

---

## 8. 보안 고려사항

| 항목 | 대응 |
|------|------|
| 비밀번호 정책 | 8자 이상, Supabase 기본 정책 적용 |
| Brute Force | Supabase Rate Limiting 기본 적용 |
| 승인 우회 | RLS로 status='approved' 사용자만 데이터 접근 |
| Admin 권한 | RLS + 클라이언트 역할 체크 |

---

## 9. 성공 지표

| 지표 | 목표 |
|------|------|
| Docker 환경 로그인 성공률 | 100% (현재 0%) |
| 승인 대기 → 로그인 시간 | < 24시간 (관리자 응답) |
| 기존 Google 사용자 영향 | 0 (무영향) |

---

## 10. 관련 문서

- Issue #105: Docker OAuth 리디렉션 문제
- `docs/issues/issue-105-docker-oauth-redirect.md`
- Supabase Auth Docs: https://supabase.com/docs/guides/auth

---

## Appendix: Supabase Email 설정

### A. Supabase Dashboard 설정

1. **Authentication → Providers → Email**
   - Enable Email provider: ✅
   - Confirm email: ❌ (관리자 승인 방식이므로)
   - Secure email change: ✅

2. **Authentication → Email Templates**
   - 한글화 (선택사항)

### B. 이메일 템플릿 (선택)

```html
<!-- 회원가입 완료 안내 -->
<h2>OJT Master 회원가입 완료</h2>
<p>회원가입이 완료되었습니다.</p>
<p>관리자 승인 후 로그인하실 수 있습니다.</p>
```
