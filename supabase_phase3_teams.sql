-- ============================================
-- OJT Master Phase 3: teams 테이블 분리
-- ============================================
-- 목적: ojt_docs.team 문자열 → teams 테이블 + FK 정규화
-- 실행: Supabase SQL Editor에서 실행

-- ============================================
-- 1. teams 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,           -- "개발팀", "마케팅팀" 등
  slug TEXT NOT NULL UNIQUE,           -- "dev", "marketing" (URL용)
  description TEXT,                    -- 팀 설명
  display_order INTEGER DEFAULT 0,     -- 표시 순서
  is_active BOOLEAN DEFAULT true,      -- 활성화 여부
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE teams IS 'OJT 팀 마스터 테이블';
COMMENT ON COLUMN teams.slug IS 'URL 친화적 식별자 (영문 소문자)';
COMMENT ON COLUMN teams.display_order IS '멘티 화면 표시 순서';

-- ============================================
-- 2. RLS 설정
-- ============================================

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자는 팀 목록 조회 가능
CREATE POLICY "Authenticated users can view teams"
  ON teams FOR SELECT
  TO authenticated
  USING (true);

-- 관리자만 팀 생성/수정/삭제 가능
CREATE POLICY "Admins can manage teams"
  ON teams FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 3. 기존 team 데이터에서 teams 테이블 생성
-- ============================================

-- ojt_docs.team에서 고유 팀 추출하여 teams 테이블에 삽입
INSERT INTO teams (name, slug, display_order)
SELECT DISTINCT
  team as name,
  -- slug 생성: 영문/숫자만 유지, 공백→언더스코어, 소문자 변환
  LOWER(
    REGEXP_REPLACE(
      REGEXP_REPLACE(team, '[^a-zA-Z0-9가-힣\s]', '', 'g'),
      '\s+', '_', 'g'
    )
  ) as slug,
  ROW_NUMBER() OVER (ORDER BY team) as display_order
FROM ojt_docs
WHERE team IS NOT NULL AND team != ''
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 4. ojt_docs에 team_id FK 컬럼 추가
-- ============================================

-- team_id 컬럼 추가 (기존 team 컬럼 유지)
ALTER TABLE ojt_docs
ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

-- ============================================
-- 5. 데이터 마이그레이션 (team → team_id)
-- ============================================

UPDATE ojt_docs o
SET team_id = t.id
FROM teams t
WHERE o.team = t.name
  AND o.team_id IS NULL;

-- ============================================
-- 6. 인덱스 추가
-- ============================================

-- teams 테이블 인덱스
CREATE INDEX IF NOT EXISTS idx_teams_slug ON teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_teams_display_order ON teams(display_order);

-- ojt_docs.team_id 인덱스
CREATE INDEX IF NOT EXISTS idx_ojt_docs_team_id ON ojt_docs(team_id);

-- ============================================
-- 7. 마이그레이션 검증 쿼리
-- ============================================

-- 마이그레이션 상태 확인
DO $$
DECLARE
  total_docs INTEGER;
  migrated_docs INTEGER;
  pending_docs INTEGER;
  team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_docs FROM ojt_docs;
  SELECT COUNT(*) INTO migrated_docs FROM ojt_docs WHERE team_id IS NOT NULL;
  SELECT COUNT(*) INTO pending_docs FROM ojt_docs WHERE team_id IS NULL AND team IS NOT NULL;
  SELECT COUNT(*) INTO team_count FROM teams;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Phase 3 마이그레이션 결과';
  RAISE NOTICE '============================================';
  RAISE NOTICE '생성된 팀 수: %', team_count;
  RAISE NOTICE '전체 문서 수: %', total_docs;
  RAISE NOTICE '마이그레이션 완료: %', migrated_docs;
  RAISE NOTICE '마이그레이션 대기: %', pending_docs;
  RAISE NOTICE '============================================';
END $$;

-- ============================================
-- 8. 확인 쿼리 (수동 실행)
-- ============================================

-- 생성된 팀 목록 확인
-- SELECT id, name, slug, display_order, is_active FROM teams ORDER BY display_order;

-- 마이그레이션 상태 확인
-- SELECT
--   COUNT(*) as total,
--   COUNT(team_id) as migrated,
--   COUNT(*) - COUNT(team_id) as pending
-- FROM ojt_docs;

-- 팀별 문서 수 확인 (team_id 기준)
-- SELECT t.name, COUNT(o.id) as doc_count
-- FROM teams t
-- LEFT JOIN ojt_docs o ON o.team_id = t.id
-- GROUP BY t.name
-- ORDER BY doc_count DESC;

-- ============================================
-- 9. (선택) 레거시 team 컬럼 제거
-- ============================================
-- 주의: 모든 데이터 마이그레이션 확인 후 실행!
-- 클라이언트 코드 수정 완료 후 실행!

-- Step 1: NOT NULL 제약 추가 (마이그레이션 완료 확인 후)
-- ALTER TABLE ojt_docs ALTER COLUMN team_id SET NOT NULL;

-- Step 2: 기존 team 컬럼 제거 (클라이언트 코드 수정 후)
-- ALTER TABLE ojt_docs DROP COLUMN team;
