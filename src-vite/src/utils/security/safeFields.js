// OJT Master - Safe Fields Configuration (Issue #132)
// API 응답에서 반환해도 안전한 필드 목록
// 민감 정보 노출 방지를 위해 select('*') 대신 명시적 필드 사용

/**
 * Users 테이블에서 안전하게 조회할 수 있는 필드
 * 주의: 새 필드 추가 시 보안 검토 필요
 */
export const SAFE_USER_FIELDS = [
  'id',
  'name',
  'email', // 표시용, 민감하지 않음
  'role',
  'department',
  'status', // pending, approved, rejected
  'is_active',
  'created_at',
  'updated_at',
];

/**
 * OJT 문서 테이블에서 안전하게 조회할 수 있는 필드
 */
export const SAFE_DOC_FIELDS = [
  'id',
  'title',
  'team',
  'team_id',
  'step',
  'sections',
  'quiz',
  'author_id',
  'author_name',
  'status',
  'estimated_minutes',
  'source_type',
  'source_url',
  'source_file',
  'created_at',
  'updated_at',
];

/**
 * Learning Records 테이블에서 안전하게 조회할 수 있는 필드
 */
export const SAFE_LEARNING_RECORD_FIELDS = [
  'id',
  'user_id',
  'doc_id',
  'score',
  'total_questions',
  'passed',
  'completed_at',
];

/**
 * Supabase select 쿼리용 필드 문자열 생성
 * @param {string[]} fields - 필드 배열
 * @returns {string} 쉼표로 구분된 필드 문자열
 */
export function toSelectString(fields) {
  return fields.join(', ');
}

// Pre-built select strings for convenience
export const USER_SELECT = toSelectString(SAFE_USER_FIELDS);
export const DOC_SELECT = toSelectString(SAFE_DOC_FIELDS);
export const LEARNING_RECORD_SELECT = toSelectString(SAFE_LEARNING_RECORD_FIELDS);
