-- ============================================
-- 테이블 정리 마이그레이션
-- 목적: admin_logs → audit_logs 통합, content_reports 제거
-- 파일: database/migrations/20251209_table_cleanup.sql
-- 이슈: PRD-DB 정합성
-- 날짜: 2025-12-09
-- ============================================

-- ============================================
-- Phase 1: 데이터 확인 (정보 출력)
-- ============================================
DO $$
DECLARE
  admin_logs_count INTEGER := 0;
  content_reports_count INTEGER := 0;
BEGIN
  -- admin_logs 테이블 존재 확인
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_logs') THEN
    SELECT COUNT(*) INTO admin_logs_count FROM admin_logs;
    RAISE NOTICE '[INFO] admin_logs 레코드 수: %', admin_logs_count;
  ELSE
    RAISE NOTICE '[INFO] admin_logs 테이블이 존재하지 않습니다.';
  END IF;

  -- content_reports 테이블 존재 확인
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    SELECT COUNT(*) INTO content_reports_count FROM content_reports;
    RAISE NOTICE '[INFO] content_reports 레코드 수: %', content_reports_count;
  ELSE
    RAISE NOTICE '[INFO] content_reports 테이블이 존재하지 않습니다.';
  END IF;
END $$;

-- ============================================
-- Phase 2: admin_logs → audit_logs 데이터 마이그레이션
-- ============================================
DO $$
BEGIN
  -- admin_logs 테이블이 존재하고 audit_logs도 존재하는 경우에만 마이그레이션
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_logs')
     AND EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') THEN

    -- 데이터가 있는 경우 마이그레이션
    INSERT INTO audit_logs (event_type, table_name, record_id, old_value, performed_by, created_at, metadata)
    SELECT
      CASE
        WHEN action ILIKE '%role%' THEN 'ROLE_CHANGE'
        WHEN action ILIKE '%delete%' THEN 'DOC_DELETE'
        WHEN action ILIKE '%create%' THEN 'DOC_CREATE'
        WHEN action ILIKE '%update%' THEN 'DOC_UPDATE'
        ELSE 'SECURITY_ALERT'
      END AS event_type,
      COALESCE(target_type, 'unknown') AS table_name,
      target_id AS record_id,
      details AS old_value,
      admin_id AS performed_by,
      created_at,
      jsonb_build_object('migrated_from', 'admin_logs', 'original_action', action) AS metadata
    FROM admin_logs al
    WHERE NOT EXISTS (
      SELECT 1 FROM audit_logs au
      WHERE au.record_id = al.target_id
        AND au.created_at = al.created_at
    );

    RAISE NOTICE '[SUCCESS] admin_logs 데이터가 audit_logs로 마이그레이션되었습니다.';
  ELSE
    RAISE NOTICE '[SKIP] admin_logs 또는 audit_logs 테이블이 없어 마이그레이션을 건너뜁니다.';
  END IF;
END $$;

-- ============================================
-- Phase 3: admin_logs 테이블 제거
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_logs') THEN
    -- 인덱스 먼저 제거
    DROP INDEX IF EXISTS idx_admin_logs_admin;
    DROP INDEX IF EXISTS idx_admin_logs_created;

    -- 테이블 제거
    DROP TABLE public.admin_logs;
    RAISE NOTICE '[SUCCESS] admin_logs 테이블이 제거되었습니다.';
  ELSE
    RAISE NOTICE '[SKIP] admin_logs 테이블이 이미 존재하지 않습니다.';
  END IF;
END $$;

-- ============================================
-- Phase 4: content_reports 테이블 제거
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'content_reports') THEN
    -- 인덱스 먼저 제거
    DROP INDEX IF EXISTS idx_content_reports_status;

    -- 테이블 제거
    DROP TABLE public.content_reports;
    RAISE NOTICE '[SUCCESS] content_reports 테이블이 제거되었습니다.';
  ELSE
    RAISE NOTICE '[SKIP] content_reports 테이블이 이미 존재하지 않습니다.';
  END IF;
END $$;

-- ============================================
-- Phase 5: 검증
-- ============================================
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%';

  RAISE NOTICE '========================================';
  RAISE NOTICE '[완료] 테이블 정리 마이그레이션 완료';
  RAISE NOTICE '현재 public 스키마 테이블 수: %', table_count;
  RAISE NOTICE '========================================';
END $$;

-- 현재 테이블 목록 출력
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name AND c.table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
