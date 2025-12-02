-- =====================================================
-- PRD-0004: 원문 뷰어 + 퀴즈 출제 시스템
-- 새로운 소스 컬럼 추가 마이그레이션
-- =====================================================

-- 1. source_type 컬럼 추가 (기본값: 'manual')
-- 'url': URL 원문
-- 'pdf': PDF 원문
-- 'manual': 기존 직접 작성 방식
ALTER TABLE ojt_docs ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';

-- 2. source_url 컬럼 추가 (URL 타입인 경우 원본 URL)
ALTER TABLE ojt_docs ADD COLUMN IF NOT EXISTS source_url TEXT;

-- 3. source_file 컬럼 추가 (PDF 타입인 경우 R2 URL)
ALTER TABLE ojt_docs ADD COLUMN IF NOT EXISTS source_file TEXT;

-- 4. 기존 데이터에 source_type 기본값 설정
UPDATE ojt_docs SET source_type = 'manual' WHERE source_type IS NULL;

-- 5. source_type CHECK 제약 조건 추가
ALTER TABLE ojt_docs DROP CONSTRAINT IF EXISTS ojt_docs_source_type_check;
ALTER TABLE ojt_docs ADD CONSTRAINT ojt_docs_source_type_check
  CHECK (source_type IN ('url', 'pdf', 'manual'));

-- 6. 인덱스 추가 (source_type 필터링 성능)
CREATE INDEX IF NOT EXISTS idx_ojt_docs_source_type ON ojt_docs(source_type);

-- =====================================================
-- 검증 쿼리
-- =====================================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'ojt_docs' AND column_name LIKE 'source%';
