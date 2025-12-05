// OJT Master v2.3.0 - Constants and Configuration

export const CONFIG = {
  // Time limits
  STEP_TIME_LIMIT: 40, // minutes per step
  CHARS_PER_MINUTE: 500, // reading speed

  // Content extraction
  MAX_URL_EXTRACT_CHARS: 15000,

  // Quiz settings
  QUIZ_PASS_THRESHOLD: 3, // 3/4 to pass
  QUIZ_QUESTIONS_PER_TEST: 4,
  QUIZ_TOTAL_POOL: 20,

  // AI settings
  AI_RETRY_TIMEOUT: 30000,
  AI_TEMPERATURE: 0.3,
  AI_MAX_TOKENS: 8192,

  // Security
  ALLOWED_ORIGINS: [
    'https://ggp-ojt-v2.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173', // Vite dev server
  ],

  // Session
  SESSION_EXPIRY_MS: 30 * 60 * 1000, // 30 minutes
};

// Supabase configuration
export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL || '',
  ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

// Gemini API configuration
export const GEMINI_CONFIG = {
  API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
  MODEL: 'gemini-2.0-flash-exp',
  API_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
};

// R2 Upload configuration
export const R2_CONFIG = {
  WORKER_URL: import.meta.env.VITE_R2_WORKER_URL || 'https://ojt-r2-upload.your-worker.workers.dev',
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
};

// CORS Proxies for URL extraction
// Note: corsproxy.io returns 403, use alternatives
export const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://api.codetabs.com/v1/proxy?quest=',
];

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  MENTOR: 'mentor',
  MENTEE: 'mentee',
};

// View states
export const VIEW_STATES = {
  LOADING: 'loading',
  ROLE_SELECT: 'role_select',
  ADMIN_DASHBOARD: 'admin_dashboard',
  MENTOR_DASHBOARD: 'mentor_dashboard',
  MENTEE_LIST: 'mentee_list',
  MENTEE_STUDY: 'mentee_study',
};

// Role to view mapping
export const ROLE_VIEW_MAP = {
  [ROLES.ADMIN]: VIEW_STATES.ADMIN_DASHBOARD,
  [ROLES.MENTOR]: VIEW_STATES.MENTOR_DASHBOARD,
  [ROLES.MENTEE]: VIEW_STATES.MENTEE_LIST,
};

// === CORS PROXY CONFIG (PRD-0008) ===
export const CORS_CONFIG = {
  // 자체 Worker 프록시 (R2 Worker 통합)
  WORKER_PROXY: import.meta.env.VITE_R2_WORKER_URL
    ? `${import.meta.env.VITE_R2_WORKER_URL}/proxy`
    : null,
  // 폴백 프록시 (외부 서비스)
  FALLBACK_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest=',
  ],
  // 요청 타임아웃 (15초)
  TIMEOUT: 15000,
};

// === PDF CONFIG (PRD-0008) ===
export const PDF_CONFIG = {
  // 최대 파일 크기 (50MB)
  MAX_SIZE: 50 * 1024 * 1024,
  // 뷰어 설정
  VIEWER: {
    DEFAULT_SCALE: 1.0,
    MIN_SCALE: 0.5,
    MAX_SCALE: 3.0,
    SCALE_STEP: 0.25,
  },
  // OCR 설정 (Phase 2)
  OCR: {
    ENABLED: false,
    LANGUAGES: ['kor', 'eng'],
  },
};
