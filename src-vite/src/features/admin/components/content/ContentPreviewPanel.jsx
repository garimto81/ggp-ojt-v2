// ContentPreviewPanel.jsx - 콘텐츠 미리보기 패널 (Split View 오른쪽)

import { useState } from 'react';

import { formatDate } from '@/utils/helpers';

import ContentStatusBadge from './ContentStatusBadge';

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
      <div className="flex h-full items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <div className="mb-4 text-4xl">📄</div>
          <p>왼쪽 목록에서 문서를 선택하세요</p>
        </div>
      </div>
    );
  }

  const sections = doc.sections || [];
  const quiz = doc.quiz || [];

  return (
    <div
      className="flex h-full flex-col bg-white"
      role="region"
      aria-label="콘텐츠 미리보기"
      aria-live="polite"
    >
      {/* Header */}
      <div className="border-b p-4">
        <h2 className="mb-2 text-lg font-bold text-gray-900">{doc.title}</h2>
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <span>작성자: {doc.author_name}</span>
          <span>·</span>
          <span>팀: {doc.team}</span>
          <span>·</span>
          <span>생성일: {formatDate(doc.created_at)}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
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
              ? 'border-b-2 border-blue-600 text-blue-600'
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
              ? 'border-b-2 border-blue-600 text-blue-600'
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
                ? 'border-b-2 border-yellow-600 text-yellow-600'
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
              <p className="py-8 text-center text-gray-500">섹션이 없습니다.</p>
            ) : (
              sections.map((section, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium text-gray-900">
                    {index + 1}. {section.title}
                  </h3>
                  <div
                    className="prose prose-sm max-w-none text-sm text-gray-600"
                    dangerouslySetInnerHTML={{ __html: section.content }}
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
              <p className="py-8 text-center text-gray-500">퀴즈가 없습니다.</p>
            ) : (
              quiz.map((q, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <p className="mb-3 font-medium text-gray-900">
                    Q{index + 1}. {q.question}
                  </p>
                  <ul className="space-y-1">
                    {q.options?.map((opt, optIndex) => (
                      <li
                        key={optIndex}
                        className={`rounded px-3 py-1.5 text-sm ${
                          optIndex === q.correctAnswer
                            ? 'bg-green-100 font-medium text-green-800'
                            : 'text-gray-600'
                        }`}
                      >
                        {String.fromCharCode(65 + optIndex)}. {opt}
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
              <p className="py-8 text-center text-gray-500">신고 내역이 없습니다.</p>
            ) : (
              reports?.map((report) => (
                <div
                  key={report.id}
                  className={`rounded-lg border p-4 ${
                    report.status === 'pending' ? 'border-yellow-300 bg-yellow-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {getReasonLabel(report.reason)}
                      </span>
                      <p className="mt-1 text-xs text-gray-500">
                        신고자: {report.reporter_name || '익명'} · {formatDate(report.created_at)}
                      </p>
                      {report.description && (
                        <p className="mt-2 text-sm text-gray-600">{report.description}</p>
                      )}
                    </div>
                    {report.status === 'pending' && onResolveReport && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => onResolveReport(report.id, 'resolved')}
                          className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                        >
                          해결
                        </button>
                        <button
                          onClick={() => onResolveReport(report.id, 'dismissed')}
                          className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                        >
                          기각
                        </button>
                      </div>
                    )}
                    {report.status !== 'pending' && (
                      <span
                        className={`rounded px-2 py-1 text-xs ${
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
      <div className="flex gap-3 border-t bg-gray-50 p-4">
        {doc.status === 'review' && (
          <button
            onClick={() => onStatusChange(doc.id, 'published')}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition hover:bg-green-700"
          >
            📤 게시
          </button>
        )}
        {doc.status === 'published' && (
          <button
            onClick={() => onStatusChange(doc.id, 'hidden')}
            className="rounded-lg bg-yellow-600 px-4 py-2 text-sm text-white transition hover:bg-yellow-700"
          >
            🙈 숨기기
          </button>
        )}
        {doc.status === 'hidden' && (
          <button
            onClick={() => onStatusChange(doc.id, 'published')}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white transition hover:bg-green-700"
          >
            📤 다시 게시
          </button>
        )}
        <button
          onClick={() => {
            if (window.confirm(`"${doc.title}" 문서를 삭제하시겠습니까?`)) {
              const input = prompt(`삭제하려면 제목을 입력하세요:\n"${doc.title}"`);
              if (input === doc.title) {
                onDelete(doc.id);
              }
            }
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white transition hover:bg-red-700"
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
