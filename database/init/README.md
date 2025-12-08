# Database Initialization Scripts

이 디렉토리는 PostgreSQL 컨테이너 초기화 스크립트를 포함합니다.

## 실행 순서

Docker Compose 실행 시 자동으로 알파벳 순서로 실행됩니다:

1. **01_init.sql**: 스키마 및 테이블 생성
   - auth 스키마 (Supabase 호환)
   - public 테이블 (users, ojt_docs, learning_records 등)
   - 인덱스 및 트리거

2. **02_rls.sql**: Row Level Security 정책
   - Helper 함수 (is_admin, is_mentor_or_admin)
   - 테이블별 RLS 정책

3. **03_seed.sql**: 초기 데이터 (선택)
   - 기본 팀 데이터
   - 관리자 설정

## 초기화 확인

```bash
# PostgreSQL 컨테이너 접속
docker exec -it ojt-postgres psql -U postgres -d ojt_master

# 테이블 목록 확인
\dt public.*

# RLS 정책 확인
\d+ public.users
```

## 수동 초기화

컨테이너 재시작 없이 수동 실행:

```bash
# 1. 스크립트 복사
docker cp database/init/01_init.sql ojt-postgres:/tmp/

# 2. 실행
docker exec -it ojt-postgres psql -U postgres -d ojt_master -f /tmp/01_init.sql
```

## 초기 관리자 생성

```sql
-- 1. auth.users에 사용자 추가
INSERT INTO auth.users (id, email, encrypted_password)
VALUES (
  gen_random_uuid(),
  'admin@example.com',
  crypt('your-password', gen_salt('bf'))  -- bcrypt 해싱
);

-- 2. public.users에 프로필 추가
INSERT INTO public.users (id, name, role, department, status)
SELECT id, 'Admin User', 'admin', 'Management', 'approved'
FROM auth.users
WHERE email = 'admin@example.com';
```

## Supabase 마이그레이션

기존 Supabase 데이터를 Self-hosted PostgreSQL로 마이그레이션하려면:

```bash
# 1. Supabase 데이터 덤프
pg_dump -h db.your-project.supabase.co -U postgres -d postgres \
  --schema=public --data-only --file=supabase_data.sql

# 2. Self-hosted PostgreSQL에 복원
docker exec -i ojt-postgres psql -U postgres -d ojt_master < supabase_data.sql
```

## 문제 해결

### 권한 에러

```sql
-- GRANT 확인
SELECT * FROM information_schema.role_table_grants
WHERE grantee IN ('anon', 'authenticated');

-- RLS 정책 확인
SELECT * FROM pg_policies WHERE schemaname = 'public';
```

### 초기화 실패

```bash
# 볼륨 삭제 후 재시작
docker-compose down -v
docker-compose --env-file .env.docker up -d
```

### 스크립트 재실행

```sql
-- 테이블 전체 삭제
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 스크립트 재실행
\i /docker-entrypoint-initdb.d/01_init.sql
\i /docker-entrypoint-initdb.d/02_rls.sql
\i /docker-entrypoint-initdb.d/03_seed.sql
```

## 참고

- PostgreSQL 초기화 스크립트는 **최초 컨테이너 생성 시 1회만 실행**됩니다
- 이미 데이터가 있으면 실행되지 않습니다
- 재실행이 필요하면 볼륨을 삭제해야 합니다 (`docker-compose down -v`)
