# Docker 개발 환경 설정 가이드

OJT Master 로컬 개발을 위한 Docker Compose 환경 설정 가이드입니다.

## 사전 요구사항

- Docker Desktop 4.0+
- Docker Compose v2.0+

## 빠른 시작

```bash
# 1. 환경 변수 설정
cp .env.docker.example .env.docker

# 2. 전체 스택 시작
docker-compose up -d

# 3. 로그 확인
docker-compose logs -f frontend
```

## 서비스 구성

| 서비스 | 포트 | 용도 |
|--------|------|------|
| `frontend` | 5173 | Vite 개발 서버 |
| `postgres` | 54321 | PostgreSQL 데이터베이스 |
| `minio` | 9000 (API), 9001 (Console) | S3 호환 스토리지 |

## 접속 URL

- **Frontend**: http://localhost:5173
- **MinIO Console**: http://localhost:9001
  - ID: `minioadmin`
  - Password: `minioadmin`
- **PostgreSQL**: `postgresql://postgres:postgres@localhost:54321/ojt_master`

## 명령어

```bash
# 전체 시작
docker-compose up -d

# 전체 중지
docker-compose down

# 로그 확인
docker-compose logs -f [service]

# 특정 서비스 재시작
docker-compose restart frontend

# 볼륨 포함 완전 삭제
docker-compose down -v

# 이미지 재빌드
docker-compose build --no-cache frontend
```

## 데이터베이스 관리

```bash
# PostgreSQL 접속
docker-compose exec postgres psql -U postgres -d ojt_master

# SQL 파일 실행
docker-compose exec -T postgres psql -U postgres -d ojt_master < ./database/migrations/new_migration.sql

# 데이터 백업
docker-compose exec postgres pg_dump -U postgres ojt_master > backup.sql

# 데이터 복원
docker-compose exec -T postgres psql -U postgres -d ojt_master < backup.sql
```

## MinIO (R2 대체)

```bash
# MinIO CLI 설치 (optional)
# macOS: brew install minio/stable/mc
# Windows: choco install minio-client

# MinIO 설정
mc alias set local http://localhost:9000 minioadmin minioadmin

# 버킷 확인
mc ls local/

# 파일 업로드
mc cp myfile.png local/ojt-media/
```

## 문제 해결

### 포트 충돌

```bash
# 사용 중인 포트 확인 (Windows)
netstat -ano | findstr :5173

# 프로세스 종료
taskkill /PID <PID> /F
```

### 볼륨 권한 문제

```bash
# 볼륨 삭제 후 재생성
docker-compose down -v
docker-compose up -d
```

### Hot Reload 안 됨

```bash
# WSL2 사용 시 폴링 모드 활성화
# docker-compose.yml에 추가:
# environment:
#   - CHOKIDAR_USEPOLLING=true
```

## 프로덕션 vs Docker 환경

| 항목 | 프로덕션 (Vercel) | Docker 로컬 |
|------|------------------|-------------|
| Frontend | Vercel Edge | Vite Dev Server |
| Database | Supabase Cloud | PostgreSQL 16 |
| Storage | Cloudflare R2 | MinIO |
| Auth | Supabase Auth | 로컬 Mock / 생략 |

## 제한사항

1. **RLS 미적용**: Docker 환경에서는 Supabase RLS 정책이 적용되지 않습니다.
2. **인증 제한**: Google OAuth는 프로덕션 환경에서만 동작합니다.
3. **R2 Worker**: CORS 프록시는 MinIO로 대체됩니다.

## 관련 문서

- [Supabase 스키마](../database/migrations/supabase_schema.sql)
- [PRD-0008: URL/PDF 최적화](../tasks/prds/0008-url-pdf-optimization.md)
