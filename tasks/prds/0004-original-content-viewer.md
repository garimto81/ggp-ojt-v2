# PRD-0004: 원문 뷰어 + 퀴즈 출제 시스템

## 1. 개요

### 1.1 목적
PDF/URL 원문을 그대로 표시하고, Gemini URL Context Tool을 활용하여 퀴즈만 자동 생성하는 시스템으로 전환

### 1.2 배경
- **현재 문제점**:
  - PDF/URL 텍스트 추출 후 AI가 "요약/재생성"하여 원문 손실
  - 이미지, 표, 레이아웃 등 시각적 요소 무시
  - CORS 프록시 의존으로 일부 사이트 접근 불가

- **해결책**:
  - 원문을 그대로 뷰어로 표시
  - Gemini URL Context Tool로 직접 URL/PDF 분석하여 퀴즈만 생성
  - 텍스트 추출 로직 제거로 코드 간소화

### 1.3 범위
- URL 원문 뷰어 (새 탭 또는 iframe)
- PDF 원문 뷰어 (PDF.js 기반)
- Gemini URL Context Tool 연동
- 데이터 구조 변경

---

## 2. 요구사항

### 2.1 기능 요구사항

#### FR-001: URL 자료 등록
- **설명**: Mentor가 URL을 입력하면 원문 URL 저장 + 퀴즈 자동 생성
- **입력**: URL 문자열
- **처리**:
  1. URL 유효성 검증
  2. Gemini URL Context Tool로 퀴즈 20개 생성
  3. source_type='url', source_url 저장
- **출력**: ojt_docs 레코드 생성

#### FR-002: PDF 자료 등록
- **설명**: Mentor가 PDF 업로드하면 R2 저장 + 퀴즈 자동 생성
- **입력**: PDF 파일
- **처리**:
  1. PDF를 Cloudflare R2에 업로드
  2. 공개 URL 획득
  3. Gemini URL Context Tool로 퀴즈 20개 생성
  4. source_type='pdf', source_file 저장
- **출력**: ojt_docs 레코드 생성

#### FR-003: URL 원문 뷰어
- **설명**: Mentee가 URL 자료의 원문을 볼 수 있음
- **구현 옵션**:
  - A) 새 탭에서 열기 (window.open)
  - B) x-frame-bypass 컴포넌트
- **우선순위**: 새 탭 열기 (100% 호환)

#### FR-004: PDF 원문 뷰어
- **설명**: Mentee가 PDF 자료의 원문을 볼 수 있음
- **구현**:
  - iframe + PDF.js 뷰어
  - `https://mozilla.github.io/pdf.js/web/viewer.html?file={R2_URL}`
- **대안**: react-pdf 라이브러리

#### FR-005: 퀴즈 응시
- **설명**: 기존 퀴즈 응시 기능 유지
- **변경 없음**: 현재 구현 그대로 사용

### 2.2 비기능 요구사항

#### NFR-001: 성능
- 퀴즈 생성 시간: 30초 이내
- PDF 업로드: 10MB 이내

#### NFR-002: 보안
- R2 업로드된 PDF는 공개 URL이지만 추측 불가능한 키 사용
- URL 입력 시 SSRF 방어 유지

#### NFR-003: 호환성
- 기존 자료(sections 기반)와 새 자료(source_url/source_file 기반) 공존
- 점진적 마이그레이션 지원

---

## 3. 기술 설계

### 3.1 데이터 구조 변경

```sql
-- ojt_docs 테이블 컬럼 추가
ALTER TABLE ojt_docs ADD COLUMN source_type TEXT; -- 'url', 'pdf', 'manual'
ALTER TABLE ojt_docs ADD COLUMN source_url TEXT;  -- URL인 경우 원본 URL
ALTER TABLE ojt_docs ADD COLUMN source_file TEXT; -- PDF인 경우 R2 URL
```

```javascript
// 새로운 ojt_docs 구조
{
  id: 'uuid',
  title: '자료 제목',
  team: '팀명',
  step: 1,

  // 새로운 필드
  source_type: 'url' | 'pdf' | 'manual',
  source_url: 'https://example.com/article',  // URL인 경우
  source_file: 'https://r2.dev/uploads/xxx.pdf',  // PDF인 경우

  // 기존 필드 (하위 호환)
  sections: [...],  // manual 타입 또는 기존 자료

  // 공통
  quiz: [...],
  estimated_minutes: 10,
  author_id: 'uuid',
  created_at: timestamp
}
```

### 3.2 Gemini URL Context Tool 연동

```javascript
// 새로운 API 호출 방식
async function generateQuizWithUrlContext(url, isPdf = false) {
  const prompt = `
다음 ${isPdf ? 'PDF 문서' : '웹페이지'}를 분석하고 학습 퀴즈를 생성하세요.

URL: ${url}

요구사항:
- 총 20개의 객관식 문제 생성
- 각 문제는 4개의 선택지
- 난이도 분포: 기억형 40%, 이해형 35%, 적용형 25%
- 핵심 내용을 평가하는 문제 위주

JSON 형식으로 출력:
{
  "title": "문서 제목 (자동 추출)",
  "quiz": [
    {
      "question": "문제 내용",
      "options": ["선택지1", "선택지2", "선택지3", "선택지4"],
      "answer": 0,
      "explanation": "정답 설명"
    }
  ],
  "estimated_minutes": 10
}
`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      tools: [{ urlContext: {} }],  // URL Context Tool 활성화
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192
      }
    })
  });

  return await response.json();
}
```

### 3.3 UI 컴포넌트

#### MentorDashboard 변경

```jsx
// 자료 생성 폼
<div className="space-y-4">
  {/* 탭 선택 */}
  <div className="flex gap-2">
    <button onClick={() => setInputMode('url')}>URL 입력</button>
    <button onClick={() => setInputMode('pdf')}>PDF 업로드</button>
    <button onClick={() => setInputMode('manual')}>직접 작성</button>
  </div>

  {/* URL 입력 */}
  {inputMode === 'url' && (
    <input
      type="url"
      placeholder="https://example.com/article"
      value={urlInput}
      onChange={e => setUrlInput(e.target.value)}
    />
  )}

  {/* PDF 업로드 */}
  {inputMode === 'pdf' && (
    <input
      type="file"
      accept=".pdf"
      onChange={handlePdfSelect}
    />
  )}

  <button onClick={handleSubmit}>
    {inputMode === 'manual' ? '자료 생성' : '퀴즈 생성'}
  </button>
</div>
```

#### MenteeStudy 변경

```jsx
// 학습 화면
<div>
  {/* 원문 보기 버튼 */}
  {doc.source_type === 'url' && (
    <button onClick={() => window.open(doc.source_url, '_blank')}>
      원문 보기 (새 탭)
    </button>
  )}

  {doc.source_type === 'pdf' && (
    <button onClick={() => setShowPdfViewer(true)}>
      PDF 보기
    </button>
  )}

  {/* PDF 뷰어 모달 */}
  {showPdfViewer && (
    <Modal onClose={() => setShowPdfViewer(false)}>
      <iframe
        src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(doc.source_file)}`}
        className="w-full h-[80vh]"
      />
    </Modal>
  )}

  {/* 퀴즈 시작 */}
  <button onClick={() => setShowQuiz(true)}>
    퀴즈 시작
  </button>
</div>
```

### 3.4 PDF R2 업로드 확장

```javascript
// 기존 이미지 업로드 함수 확장
async function uploadPdfToR2(file) {
  // 파일 타입 검증
  if (file.type !== 'application/pdf') {
    throw new Error('PDF 파일만 업로드 가능합니다');
  }

  // 파일 크기 검증 (10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('파일 크기는 10MB를 초과할 수 없습니다');
  }

  // R2 Worker에 업로드 (기존 로직 재사용)
  const key = `pdfs/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.pdf`;

  // ... 업로드 로직

  return publicUrl;
}
```

---

## 4. 마이그레이션 전략

### 4.1 하위 호환성
- 기존 자료(sections 기반)는 그대로 표시
- source_type이 없으면 'manual'로 간주
- 점진적 전환 (강제 마이그레이션 없음)

### 4.2 DB 마이그레이션

```sql
-- 1. 컬럼 추가 (nullable)
ALTER TABLE ojt_docs ADD COLUMN source_type TEXT DEFAULT 'manual';
ALTER TABLE ojt_docs ADD COLUMN source_url TEXT;
ALTER TABLE ojt_docs ADD COLUMN source_file TEXT;

-- 2. 기존 데이터 업데이트
UPDATE ojt_docs SET source_type = 'manual' WHERE source_type IS NULL;
```

---

## 5. R2 Worker 수정

### 5.1 PDF 업로드 지원 추가

```javascript
// ojt-r2-upload/src/index.js 수정
const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf'  // PDF 추가
];

const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024,  // 10MB
  pdf: 10 * 1024 * 1024     // 10MB
};
```

---

## 6. 테스트 계획

### 6.1 단위 테스트
- [ ] URL 유효성 검증
- [ ] PDF 업로드 함수
- [ ] Gemini URL Context API 호출

### 6.2 E2E 테스트
- [ ] URL 입력 → 퀴즈 생성 → 원문 보기 → 퀴즈 응시
- [ ] PDF 업로드 → 퀴즈 생성 → PDF 보기 → 퀴즈 응시
- [ ] 기존 자료 호환성 확인

### 6.3 엣지 케이스
- [ ] X-Frame-Options 차단 URL
- [ ] 큰 PDF 파일 (10MB 근처)
- [ ] 한글 URL 인코딩
- [ ] Gemini API 실패 시 재시도

---

## 7. 일정

| 단계 | 작업 | 예상 |
|------|------|------|
| Phase 1 | DB 스키마 변경 + R2 PDF 지원 | - |
| Phase 2 | Gemini URL Context 연동 | - |
| Phase 3 | Mentor UI 변경 | - |
| Phase 4 | Mentee 원문 뷰어 | - |
| Phase 5 | 테스트 + 버그 수정 | - |

---

## 8. 참고 자료

- [Gemini URL Context Tool 공식 문서](https://ai.google.dev/gemini-api/docs/url-context)
- [PDF.js 뷰어](https://mozilla.github.io/pdf.js/)
- [x-frame-bypass](https://github.com/niutech/x-frame-bypass)
- [react-pdf](https://www.npmjs.com/package/react-pdf)

---

## 9. 승인

| 역할 | 이름 | 날짜 | 서명 |
|------|------|------|------|
| 작성자 | Claude | 2025-12-02 | ✅ |
| 검토자 | | | |
| 승인자 | | | |
