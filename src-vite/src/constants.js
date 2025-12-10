// OJT Master v2.4.0 - Constants and Configuration

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

  // Security - Vercel Deployment
  ALLOWED_ORIGINS: [
    'https://ggp-ojt-v2.vercel.app', // Production
    'https://ggp-ojt-v2-*.vercel.app', // Preview deployments
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

// CORS Proxies for URL extraction (fallback only)
export const CORS_PROXIES = ['https://api.allorigins.win/raw?url=', 'https://corsproxy.io/?'];

// CORS Proxy configuration (FR-801)
export const CORS_CONFIG = {
  // 자체 R2 Worker 프록시 사용 (constants.js의 R2_CONFIG.WORKER_URL + /proxy)
  USE_SELF_PROXY: true,
  // 타임아웃 (ms)
  TIMEOUT: 10000,
  // 캐시 TTL (초)
  CACHE_TTL: 300,
};

// WebLLM configuration (Issue #30, #45)
export const WEBLLM_CONFIG = {
  // 기본 모델 (한국어 우수, 2.4GB)
  DEFAULT_MODEL: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
  // 대안 모델 (저사양용, 1.8GB)
  FALLBACK_MODEL: 'gemma-2-2b-it-q4f16_1-MLC',
  // AI 생성 파라미터
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
  // 사용 가능한 모델 목록
  AVAILABLE_MODELS: [
    {
      id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      name: 'Qwen 2.5 3B',
      size: '2.4GB',
      recommended: true,
      description: '한국어 우수, 권장',
    },
    {
      id: 'gemma-2-2b-it-q4f16_1-MLC',
      name: 'Gemma 2 2B',
      size: '1.8GB',
      recommended: false,
      description: '저사양 기기용',
    },
    {
      id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
      name: 'Llama 3.2 3B',
      size: '2.1GB',
      recommended: false,
      description: '영어 중심',
    },
  ],
};

// AI Engine configuration
export const AI_ENGINE_CONFIG = {
  // 기본 엔진: 'gemini' | 'webllm'
  DEFAULT_ENGINE: 'gemini',
  // WebLLM 실패 시 Gemini로 폴백
  FALLBACK_ENABLED: true,
  // 로컬 스토리지 키
  STORAGE_KEY: 'ojt_ai_engine',
};

// PDF Viewer configuration (FR-802)
export const PDF_CONFIG = {
  // react-pdf worker
  WORKER_SRC: 'https://unpkg.com/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs',
  // 최대 페이지 수 (메모리 제한)
  MAX_PAGES: 100,
  // 기본 확대 배율
  DEFAULT_SCALE: 1.0,
  // 확대/축소 단계
  SCALE_STEP: 0.25,
  MIN_SCALE: 0.5,
  MAX_SCALE: 3.0,
};

// Role definitions
export const ROLES = {
  ADMIN: 'admin',
  MENTOR: 'mentor',
  MENTEE: 'mentee',
};

// Role-based theme configuration (Issue #170)
// 역할별 시각적 구분을 위한 컬러 테마
export const ROLE_THEMES = {
  [ROLES.ADMIN]: {
    // Rose/Red 계열 - 관리자 권한 강조
    primary: 'rose',
    header: 'bg-rose-50 border-rose-200',
    headerText: 'text-rose-800',
    accent: 'bg-rose-500',
    accentHover: 'hover:bg-rose-600',
    badge: 'bg-rose-100 text-rose-700',
    border: 'border-rose-300',
    ring: 'ring-rose-500',
  },
  [ROLES.MENTOR]: {
    // Blue 계열 - 전문성/신뢰 강조
    primary: 'blue',
    header: 'bg-blue-50 border-blue-200',
    headerText: 'text-blue-800',
    accent: 'bg-blue-500',
    accentHover: 'hover:bg-blue-600',
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-300',
    ring: 'ring-blue-500',
  },
  [ROLES.MENTEE]: {
    // Green 계열 - 성장/학습 강조
    primary: 'green',
    header: 'bg-green-50 border-green-200',
    headerText: 'text-green-800',
    accent: 'bg-green-500',
    accentHover: 'hover:bg-green-600',
    badge: 'bg-green-100 text-green-700',
    border: 'border-green-300',
    ring: 'ring-green-500',
  },
};

// Default theme (for unauthenticated or unknown roles)
export const DEFAULT_THEME = {
  primary: 'gray',
  header: 'bg-white border-gray-200',
  headerText: 'text-gray-800',
  accent: 'bg-gray-500',
  accentHover: 'hover:bg-gray-600',
  badge: 'bg-gray-100 text-gray-700',
  border: 'border-gray-300',
  ring: 'ring-gray-500',
};

// Department-based theme configuration (Issue #170)
// 부서별 시각적 구분을 위한 컬러 테마
export const DEPARTMENT_THEMES = {
  개발팀: {
    badge: 'bg-indigo-100 text-indigo-700',
    border: 'border-indigo-300',
  },
  디자인팀: {
    badge: 'bg-pink-100 text-pink-700',
    border: 'border-pink-300',
  },
  기획팀: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-300',
  },
  마케팅팀: {
    badge: 'bg-orange-100 text-orange-700',
    border: 'border-orange-300',
  },
  운영팀: {
    badge: 'bg-teal-100 text-teal-700',
    border: 'border-teal-300',
  },
  인사팀: {
    badge: 'bg-cyan-100 text-cyan-700',
    border: 'border-cyan-300',
  },
};

// Default department theme
export const DEFAULT_DEPARTMENT_THEME = {
  badge: 'bg-gray-100 text-gray-600',
  border: 'border-gray-200',
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
