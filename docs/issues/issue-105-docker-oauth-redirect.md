# Issue #105: Docker 사내 배포 시 Google OAuth 리디렉션 문제

## 문제 설명

Docker로 사내 배포 시 (`http://10.10.100.209:3000`) Google OAuth 로그인이 실패합니다.

### 원인

1. **Google OAuth Redirect URI 제한**: Google Cloud Console에서 `http://` 스킴의 리디렉션 URI는 `localhost`만 허용
2. **내부 IP 등록 불가**: `http://10.10.100.209:3000`은 Google OAuth 리디렉션 URI로 등록할 수 없음

### 현재 흐름 (실패)

```
[사용자] → http://10.10.100.209:3000 접속
    ↓
[로그인 클릭] → Supabase Auth → Google OAuth
    ↓
[Google] → 리디렉션 URI가 허용 목록에 없음 → ❌ 실패
```

---

## 해결책

### Option 1: Reverse Proxy + HTTPS (권장) ⭐

**내부 도메인 + SSL 인증서 적용**

```
┌─────────────────────────────────────────────────────────────────┐
│                       사내 네트워크                               │
│                                                                 │
│  [사용자] → https://ojt.company.local → [Nginx/Traefik]         │
│                                              ↓                  │
│                                    http://10.10.100.209:3000    │
│                                         (Docker 앱)             │
└─────────────────────────────────────────────────────────────────┘
```

**설정 방법**:
1. 사내 DNS에 `ojt.company.local` → `10.10.100.209` 등록
2. 자체 서명 SSL 또는 사내 CA 인증서 발급
3. Nginx/Traefik으로 HTTPS → HTTP 프록시
4. Google Cloud Console에 `https://ojt.company.local` 등록
5. Supabase Dashboard에서 Site URL 업데이트

**장점**: 정석적인 방법, 보안 강화
**단점**: 사내 DNS/인증서 설정 필요

---

### Option 2: Cloudflare Tunnel (외부 도메인)

**Cloudflare Zero Trust로 HTTPS 터널 생성**

```bash
# 사내 서버에서 실행
cloudflared tunnel create ojt-app
cloudflared tunnel route dns ojt-app ojt.your-domain.com
cloudflared tunnel run --url http://localhost:3000 ojt-app
```

**설정 방법**:
1. Cloudflare 계정 생성 (무료)
2. 도메인 연결 또는 `*.trycloudflare.com` 사용
3. `cloudflared` 설치 및 터널 생성
4. Google OAuth에 `https://ojt.your-domain.com` 등록

**장점**: 무료, SSL 자동, 외부에서도 접근 가능
**단점**: 외부 서비스 의존, 사내 정책 확인 필요

---

### Option 3: Supabase Email/Password 인증 추가

**Google OAuth 대신 이메일 인증 사용**

```javascript
// 현재: Google OAuth만 지원
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
});

// 추가: 이메일/비밀번호 인증
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@company.com',
  password: 'password123',
});
```

**설정 방법**:
1. Supabase Dashboard → Authentication → Providers → Email 활성화
2. 로그인 UI에 이메일/비밀번호 폼 추가
3. 사내 배포에서는 이메일 인증 사용

**장점**: OAuth 설정 불필요, 즉시 적용 가능
**단점**: 별도 회원가입 필요, UX 변경

---

### Option 4: 개발 모드 우회 (임시)

**로컬 환경에서만 인증 우회**

```javascript
// AuthContext.jsx
if (import.meta.env.VITE_AUTH_BYPASS === 'true') {
  // 개발/테스트용 - 인증 없이 진행
  setUser({ id: 'dev-user', email: 'dev@local', role: 'mentor' });
  return;
}
```

**장점**: 즉시 테스트 가능
**단점**: 보안 취약, 프로덕션 사용 불가

---

## 권장 순서

| 우선순위 | 옵션 | 상황 |
|:--------:|------|------|
| 1 | **Option 3** (이메일 인증) | 빠른 해결이 필요할 때 |
| 2 | **Option 1** (Reverse Proxy) | 사내 인프라 지원 가능할 때 |
| 3 | **Option 2** (Cloudflare) | 외부 접근도 필요할 때 |
| 4 | **Option 4** (우회) | 개발/테스트 목적만 |

---

## 구현 작업 (Option 3 선택 시)

### Phase 1: Supabase 설정
- [ ] Email Provider 활성화
- [ ] 이메일 템플릿 한글화

### Phase 2: UI 구현
- [ ] 로그인 페이지에 이메일/비밀번호 폼 추가
- [ ] 회원가입 페이지 추가
- [ ] 비밀번호 찾기 기능

### Phase 3: 환경 분기
- [ ] Vercel: Google OAuth (기존)
- [ ] Docker: 이메일 인증 + Google OAuth (선택)

---

## 관련 이슈

- #104: AI 배포 아키텍처
- #101: Local AI 연동
