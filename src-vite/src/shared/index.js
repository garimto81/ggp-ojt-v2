/**
 * Shared - 공유 유틸리티 및 컴포넌트
 *
 * 모든 feature에서 공유되는 코드
 * - contexts: Toast 등 공통 Context
 * - utils: Supabase, Dexie, helpers
 * - components/ui: 공통 UI 컴포넌트
 * - layouts: Header 등 레이아웃
 */

// Contexts
export { ToastProvider, useToast } from './contexts/ToastContext';

// Utils
export { supabase } from './utils/supabaseClient';
export { localDb } from './utils/db';
export { shuffleArray, formatDate, formatDuration } from './utils/helpers';
export { logger } from './utils/logger';

// UI Components
export { Spinner } from './components/ui/Spinner';
export { EmptyState } from './components/ui/EmptyState';

// Layouts
export { Header } from './layouts/Header';
