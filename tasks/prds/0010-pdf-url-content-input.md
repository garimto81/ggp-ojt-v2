# PRD-0010: PDF/URL 콘텐츠 입력 기능 완성

> **Issue**: #198
> **Status**: Draft
> **Author**: Claude Code
> **Created**: 2025-12-11
> **Priority**: High

## 1. 개요

### 1.1 배경

OJT Master의 Mentor Dashboard에서 교육 콘텐츠를 생성할 때 3가지 입력 방식을 지원해야 합니다:
- **텍스트**: ✅ 완전 구현됨
- **URL**: ⚠️ 로직 구현됨, 검증 필요
- **PDF**: ❌ 플레이스홀더만 (구현 필요)

### 1.2 목표

1. PDF 파일 업로드 및 텍스트 추출 기능 완성
2. URL 텍스트 추출 기능 검증 및 안정화
3. 통합 테스트 커버리지 확보

### 1.3 기존 리소스

| 구성요소 | 상태 | 파일 |
|----------|------|------|
| `pdfjs-dist` | ✅ 설치됨 (v5.4.449) | package.json |
| `react-pdf` | ✅ 설치됨 | package.json |
| PdfViewer.jsx | ✅ 구현됨 (뷰어) | features/content/create/components/ |
| cors-proxy.js | ✅ 구현됨 | utils/ |
| ContentInputPanel.jsx | ⚠️ PDF 플레이스홀더 | features/content/create/components/ |
| PDF_CONFIG | ✅ 설정됨 | constants.js |
| CORS_CONFIG | ✅ 설정됨 | constants.js |

---

## 2. 기능 요구사항

### 2.1 PDF 업로드 기능 (FR-198-1)

#### 2.1.1 파일 선택 UI

```jsx
// ContentInputPanel.jsx - PDF 모드
{inputType === 'pdf' && (
  <div className="space-y-4">
    <input
      type="file"
      accept=".pdf,application/pdf"
      onChange={handlePdfSelect}
      className="hidden"
      id="pdf-upload"
      ref={pdfInputRef}
    />
    <label
      htmlFor="pdf-upload"
      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                 hover:border-blue-400 hover:bg-blue-50 transition block"
    >
      {selectedPdf ? (
        <div className="text-gray-700">
          <span className="font-medium">{selectedPdf.name}</span>
          <span className="text-gray-500 ml-2">
            ({(selectedPdf.size / 1024 / 1024).toFixed(2)} MB)
          </span>
        </div>
      ) : (
        <div className="text-gray-500">
          PDF 파일을 선택하거나 드래그하세요
        </div>
      )}
    </label>
  </div>
)}
```

#### 2.1.2 파일 검증

| 항목 | 제한 | 에러 메시지 |
|------|------|-------------|
| 파일 형식 | `.pdf`, `application/pdf` | "PDF 파일만 업로드 가능합니다" |
| 파일 크기 | 최대 50MB | "파일 크기가 50MB를 초과합니다" |
| 페이지 수 | 최대 100페이지 | "100페이지 이하 PDF만 지원합니다" |

#### 2.1.3 텍스트 추출 함수

```javascript
// utils/pdf.js (신규)
import * as pdfjsLib from 'pdfjs-dist';

// Worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_CONFIG.WORKER_SRC;

/**
 * PDF 파일에서 텍스트 추출
 * @param {File} file - PDF 파일 객체
 * @param {Function} onProgress - 진행률 콜백 (0-100)
 * @returns {Promise<{text: string, pages: number, wasTruncated: boolean}>}
 */
export async function extractPdfText(file, onProgress) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = Math.min(pdf.numPages, PDF_CONFIG.MAX_PAGES);
  let fullText = '';

  for (let i = 1; i <= totalPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map(item => item.str)
      .join(' ');
    fullText += pageText + '\n\n';

    onProgress?.(Math.round((i / totalPages) * 100));
  }

  const maxLength = CONFIG.MAX_URL_EXTRACT_CHARS;
  return {
    text: fullText.substring(0, maxLength),
    pages: totalPages,
    wasTruncated: fullText.length > maxLength,
    originalLength: fullText.length,
  };
}
```

### 2.2 URL 텍스트 추출 기능 (FR-198-2)

#### 2.2.1 현재 구현 상태

```
extractUrlText() in api.js
    │
    └─► fetchWithCorsProxy() in cors-proxy.js
           │
           ├─ 1차: R2 Worker 프록시 (자체 서버)
           ├─ 2차: allorigins.win
           └─ 3차: corsproxy.io
```

#### 2.2.2 검증 필요 항목

| 항목 | 확인 내용 | 테스트 방법 |
|------|----------|-------------|
| R2 Worker | 프록시 응답 정상 | 실제 URL 테스트 |
| 폴백 체인 | 3단계 폴백 동작 | 각 프록시 비활성화 테스트 |
| 메타데이터 | title, description 추출 | 다양한 사이트 테스트 |
| 텍스트 추출 | 본문 정확도 | 복잡한 레이아웃 테스트 |
| 15000자 제한 | 잘림 처리 | 대용량 페이지 테스트 |

### 2.3 source_type 필드 저장 (FR-198-3)

```javascript
// 생성된 문서에 source 정보 포함
const doc = {
  ...generatedContent,
  source_type: inputType === 'url' ? 'url' : inputType === 'pdf' ? 'pdf' : 'manual',
  source_url: inputType === 'url' ? urlInput.trim() : null,
  source_file: inputType === 'pdf' ? selectedPdf?.name : null,
};
```

---

## 3. 기술 설계

### 3.1 Make vs Buy 분석

| 옵션 | 장점 | 단점 | 결정 |
|------|------|------|------|
| **pdfjs-dist (직접 사용)** | 이미 설치됨, 완전 제어 | 약간의 코드 필요 | ✅ 채택 |
| react-pdftotext | 간단한 API | 추가 의존성 | ❌ |
| pdf-parse | Node.js용 | 브라우저 미지원 | ❌ |

**결론**: 이미 설치된 `pdfjs-dist`를 직접 사용 (추가 의존성 없음)

### 3.2 파일 구조

```
src/
├── utils/
│   ├── pdf.js              # 신규: PDF 텍스트 추출
│   ├── cors-proxy.js       # 기존: URL CORS 프록시
│   └── api.js              # 기존: extractUrlText()
├── features/content/create/
│   ├── components/
│   │   ├── ContentInputPanel.jsx  # 수정: PDF 업로드 UI
│   │   └── PdfViewer.jsx          # 기존: PDF 미리보기
│   └── constants.js               # 기존: PDF_CONFIG
```

### 3.3 상태 관리

```javascript
// ContentInputPanel.jsx 추가 상태
const [selectedPdf, setSelectedPdf] = useState(null);     // File 객체
const [pdfText, setPdfText] = useState('');               // 추출된 텍스트
const [pdfProgress, setPdfProgress] = useState(0);        // 추출 진행률
const [pdfPreview, setPdfPreview] = useState(false);      // 미리보기 모달
```

---

## 4. UI/UX 설계

### 4.1 PDF 업로드 플로우

```
[PDF 버튼 클릭]
    │
    ▼
[파일 선택 영역 표시]
    │
    ├── 클릭 또는 드래그
    │
    ▼
[파일 검증]
    │
    ├── 실패 → Toast 에러
    │
    ▼
[미리보기 표시 (PdfViewer)]
    │
    ├── "텍스트 추출" 버튼
    │
    ▼
[텍스트 추출 (진행률 표시)]
    │
    ▼
[rawInput에 텍스트 설정]
    │
    ▼
[AI 생성 버튼 활성화]
```

### 4.2 UI 목업

```
┌─────────────────────────────────────────────────────┐
│ 콘텐츠 입력                                          │
├─────────────────────────────────────────────────────┤
│ [텍스트] [URL] [PDF ●]                              │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │  📄 report.pdf (2.5 MB)                         │ │
│ │  ─────────────────────────────────────          │ │
│ │  [미리보기] [텍스트 추출]                        │ │
│ └─────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│ 추출된 텍스트: 15,000자 (100페이지 중 50페이지)      │
├─────────────────────────────────────────────────────┤
│ [☁️ AI로 교육 자료 생성]                            │
└─────────────────────────────────────────────────────┘
```

---

## 5. 테스트 계획

### 5.1 단위 테스트 (Vitest)

| 테스트 | 파일 | 설명 |
|--------|------|------|
| extractPdfText | pdf.test.js | PDF 텍스트 추출 함수 |
| ContentInputPanel | ContentInputPanel.test.jsx | ✅ 21개 테스트 완료 |
| fetchWithCorsProxy | cors-proxy.test.js | CORS 프록시 폴백 |

### 5.2 E2E 테스트 (Playwright)

| 테스트 | 파일 | 설명 |
|--------|------|------|
| PDF 업로드 플로우 | e2e-issue198-content-input.spec.js | 파일 선택 → 추출 → 생성 |
| URL 추출 플로우 | e2e-issue198-content-input.spec.js | URL 입력 → 추출 → 생성 |
| source_type 저장 | e2e-issue198-content-input.spec.js | DB 저장 검증 |

### 5.3 테스트 시나리오

#### PDF 업로드 시나리오

```gherkin
Scenario: PDF 파일에서 텍스트 추출
  Given Mentor가 콘텐츠 입력 패널에 있다
  When PDF 탭을 클릭한다
  And 유효한 PDF 파일을 업로드한다
  Then 파일 정보가 표시된다
  When "텍스트 추출" 버튼을 클릭한다
  Then 진행률이 표시된다
  And 추출된 텍스트가 표시된다
  When "AI로 교육 자료 생성" 버튼을 클릭한다
  Then 문서가 source_type='pdf'로 생성된다
```

---

## 6. 구현 계획

### Phase 1: PDF 텍스트 추출 (1일)

1. `utils/pdf.js` 생성 - `extractPdfText()` 함수
2. `ContentInputPanel.jsx` 수정 - 파일 선택 UI
3. 단위 테스트 작성

### Phase 2: PDF 업로드 통합 (0.5일)

1. 파일 검증 로직 추가
2. 진행률 표시 UI
3. PdfViewer 미리보기 연동

### Phase 3: URL 기능 검증 (0.5일)

1. R2 Worker 프록시 테스트
2. 폴백 체인 검증
3. 다양한 사이트 테스트

### Phase 4: 통합 테스트 (1일)

1. E2E 테스트 실행 (Docker 환경)
2. source_type 저장 검증
3. 버그 수정 및 안정화

**총 예상 소요 시간**: 3일

---

## 7. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| 대용량 PDF 메모리 | 브라우저 크래시 | Web Worker 사용, 페이지 제한 |
| 이미지 전용 PDF | 텍스트 추출 불가 | 경고 메시지 표시 |
| CORS 프록시 장애 | URL 추출 실패 | 3단계 폴백 체인 |
| Worker 버전 불일치 | PDF 로드 실패 | CDN 버전 고정 |

---

## 8. 성공 지표

| 지표 | 목표 | 측정 방법 |
|------|------|----------|
| PDF 텍스트 추출 성공률 | > 95% | 테스트 케이스 |
| URL 텍스트 추출 성공률 | > 90% | 다양한 사이트 테스트 |
| 단위 테스트 커버리지 | > 80% | Vitest coverage |
| E2E 테스트 통과율 | 100% | Playwright |

---

## 9. 참조

### 관련 이슈

- #198: PDF 업로드 및 URL 텍스트 추출 기능 복원/완성 (현재)
- #34: URL/PDF 입력 시 source_url/source_file 저장 (Closed)
- #36: PDF 업로드 기능 구현 (Closed)
- #46: URL/PDF 기능 최적화 및 UI 개선 (Closed)

### 참조 문서

- [PDF.js Text Extraction](https://www.nutrient.io/blog/how-to-extract-text-from-a-pdf-using-javascript/)
- [react-pdftotext](https://dev.to/utkarsh212/how-to-extract-plain-text-from-pdf-in-react-2afl)
- [CORS Proxy Solutions](https://corsfix.com/)
- [PDF.js React Discussion](https://github.com/wojtekmaj/react-pdf/discussions/1411)

---

## 10. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| 작성자 | Claude Code | 2025-12-11 |
| 검토자 | - | - |
| 승인자 | - | - |
