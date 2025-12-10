/**
 * AI Feature - AI 엔진 관리
 * @agent ai-agent
 * @blocks ai.engine, ai.generate
 *
 * ⚠️ IMPORTANT: Context는 src/contexts/에서 re-export
 * - 중복 Context 인스턴스 방지 (Issue #182)
 * - Single Source of Truth 패턴 적용
 */

// Hooks - src/contexts에서 re-export (SSOT 패턴)
export { useAI, AIProvider } from '@/contexts/AIContext';

// Components (default export를 named export로 re-export)
export { default as AIEngineSelector } from './components/AIEngineSelector';

// Services (리팩토링 후 추가)
// export { chromeAI } from './services/chromeAI';
// export { webllm } from './services/webllm';
