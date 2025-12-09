# 05. Tech Stack & Architecture

> **Parent**: [Master PRD](./00-master-prd.md) | **Version**: 3.0.0

## 5.1 Tech Stack Overview

| Layer | Technology | Version | Purpose |
|-------|------------|---------|---------|
| **Frontend** | React | 19.x | UI Framework |
| | Vite | 7.x | Build Tool |
| | Dexie.js | 4.x | IndexedDB (오프라인 캐시) |
| | Chart.js | 4.x | 대시보드 차트 |
| | Quill | 2.x | Rich Text Editor |
| **AI** | Gemini API | 2.0-flash | Primary AI Engine |
| | WebLLM | 0.2.x | Browser-side LLM (fallback) |
| **Backend** | Supabase | - | PostgreSQL + Auth + RLS |
| **Storage** | Cloudflare R2 | - | 이미지/PDF 저장 |
| **PDF** | pdfjs-dist | 5.x | PDF 텍스트 추출 |
| **Hosting** | Vercel | - | 정적 사이트 호스팅 |

---

## 5.2 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Client (Browser)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   React     │  │   Dexie.js  │  │   WebLLM    │                 │
│  │   19 + Vite │  │  IndexedDB  │  │  (Optional) │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
│         │                │                │                        │
│         └────────────────┼────────────────┘                        │
│                          │                                         │
└──────────────────────────┼─────────────────────────────────────────┘
                           │
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         External Services                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  Supabase   │  │  Gemini API │  │ Cloudflare  │  │  Vercel   │ │
│  │  (BaaS)     │  │  (AI)       │  │  R2         │  │  (Host)   │ │
│  ├─────────────┤  └─────────────┘  └─────────────┘  └───────────┘ │
│  │ PostgreSQL  │                                                   │
│  │ Auth        │                                                   │
│  │ RLS         │                                                   │
│  │ Realtime    │                                                   │
│  └─────────────┘                                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5.3 Frontend Architecture

### Component Structure

```
src/
├── components/           # UI 컴포넌트
│   ├── AdminDashboard.jsx
│   ├── MentorDashboard.jsx
│   ├── MenteeList.jsx
│   ├── MenteeStudy.jsx
│   ├── Header.jsx
│   ├── AIEngineSelector.jsx
│   ├── PdfViewer.jsx
│   └── ui/              # 공통 UI
│       ├── Spinner.jsx
│       └── EmptyState.jsx
├── contexts/            # React Context
│   ├── AuthContext.jsx  # 인증 상태
│   ├── AIContext.jsx    # AI 엔진 상태
│   ├── DocsContext.jsx  # 문서 상태
│   └── ToastContext.jsx # 알림
├── utils/               # 유틸리티
│   ├── api.js           # API 호출
│   ├── db.js            # Dexie.js (로컬 DB)
│   ├── webllm.js        # WebLLM 래퍼
│   ├── cors-proxy.js    # CORS 프록시
│   └── helpers.js       # 헬퍼 함수
├── constants.js         # 설정값
├── App.jsx              # 메인 앱
└── main.jsx             # 엔트리포인트
```

### State Management

```jsx
// Provider 계층
<QueryClientProvider>      // React Query (optional)
  <ToastProvider>          // 알림
    <AuthProvider>         // 인증
      <AIProvider>         // AI 엔진
        <DocsProvider>     // 문서
          <App />
        </DocsProvider>
      </AIProvider>
    </AuthProvider>
  </ToastProvider>
</QueryClientProvider>
```

---

## 5.4 AI Engine Configuration

### Gemini API (Primary)

```javascript
// constants.js
export const GEMINI_CONFIG = {
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY,
  MODEL: 'gemini-2.0-flash-exp',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};

// API 호출
const response = await fetch(
  `${GEMINI_CONFIG.API_URL}/${GEMINI_CONFIG.MODEL}:generateContent?key=${GEMINI_CONFIG.API_KEY}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  }
);
```

### WebLLM (Fallback)

```javascript
// constants.js
export const WEBLLM_CONFIG = {
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  FALLBACK_MODEL: 'gemma-2-2b-it-q4f16_1-MLC',
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
};

// WebGPU 지원 확인
const isWebGPUSupported = 'gpu' in navigator;
```

---

## 5.5 Data Flow

### Online Flow

```
User Action → React Component → Context/Hook
                                    │
                                    ▼
                              Supabase API
                                    │
                                    ▼
                              PostgreSQL
                                    │
                                    ▼
                              Response → State Update → UI
```

### Offline Flow (Dexie.js)

```
User Action → React Component → Context/Hook
                                    │
                                    ▼
                              Dexie.js (IndexedDB)
                                    │
                                    ├─ (Online) → Sync to Supabase
                                    │
                                    └─ (Offline) → Queue in sync_queue
```

---

## 5.6 Build & Deploy

### Vite Configuration

```javascript
// vite.config.js
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@contexts': '/src/contexts',
      '@utils': '/src/utils',
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
```

### Vercel Deployment

```json
// vercel.json
{
  "buildCommand": "cd src-vite && npm install && npm run build",
  "outputDirectory": "src-vite/dist",
  "framework": "vite",
  "rewrites": [{ "source": "/(.*)", "destination": "/" }]
}
```

---

## 5.7 Environment Variables

```bash
# .env (local development)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_GEMINI_API_KEY=AIza...
VITE_R2_WORKER_URL=https://ojt-r2-upload.xxx.workers.dev

# Vercel Environment Variables (production)
# Settings > Environment Variables에서 설정
```

---

## 5.8 Browser Support

| Browser | Version | WebLLM | Notes |
|---------|---------|--------|-------|
| Chrome | 113+ | ✅ | 권장 |
| Edge | 113+ | ✅ | Chrome 기반 |
| Firefox | 120+ | ⚠️ | WebGPU 제한적 |
| Safari | 17+ | ❌ | WebGPU 미지원 |
| Mobile | - | ❌ | WebGPU 미지원 |

---

## Related Documents

- [AI Content Generation](./03-features/03-01-ai-content.md)
- [Database Schema](./04-database/04-01-schema.md)
- [API Specification](./06-api-spec.md)
