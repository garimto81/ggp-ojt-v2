// OJT Master - Version Information
// Single source of truth for version display
//
// 2.17.1 (181c482) - 2025-12-10
//   - fix(docs): 저장 데이터 타입 검증 및 디버깅 로그 강화 (#188)
// 2.17.0 - 2025-12-10
//   - fix(auth): RLS 정책 위반 에러 핸들링 및 세션 관리 개선 (#188, #189, #190)
//   - fix(docs): created_at 타입 오류 수정 (Date.now() → ISO 문자열)
// 2.16.4 (6dcccc6) - 2025-12-09
//   - fix(admin): 사용자 관리 탭에서 admin_settings 부서 목록 로드 (#176, #177)
// 2.16.3 (b76abd7) - 2025-12-09
//   - docs: CLAUDE.md 문서 개선
// 2.16.2 (afbf8a2) - 2025-12-09
//   - feat(admin): 사용자 관리창에 역할/부서 컬러 뱃지 적용 (#174)
// 2.16.1 (463748b) - 2025-12-09
//   - fix(ux): Header 역할/부서 컬러 뱃지 (#172, #173)
//   - feat: 버전 표시에 커밋 해시 추가, version.js 도입

export const APP_VERSION = '2.17.1';
export const BUILD_HASH = '181c482';
export const BUILD_SUMMARY = '타입 검증 강화';
export const BUILD_DATE = '2025-12-10';
