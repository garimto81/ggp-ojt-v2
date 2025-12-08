-- ============================================================
-- Email 인증 + 관리자 승인 시스템 마이그레이션
-- Issue #105: Docker OAuth 리디렉션 문제 해결
-- Date: 2025-12-08
-- ============================================================

-- ============================================================
-- 1. users 테이블 컬럼 추가
-- ============================================================

-- auth_provider: 인증 방식 (google | email)
-- 기존 사용자는 모두 Google OAuth로 가입했으므로 기본값 'google'
ALTER TABLE users
ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'google';

-- status: 계정 상태 (pending | approved | rejected)
-- 기존 사용자는 이미 사용 중이므로 기본값 'approved'
-- ⚠️ CRITICAL: DEFAULT 'approved' 없으면 기존 사용자 로그인 차단됨!
ALTER TABLE users
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';

-- approved_by: 승인한 Admin의 user ID
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- approved_at: 승인 일시
ALTER TABLE users
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ============================================================
-- 2. 기존 사용자 데이터 보장 (안전장치)
-- ============================================================

-- 혹시 NULL인 기존 사용자가 있다면 명시적으로 업데이트
UPDATE users
SET
  auth_provider = COALESCE(auth_provider, 'google'),
  status = COALESCE(status, 'approved')
WHERE auth_provider IS NULL OR status IS NULL;

-- ============================================================
-- 3. 인덱스 추가 (성능 최적화)
-- ============================================================

-- status별 조회 최적화 (Admin 승인 대기 목록)
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- auth_provider별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);

-- 복합 인덱스: Email 사용자 중 승인 대기
CREATE INDEX IF NOT EXISTS idx_users_email_pending
ON users(auth_provider, status)
WHERE auth_provider = 'email' AND status = 'pending';

-- ============================================================
-- 4. CHECK 제약조건 (데이터 무결성)
-- ============================================================

-- auth_provider 값 제한
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_auth_provider_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_auth_provider_check
    CHECK (auth_provider IN ('google', 'email'));
  END IF;
END $$;

-- status 값 제한
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users
    ADD CONSTRAINT users_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ============================================================
-- 5. RLS 정책 업데이트
-- ============================================================

-- 기존 SELECT 정책 삭제 (있다면)
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- 새 SELECT 정책: 승인된 사용자 + 본인 데이터
-- ⚠️ CRITICAL: status IS NULL 조건으로 기존 사용자 보호
CREATE POLICY "users_select_approved" ON users FOR SELECT
USING (
  auth.uid() = id  -- 본인 데이터는 항상 조회 가능
  OR status IS NULL  -- 마이그레이션 전 기존 사용자 (안전장치)
  OR status = 'approved'  -- 승인된 사용자
  OR (
    -- Admin은 모든 사용자 조회 가능
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
);

-- INSERT 정책: 인증된 사용자는 본인 데이터 생성 가능
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;

CREATE POLICY "users_insert_own" ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- UPDATE 정책: 본인 또는 Admin
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;

CREATE POLICY "users_update_own_or_admin" ON users FOR UPDATE
USING (
  auth.uid() = id  -- 본인
  OR EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================
-- 6. 검증 쿼리 (실행 후 확인용)
-- ============================================================

-- 컬럼 추가 확인
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'users'
-- AND column_name IN ('auth_provider', 'status', 'approved_by', 'approved_at');

-- 기존 사용자 상태 확인 (모두 google/approved여야 함)
-- SELECT auth_provider, status, COUNT(*)
-- FROM users
-- GROUP BY auth_provider, status;

-- NULL 값 없는지 확인 (0 rows여야 함)
-- SELECT id, name FROM users
-- WHERE auth_provider IS NULL OR status IS NULL;
