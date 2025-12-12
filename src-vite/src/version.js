// OJT Master - Version Information
// Single source of truth for version display
//
// 2.32.0 - 2025-12-12
//   - feat(ui): shadcn/ui 컴포넌트 시스템 구현 (PRD-0015)
//   - Button, Card, Input, Badge, Table, Select, Progress, StatsCard 추가
//   - AdminDashboard, Header에 새 컴포넌트 적용
// 2.31.0 - 2025-12-12
//   - feat: 버전 자동 업데이트 시스템 추가
//   - 캐시 삭제 없이 새 버전 감지 및 Toast 알림
//   - VersionContext, vite-plugin-version 도입
// 2.30.0 - 2025-12-12
//   - feat(design): 톤앤매너 가이드라인 시스템 적용 (PRD-0014) (#225)
//   - 디자인 토큰 (색상, 타이포그래피) 정의
//   - Toast, EmptyState 컴포넌트 리디자인
// 2.29.0 - 2025-12-12
//   - feat: 퀴즈 없는 문서 열람 완료 기능 (#223) (#224)
//   - 퀴즈 없는 문서도 "열람 완료" 버튼으로 학습 완료 처리
// 2.28.0 - 2025-12-12
//   - fix: 학습 완료 판단 로직 단순화 (#221) (#222)
//   - learning_records.passed만으로 완료 여부 판단
// 2.27.0 - 2025-12-11
//   - feat(content): AI 분석 없이 원본 저장 기능 (#219)
//   - skipAiAnalysis 토글로 텍스트/URL/PDF 원본 그대로 저장
//   - 퀴즈 없이 학습 자료만 등록 가능
// 2.26.0 - 2025-12-11
//   - feat(ocr): 이미지 PDF OCR 지원 (#217)
//   - Tesseract.js v6 도입 (한글+영어 지원)
//   - 텍스트 레이어 없는 PDF 자동 감지 및 OCR fallback
// 2.25.0 - 2025-12-11
//   - fix(content): PDF 학습 시 원본 PDF 직접 표시 (#211)
//   - PDF도 URL과 동일하게 퀴즈만 생성 (섹션 없음)
//   - SectionViewer에 PDF embed 뷰어 추가
// 2.24.1 - 2025-12-11
//   - fix(storage): 한글 파일명 PDF 업로드 오류 수정 (#213)
//   - Storage key를 ASCII only로 생성 (Supabase 호환)
// 2.24.0 - 2025-12-11
//   - fix(content): URL 학습 시 원본 페이지 직접 표시 (#211)
//   - URL은 텍스트 추출 없이 퀴즈만 생성
//   - 학습 뷰어에서 iframe으로 원본 URL 직접 표시
//   - generateUrlQuizOnly, createUrlQuizOnlyPrompt 추가
// 2.23.0 - 2025-12-11
//   - refactor(content): URL 처리를 PDF와 동일한 패턴으로 통합 (#211)
//   - 입력 타입별 처리 블록 분리 (PDF/URL/텍스트)
// 2.22.0 - 2025-12-11
//   - fix(content): URL 프로토콜 자동 추가 (#208)
//   - fix(content): 생성 후 자동 저장 (#209)
//   - fix(ai): Gemini 응답 team/title 필드 기본값 설정
// 2.21.0 - 2025-12-11
//   - feat(ux): PDF 자동 텍스트 추출 (#206)
//   - 생성 시점에 자동 추출, 수동 버튼 제거
// 2.20.0 - 2025-12-11
//   - feat(storage): PDF Supabase Storage 저장 (#202)
//   - fix(pdf): PDF.js Worker 버전 불일치 수정 (#204)
// 2.19.1 - 2025-12-11
//   - fix(ai): Gemini 모델 gemini-2.5-flash-lite로 변경 (#200)
//   - -exp 모델의 낮은 할당량 문제 해결 (Stable 모델 전환)
//   - 최저가 + 높은 할당량 + 빠른 응답 속도
// 2.19.0 - 2025-12-11
//   - refactor(ai): WebLLM 완전 제거, Gemini 단일 엔진 전환 (#200)
//   - @mlc-ai/web-llm 의존성 제거 (5.5MB 번들 감소)
//   - AIContext, ContentInputPanel 단순화
//   - Header AI 상태 표시 개선 (Gemini 전용)
// 2.18.0 - 2025-12-11
//   - feat(content): PDF 업로드 및 텍스트 추출 기능 구현 (#198)
//   - pdfjs-dist를 활용한 브라우저 내 PDF 텍스트 추출
//   - 파일 검증, 진행률 표시, 메타데이터 추출 지원
//   - source_type='pdf' 저장으로 콘텐츠 출처 추적
// 2.17.8 - 2025-12-10
//   - fix(admin): 부서 동기화 문제 해결 (#178)
//   - 설정 탭에서 부서 생성 후 사용자 탭에서 즉시 반영
//   - visibilitychange 이벤트로 탭 전환 시 부서 재로드
// 2.17.7 - 2025-12-10
//   - fix(db): users.is_active 컬럼 마이그레이션 추가 (#196)
//   - fix(docs): ai_processed, ai_error 필드도 DB 저장 시 제거
//   - fix(learning): completed_at ISO 문자열로 통일
//   - Supabase 스키마 vs 코드 전체 검증 완료
// 2.17.6 - 2025-12-10
//   - fix(docs): ai_engine 필드 DB 저장 시 제거 (#195)
//   - 스키마에 없는 필드로 인한 저장 실패 해결
// 2.17.5 - 2025-12-10
//   - fix(db): audit_logs SELECT RLS 정책 추가 (#192)
//   - fix(db): audit_logs CHECK 제약조건에 SETTINGS_UPDATE 추가 (#193)
//   - fix(lint): ESLint __dirname, global, 호이스팅 에러 수정 (#194)
//   - chore: 린트 에러 0개 달성
// 2.17.4 - 2025-12-10
//   - fix(admin): audit_logs CHECK 제약조건 준수 (DOC_UPDATE 사용)
//   - fix(admin): event_type UPPERCASE 통일 및 DB 제약조건 매핑
//   - docs: RLS 정책 Supabase CLI 검증 완료
// 2.17.3 - 2025-12-10
//   - fix(admin): audit_logs 실제 스키마 적용 (event_type, table_name, metadata)
//   - fix(admin): content_reports 테이블 누락 graceful 처리
//   - 전체 DB 스키마 vs 코드 검증 완료
// 2.17.2 - 2025-12-10
//   - fix(admin): admin_logs → audit_logs 테이블 참조 수정 (#191)
//   - fix(admin): 설정 탭 404 에러 graceful 처리
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

export const APP_VERSION = '2.32.0';
export const BUILD_HASH = '730f37f';
export const BUILD_SUMMARY = 'shadcn/ui 컴포넌트 시스템';
export const BUILD_DATE = '2025-12-12';
