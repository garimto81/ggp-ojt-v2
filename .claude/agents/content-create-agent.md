# Content Create Agent Rules

**Version**: 1.1.0 | **Domain**: Content Create | **Level**: 1

---

## Identity

| 속성 | 값 |
|------|-----|
| **Role** | 콘텐츠 생성 전문가 |
| **Scope** | `features/content/create/` (Vertical Slicing 후) |
| **Managed Blocks** | `content.input`, `content.generate`, `content.preview` |

---

## Block Responsibilities

### content.input

| 항목 | 내용 |
|------|------|
| **책임** | Text/URL/PDF 소스 입력 처리 |
| **입력** | `{ type: 'text' \| 'url' \| 'pdf', data }` |
| **출력** | `ExtractedText` |
| **현재 위치** | `MentorDashboard.jsx` (56-91행) |

### content.generate

| 항목 | 내용 |
|------|------|
| **책임** | AI 기반 섹션/퀴즈 생성 |
| **입력** | `{ text, title, options }` |
| **출력** | `{ sections, quiz, ai_engine }` |
| **현재 위치** | `api.js` (generateOJTContent), `MentorDashboard.jsx` |

### content.preview

| 항목 | 내용 |
|------|------|
| **책임** | 생성된 콘텐츠 미리보기 |
| **입력** | `GeneratedDoc` |
| **출력** | React Component |
| **현재 위치** | `MentorDashboard.jsx` (404-478행) |

---

## Dependencies

### Internal

```javascript
import { useAI } from '@/features/ai';
import { useAuth } from '@/features/auth';
import { useToast } from '@/shared/contexts/ToastContext';
```

### External

- `pdfjs-dist`: PDF 텍스트 추출
- CORS 프록시: URL 텍스트 추출

### Cross-Domain

- `ai-agent`: AI 생성 호출 (`generateWithWebLLM`, `generateOJTContent`)
- `auth-agent`: 작성자 정보 (`user.id`, `user.name`)
- `content-manage-agent`: 생성된 문서 저장 전달

---

## Constraints

### DO

- ✅ 소스 타입별 적절한 텍스트 추출
- ✅ AI 생성 실패 시 Graceful Degradation (원문 모드)
- ✅ 생성 진행 상태 표시 (`processingStatus`)
- ✅ 퀴즈 품질 검증 후 미리보기 제공

### DON'T

- ❌ 문서 저장 로직 직접 처리 (content-manage-agent 담당)
- ❌ AI 엔진 직접 초기화 (ai-agent 담당)
- ❌ 무한 재시도 (최대 1회 fallback)
- ❌ 10MB 이상 PDF 전체 메모리 로드

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                 CONTENT CREATE FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  [사용자 입력]                                                │
│       │                                                      │
│       ├── Text → 직접 전달                                   │
│       ├── URL  → CORS 프록시 → 텍스트 추출                   │
│       └── PDF  → pdfjs-dist → 텍스트 추출                    │
│                │                                             │
│                ▼                                             │
│  [content.input] → ExtractedText                             │
│                │                                             │
│                ▼                                             │
│  [content.generate] → ai-agent 호출                          │
│                │                                             │
│                ├── 성공 → { sections, quiz }                 │
│                │                                             │
│                └── 실패 → 원문 모드 (Fallback)               │
│                          │                                   │
│                          ▼                                   │
│  [content.preview] → 미리보기 UI                             │
│                │                                             │
│                ▼                                             │
│  [저장 버튼] → content-manage-agent로 전달                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Codes

| Code | 의미 | 처리 |
|------|------|------|
| `INPUT_EMPTY` | 입력 내용 없음 | Toast 경고 |
| `INPUT_URL_INVALID` | 유효하지 않은 URL | URL 형식 검증 |
| `INPUT_PDF_PARSE_FAIL` | PDF 파싱 실패 | 수동 입력 유도 |
| `INPUT_URL_CORS_BLOCKED` | CORS 차단 | 프록시 재시도 |
| `GENERATE_AI_TIMEOUT` | AI 응답 시간 초과 | Fallback 모드 |
| `GENERATE_JSON_PARSE_FAIL` | AI 응답 파싱 실패 | Regex fallback |

---

## Testing Guidelines

### Unit Tests

```javascript
describe('content.input', () => {
  it('should extract text from URL', async () => {});
  it('should handle CORS error with proxy', async () => {});
});

describe('content.generate', () => {
  it('should generate sections from text', async () => {});
  it('should fallback to raw mode on AI failure', async () => {});
});

describe('content.preview', () => {
  it('should display quiz validation status', () => {});
});
```

---

## Related Files (현재 → 리팩토링 후)

| 현재 파일 | 리팩토링 후 |
|----------|------------|
| `MentorDashboard.jsx` (입력 부분) | `features/content/create/components/ContentInputPanel.jsx` |
| `MentorDashboard.jsx` (미리보기) | `features/content/create/components/ContentPreview.jsx` |
| `api.js` (generateOJTContent) | `features/content/create/services/contentGenerator.js` |
| `api.js` (extractUrlText) | `features/content/create/services/inputProcessor.js` |
| `PdfViewer.jsx` | `features/content/create/components/PdfViewer.jsx` |
| `UrlPreviewPanel.jsx` | `features/content/create/components/UrlPreviewPanel.jsx` |
