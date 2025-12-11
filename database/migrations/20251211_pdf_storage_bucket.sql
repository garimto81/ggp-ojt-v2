-- ============================================
-- PDF Supabase Storage 버킷 및 RLS 정책 설정
-- 목적: 로컬 PDF 파일을 Supabase Storage에 영구 저장
-- 파일: database/migrations/20251211_pdf_storage_bucket.sql
-- 이슈: #202
-- PRD: tasks/prds/0013-pdf-supabase-storage.md
-- 날짜: 2025-12-11
-- ============================================

-- ============================================
-- Phase 1: pdfs 버킷 생성
-- ============================================

-- 1.1 버킷 생성 (public 접근 허용)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,  -- 50MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 1.2 버킷 확인
-- SELECT * FROM storage.buckets WHERE id = 'pdfs';

-- ============================================
-- Phase 2: RLS 정책 설정
-- ============================================

-- 2.1 Mentor/Admin만 PDF 업로드 가능
CREATE POLICY "Mentor and Admin can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdfs'
  AND (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('mentor', 'admin')
    )
  )
);

-- 2.2 인증된 사용자 모두 PDF 조회 가능
CREATE POLICY "Authenticated users can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');

-- 2.3 본인 업로드 파일 또는 Admin만 삭제 가능
CREATE POLICY "Owner or Admin can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pdfs'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- 2.4 본인 업로드 파일 또는 Admin만 수정 가능
CREATE POLICY "Owner or Admin can update PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pdfs'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
);

-- ============================================
-- Phase 3: ojt_docs 테이블 확장
-- ============================================

-- 3.1 source_storage_path 컬럼 추가
ALTER TABLE public.ojt_docs
ADD COLUMN IF NOT EXISTS source_storage_path TEXT;

-- 3.2 컬럼 설명 추가
COMMENT ON COLUMN public.ojt_docs.source_storage_path IS
  'Supabase Storage 파일 경로 (예: documents/{doc_id}/filename.pdf)';

-- 3.3 인덱스 생성 (NULL이 아닌 경우만)
CREATE INDEX IF NOT EXISTS idx_ojt_docs_source_storage_path
ON public.ojt_docs(source_storage_path)
WHERE source_storage_path IS NOT NULL;

-- ============================================
-- Phase 4: 검증 쿼리 (주석 처리)
-- ============================================

-- 4.1 버킷 확인
-- SELECT id, name, public, file_size_limit, allowed_mime_types
-- FROM storage.buckets
-- WHERE id = 'pdfs';

-- 4.2 RLS 정책 확인
-- SELECT policyname, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'storage'
-- AND tablename = 'objects'
-- AND policyname LIKE '%PDF%';

-- 4.3 ojt_docs 테이블 확인
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
-- AND table_name = 'ojt_docs'
-- AND column_name = 'source_storage_path';

-- ============================================
-- 완료
-- ============================================
-- 실행 후 확인:
-- 1. Supabase Dashboard > Storage > pdfs 버킷 생성 확인
-- 2. Policies 탭에서 4개 정책 확인
-- 3. Database > ojt_docs 테이블에 source_storage_path 컬럼 확인
