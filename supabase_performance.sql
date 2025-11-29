-- ============================================
-- OJT Master 성능 최적화 스크립트 (v2.1.0)
-- ============================================
-- 실행 방법: Supabase SQL Editor에서 실행
-- 문서: docs/PERFORMANCE_OPTIMIZATION.md

-- ============================================
-- 1. JSONB GIN 인덱스 추가
-- ============================================
-- sections, quiz JSONB 컬럼 검색 최적화
-- 효과: 순차 스캔 → 인덱스 스캔 (100배 이상 성능 향상)

CREATE INDEX IF NOT EXISTS idx_ojt_docs_sections_gin
  ON ojt_docs USING GIN (sections);

CREATE INDEX IF NOT EXISTS idx_ojt_docs_quiz_gin
  ON ojt_docs USING GIN (quiz);

-- ============================================
-- 2. 복합 인덱스 추가
-- ============================================
-- 팀별 로드맵 조회 (team + step) 최적화

CREATE INDEX IF NOT EXISTS idx_ojt_docs_team_step
  ON ojt_docs(team, step);

-- 사용자별 학습 기록 조회 최적화
CREATE INDEX IF NOT EXISTS idx_learning_records_user_passed
  ON learning_records(user_id, passed);

-- 사용자-문서 복합 조회 최적화
CREATE INDEX IF NOT EXISTS idx_learning_records_user_doc
  ON learning_records(user_id, doc_id);

-- ============================================
-- 3. 시계열 BRIN 인덱스
-- ============================================
-- created_at, completed_at 범위 검색 최적화
-- BRIN: B-tree 대비 10배 작은 인덱스 크기

CREATE INDEX IF NOT EXISTS idx_ojt_docs_created_brin
  ON ojt_docs USING BRIN (created_at);

CREATE INDEX IF NOT EXISTS idx_learning_records_completed_brin
  ON learning_records USING BRIN (completed_at);

-- ============================================
-- 4. RLS 성능 최적화 인덱스
-- ============================================
-- is_admin(), is_mentor_or_admin() 함수 성능 향상

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);

-- ============================================
-- 5. RLS 함수 최적화 (NULL 체크 추가)
-- ============================================
-- #24 이슈 해결: SECURITY DEFINER 함수 NULL 체크

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  -- 비인증 사용자는 DB 조회 없이 즉시 false 반환
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN COALESCE(
    (SELECT role = 'admin' FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION public.is_mentor_or_admin()
RETURNS boolean AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  RETURN COALESCE(
    (SELECT role IN ('mentor', 'admin') FROM public.users WHERE id = auth.uid()),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- 6. RLS 정책 최적화 (SELECT 래핑)
-- ============================================
-- 94.97% 성능 향상: auth.uid()를 SELECT로 래핑하여 캐싱

DROP POLICY IF EXISTS "Users can update own profile (except role)" ON users;

CREATE POLICY "Users can update own profile (except role)"
  ON users FOR UPDATE
  USING ((SELECT auth.uid()) = id)
  WITH CHECK (
    (SELECT auth.uid()) = id AND
    role = (SELECT role FROM users WHERE id = (SELECT auth.uid()))
  );

-- ============================================
-- 7. 성능 모니터링 뷰 (선택적)
-- ============================================

-- 인덱스 사용률 확인 뷰
-- 참고: pg_stat_user_indexes의 컬럼명은 relname (테이블명), indexrelname (인덱스명)
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
  schemaname,
  relname as tablename,
  indexrelname as indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  CASE
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW'
    ELSE 'ACTIVE'
  END as status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 캐시 히트율 확인 뷰
CREATE OR REPLACE VIEW cache_hit_ratio AS
SELECT
  'cache hit rate' AS metric,
  ROUND(
    SUM(heap_blks_hit)::numeric /
    NULLIF(SUM(heap_blks_hit) + SUM(heap_blks_read), 0)::numeric * 100,
    2
  ) AS ratio_percent
FROM pg_statio_user_tables;

-- ============================================
-- 8. 확인 쿼리
-- ============================================

-- 생성된 인덱스 확인
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public' ORDER BY tablename;

-- 인덱스 크기 확인
-- SELECT
--   relname as tablename,
--   indexrelname as indexname,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
-- ORDER BY pg_relation_size(indexrelid) DESC;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '성능 최적화 스크립트 실행 완료 (v2.1.0)';
  RAISE NOTICE '- GIN 인덱스: 2개';
  RAISE NOTICE '- 복합 인덱스: 3개';
  RAISE NOTICE '- BRIN 인덱스: 2개';
  RAISE NOTICE '- RLS 인덱스: 1개';
  RAISE NOTICE '- RLS 함수 최적화: 2개';
END $$;
