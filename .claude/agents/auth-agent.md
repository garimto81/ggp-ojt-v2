# Auth Domain Agent Rules

**Version**: 1.0.0 | **Domain**: Auth | **Level**: 1

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | 인증/인가 전문가 |
| **Scope** | `features/auth/` (향후), 현재 `contexts/AuthContext.jsx`, `components/RoleSelectionPage.jsx` |
| **Managed Blocks** | `auth.login`, `auth.session`, `auth.role` |

---

## Block Responsibilities

### auth.login

| 항목 | 내용 |
|------|------|
| **책임** | OAuth/Email 로그인 처리 |
| **입력** | `{ provider: 'google' \| 'email', credentials? }` |
| **출력** | `AuthSession` |
| **파일** | `AuthContext.jsx` (signInWithOAuth, signInWithPassword) |

### auth.session

| 항목 | 내용 |
|------|------|
| **책임** | 세션 상태 관리 및 구독 |
| **입력** | `AuthSession` |
| **출력** | `UserProfile` |
| **파일** | `AuthContext.jsx` (onAuthStateChange, getSession) |

### auth.role

| 항목 | 내용 |
|------|------|
| **책임** | 역할 선택 및 권한 검사 |
| **입력** | `UserProfile`, `RequiredRole` |
| **출력** | `{ isAuthorized: boolean, role: string }` |
| **파일** | `RoleSelectionPage.jsx`, `AuthContext.jsx` |

---

## Dependencies

### Internal

```javascript
// 필수 의존성
import { supabase } from '@/utils/supabaseClient';
import { useToast } from '@/contexts/ToastContext';
```

### External

- `@supabase/supabase-js`: Supabase Auth API

### Cross-Domain

- `content-domain`: 문서 작성 시 `author_id` 제공
- `learning-domain`: 학습 기록 시 `user_id` 제공
- `admin-domain`: 관리자 권한 검증 시 호출됨

---

## Constraints

### DO

- ✅ Supabase Auth API만 사용
- ✅ 세션 상태는 `AuthContext`에서만 관리
- ✅ 역할 검사는 `checkRole()` 함수 사용
- ✅ 에러 발생 시 Toast로 사용자 알림
- ✅ 로그아웃 시 로컬 캐시 (Dexie) 정리

### DON'T

- ❌ 직접 localStorage/sessionStorage 접근 (Supabase가 관리)
- ❌ 인증 토큰 직접 조작
- ❌ 다른 도메인 Context 직접 수정
- ❌ API 키/비밀값 하드코딩

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AUTH DATA FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User → signInWithOAuth() → Supabase Auth → Session         │
│              │                                               │
│              ▼                                               │
│  onAuthStateChange() → fetchUserProfile() → users 테이블    │
│              │                                               │
│              ▼                                               │
│  AuthContext.user → App 전체에서 사용                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Codes

| Code | 의미 | 처리 |
|------|------|------|
| `AUTH_INVALID_CREDENTIALS` | 잘못된 인증 정보 | 재입력 요청 |
| `AUTH_SESSION_EXPIRED` | 세션 만료 | 재로그인 유도 |
| `AUTH_ROLE_UNAUTHORIZED` | 권한 없음 | 역할 선택 페이지로 이동 |
| `AUTH_PROFILE_NOT_FOUND` | 프로필 없음 | 프로필 생성 유도 |

---

## Testing Guidelines

### Unit Tests

```javascript
// __tests__/auth.test.js
describe('auth.login', () => {
  it('should call signInWithOAuth with google provider', async () => {
    // Mock supabase.auth.signInWithOAuth
  });
});

describe('auth.session', () => {
  it('should update user state on auth change', () => {
    // Mock onAuthStateChange
  });
});

describe('auth.role', () => {
  it('should return true for admin accessing admin route', () => {
    // Test checkRole('admin')
  });
});
```

### Mocking Rules

- ✅ `supabase.auth.*` 함수만 Mock
- ✅ `supabase.from('users')` 쿼리 Mock
- ❌ 전체 Context를 Mock하지 말 것

---

## Security Considerations

1. **OAuth Redirect**: 허용된 URL만 redirectTo에 사용
2. **RLS 의존**: users 테이블 RLS 정책 신뢰
3. **세션 검증**: 민감한 작업 전 세션 유효성 재확인

---

## Related Files

### Current Structure

- `src-vite/src/contexts/AuthContext.jsx`
- `src-vite/src/components/RoleSelectionPage.jsx`

### Future Structure (Vertical Slicing)

```
features/auth/
├── components/
│   └── RoleSelectionPage.jsx
├── hooks/
│   └── useAuth.js
├── contexts/
│   └── AuthContext.jsx
├── api/
│   └── authApi.js
├── index.js
└── AGENT_RULES.md
```
