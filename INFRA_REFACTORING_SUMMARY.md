# Infrastructure Refactoring Summary

**Branch**: `refactor/local-only`
**Issue**: #114
**Date**: 2025-12-08

## 목표

Vercel 클라우드 배포를 폐기하고 순수 로컬 네트워크 Docker 배포로 전환

## 변경 사항

### 1. 삭제된 파일

- **vercel.json**: Vercel 배포 설정 파일 삭제

### 2. Docker 인프라 재작성

#### `docker/docker-compose.yml`
- **PostgreSQL 16** 추가: Self-hosted DB (Supabase 클라우드 대체)
  - 볼륨: `postgres_data` (데이터 영속성)
  - 포트: 5432
  - 초기화: `database/init/*.sql` 자동 실행
  - 성능 튜닝: shared_buffers=256MB, max_connections=200

- **PostgREST v12** 추가: PostgreSQL REST API
  - Supabase REST API와 호환
  - JWT 인증 지원
  - 포트: 3000
  - 엔드포인트: `/rest/v1/*`

- **Nginx** 업데이트:
  - 기존: 정적 파일 서빙만
  - 추가: PostgREST 프록시, vLLM 프록시

- **vLLM**: 외부 서버 연결 (10.10.100.209:8001)

#### `docker/nginx.conf`
- **PostgREST 프록시** 추가: `/rest/v1/*` → `postgrest:3000`
  - CORS 헤더 설정 (로컬 네트워크)
  - PostgREST 특수 헤더 전달 (Accept-Profile, Prefer)
  - 타임아웃: 30초

- **vLLM 프록시** 업데이트: `/api/v1/*` → `vllm:8001/v1/*`
  - 기존 외부 서버 연결 유지
  - 타임아웃: 120초 (AI 생성 시간 고려)

- **성능 최적화**:
  - Upstream keepalive (PostgreSQL 32개, vLLM 8개)
  - Gzip 압축
  - 정적 자산 캐싱 (1년)

#### `docker/.env.docker.example`
- **PostgreSQL 변수** 추가:
  - `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`

- **PostgREST 변수** 추가:
  - `PGRST_JWT_SECRET` (필수, 32자 이상)
  - `PGRST_DB_SCHEMAS`, `PGRST_DB_ANON_ROLE`

- **Vercel 관련 변수** 제거:
  - `VITE_SUPABASE_URL` → `https://localhost:8443`
  - `VITE_SUPABASE_ANON_KEY` → PostgREST JWT 토큰

- **vLLM 변수**:
  - `VLLM_HOST=10.10.100.209` (외부 AI 서버)

#### `docker/README.md`
- **전체 재작성**: Local-Only 배포 가이드
  - 아키텍처 다이어그램
  - 빠른 시작 가이드 (6단계)
  - 상세 설정 (PostgreSQL, PostgREST, Nginx, vLLM)
  - 운영 명령어 (시작/중지, 로그, DB 관리)
  - 문제 해결 (503, 403, Mixed Content, vLLM 연결)
  - 보안 권장사항 (비밀번호, 방화벽, SSL, 백업)
  - Supabase 마이그레이션 가이드
  - 성능 튜닝
  - 모니터링 (Prometheus/Grafana)

### 3. Database 초기화 스크립트

#### `database/init/01_init.sql`
- **auth 스키마** 생성: Supabase 호환
  - `auth.users` 테이블 (간소화된 인증 테이블)
  - `auth.uid()`, `auth.email()`, `auth.role()` 함수

- **PostgreSQL Roles**: `anon`, `authenticated`

- **Public 테이블** 생성:
  - `users`, `teams`, `ojt_docs`, `learning_records`, `learning_progress`
  - `content_reports`, `admin_settings`, `admin_logs`

- **인덱스** 최적화:
  - 복합 인덱스: `(team, step)`, `(user_id, doc_id)`
  - 시간 역순: `updated_at DESC`, `created_at DESC`

- **트리거**: `updated_at` 자동 갱신

- **GRANT 권한**: `anon`, `authenticated` Role 별 권한 부여

#### `database/init/02_rls.sql`
- **Helper 함수**: `is_admin()`, `is_mentor_or_admin()` (SECURITY DEFINER)

- **RLS 정책** (테이블별):
  - `users`: 본인 조회/수정, Admin 전체 관리
  - `teams`: 전체 조회, Admin만 관리
  - `ojt_docs`: 전체 조회, Mentor+ 생성, 작성자 수정/삭제
  - `learning_*`: 본인만 접근, Admin 전체 조회
  - `admin_*`: Admin 전용

#### `database/init/03_seed.sql`
- **기본 팀 데이터**: Frontend, Backend, DevOps, AI/ML, Design, QA

- **관리자 설정**: 퀴즈 통과 점수(70%), 최대 시도 횟수(3)

#### `database/init/README.md`
- 초기화 스크립트 설명
- 실행 순서 (자동)
- 초기화 확인 방법
- 수동 초기화
- 초기 관리자 생성 가이드
- Supabase 마이그레이션
- 문제 해결

## 아키텍처 변경

### 변경 전 (Vercel + Supabase Cloud)

```
Browser → Vercel (React SPA)
            ↓
       Supabase Cloud (PostgreSQL + Auth + REST API)
            ↓
       vLLM (외부 서버)
```

### 변경 후 (Local-Only Docker)

```
Browser → nginx:8443 (HTTPS)
            ├── / → React SPA (정적 파일)
            ├── /rest/v1/* → PostgREST:3000 → postgres:5432
            └── /api/v1/* → vLLM:8001 (외부 서버)
```

## 주요 이점

1. **완전한 로컬 제어**: 클라우드 의존성 제거
2. **데이터 보안**: 사내 네트워크에서만 접근
3. **비용 절감**: Vercel, Supabase 구독료 없음
4. **커스터마이징**: PostgreSQL, PostgREST 설정 자유도
5. **오프라인 가능**: 인터넷 없이 사내망에서 운영

## 배포 방법

### 1. 환경 설정

```bash
cd docker
cp .env.docker.example .env.docker
# POSTGRES_PASSWORD, PGRST_JWT_SECRET 수정
```

### 2. SSL 인증서

```bash
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/CN=localhost"
```

### 3. 프론트엔드 빌드

```bash
cd ../src-vite
npm install
npm run build
```

### 4. Docker 실행

```bash
cd ../docker
docker-compose --env-file .env.docker up -d
```

### 5. 초기 Admin 생성

```sql
-- PostgreSQL 접속
docker exec -it ojt-postgres psql -U postgres -d ojt_master

-- Admin 계정 생성
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (gen_random_uuid(), 'admin@local', crypt('admin123', gen_salt('bf')));

INSERT INTO public.users (id, name, role, department, status)
SELECT id, 'Admin User', 'admin', 'Management', 'approved'
FROM auth.users WHERE email = 'admin@local';
```

### 6. 접속

- Frontend: https://localhost:8443
- PostgreSQL: localhost:5432
- PostgREST: http://localhost:3000

## 마이그레이션 체크리스트

- [x] vercel.json 삭제
- [x] docker-compose.yml 재작성 (PostgreSQL + PostgREST 추가)
- [x] nginx.conf 업데이트 (PostgREST 프록시 추가)
- [x] .env.docker.example 정리 (PostgreSQL 변수 추가)
- [x] database/init/*.sql 작성 (초기화 스크립트)
- [x] docker/README.md 업데이트 (로컬 배포 가이드)
- [ ] 프론트엔드 코드 수정 (Frontend Agent 담당)
  - [ ] Supabase 클라이언트 URL 변경
  - [ ] API 엔드포인트 변경 (/rest/v1/*)
  - [ ] 인증 흐름 업데이트 (PostgREST JWT)
- [ ] E2E 테스트 업데이트 (로컬 URL)
- [ ] 문서 업데이트 (CLAUDE.md, README.md)

## 호환성 참고

- **PostgREST**: Supabase REST API와 대부분 호환
- **JWT 인증**: Supabase와 동일한 claim 구조 사용
- **RLS 정책**: Supabase와 동일한 보안 모델

## 다음 단계 (Frontend Agent)

1. `src-vite/src/utils/api.js`: Supabase 클라이언트 초기화 변경
2. `src-vite/.env`: 환경 변수 업데이트
3. `src-vite/src/features/auth/`: 인증 흐름 PostgREST 연동
4. E2E 테스트: `playwright.config.js` baseURL 변경

## 참고 문서

- [docker/README.md](docker/README.md): 로컬 배포 가이드
- [database/init/README.md](database/init/README.md): DB 초기화 가이드
- [Issue #114](https://github.com/garimto81/ggp-ojt-v2/issues/114): 요구사항

## 작업자

Infrastructure Agent - 2025-12-08
