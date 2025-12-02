-- ============================================
-- OJT Master Phase 2: learning_progress 테이블
-- ============================================
-- 목적: 학습 진행률 추적 (세션별 시간, 섹션 진행, 퀴즈 시도)
-- 실행: Supabase SQL Editor에서 실행

-- ============================================
-- 1. learning_progress 테이블 생성
-- ============================================

CREATE TABLE IF NOT EXISTS learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doc_id UUID NOT NULL REFERENCES ojt_docs(id) ON DELETE CASCADE,

  -- 진행 상태
  status TEXT DEFAULT 'not_started'
    CHECK (status IN ('not_started', 'in_progress', 'completed', 'passed')),

  -- 학습 시간 추적
  started_at TIMESTAMPTZ,
  last_accessed_at TIMESTAMPTZ,
  total_time_seconds INTEGER DEFAULT 0,

  -- 콘텐츠 진행률 (섹션 기반)
  current_section INTEGER DEFAULT 0,
  sections_completed INTEGER DEFAULT 0,

  -- 퀴즈 시도 기록
  quiz_attempts INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,

  -- 타임스탬프
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 사용자-문서 복합 유니크 (1인 1문서 1기록)
  UNIQUE(user_id, doc_id)
);

-- 테이블 코멘트
COMMENT ON TABLE learning_progress IS 'OJT 문서별 학습 진행률 추적';
COMMENT ON COLUMN learning_progress.status IS 'not_started: 미시작, in_progress: 학습중, completed: 학습완료, passed: 퀴즈통과';
COMMENT ON COLUMN learning_progress.total_time_seconds IS '누적 학습 시간 (초)';
COMMENT ON COLUMN learning_progress.current_section IS '현재 학습 중인 섹션 인덱스';
COMMENT ON COLUMN learning_progress.quiz_attempts IS '퀴즈 시도 횟수';
COMMENT ON COLUMN learning_progress.best_score IS '최고 점수 (4점 만점)';

-- ============================================
-- 2. 인덱스 생성
-- ============================================

-- 사용자별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_progress_user
  ON learning_progress(user_id);

-- 문서별 조회 최적화
CREATE INDEX IF NOT EXISTS idx_progress_doc
  ON learning_progress(doc_id);

-- 상태별 필터링 (진행 중인 학습 조회)
CREATE INDEX IF NOT EXISTS idx_progress_user_status
  ON learning_progress(user_id, status);

-- 최근 접근 순 정렬
CREATE INDEX IF NOT EXISTS idx_progress_last_accessed
  ON learning_progress(last_accessed_at DESC);

-- ============================================
-- 3. RLS (Row Level Security) 설정
-- ============================================

ALTER TABLE learning_progress ENABLE ROW LEVEL SECURITY;

-- 정책 1: 사용자는 자신의 진행률 조회 가능
CREATE POLICY "Users can view own progress"
  ON learning_progress FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 정책 2: 관리자는 전체 진행률 조회 가능
CREATE POLICY "Admins can view all progress"
  ON learning_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 정책 3: 멘토는 자신이 작성한 문서의 학습 진행률 조회 가능
CREATE POLICY "Mentors can view progress for own docs"
  ON learning_progress FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM ojt_docs
      WHERE ojt_docs.id = learning_progress.doc_id
        AND ojt_docs.author_id = auth.uid()
    )
  );

-- 정책 4: 사용자는 자신의 진행률 생성 가능
CREATE POLICY "Users can create own progress"
  ON learning_progress FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 정책 5: 사용자는 자신의 진행률 수정 가능
CREATE POLICY "Users can update own progress"
  ON learning_progress FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- 4. 트리거: updated_at 자동 갱신
-- ============================================

CREATE TRIGGER learning_progress_updated_at
  BEFORE UPDATE ON learning_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 5. 기존 데이터 마이그레이션 (선택적)
-- ============================================
-- learning_records에서 초기 데이터 생성
-- 주의: 이미 데이터가 있으면 CONFLICT 처리

INSERT INTO learning_progress (
  user_id,
  doc_id,
  status,
  quiz_attempts,
  best_score,
  created_at,
  updated_at
)
SELECT
  user_id,
  doc_id,
  CASE WHEN passed THEN 'passed' ELSE 'completed' END as status,
  1 as quiz_attempts,
  score as best_score,
  completed_at as created_at,
  completed_at as updated_at
FROM learning_records
WHERE user_id IS NOT NULL AND doc_id IS NOT NULL
ON CONFLICT (user_id, doc_id) DO UPDATE
SET
  quiz_attempts = learning_progress.quiz_attempts + 1,
  best_score = GREATEST(learning_progress.best_score, EXCLUDED.best_score),
  status = CASE
    WHEN EXCLUDED.status = 'passed' THEN 'passed'
    ELSE learning_progress.status
  END,
  updated_at = NOW();

-- ============================================
-- 6. 확인 쿼리
-- ============================================

-- 테이블 생성 확인
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'learning_progress';

-- 인덱스 확인
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'learning_progress';

-- RLS 정책 확인
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE tablename = 'learning_progress';

-- 마이그레이션된 데이터 확인
-- SELECT status, COUNT(*) FROM learning_progress GROUP BY status;

-- ============================================
-- 완료 메시지
-- ============================================
DO $$
DECLARE
  row_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM learning_progress;
  RAISE NOTICE 'Phase 2 완료: learning_progress 테이블 생성';
  RAISE NOTICE '- 마이그레이션된 레코드: % 건', row_count;
END $$;
