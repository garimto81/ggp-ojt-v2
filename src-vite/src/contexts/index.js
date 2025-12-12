// OJT Master v2.9.0 - Contexts Index
// Block Agent System v1.1.0 - Barrel exports (하위호환 유지)

// Auth (auth-agent) - 로컬 파일 유지 (features와 동기화 필요)
export { AuthProvider, useAuth } from './AuthContext';

// Docs (content-manage-agent) - 로컬 파일 유지
export { DocsProvider, useDocs } from './DocsContext';

// Toast (shared) - 공유 Context
export { ToastProvider, useToast, Toast } from './ToastContext';

// AI (ai-agent) - 로컬 파일 유지
export { AIProvider, useAI } from './AIContext';

// Version (버전 자동 업데이트)
export { VersionProvider, useVersion } from './VersionContext';

// Departments (#178 - 부서 관리 정규화)
export { DepartmentsProvider, useDepartments } from './DepartmentsContext';
