// OJT Master - Empty State Component (Issue #139)
// Design System: PRD-0014 톤앤매너 가이드라인

/**
 * EmptyState - 빈 상태 UI 컴포넌트
 * PRD-0014: "데이터 없음" → "아직 ~가 없어요" 패턴 적용
 *
 * @param {Object} props
 * @param {string} props.title - 제목 (따뜻한 톤)
 * @param {string} props.description - 설명 (격려하는 톤)
 * @param {string} [props.icon] - 아이콘 타입 (document, search, user, learning, quiz, default)
 * @param {React.ReactNode} [props.action] - 액션 버튼/링크
 * @param {string} [props.variant] - 스타일 변형 (default, subtle)
 */
export default function EmptyState({
  title = '아직 데이터가 없어요',
  description = '',
  icon = 'default',
  action = null,
  variant = 'default',
}) {
  const icons = {
    document: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
    ),
    search: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    ),
    user: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
        />
      </svg>
    ),
    learning: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
        />
      </svg>
    ),
    quiz: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    ),
    default: (
      <svg className="h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    ),
  };

  // variant에 따른 스타일
  const containerStyles = {
    default: 'bg-gradient-to-b from-gray-50 to-white rounded-2xl border border-gray-100',
    subtle: '',
  };

  return (
    <div
      className={`flex flex-col items-center justify-center px-6 py-16 text-center ${containerStyles[variant]}`}
    >
      {/* 아이콘 - Primary 색상의 연한 배경 */}
      <div className="bg-primary-50 mb-6 flex h-24 w-24 items-center justify-center rounded-full">
        <div className="text-primary-400">{icons[icon] || icons.default}</div>
      </div>

      {/* 제목 - 따뜻하고 격려하는 톤 */}
      <h3 className="mb-2 text-xl font-semibold text-gray-800">{title}</h3>

      {/* 설명 */}
      {description && <p className="mb-6 max-w-sm text-base text-gray-500">{description}</p>}

      {/* 액션 버튼 */}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
