/**
 * Content Create - AI 콘텐츠 생성
 * @agent content-create-agent
 * @blocks content.input, content.generate, content.preview
 *
 * Block Agent System v1.1.0
 */

// Main Components (Refactored)
export { default as ContentInputPanel } from './components/ContentInputPanel';
export { default as GeneratedDocsPreview } from './components/GeneratedDocsPreview';
export { default as MentorDashboard } from './components/MentorDashboardRefactored';

// Sub-components
export { default as UrlPreviewPanel } from './components/UrlPreviewPanel';
export { default as SplitViewLayout } from './components/SplitViewLayout';

// Legacy (하위호환용 - 점진적 제거 예정)
// export { default as MentorDashboardLegacy } from './components/MentorDashboard';
// export { default as PdfViewer } from './components/PdfViewer'; // react-pdf 필요
