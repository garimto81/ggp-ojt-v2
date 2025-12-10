// OJT Master - Supabase Client (Issue #59)
// Supabase 싱글톤 클라이언트

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CONFIG } from '../constants';

// Validate Supabase URL at startup (Issue #52)
if (typeof window !== 'undefined') {
  const supabaseUrl = SUPABASE_CONFIG.URL;

  if (!supabaseUrl) {
    console.error('[Supabase] VITE_SUPABASE_URL is not set. Please check your .env file.');
  } else if (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1')) {
    console.warn(
      '[Supabase] URL is pointing to localhost:',
      supabaseUrl,
      '\nIf this is unexpected, try:\n' +
        '1. Clear browser cache\n' +
        '2. Delete node_modules/.vite folder\n' +
        '3. Restart dev server with: npm run dev'
    );
  } else {
    console.info('[Supabase] Connected to:', supabaseUrl);
  }
}

// Initialize Supabase client with session auto-refresh (Issue #188)
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY, {
  auth: {
    autoRefreshToken: true, // 토큰 자동 갱신
    persistSession: true, // 세션 localStorage 저장
    detectSessionInUrl: true, // OAuth 리다이렉트 시 URL에서 세션 감지
  },
});

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
