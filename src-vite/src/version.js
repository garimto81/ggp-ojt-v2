// OJT Master - Centralized Version Management (Issue #82)
// Single Source of Truth for application version

/**
 * Application version - Update this when releasing new versions
 * Format: MAJOR.MINOR.PATCH (Semantic Versioning)
 * - MAJOR: Breaking changes
 * - MINOR: New features (backwards compatible)
 * - PATCH: Bug fixes
 */
export const APP_VERSION = '2.13.2';

/**
 * Application name
 */
export const APP_NAME = 'OJT Master';

/**
 * Build information object for comprehensive version details
 */
export const BUILD_INFO = {
  version: APP_VERSION,
  name: APP_NAME,
  description: 'AI 기반 신입사원 온보딩 교육 시스템',
  engine: 'Local AI / WebLLM',
};

/**
 * Get formatted version string for display
 * @param {boolean} includeEngine - Include AI engine info
 * @returns {string} Formatted version string
 */
export function getVersionString(includeEngine = true) {
  return includeEngine ? `v${APP_VERSION} (${BUILD_INFO.engine})` : `v${APP_VERSION}`;
}
