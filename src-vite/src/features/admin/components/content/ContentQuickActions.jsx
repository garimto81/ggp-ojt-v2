// ContentQuickActions.jsx - 콘텐츠 인라인 액션 버튼

import { useState } from 'react';

export default function ContentQuickActions({
  doc,
  onPreview,
  onStatusChange,
  onDelete,
  isSelected,
}) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (isDeleting) return;

    // 1단계 확인
    if (!window.confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
      return;
    }

    // 2단계 확인 (제목 입력)
    const userInput = prompt(`삭제하려면 문서 제목을 정확히 입력하세요:\n"${doc.title}"`);
    if (userInput !== doc.title) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDelete(doc.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-2 flex items-center gap-1">
      <button
        onClick={() => onPreview(doc)}
        className={`rounded p-1.5 text-xs transition ${
          isSelected ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
        }`}
        aria-label={`${doc.title} 미리보기`}
        title="미리보기"
      >
        👁️
      </button>

      {doc.status === 'review' && (
        <button
          onClick={() => onStatusChange(doc.id, 'published')}
          className="rounded p-1.5 text-xs text-green-700 transition hover:bg-green-100"
          aria-label={`${doc.title} 게시`}
          title="게시"
        >
          📤
        </button>
      )}

      {doc.status === 'published' && (
        <button
          onClick={() => onStatusChange(doc.id, 'hidden')}
          className="rounded p-1.5 text-xs text-yellow-700 transition hover:bg-yellow-100"
          aria-label={`${doc.title} 숨기기`}
          title="숨기기"
        >
          🙈
        </button>
      )}

      {doc.status === 'hidden' && (
        <button
          onClick={() => onStatusChange(doc.id, 'published')}
          className="rounded p-1.5 text-xs text-green-700 transition hover:bg-green-100"
          aria-label={`${doc.title} 다시 게시`}
          title="다시 게시"
        >
          📤
        </button>
      )}

      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded p-1.5 text-xs text-red-600 transition hover:bg-red-100 disabled:opacity-50"
        aria-label={`${doc.title} 삭제`}
        title="삭제"
      >
        {isDeleting ? '...' : '🗑️'}
      </button>
    </div>
  );
}
