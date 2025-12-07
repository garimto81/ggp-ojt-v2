// ContentPreviewPanel.jsx - 콘텐츠 미리보기 패널 (Split View 오른쪽)

import { useState } from 'react';
import DOMPurify from 'dompurify';
import ContentStatusBadge from './ContentStatusBadge';
import { formatDate, sanitizeText } from '@utils/helpers';

export default function ContentPreviewPanel({
  doc,
  reports,
  onStatusChange,
  onDelete,
  onResolveReport,
}) {
  const [activeTab, setActiveTab] = useState('content'); // content | quiz | reports

  if (!doc) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-4">📄</div>
          <p>왼쪽 목록에서 문서를 선택하세요</p>
        </div>
      </div>
    );
  }

  const sections = doc.sections || [];
  const quiz = doc.quiz || [];

  return (
    <div
      className="h-full flex flex-col bg-white"
      role="region"
      aria-label="콘텐츠 미리보기"
      aria-live="polite"
    >
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{sanitizeText(doc.title)}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>작성자: {sanitizeText(doc.author_name)}</span>
          <span>·</span>
          <span>팀: {sanitizeText(doc.team)}</span>
          <span>·</span>
          <span>생성일: {formatDate(doc.created_at)}</span>
        </div>

        {/* Source Info */}
        {doc.source_type && doc.source_type !== 'text' && (
          <div className="flex items-center gap-2 mt-2 text-sm">
            {doc.source_type === 'url' && doc.source_url && (
              <a
                href={doc.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition"
                aria-label="원문 URL 열기"
              >
                🔗 원문 보기
              </a>
            )}
            {doc.source_type === 'pdf' && doc.source_file && (
              <a
                href={doc.source_file}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
                aria-label="PDF 파일 열기"
              >
                📄 PDF 원문 보기
              </a>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 mt-3">
          <ContentStatusBadge status={doc.status || 'published'} showIcon />
          {doc.report_count > 0 && (
            <span className="text-sm text-yellow-600">⚠️ 신고 {doc.report_count}건</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" role="tablist" aria-label="미리보기 탭">
        <button
          role="tab"
          aria-selected={activeTab === 'content'}
          onClick={() => setActiveTab('content')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'content'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📖 섹션 ({sections.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'quiz'}
          onClick={() => setActiveTab('quiz')}
          className={`px-4 py-2 text-sm font-medium transition ${
            activeTab === 'quiz'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          📝 퀴즈 ({quiz.length})
        </button>
        {doc.report_count > 0 && (
          <button
            role="tab"
            aria-selected={activeTab === 'reports'}
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium transition ${
              activeTab === 'reports'
                ? 'text-yellow-600 border-b-2 border-yellow-600'
                : 'text-yellow-500 hover:text-yellow-700'
            }`}
          >
            ⚠️ 신고 ({doc.report_count})
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Sections Tab */}
        {activeTab === 'content' && (
          <div className="space-y-4" role="tabpanel" aria-labelledby="tab-content">
            {sections.length === 0 ? (
              <p className="text-gray-500 text-center py-8">섹션이 없습니다.</p>
            ) : (
              sections.map((section, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-2">
                    {index + 1}. {sanitizeText(section.title)}
                  </h3>
                  <div
                    className="text-sm text-gray-600 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(section.content, {
                        ALLOWED_TAGS: [
                          'p',
                          'br',
                          'strong',
                          'em',
                          'u',
                          'h1',
                          'h2',
                          'h3',
                          'ul',
                          'ol',
                          'li',
                          'a',
                        ],
                        ALLOWED_ATTR: ['href', 'target', 'rel'],
                      }),
                    }}
                  />
                </div>
              ))
            )}
          </div>
        )}

        {/* Quiz Tab */}
        {activeTab === 'quiz' && (
          <div className="space-y-4" role="tabpanel" aria-labelledby="tab-quiz">
            {quiz.length === 0 ? (
              <p className="text-gray-500 text-center py-8">퀴즈가 없습니다.</p>
            ) : (
              quiz.map((q, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <p className="font-medium text-gray-900 mb-3">
                    Q{index + 1}. {sanitizeText(q.question)}
                  </p>
                  <ul className="space-y-1">
                    {q.options?.map((opt, optIndex) => (
                      <li
                        key={optIndex}
                        className={`text-sm px-3 py-1.5 rounded ${
                          optIndex === q.correctAnswer
                            ? 'bg-green-100 text-green-800 font-medium'
                            : 'text-gray-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {sanitizeText(opt)}
                        {optIndex === q.correctAnswer && ' ✓'}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-3" role="tabpanel" aria-labelledby="tab-reports">
            {reports?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">신고 내역이 없습니다.</p>
            ) : (
              reports?.map((report) => (
                <div
                  key={report.id}
                  className={`border rounded-lg p-4 ${
                    report.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {getReasonLabel(report.reason)}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        신고자: {sanitizeText(report.reporter_name || '익명')} ·{' '}
                        {formatDate(report.created_at)}
                      </p>
                      {report.description && (
                        <p className="text-sm text-gray-600 mt-2">
                          {sanitizeText(report.description)}
                        </p>
                      )}
                    </div>
                    {report.status === 'pending' && onResolveReport && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onResolveReport(report.id, 'resolved')}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                        >
                          해결
                        </button>
                        <button
                          onClick={() => onResolveReport(report.id, 'dismissed')}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                        >
                          기각
                        </button>
                      </div>
                    )}
                    {report.status !== 'pending' && (
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          report.status === 'resolved'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {report.status === 'resolved' ? '해결됨' : '기각됨'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Actions Footer */}
      <div className="p-4 border-t bg-gray-50 flex gap-3">
        {doc.status === 'review' && (
          <button
            onClick={() => onStatusChange(doc.id, 'published')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            📤 게시
          </button>
        )}
        {doc.status === 'published' && (
          <button
            onClick={() => onStatusChange(doc.id, 'hidden')}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition text-sm"
          >
            🙈 숨기기
          </button>
        )}
        {doc.status === 'hidden' && (
          <button
            onClick={() => onStatusChange(doc.id, 'published')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
          >
            📤 다시 게시
          </button>
        )}
        <button
          onClick={() => {
            const safeTitle = sanitizeText(doc.title);
            if (window.confirm(`"${safeTitle}" 문서를 삭제하시겠습니까?`)) {
              const input = prompt(`삭제하려면 제목을 입력하세요:\n"${safeTitle}"`);
              if (input === safeTitle) {
                onDelete(doc.id);
              }
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
        >
          🗑️ 삭제
        </button>
      </div>
    </div>
  );
}

function getReasonLabel(reason) {
  const labels = {
    inappropriate: '부적절한 내용',
    outdated: '오래된 정보',
    duplicate: '중복 콘텐츠',
    spam: '스팸/광고',
    other: '기타',
  };
  return labels[reason] || reason;
}
