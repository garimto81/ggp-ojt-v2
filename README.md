# OJT Master v2.14.0

AI 기반 신입사원 온보딩 교육 자료 생성 및 학습 관리 시스템

## 아키텍처

**Local-Only Docker 배포** - 인터넷 연결 없이 로컬 네트워크에서 운영

```
┌─────────────────────────────────────────────────────────────┐
│                   Local-Only Architecture                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Browser ──HTTPS──▶ nginx:8443                              │
│                        │                                    │
│                        ├── / ──▶ React SPA (정적 파일)       │
│                        ├── /rest/v1/* ──▶ PostgREST:3000    │
│                        │                    │               │
│                        │                    └──▶ postgres   │
│                        │                                    │
│                        └── /api/v1/* ──▶ vLLM (외부 서버)    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 기술 스택

| 영역 | 기술 |
|------|------|
| **Frontend** | React 19 + Vite 7 + Tailwind CSS 4 |
| **State** | React Query (TanStack Query v5) |
| **Backend** | PostgreSQL 16 + PostgREST v12 |
| **AI** | vLLM (Qwen3-4B) + WebLLM fallback |
| **Proxy** | nginx (SPA + API 프록시) |

## 빠른 시작 (Docker)

```bash
# 1. 환경 변수 설정
cd docker
cp .env.docker.example .env.docker
# POSTGRES_PASSWORD, PGRST_JWT_SECRET 수정

# 2. SSL 인증서 생성
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem -subj "/CN=localhost"

# 3. 프론트엔드 빌드
cd ../src-vite
npm install && npm run build

# 4. Docker 실행
cd ../docker
docker-compose --env-file .env.docker up -d

# 5. 접속
# https://localhost:8443
```

## 개발 환경

```bash
# 개발 서버
cd src-vite
npm run dev           # http://localhost:5173

# 테스트
npm run test          # Vitest (단위 테스트)
pnpm test             # Playwright (E2E)

# 코드 품질
npm run lint:fix      # ESLint 자동 수정
npm run format        # Prettier 포맷팅
```

## 역할 및 권한

| 역할 | 권한 |
|------|------|
| **Admin** | 전체 관리, 사용자 승인 |
| **Mentor** | AI 콘텐츠 생성, 문서 CRUD |
| **Mentee** | 학습, 퀴즈 (읽기 전용) |

## 인증 흐름

```
회원가입 → status='pending' → Admin 승인 → status='approved' → 로그인 가능
```

## 문서

- [CLAUDE.md](./CLAUDE.md) - 개발 가이드
- [docker/](./docker/) - Docker 배포 설정

## 라이선스

ISC
