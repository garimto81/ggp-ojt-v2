# Docker 사내 배포 - 인증 설정 가이드

## 개요

Docker 사내 배포 환경(http://10.x.x.x)에서는 **Google OAuth가 동작하지 않습니다**.
내부 IP는 Google OAuth redirect URI로 사용할 수 없기 때문입니다.

이 문서는 **이메일/비밀번호 + 관리자 승인** 방식을 설정하는 방법을 설명합니다.

## 인증 워크플로우

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  회원가입    │ ──▶ │  승인 대기   │ ──▶ │  Admin 승인  │ ──▶ │   로그인    │
│ (이메일/비번) │     │  (pending)   │     │  (approved)  │     │   (완료)    │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 핵심 포인트

- **이메일** = 로그인 ID로 사용 (실제 이메일 발송 없음)
- **이메일 확인 불필요** = 인증 링크 클릭 없이 가입 완료
- **관리자 승인 필수** = Admin이 승인해야 로그인 가능

---

## 1. Supabase 설정 (필수)

### 1.1 이메일 확인 비활성화

Supabase Dashboard에서 이메일 확인을 끄면, 사용자가 가입 즉시 로그인할 수 있습니다.
(단, 앱에서 `status='pending'` 체크로 관리자 승인 전까지 접근 차단)

**설정 경로:**
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. **Authentication** → **Providers** → **Email**
4. **Confirm email** 옵션 **OFF** (비활성화)

```
┌────────────────────────────────────────┐
│ Email Provider Settings                │
├────────────────────────────────────────┤
│ ☑ Enable Email Provider                │
│ ☐ Confirm email  ◀── 이 옵션 끄기       │
│ ☐ Secure email change                  │
│ ☐ Double confirm email changes         │
└────────────────────────────────────────┘
```

### 1.2 데이터베이스 마이그레이션

Email 인증 관련 컬럼이 없다면 마이그레이션 실행:

**SQL Editor**에서 실행:
```sql
-- database/migrations/20251208_email_auth.sql 내용 실행
```

파일 위치: `database/migrations/20251208_email_auth.sql`

---

## 2. Docker 환경 설정

### 2.1 환경 변수 파일 생성

```bash
cd local-ai-server
cp .env.example .env
```

### 2.2 .env 파일 수정

```bash
# 필수 설정
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# 인증 모드 - Docker 사내 배포에서는 반드시 'email' 사용!
VITE_AUTH_MODE=email

# 포트 (기본 3000, 80 사용 중이면 변경)
APP_PORT=3000
```

### 2.3 Docker 실행

```bash
docker-compose up -d
```

접속: `http://10.x.x.x:3000` (서버 IP)

---

## 3. 첫 번째 Admin 계정 생성

### 문제
- 앱에서 가입하면 `status='pending'` 상태
- Admin만 승인 가능한데, Admin이 없으면 승인 불가

### 해결: Supabase에서 직접 Admin 계정 생성

1. Supabase Dashboard → **Table Editor** → **users**
2. **Insert row** 클릭
3. 다음 값 입력:

| 필드 | 값 |
|------|-----|
| id | (Auth에서 생성된 UUID) |
| name | 관리자 이름 |
| role | `admin` |
| auth_provider | `email` |
| status | `approved` |

또는 SQL로 직접 업데이트:

```sql
-- 이미 가입한 사용자를 Admin으로 승격
UPDATE users
SET role = 'admin', status = 'approved'
WHERE email = 'admin@company.com';
```

---

## 4. 사용자 관리

### 4.1 신규 가입자 승인

1. Admin 계정으로 로그인
2. **승인 관리** 탭 클릭
3. 대기 중인 사용자 목록에서 **승인** 또는 **거부** 클릭

### 4.2 승인 상태

| status | 설명 |
|--------|------|
| `pending` | 가입 완료, 승인 대기 중 |
| `approved` | 승인됨, 로그인 가능 |
| `rejected` | 거부됨, 로그인 불가 |

---

## 5. FAQ

### Q: 이메일 주소가 아닌 다른 ID를 사용할 수 있나요?

**A:** Supabase Auth는 이메일 형식의 ID를 요구합니다. 하지만 실제 이메일일 필요는 없습니다.
예: `hong@internal`, `kim123@local` 등 내부 식별자 사용 가능

### Q: 비밀번호 규칙은?

**A:** Supabase 기본 설정은 6자 이상입니다.
Dashboard → Authentication → Settings에서 변경 가능

### Q: 승인 없이 바로 로그인하게 하려면?

**A:** `src-vite/src/constants.js`에서 수정:
```javascript
export const AUTH_CONFIG = {
  MODE: import.meta.env.VITE_AUTH_MODE || 'hybrid',
  REQUIRE_APPROVAL: false,  // false로 변경
};
```

그리고 `AuthContext.jsx`와 `useUserProfile.js`에서 status 체크 로직 제거 필요

---

## 6. 트러블슈팅

### Google 로그인 버튼만 보임

**원인:** `VITE_AUTH_MODE`가 설정되지 않음
**해결:** `.env` 파일에 `VITE_AUTH_MODE=email` 추가 후 재빌드

```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 가입 후 무한 로딩

**원인:** `PENDING_APPROVAL` viewState가 없음
**해결:** `src-vite/src/App.jsx`에 해당 viewState 처리 확인

### 승인 후에도 로그인 불가

**원인:** 브라우저 캐시
**해결:** 로그아웃 후 재로그인, 또는 시크릿 모드로 테스트

---

## 관련 문서

- [Issue #105](https://github.com/anthropics/ggp-ojt-v2/issues/105): Docker OAuth 문제 해결
- [Issue #107](https://github.com/anthropics/ggp-ojt-v2/issues/107): VITE_AUTH_MODE 누락 수정
- `database/migrations/20251208_email_auth.sql`: DB 스키마
