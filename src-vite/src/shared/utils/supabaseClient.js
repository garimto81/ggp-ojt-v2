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

// Initialize Supabase client (singleton)
export const supabase = createClient(SUPABASE_CONFIG.URL, SUPABASE_CONFIG.ANON_KEY);

// Make supabase available globally for db.js
if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
