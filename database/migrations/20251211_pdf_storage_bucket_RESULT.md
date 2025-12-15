# 마이그레이션 실행 결과

**파일**: `20251211_pdf_storage_bucket.sql`
**실행일**: 2025-12-11
**이슈**: #202
**PRD**: tasks/prds/0013-pdf-supabase-storage.md
**담당 에이전트**: supabase-agent

---

## 실행 요약

| 항목 | 결과 |
|------|------|
| **상태** | ✅ 성공 |
| **실행 시간** | 2025-12-11 06:30 UTC |
| **변경 사항** | 버킷 1개, RLS 정책 4개, 테이블 컬럼 1개, 인덱스 1개 |
| **롤백 스크립트** | `20251211_pdf_storage_bucket_rollback.sql` |

---

## Phase 1: pdfs 버킷 생성

### 실행 쿼리

```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdfs',
  'pdfs',
  true,
  52428800,  -- 50MB in bytes
  ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;
```

### 결과

```json
{
  "id": "pdfs",
  "name": "pdfs",
  "public": true,
  "file_size_limit": 52428800,
  "allowed_mime_types": ["application/pdf"],
  "created_at": "2025-12-11 06:30:55.730998+00",
  "type": "STANDARD"
}
```

**상태**: ✅ 버킷 생성 성공

---

## Phase 2: RLS 정책 설정

### 2.1 INSERT 정책

```sql
CREATE POLICY "Mentor and Admin can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pdfs' AND ...);
```

**상태**: ✅ 정책 생성 성공

### 2.2 SELECT 정책

```sql
CREATE POLICY "Authenticated users can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');
```

**상태**: ✅ 정책 생성 성공

### 2.3 DELETE 정책

```sql
CREATE POLICY "Owner or Admin can delete PDFs"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'pdfs' AND ...);
```

**상태**: ✅ 정책 생성 성공

### 2.4 UPDATE 정책

```sql
CREATE POLICY "Owner or Admin can update PDFs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'pdfs' AND ...);
```

**상태**: ✅ 정책 생성 성공

### 검증 결과

```json
[
  {
    "policyname": "Authenticated users can view PDFs",
    "cmd": "SELECT",
    "roles": "{authenticated}"
  },
  {
    "policyname": "Mentor and Admin can upload PDFs",
    "cmd": "INSERT",
    "roles": "{authenticated}"
  },
  {
    "policyname": "Owner or Admin can delete PDFs",
    "cmd": "DELETE",
    "roles": "{authenticated}"
  },
  {
    "policyname": "Owner or Admin can update PDFs",
    "cmd": "UPDATE",
    "roles": "{authenticated}"
  }
]
```

**상태**: ✅ 4개 정책 모두 생성 확인

---

## Phase 3: ojt_docs 테이블 확장

### 3.1 컬럼 추가

```sql
ALTER TABLE public.ojt_docs
ADD COLUMN IF NOT EXISTS source_storage_path TEXT;
```

**상태**: ✅ 컬럼 추가 성공

### 3.2 컬럼 설명

```sql
COMMENT ON COLUMN public.ojt_docs.source_storage_path IS
  'Supabase Storage 파일 경로 (예: documents/{doc_id}/filename.pdf)';
```

**상태**: ✅ 주석 추가 성공

### 3.3 인덱스 생성

```sql
CREATE INDEX IF NOT EXISTS idx_ojt_docs_source_storage_path
ON public.ojt_docs(source_storage_path)
WHERE source_storage_path IS NOT NULL;
```

**상태**: ✅ 인덱스 생성 성공

### 검증 결과

```json
{
  "column_name": "source_storage_path",
  "data_type": "text",
  "is_nullable": "YES"
}
```

**상태**: ✅ ojt_docs 테이블 확장 완료

---

## Phase 4: 최종 검증

### 4.1 버킷 확인

```bash
curl -X POST "https://api.supabase.com/.../query" \
  -d '{"query": "SELECT * FROM storage.buckets WHERE id = '\''pdfs'\'';"}'
```

**결과**: ✅ pdfs 버킷 존재 확인

### 4.2 RLS 정책 확인

```bash
curl -X POST "https://api.supabase.com/.../query" \
  -d '{"query": "SELECT policyname FROM pg_policies WHERE policyname LIKE '\''%PDF%'\'';"}'
```

**결과**: ✅ 4개 정책 모두 활성화

### 4.3 테이블 확인

```bash
curl -X POST "https://api.supabase.com/.../query" \
  -d '{"query": "SELECT column_name FROM information_schema.columns WHERE table_name = '\''ojt_docs'\'' AND column_name = '\''source_storage_path'\'';"}'
```

**결과**: ✅ source_storage_path 컬럼 존재

---

## 영향 분석

### 변경 사항

| 항목 | 변경 전 | 변경 후 |
|------|---------|---------|
| **Storage 버킷** | 0개 | 1개 (pdfs) |
| **RLS 정책** | 0개 (pdfs 관련) | 4개 (INSERT/SELECT/UPDATE/DELETE) |
| **ojt_docs 컬럼** | 19개 | 20개 (source_storage_path 추가) |
| **인덱스** | 2개 | 3개 (source_storage_path 인덱스 추가) |

### 데이터 무결성

- **기존 데이터**: 영향 없음 (컬럼 추가만, NULL 허용)
- **롤백 가능**: `20251211_pdf_storage_bucket_rollback.sql` 준비됨
- **멱등성**: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING` 사용

---

## 다음 단계

### Frontend 구현 (content-create-agent)

1. **storage.js 유틸리티 작성**
   - `uploadPdfToStorage(docId, file)` 함수
   - `getPdfPublicUrl(storagePath)` 함수

2. **ContentInputPanel 수정**
   - PDF 업로드 시 Supabase Storage에 먼저 저장
   - `source_storage_path`, `source_url` 필드 ojt_docs에 저장

3. **PdfViewer 수정**
   - `source_storage_path`에서 URL 생성
   - Supabase Storage URL 지원

### 테스트

- [ ] 단위 테스트: `src/utils/__tests__/storage.test.js`
- [ ] E2E 테스트: `tests/e2e-issue202-pdf-storage.spec.js`
- [ ] 실제 PDF 업로드/열람 테스트

---

## 관련 문서

- **PRD**: `tasks/prds/0013-pdf-supabase-storage.md`
- **마이그레이션**: `database/migrations/20251211_pdf_storage_bucket.sql`
- **롤백**: `database/migrations/20251211_pdf_storage_bucket_rollback.sql`
- **스키마**: `database/agents/supabase/SCHEMA.md` (v3.1.0)

---

## 결론

✅ **마이그레이션 성공**: Supabase Storage 인프라 구축 완료

- pdfs 버킷 생성 및 RLS 정책 설정 완료
- ojt_docs 테이블 확장 (source_storage_path) 완료
- 프론트엔드 구현 준비 완료

**다음 작업**: content-create-agent가 PDF 업로드 로직 구현 (#202)
