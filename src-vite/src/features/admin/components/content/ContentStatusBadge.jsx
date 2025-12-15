// ContentStatusBadge.jsx - 콘텐츠 상태 배지 컴포넌트

const STATUS_CONFIG = {
  draft: {
    label: '임시저장',
    className: 'bg-blue-100 text-blue-800',
    icon: '🔵',
  },
  review: {
    label: '검토대기',
    className: 'bg-orange-100 text-orange-800',
    icon: '🟠',
  },
  published: {
    label: '게시됨',
    className: 'bg-green-100 text-green-800',
    icon: '🟢',
  },
  hidden: {
    label: '숨김',
    className: 'bg-gray-100 text-gray-800',
    icon: '⚫',
  },
};

export default function ContentStatusBadge({ status, showIcon = false }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.draft;

  return (
    <span
      role="status"
      aria-label={`상태: ${config.label}`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.className}`}
    >
      {showIcon && <span aria-hidden="true">{config.icon}</span>}
      {config.label}
    </span>
  );
}

export { STATUS_CONFIG };
