/**
 * AI Feature - AI 엔진 관리 (Gemini Only)
 * @agent ai-agent
 * @blocks ai.engine, ai.generate
 * @issue #200 - WebLLM 제거, Gemini 단일 엔진
 *
 * ⚠️ IMPORTANT: Context는 src/contexts/에서 re-export
 * - 중복 Context 인스턴스 방지 (Issue #182)
 * - Single Source of Truth 패턴 적용
 */

// Hooks - src/contexts에서 re-export (SSOT 패턴)
export { useAI, AIProvider } from '@/contexts/AIContext';
