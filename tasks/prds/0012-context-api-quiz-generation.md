# PRD-0012: Context API 기반 원본 콘텐츠 + 퀴즈 생성

> **Issue**: #200
> **Status**: Draft
> **Author**: Claude Code
> **Created**: 2025-12-11
> **Priority**: High
> **Version**: 1.0.0

## 1. 개요

### 1.1 배경

현재 OJT Master는 모든 입력 타입(텍스트, URL, PDF)에 대해 동일한 처리 방식을 적용합니다:
1. 콘텐츠 추출 (텍스트화)
2. Gemini API로 섹션 정제 + 퀴즈 생성
3. 정제된 콘텐츠로 학습

이 방식의 문제점:
- **원본 손실**: PDF의 이미지/표/차트가 텍스트 추출 과정에서 손실
- **레이아웃 손실**: 원본 문서의 시각적 구조 파괴
- **CORS 복잡성**: URL 텍스트 추출을 위한 프록시 필요
- **불필요한 변환**: URL/PDF는 원본 그대로 보여주는 것이 더 효과적

### 1.2 목표

**입력 타입별 차별화된 처리**:
1. **텍스트**: Gemini가 콘텐츠 정제 + 퀴즈 생성 (기존 유지)
2. **URL**: 원본 그대로 표시 + Gemini URL Context Tool로 퀴즈만 생성
3. **PDF**: 원본 그대로 표시 + Gemini Files API로 퀴즈만 생성

### 1.3 핵심 변경

| 입력 | AS-IS | TO-BE |
|------|-------|-------|
| 텍스트 | Gemini → sections + quiz | 변경 없음 |
| URL | 텍스트 추출 → Gemini | **URL Context Tool → quiz only** |
| PDF | pdfjs 추출 → Gemini | **Files API → quiz only** |

---

## 2. 아키텍처

### 2.1 전체 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                      입력 타입별 처리 플로우                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 텍스트 입력                                                     │
│     rawText → Gemini API → sections[] + quiz[]                     │
│                    ↓                                                │
│     DB: sections + quiz                                            │
│     학습: SectionViewer                                            │
│                                                                     │
│  2. URL 입력                                                        │
│     URL → Gemini URL Context Tool → quiz[] only                    │
│                    ↓                                                │
│     DB: source_url + quiz (sections = null)                        │
│     학습: iframe / 새 탭                                            │
│                                                                     │
│  3. PDF 입력                                                        │
│     ├─ 온라인 URL → URL Context Tool → quiz[]                      │
│     │                    ↓                                         │
│     │     DB: source_url + quiz                                    │
│     │     학습: embed / iframe                                     │
│     │                                                              │
│     └─ 로컬 파일 → R2 업로드 + Files API → quiz[]                  │
│                    ↓                                                │
│          DB: source_file + quiz                                    │
│          학습: react-pdf 뷰어                                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Block Agent 구조

```
features/
├── ai/
│   └── agents/
│       ├── gemini/                    # 기존 (텍스트 정제 + 퀴즈)
│       │   ├── index.js
│       │   ├── client.js
│       │   ├── prompts.js
│       │   ├── parser.js
│       │   └── validator.js
│       │
│       └── context-quiz/              # 신규 Agent
│           ├── index.js               # 진입점
│           ├── url-context.js         # URL Context Tool
│           ├── file-upload.js         # Files API 업로드
│           ├── quiz-generator.js      # 퀴즈 전용 생성
│           └── quiz-generator.test.js # 테스트
│
├── content/
│   └── create/
│       └── components/
│           └── ContentInputPanel.jsx  # 수정: 입력 타입별 분기
│
└── learning/
    └── study/
        └── components/
            ├── MenteeStudy.jsx        # 수정: 원본 뷰어 분기
            ├── UrlViewer.jsx          # 신규: iframe/새탭
            └── PdfViewer.jsx          # 수정: 로컬 PDF 지원
```

---

## 3. 기능 요구사항

### 3.1 FR-201-1: URL Context Tool 통합

#### API 호출

```javascript
// features/ai/agents/context-quiz/url-context.js

export async function generateQuizFromUrl(url, options = {}) {
  const { quizCount = 10 } = options;

  const response = await fetch(
    `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: QUIZ_ONLY_PROMPT.replace('{quizCount}', quizCount)
                                  .replace('{url}', url)
          }]
        }],
        tools: [{ url_context: {} }],  // URL Context Tool 활성화
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = await response.json();
  return parseQuizResponse(data);
}
```

#### 지원 콘텐츠

| 타입 | 지원 | 비고 |
|------|------|------|
| 웹페이지 (HTML) | ✅ | |
| PDF URL | ✅ | 공개 접근 가능한 URL |
| 이미지 URL | ✅ | PNG, JPEG, WebP |
| 비공개 URL | ❌ | 인증 필요한 경우 불가 |

### 3.2 FR-201-2: Files API 통합 (로컬 PDF)

#### 파일 업로드

```javascript
// features/ai/agents/context-quiz/file-upload.js

export async function uploadToGeminiFiles(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${GEMINI_CONFIG.API_KEY}`,
    {
      method: 'POST',
      body: formData
    }
  );

  const { file: uploaded } = await response.json();
  return uploaded.uri;  // 48시간 유효
}
```

#### 퀴즈 생성

```javascript
// features/ai/agents/context-quiz/quiz-generator.js

export async function generateQuizFromFile(fileUri, options = {}) {
  const { quizCount = 10, mimeType = 'application/pdf' } = options;

  const response = await fetch(
    `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { file_uri: fileUri, mime_type: mimeType } },
            { text: QUIZ_ONLY_PROMPT.replace('{quizCount}', quizCount) }
          ]
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: 'application/json'
        }
      })
    }
  );

  const data = await response.json();
  return parseQuizResponse(data);
}
```

### 3.3 FR-201-3: 원본 뷰어 컴포넌트

#### URL 뷰어

```jsx
// features/learning/study/components/UrlViewer.jsx

export function UrlViewer({ url, title }) {
  const [iframeBlocked, setIframeBlocked] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* 헤더 */}
      <div className="flex items-center justify-between p-3 bg-gray-50 border-b">
        <span className="text-sm text-gray-600 truncate flex-1">
          🔗 {url}
        </span>
        <button
          onClick={() => window.open(url, '_blank')}
          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          새 탭에서 열기
        </button>
      </div>

      {/* iframe 또는 차단 메시지 */}
      {iframeBlocked ? (
        <div className="flex-1 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <p className="text-gray-600 mb-4">이 사이트는 iframe을 차단했습니다.</p>
            <button
              onClick={() => window.open(url, '_blank')}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg"
            >
              새 탭에서 열기
            </button>
          </div>
        </div>
      ) : (
        <iframe
          src={url}
          className="flex-1 w-full border-0"
          onError={() => setIframeBlocked(true)}
          sandbox="allow-same-origin allow-scripts allow-popups"
        />
      )}
    </div>
  );
}
```

#### PDF 뷰어 (로컬 파일)

```jsx
// features/learning/study/components/PdfViewer.jsx (수정)

export function PdfViewer({ source }) {
  // source_url (온라인) 또는 source_file (R2 업로드)
  const pdfUrl = source.source_url || source.source_file;

  return (
    <div className="h-full">
      <embed
        src={pdfUrl}
        type="application/pdf"
        className="w-full h-full"
      />
    </div>
  );
}
```

### 3.4 FR-201-4: ContentInputPanel 분기 로직

```javascript
// handleGenerate 함수 수정

const handleGenerate = async () => {
  setIsProcessing(true);

  try {
    let result;

    switch (inputType) {
      case 'text':
        // 기존: 정제 + 퀴즈
        result = await generateOJTContent(rawInput, inputTitle);
        break;

      case 'url':
        // 신규: URL Context Tool
        setProcessingStatus('URL에서 퀴즈 생성 중...');
        const urlQuiz = await generateQuizFromUrl(urlInput);
        result = {
          title: inputTitle || extractTitleFromUrl(urlInput),
          source_type: 'url',
          source_url: urlInput,
          sections: null,
          quiz: urlQuiz
        };
        break;

      case 'pdf':
        if (isPdfUrl(pdfInput)) {
          // 온라인 PDF
          setProcessingStatus('PDF URL에서 퀴즈 생성 중...');
          const pdfUrlQuiz = await generateQuizFromUrl(pdfInput);
          result = {
            title: inputTitle,
            source_type: 'pdf',
            source_url: pdfInput,
            sections: null,
            quiz: pdfUrlQuiz
          };
        } else {
          // 로컬 PDF
          setProcessingStatus('PDF 업로드 중...');
          const r2Url = await uploadToR2(selectedPdf);

          setProcessingStatus('PDF에서 퀴즈 생성 중...');
          const fileUri = await uploadToGeminiFiles(selectedPdf);
          const fileQuiz = await generateQuizFromFile(fileUri);

          result = {
            title: inputTitle || selectedPdf.name,
            source_type: 'pdf',
            source_file: r2Url,
            sections: null,
            quiz: fileQuiz
          };
        }
        break;
    }

    onDocumentsGenerated([result]);

  } catch (error) {
    Toast.error(`오류: ${error.message}`);
  } finally {
    setIsProcessing(false);
  }
};
```

---

## 4. 데이터베이스

### 4.1 스키마 변경

```sql
-- ojt_docs 테이블 수정
-- sections 컬럼을 nullable로 변경

ALTER TABLE ojt_docs
  ALTER COLUMN sections DROP NOT NULL;

-- 기존 컬럼 확인 (이미 있을 수 있음)
-- source_type: 'manual' | 'url' | 'pdf'
-- source_url: URL 원본 주소
-- source_file: PDF 파일 URL (R2)
```

### 4.2 데이터 예시

| source_type | sections | source_url | source_file | quiz |
|-------------|----------|------------|-------------|------|
| manual | [...] | null | null | [...] |
| url | null | https://... | null | [...] |
| pdf | null | https://...pdf | null | [...] |
| pdf | null | null | https://r2/...pdf | [...] |

---

## 5. 프롬프트 설계

### 5.1 퀴즈 전용 프롬프트

```javascript
// features/ai/agents/context-quiz/prompts.js

export const QUIZ_ONLY_PROMPT = `
당신은 교육 콘텐츠 전문가입니다.
제공된 콘텐츠를 읽고 신입사원용 4지선다 퀴즈를 생성해주세요.

## 퀴즈 생성 규칙
1. {quizCount}개의 문제 생성
2. 난이도 분포: 쉬움 30% / 중간 50% / 어려움 20%
3. 유형 분포: 기억형 40% / 이해형 35% / 적용형 25%
4. 오답은 그럴듯하게 작성 (함정 보기)
5. 정답 인덱스는 0-3 랜덤 배치

## 출력 형식 (JSON)
{
  "quiz": [
    {
      "question": "질문 텍스트",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "correctIndex": 0,
      "explanation": "정답 해설",
      "difficulty": "easy|medium|hard",
      "category": "recall|comprehension|application"
    }
  ]
}

콘텐츠 URL: {url}
`;
```

---

## 6. Block Agent 설계

### 6.1 context-quiz-agent

| 항목 | 내용 |
|------|------|
| **이름** | context-quiz-agent |
| **경로** | `features/ai/agents/context-quiz/` |
| **책임** | URL/PDF 원본 기반 퀴즈 전용 생성 |
| **의존성** | Gemini API (URL Context Tool, Files API) |

### 6.2 파일 구조

```
features/ai/agents/context-quiz/
├── index.js               # 진입점, 타입별 라우팅
├── url-context.js         # URL Context Tool 호출
├── file-upload.js         # Gemini Files API 업로드
├── quiz-generator.js      # 퀴즈 생성 로직
├── prompts.js             # 퀴즈 전용 프롬프트
├── parser.js              # 응답 파싱
└── __tests__/
    ├── url-context.test.js
    ├── file-upload.test.js
    └── quiz-generator.test.js
```

### 6.3 인터페이스

```typescript
// 타입 정의 (JSDoc)

/**
 * @typedef {Object} QuizQuestion
 * @property {string} question
 * @property {string[]} options - 4개 선택지
 * @property {number} correctIndex - 0-3
 * @property {string} explanation
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {'recall'|'comprehension'|'application'} category
 */

/**
 * @typedef {Object} QuizGenerationResult
 * @property {QuizQuestion[]} quiz
 * @property {number} generatedAt - timestamp
 * @property {string} source - 'url_context' | 'files_api'
 */
```

---

## 7. 구현 계획

### Phase 1: context-quiz-agent 구현 (1일)

| 작업 | 파일 | 설명 |
|------|------|------|
| URL Context Tool | url-context.js | URL 기반 퀴즈 생성 |
| Files API 업로드 | file-upload.js | 로컬 파일 업로드 |
| 퀴즈 생성기 | quiz-generator.js | 파일 기반 퀴즈 생성 |
| 프롬프트 | prompts.js | 퀴즈 전용 프롬프트 |
| 단위 테스트 | __tests__/*.test.js | 각 모듈 테스트 |

### Phase 2: ContentInputPanel 수정 (0.5일)

| 작업 | 설명 |
|------|------|
| 입력 타입별 분기 | text/url/pdf 처리 로직 분리 |
| PDF URL 감지 | http로 시작하는 .pdf URL 감지 |
| 상태 표시 | 각 단계별 진행 상태 표시 |

### Phase 3: 원본 뷰어 구현 (0.5일)

| 작업 | 설명 |
|------|------|
| UrlViewer | iframe + 새 탭 폴백 |
| PdfViewer 수정 | source_url/source_file 분기 |
| MenteeStudy 분기 | source_type별 뷰어 선택 |

### Phase 4: 테스트 및 검증 (1일)

| 작업 | 설명 |
|------|------|
| E2E 테스트 | URL/PDF 퀴즈 생성 플로우 |
| 통합 테스트 | 전체 학습 플로우 |
| 성능 테스트 | 대용량 PDF 처리 시간 |

**총 예상 소요 시간**: 3일

---

## 8. 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| iframe 차단 (X-Frame-Options) | URL 원본 표시 불가 | "새 탭에서 열기" 폴백 |
| Gemini Files API 48시간 제한 | 파일 URI 만료 | R2에 별도 보관 |
| URL Context Tool 비용 | API 비용 증가 | 캐싱 고려 (향후) |
| 비공개 PDF URL | 접근 불가 | 로컬 업로드로 안내 |

---

## 9. 성공 지표

| 지표 | 목표 | 측정 |
|------|------|------|
| URL 퀴즈 생성 성공률 | > 95% | 다양한 사이트 테스트 |
| PDF 퀴즈 생성 성공률 | > 95% | 다양한 PDF 테스트 |
| 퀴즈 품질 | 기존 대비 동등 | validator 검증 |
| 원본 뷰어 작동률 | > 80% | iframe 차단율 측정 |

---

## 10. 참조

### 관련 이슈

- #198: PDF 업로드 및 URL 텍스트 추출 기능 복원/완성
- #200: WebLLM 제거, Gemini 단일 엔진 전환
- #201: Context API 기반 퀴즈 생성 (예정)

### 외부 문서

- [Gemini URL Context Tool](https://developers.googleblog.com/en/url-context-tool-for-gemini-api-now-generally-available/)
- [Gemini Files API](https://ai.google.dev/api/files)
- [Gemini Document Processing](https://ai.google.dev/gemini-api/docs/document-processing)
- [Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching)

---

## 11. 승인

| 역할 | 이름 | 승인일 |
|------|------|--------|
| 작성자 | Claude Code | 2025-12-11 |
| 검토자 | - | - |
| 승인자 | - | - |
