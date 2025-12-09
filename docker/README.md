# OJT Master - Local-Only Docker Deployment

Issue #114: Vercel 배포 폐기, 순수 로컬 네트워크 Docker 배포로 전환

## 개요

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
│                                         10.10.100.209:8001  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 구성 요소

| 서비스 | 역할 | 포트 | 이미지 |
|--------|------|------|--------|
| **postgres** | Self-hosted PostgreSQL | 5432 | postgres:16-alpine |
| **postgrest** | PostgreSQL REST API (Supabase 대체) | 3000 | postgrest/postgrest:v12.0.2 |
| **nginx** | 프론트엔드 서빙 + API 프록시 | 8080, 8443 | nginx:alpine |
| **vLLM** | AI 서버 (외부) | 8001 | 별도 서버 |

## 요구사항

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (프론트엔드 빌드용)
- 8GB+ RAM (PostgreSQL + 프론트엔드)

## 빠른 시작

### 1. 환경 변수 설정

```bash
cd docker
cp .env.docker.example .env.docker
```

**필수 수정 사항:**
```bash
# .env.docker
POSTGRES_PASSWORD=your-secure-password-here
PGRST_JWT_SECRET=$(openssl rand -base64 32)  # 32자 이상 랜덤 생성
```

### 2. SSL 인증서 생성

```bash
# 자체 서명 인증서 (개발용)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem \
  -subj "/CN=localhost"
```

**프로덕션 (Let's Encrypt):**
```bash
certbot certonly --standalone -d your-domain.com
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/key.pem
```

### 3. 프론트엔드 빌드

```bash
cd ../src-vite

# 환경 변수 설정
cat > .env << EOF
VITE_SUPABASE_URL=https://localhost:8443
VITE_SUPABASE_ANON_KEY=<PostgREST JWT token>
VITE_LOCAL_AI_URL=/api
VITE_AUTH_MODE=email
EOF

npm install
npm run build
```

### 4. Docker Compose 실행

```bash
cd ../docker
docker-compose --env-file .env.docker up -d

# 로그 확인
docker-compose logs -f
```

### 5. 초기 관리자 생성

```bash
# PostgreSQL 컨테이너 접속
docker exec -it ojt-postgres psql -U postgres -d ojt_master

# SQL 실행
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  gen_random_uuid(),
  'admin@local',
  crypt('admin123', gen_salt('bf'))
);

INSERT INTO public.users (id, name, role, department, status)
SELECT id, 'Admin User', 'admin', 'Management', 'approved'
FROM auth.users
WHERE email = 'admin@local';
```

### 6. 접속

- **Frontend**: https://localhost:8443
- **PostgreSQL**: localhost:5432
- **PostgREST API**: http://localhost:3000

브라우저에서 자체 서명 인증서 경고 무시하고 접속

## 상세 설정

### PostgreSQL

**초기화 스크립트**: `database/init/*.sql` (자동 실행)
- `01_init.sql`: 스키마 및 테이블 생성
- `02_rls.sql`: Row Level Security 정책
- `03_seed.sql`: 초기 데이터 (팀, 설정)

**접속:**
```bash
docker exec -it ojt-postgres psql -U postgres -d ojt_master
```

**백업:**
```bash
docker exec ojt-postgres pg_dump -U postgres ojt_master > backup.sql
```

**복원:**
```bash
docker exec -i ojt-postgres psql -U postgres -d ojt_master < backup.sql
```

### PostgREST

**JWT Secret 생성:**
```bash
openssl rand -base64 32
```

**API 테스트:**
```bash
# 익명 접근 (RLS 적용됨)
curl http://localhost:3000/users

# 인증 접근 (JWT 토큰 필요)
curl http://localhost:3000/users \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

**JWT 토큰 생성 (Python):**
```python
import jwt
import datetime

payload = {
  'sub': '<user_id>',
  'email': 'admin@local',
  'role': 'authenticated',
  'exp': datetime.datetime.utcnow() + datetime.timedelta(days=1)
}

token = jwt.encode(payload, '<PGRST_JWT_SECRET>', algorithm='HS256')
print(token)
```

### Nginx

**로그 확인:**
```bash
docker logs ojt-nginx
docker exec ojt-nginx tail -f /var/log/nginx/access.log
docker exec ojt-nginx tail -f /var/log/nginx/error.log
```

**설정 테스트:**
```bash
docker exec ojt-nginx nginx -t
docker exec ojt-nginx nginx -s reload
```

### vLLM (외부 서버)

**AI 서버 상태 확인:**
```bash
curl http://10.10.100.209:8001/health
curl http://10.10.100.209:8001/v1/models
```

**환경 변수 변경:**
```bash
# .env.docker
VLLM_HOST=10.10.100.209  # AI 서버 IP 변경
```

**nginx 프록시 테스트:**
```bash
# 브라우저 DevTools에서 확인
fetch('https://localhost:8443/api/v1/models')
  .then(r => r.json())
  .then(console.log)
```

## 운영 명령어

### 시작/중지

```bash
# 전체 시작
docker-compose --env-file .env.docker up -d

# 전체 중지
docker-compose down

# 특정 서비스만 재시작
docker-compose restart nginx
docker-compose restart postgrest
```

### 로그 확인

```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스
docker-compose logs -f postgres
docker-compose logs -f postgrest
docker-compose logs -f nginx
```

### 데이터베이스 관리

```bash
# 테이블 목록
docker exec -it ojt-postgres psql -U postgres -d ojt_master -c "\dt public.*"

# 사용자 목록
docker exec -it ojt-postgres psql -U postgres -d ojt_master -c "SELECT * FROM public.users;"

# RLS 정책 확인
docker exec -it ojt-postgres psql -U postgres -d ojt_master -c "SELECT * FROM pg_policies WHERE schemaname = 'public';"
```

### 볼륨 관리

```bash
# 볼륨 목록
docker volume ls | grep ojt

# 볼륨 삭제 (데이터 초기화)
docker-compose down -v

# 볼륨 백업
docker run --rm -v ojt_postgres_data:/data -v $(pwd):/backup ubuntu tar czf /backup/postgres_backup.tar.gz /data
```

### 프론트엔드 업데이트

```bash
# 1. 빌드
cd ../src-vite
npm run build

# 2. nginx 재시작
cd ../docker
docker-compose restart nginx
```

## 문제 해결

### 503 Service Unavailable

**원인**: PostgREST가 PostgreSQL에 연결 실패

**해결:**
```bash
# PostgreSQL 상태 확인
docker-compose ps postgres

# 로그 확인
docker-compose logs postgres
docker-compose logs postgrest

# 재시작
docker-compose restart postgrest
```

### 403 Forbidden (API)

**원인**: RLS 정책 또는 GRANT 권한 문제

**해결:**
```bash
# GRANT 확인
docker exec -it ojt-postgres psql -U postgres -d ojt_master << EOF
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_name = 'users' AND grantee IN ('anon', 'authenticated');
EOF

# RLS 재적용
docker exec -it ojt-postgres psql -U postgres -d ojt_master -f /docker-entrypoint-initdb.d/02_rls.sql
```

### Mixed Content (HTTPS → HTTP)

**원인**: HTTPS 페이지에서 HTTP API 호출

**해결:**
- nginx 프록시 사용 (이미 적용됨)
- `/api/v1/*`, `/rest/v1/*`은 같은 오리진

### vLLM 연결 실패

**원인**: AI 서버 미실행 또는 네트워크 문제

**해결:**
```bash
# AI 서버 확인
curl http://10.10.100.209:8001/health

# 방화벽 확인 (8001 포트)
telnet 10.10.100.209 8001

# nginx extra_hosts 확인
docker-compose config | grep vllm-server
```

### 인증서 경고

**원인**: 자체 서명 인증서 사용

**해결 (브라우저별):**
- Chrome: "고급" → "localhost(안전하지 않음)으로 계속"
- Firefox: "위험을 감수하고 계속"
- 프로덕션: Let's Encrypt 사용

## 보안 권장사항

1. **비밀번호 강화**
   ```bash
   POSTGRES_PASSWORD=$(openssl rand -base64 32)
   PGRST_JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **방화벽 설정**
   ```bash
   # 8443만 외부 노출
   ufw allow 8443/tcp

   # 5432, 3000은 내부망만
   ufw deny 5432/tcp
   ufw deny 3000/tcp
   ```

3. **SSL 인증서 (프로덕션)**
   - Let's Encrypt 사용
   - 자동 갱신 설정 (certbot renew)

4. **정기 백업**
   ```bash
   # cron에 등록 (매일 2시)
   0 2 * * * docker exec ojt-postgres pg_dump -U postgres ojt_master > /backup/ojt_$(date +\%Y\%m\%d).sql
   ```

5. **로그 모니터링**
   ```bash
   # Fail2ban 설정 (nginx 로그)
   # Prometheus + Grafana (메트릭 수집)
   ```

## Supabase 마이그레이션

기존 Supabase 클라우드에서 Self-hosted로 전환:

### 1. 데이터 덤프

```bash
# Supabase 데이터 덤프
pg_dump -h db.cbvansmxutnogntbyswi.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  --data-only \
  --file=supabase_data.sql
```

### 2. 스키마 호환성 확인

```sql
-- auth.users id와 public.users id 매칭 확인
SELECT au.id, au.email, pu.name, pu.role
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id;
```

### 3. 데이터 복원

```bash
# Self-hosted PostgreSQL에 복원
docker exec -i ojt-postgres psql -U postgres -d ojt_master < supabase_data.sql
```

### 4. 프론트엔드 환경 변수 변경

```bash
# src-vite/.env
# 변경 전
VITE_SUPABASE_URL=https://cbvansmxutnogntbyswi.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# 변경 후
VITE_SUPABASE_URL=https://localhost:8443
VITE_SUPABASE_ANON_KEY=<PostgREST JWT token>
VITE_LOCAL_AI_URL=/api
VITE_AUTH_MODE=email
```

## 성능 튜닝

### PostgreSQL

```bash
# docker-compose.yml (이미 적용됨)
- shared_buffers=256MB
- effective_cache_size=1GB
- max_connections=200
```

### Nginx

```bash
# nginx.conf (이미 적용됨)
- worker_connections 1024
- keepalive 65
- gzip on (압축)
```

### PostgREST

```bash
# .env.docker
PGRST_DB_POOL=20  # 커넥션 풀 크기
```

## 모니터링

### Prometheus + Grafana (선택)

```bash
# docker-compose.yml에 추가
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"

grafana:
  image: grafana/grafana
  ports:
    - "3001:3000"
```

### 기본 모니터링

```bash
# 컨테이너 리소스 사용량
docker stats

# PostgreSQL 커넥션
docker exec ojt-postgres psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# nginx 요청 통계
docker exec ojt-nginx tail -100 /var/log/nginx/access.log | awk '{print $7}' | sort | uniq -c | sort -rn
```

## 관련 문서

- [PostgreSQL 초기화 가이드](../database/init/README.md)
- [PostgREST 공식 문서](https://postgrest.org/)
- [Docker 사내 배포 인증 설정](../docs/DOCKER_AUTH_SETUP.md)

## 문의

Issue #114 참조
