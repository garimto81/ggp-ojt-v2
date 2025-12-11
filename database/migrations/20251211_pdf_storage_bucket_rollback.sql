-- ============================================
-- PDF Supabase Storage 버킷 롤백
-- 목적: 20251211_pdf_storage_bucket.sql 롤백
-- 파일: database/migrations/20251211_pdf_storage_bucket_rollback.sql
-- 이슈: #202
-- 날짜: 2025-12-11
-- ============================================

-- ============================================
-- Phase 1: ojt_docs 테이블 롤백
-- ============================================

-- 1.1 인덱스 제거
DROP INDEX IF EXISTS public.idx_ojt_docs_source_storage_path;

-- 1.2 컬럼 제거 (데이터 확인 필수!)
-- 주의: 실제 데이터가 있는 경우 백업 후 실행
DO $$
DECLARE
  rec_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO rec_count
  FROM public.ojt_docs
  WHERE source_storage_path IS NOT NULL;

  IF rec_count > 0 THEN
    RAISE NOTICE 'source_storage_path에 데이터 %개 존재. 삭제 전 백업 필요!', rec_count;
    -- 강제 삭제를 원하면 아래 주석 해제
    -- ALTER TABLE public.ojt_docs DROP COLUMN source_storage_path;
  ELSE
    ALTER TABLE public.ojt_docs DROP COLUMN IF EXISTS source_storage_path;
    RAISE NOTICE 'source_storage_path 컬럼 삭제 완료';
  END IF;
END $$;

-- ============================================
-- Phase 2: RLS 정책 제거
-- ============================================

-- 2.1 RLS 정책 삭제
DROP POLICY IF EXISTS "Mentor and Admin can upload PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Owner or Admin can delete PDFs" ON storage.objects;
DROP POLICY IF EXISTS "Owner or Admin can update PDFs" ON storage.objects;

-- ============================================
-- Phase 3: 버킷 제거 (데이터 확인 필수!)
-- ============================================

-- 3.1 버킷 내 파일 수 확인
DO $$
DECLARE
  file_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO file_count
  FROM storage.objects
  WHERE bucket_id = 'pdfs';

  IF file_count > 0 THEN
    RAISE EXCEPTION '버킷에 파일 %개 존재. 삭제 전 백업 필요!', file_count;
  END IF;
END $$;

-- 3.2 버킷 삭제
DELETE FROM storage.buckets WHERE id = 'pdfs';

-- ============================================
-- Phase 4: 검증 쿼리
-- ============================================

-- 4.1 버킷 삭제 확인
-- SELECT id FROM storage.buckets WHERE id = 'pdfs';
-- 결과: 0 rows (정상)

-- 4.2 RLS 정책 삭제 확인
-- SELECT policyname
-- FROM pg_policies
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND policyname LIKE '%PDF%';
-- 결과: 0 rows (정상)

-- 4.3 ojt_docs 컬럼 삭제 확인
-- SELECT column_name
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'ojt_docs'
-- AND column_name = 'source_storage_path';
-- 결과: 0 rows (정상)

-- ============================================
-- 완료
-- ============================================
-- 롤백 완료. 다음 확인 사항:
-- 1. 버킷 내 파일 백업 여부
-- 2. ojt_docs.source_storage_path 데이터 백업 여부
-- 3. 애플리케이션 코드에서 source_storage_path 참조 제거
