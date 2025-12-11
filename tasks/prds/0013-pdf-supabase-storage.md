# PRD-0013: PDF 파일 Supabase Storage 저장

## 개요

| 항목 | 내용 |
|------|------|
| **PRD 번호** | 0013 |
| **제목** | PDF 파일 Supabase Storage 저장 (압축 없이) |
| **상태** | Draft |
| **작성일** | 2025-12-11 |
| **관련 이슈** | #200, #198 |
| **선행 PRD** | PRD-0012 (Context API 기반 퀴즈 생성) |
| **담당 에이전트** | content-create-agent, supabase-agent |

---

## 1. 배경 및 문제

### 1.1 현재 상황

PRD-0012에서 구현된 Context API 기반 퀴즈 생성 시스템에서:

| 입력 타입 | 현재 처리 | 문제점 |
|-----------|----------|--------|
| **온라인 PDF URL** | `source_url`에 URL 저장 | ✅ 정상 (URL로 접근 가능) |
| **로컬 PDF 파일** | `source_file`에 파일명만 저장 | ❌ **파일 원본 접근 불가** |

### 1.2 문제점

```
[Mentor] 로컬 PDF 업로드
    │
    ├─ Gemini Files API 업로드 (48시간 임시)
    ├─ 퀴즈 생성 완료 ✅
    └─ source_file = "document.pdf" (파일명만 저장)

[Mentee] 학습 시
    │
    └─ PdfViewer: "로컬 PDF 파일은 표시되지 않습니다" ❌
```

**Gemini Files API의 한계**: 48시간 후 파일 자동 만료 → 학습자가 PDF 원본 열람 불가

### 1.3 해결 방향

**Supabase Storage** 사용 (이미 Supabase 인프라 사용 중):
- 무료 1GB 스토리지
- 50MB/파일 제한
- CDN 제공
- RLS 정책 적용 가능

---

## 2. 목표

### 2.1 핵심 목표

1. **로컬 PDF 파일 영구 저장**: Supabase Storage에 PDF 원본 저장
2. **학습자 열람 가능**: PdfViewer에서 저장된 PDF 표시
3. **압축 없이 저장**: PDF는 이미 압축된 포맷, 추가 압축 불필요

### 2.2 성공 지표

| 지표 | 목표값 |
|------|--------|
| 로컬 PDF 업로드 → 저장 성공률 | 100% |
| 학습자 PDF 열람 성공률 | 100% |
| 업로드 시간 (10MB 기준) | < 5초 |

---

## 3. 요구사항

### 3.1 기능 요구사항

#### FR-1: Supabase Storage 버킷 설정

```sql
-- 1. 버킷 생성 (Supabase Dashboard 또는 SQL)
INSERT INTO storage.buckets (id, name, public)
VALUES ('pdfs', 'pdfs', true);

-- 2. RLS 정책: Mentor만 업로드, 모두 읽기
CREATE POLICY "Mentor can upload PDFs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pdfs'
  AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('mentor', 'admin')
);

CREATE POLICY "Anyone can view PDFs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pdfs');
```

#### FR-2: PDF 업로드 로직

```javascript
// ContentInputPanel.jsx - handlePdfGenerate 수정

// 1. Supabase Storage에 PDF 업로드
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('pdfs')
  .upload(`documents/${docId}/${file.name}`, file, {
    cacheControl: '3600',
    upsert: false
  });

// 2. Public URL 생성
const { data: urlData } = supabase.storage
  .from('pdfs')
  .getPublicUrl(uploadData.path);

// 3. source_storage_path에 경로 저장
const doc = {
  // ... 기존 필드
  source_type: 'pdf',
  source_file: file.name,
  source_storage_path: uploadData.path,  // 새 필드
  source_url: urlData.publicUrl,          // Public URL 저장
};
```

#### FR-3: ojt_docs 테이블 스키마 확장

```sql
-- 마이그레이션: source_storage_path 컬럼 추가
ALTER TABLE ojt_docs
ADD COLUMN IF NOT EXISTS source_storage_path TEXT;

COMMENT ON COLUMN ojt_docs.source_storage_path IS
  'Supabase Storage 파일 경로 (예: documents/{doc_id}/file.pdf)';
```

#### FR-4: PdfViewer 수정

```javascript
// PdfViewer.jsx - Supabase Storage URL 지원

// PDF 소스 결정 (우선순위)
const pdfSource = useMemo(() => {
  // 1. source_url이 있으면 사용 (온라인 PDF 또는 Storage URL)
  if (url) return url;

  // 2. source_storage_path가 있으면 Supabase Storage에서 가져오기
  if (storagePath) {
    const { data } = supabase.storage
      .from('pdfs')
      .getPublicUrl(storagePath);
    return data.publicUrl;
  }

  return null;
}, [url, storagePath]);
```

### 3.2 비기능 요구사항

| 항목 | 요구사항 |
|------|----------|
| **파일 크기** | 최대 50MB (Supabase Free 제한) |
| **지원 형식** | PDF만 (application/pdf) |
| **보안** | RLS 정책으로 접근 제어 |
| **성능** | CDN 캐싱 활용 |

---

## 4. 기술 설계

### 4.1 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    PDF 저장 아키텍처                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Mentor] ContentInputPanel                                     │
│      │                                                          │
│      ├─── 1. PDF 파일 선택                                       │
│      │                                                          │
│      ├─── 2. Supabase Storage 업로드 ───▶ pdfs 버킷             │
│      │       │                              │                   │
│      │       └─ path: documents/{docId}/file.pdf                │
│      │                                                          │
│      ├─── 3. Gemini Files API (퀴즈 생성용, 48시간)              │
│      │       └─ generateQuizFromLocalFile()                     │
│      │                                                          │
│      └─── 4. ojt_docs 저장                                       │
│              │                                                  │
│              └─ source_storage_path, source_url                 │
│                                                                 │
│  [Mentee] PdfViewer                                             │
│      │                                                          │
│      └─── source_url (Public URL) ───▶ Supabase CDN             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 데이터 흐름

| 단계 | 작업 | 저장 위치 |
|------|------|----------|
| 1 | PDF 파일 선택 | 클라이언트 메모리 |
| 2 | Supabase Storage 업로드 | `pdfs` 버킷 (영구) |
| 3 | Gemini Files API 업로드 | Google 임시 (48시간) |
| 4 | 퀴즈 생성 | - |
| 5 | 문서 저장 | `ojt_docs` 테이블 |
| 6 | 학습자 열람 | Supabase CDN → 브라우저 |

### 4.3 파일 경로 규칙

```
pdfs/
└── documents/
    └── {doc_id}/
        └── {original_filename}.pdf
```

예시: `pdfs/documents/550e8400-e29b-41d4-a716-446655440000/training-manual.pdf`

---

## 5. 구현 계획

### 5.1 Phase 1: 인프라 설정 (0.5일)

| 작업 | 파일 | 담당 에이전트 |
|------|------|--------------|
| Supabase Storage 버킷 생성 | Supabase Dashboard | supabase-agent |
| RLS 정책 설정 | `database/migrations/` | supabase-agent |
| ojt_docs 스키마 확장 | `database/migrations/` | supabase-agent |

### 5.2 Phase 2: 업로드 로직 (0.5일)

| 작업 | 파일 | 담당 에이전트 |
|------|------|--------------|
| PDF 업로드 함수 | `src/utils/storage.js` (신규) | content-create-agent |
| ContentInputPanel 수정 | `ContentInputPanel.jsx` | content-create-agent |
| 에러 핸들링 | - | content-create-agent |

### 5.3 Phase 3: 뷰어 연동 (0.5일)

| 작업 | 파일 | 담당 에이전트 |
|------|------|--------------|
| PdfViewer 수정 | `PdfViewer.jsx` | learning-study-agent |
| MenteeStudy 연동 | `MenteeStudyRefactored.jsx` | learning-study-agent |

### 5.4 Phase 4: 테스트 (0.5일)

| 작업 | 파일 |
|------|------|
| 단위 테스트 | `src/utils/__tests__/storage.test.js` |
| E2E 테스트 | `tests/e2e-issue202-pdf-storage.spec.js` |

---

## 6. 영향 분석

### 6.1 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `ContentInputPanel.jsx` | Supabase Storage 업로드 추가 |
| `PdfViewer.jsx` | Storage URL 지원 |
| `MenteeStudyRefactored.jsx` | storagePath prop 전달 |
| `database/migrations/` | 스키마 마이그레이션 추가 |

### 6.2 신규 파일

| 파일 | 내용 |
|------|------|
| `src/utils/storage.js` | Supabase Storage 유틸리티 |
| `src/utils/__tests__/storage.test.js` | 단위 테스트 |

### 6.3 의존성

- `@supabase/supabase-js` (이미 설치됨)
- 추가 패키지 없음

---

## 7. 위험 및 완화

| 위험 | 영향 | 완화 방안 |
|------|------|----------|
| Storage 용량 초과 | 업로드 실패 | 파일 크기 제한 (50MB), 주기적 정리 |
| 업로드 실패 | UX 저하 | 재시도 로직, 에러 메시지 |
| CORS 오류 | PDF 열람 불가 | Supabase 버킷 public 설정 |

---

## 8. 대안 검토

| 옵션 | 장점 | 단점 | 선택 |
|------|------|------|------|
| **Supabase Storage** | 기존 인프라 활용, 무료 1GB | 용량 제한 | ✅ 선택 |
| Cloudflare R2 | 무제한, S3 호환 | 추가 설정 필요 | ❌ |
| PostgreSQL BLOB | 별도 스토리지 불필요 | 성능 저하 | ❌ |
| PDF 압축 후 저장 | 용량 절약 | 복잡도 증가, 품질 손실 | ❌ |

---

## 9. 체크리스트

### 구현 전

- [ ] Supabase Dashboard에서 `pdfs` 버킷 생성
- [ ] 버킷 Public 설정 확인
- [ ] RLS 정책 SQL 준비

### 구현 중

- [ ] storage.js 유틸리티 작성
- [ ] ContentInputPanel 업로드 로직 추가
- [ ] PdfViewer Storage URL 지원
- [ ] 마이그레이션 스크립트 작성

### 구현 후

- [ ] 단위 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 실제 PDF 업로드/열람 테스트
- [ ] CLAUDE.md 업데이트

---

## 10. 참고 자료

- [Supabase Storage Docs](https://supabase.com/docs/guides/storage)
- [Supabase Storage Pricing](https://supabase.com/pricing) - Free: 1GB, 2GB/월 egress
- [PRD-0012: Context API 기반 퀴즈 생성](./0012-context-api-quiz-generation.md)
- [Issue #200: Context API 퀴즈 생성](https://github.com/garimto81/ggp-ojt-v2/issues/200)
