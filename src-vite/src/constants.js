// OJT Master v2.13.0 - Constants and Configuration (Local AI + WebLLM)

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
// 2025년 11월 이후 신규 프로젝트: VITE_SUPABASE_PUBLISHABLE_KEY 사용
// 레거시 프로젝트: VITE_SUPABASE_ANON_KEY 계속 사용 가능
export const SUPABASE_CONFIG = {
  URL: import.meta.env.VITE_SUPABASE_URL || '',
  // 신규 publishable key 우선, 없으면 레거시 anon key 사용
  ANON_KEY:
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '',
};

// R2 Upload configuration
export const R2_CONFIG = {
  WORKER_URL: import.meta.env.VITE_R2_WORKER_URL || 'https://ojt-r2-upload.your-worker.workers.dev',
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'],
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

// AI Engine configuration (Local AI + WebLLM, Issue #101)
export const AI_ENGINE_CONFIG = {
  // 엔진 우선순위: localai > webllm > fallback
  ENGINES: {
    LOCAL_AI: 'localai', // 사내 vLLM 서버 (최우선)
    WEBLLM: 'webllm', // WebLLM fallback (브라우저)
  },
  // 기본 엔진 (자동 선택)
  DEFAULT_ENGINE: 'auto',
  // 로컬 스토리지 키
  STORAGE_KEY: 'ojt_ai_engine',
};

// Local AI configuration (Issue #101)
export const LOCAL_AI_CONFIG = {
  // 생성 파라미터
  TEMPERATURE: 0.3,
  MAX_TOKENS: 4096,
  // 기본 모델
  MODEL_NAME: 'Qwen/Qwen3-4B',
  // 타임아웃 (ms)
  TIMEOUT: 60000,
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

// Role-based color system (Issue #91)
// Admin=Purple (authority), Mentor=Blue (trust), Mentee=Green (growth)
export const ROLE_COLORS = {
  [ROLES.ADMIN]: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
    primary: 'purple-600',
  },
  [ROLES.MENTOR]: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    primary: 'blue-600',
  },
  [ROLES.MENTEE]: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-700',
    badge: 'bg-green-100 text-green-700 border-green-200',
    primary: 'green-600',
  },
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
