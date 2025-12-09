-- ============================================================
-- OJT Master - Seed Data (Optional)
-- Issue #114: Local-Only Docker Deployment
-- ============================================================
--
-- 목적: 초기 데이터 삽입 (팀 정보, 기본 설정)
-- 실행: Docker entrypoint에서 자동 실행됨
--
-- ============================================================

-- ============================================================
-- 기본 팀 데이터
-- ============================================================
INSERT INTO public.teams (id, name, slug, display_order, is_active) VALUES
  (gen_random_uuid(), 'Frontend', 'frontend', 1, true),
  (gen_random_uuid(), 'Backend', 'backend', 2, true),
  (gen_random_uuid(), 'DevOps', 'devops', 3, true),
  (gen_random_uuid(), 'AI/ML', 'ai-ml', 4, true),
  (gen_random_uuid(), 'Design', 'design', 5, true),
  (gen_random_uuid(), 'QA', 'qa', 6, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================
-- 기본 관리자 설정
-- ============================================================
INSERT INTO public.admin_settings (key, value) VALUES
  ('quiz_pass_score', '{"value": 70, "description": "퀴즈 통과 점수 (%)"}'),
  ('max_quiz_attempts', '{"value": 3, "description": "최대 퀴즈 시도 횟수"}'),
  ('ai_generation_timeout', '{"value": 60, "description": "AI 생성 타임아웃 (초)"}'),
  ('content_report_auto_review', '{"value": false, "description": "콘텐츠 신고 자동 검토"}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 완료 메시지
-- ============================================================
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'Default teams: Frontend, Backend, DevOps, AI/ML, Design, QA';
  RAISE NOTICE 'Admin settings: quiz_pass_score=70, max_quiz_attempts=3';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Database initialization complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Create admin user via auth.users table';
  RAISE NOTICE '  2. Access frontend: https://localhost:8443';
  RAISE NOTICE '  3. Login with created credentials';
  RAISE NOTICE '';
END
$$;
