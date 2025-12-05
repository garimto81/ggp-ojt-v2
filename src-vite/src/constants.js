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

// === WEBLLM CONFIG (PRD-0007) ===
export const WEBLLM_CONFIG = {
  // Available models for browser-based LLM
  MODELS: {
    'qwen-2.5-3b': {
      id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
      name: 'Qwen 2.5 3B',
      size: '2.4GB',
      koreanQuality: 5, // 1-5 rating
      description: '한국어 최적화, 권장',
    },
    'gemma-3-2b': {
      id: 'gemma-2-2b-it-q4f16_1-MLC',
      name: 'Gemma 2 2B',
      size: '1.5GB',
      koreanQuality: 4,
      description: '경량 모델, 저사양 기기용',
    },
  },
  DEFAULT_MODEL: 'qwen-2.5-3b',

  // Storage keys
  STORAGE_KEYS: {
    PREFERRED_ENGINE: 'ojt_preferred_ai_engine', // 'gemini' | 'webllm'
    SELECTED_MODEL: 'ojt_webllm_model',
    MODEL_CACHED: 'ojt_webllm_cached',
  },

  // Generation settings (matches Gemini for consistency)
  GENERATION: {
    temperature: 0.3,
    maxTokens: 8192,
  },
};
