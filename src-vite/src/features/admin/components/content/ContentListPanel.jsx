// ContentListPanel.jsx - 콘텐츠 목록 패널 (Split View 왼쪽)

import { useState, useMemo } from 'react';
import ContentStatusBadge from './ContentStatusBadge';
import ContentQuickActions from './ContentQuickActions';
import { formatDate } from '@utils/helpers';
import { useDebounce } from '@hooks/useDebounce';

const STATUS_TABS = [
  { key: 'all', label: '전체' },
  { key: 'review', label: '검토대기', color: 'text-orange-600' },
  { key: 'reported', label: '신고됨', color: 'text-yellow-600' },
  { key: 'hidden', label: '숨김', color: 'text-gray-600' },
];

export default function ContentListPanel({
  docs,
  selectedDocId,
  onSelectDoc,
  onStatusChange,
  onDelete,
  teamOptions,
  authorOptions,
}) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');

  const debouncedSearch = useDebounce(search, 300);

  // 상태별 카운트 계산
  const statusCounts = useMemo(() => {
    return {
      all: docs.length,
      review: docs.filter((d) => d.status === 'review').length,
      reported: docs.filter((d) => d.report_count > 0).length,
      hidden: docs.filter((d) => d.status === 'hidden').length,
    };
  }, [docs]);

  // 필터링된 문서 목록
  const filteredDocs = useMemo(() => {
    let filtered = [...docs];

    // 상태 필터
    if (statusFilter === 'review') {
      filtered = filtered.filter((d) => d.status === 'review');
    } else if (statusFilter === 'reported') {
      filtered = filtered.filter((d) => d.report_count > 0);
    } else if (statusFilter === 'hidden') {
      filtered = filtered.filter((d) => d.status === 'hidden');
    }

    // 검색 필터
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter((d) => d.title?.toLowerCase().includes(searchLower));
    }

    // 팀 필터
    if (teamFilter) {
      filtered = filtered.filter((d) => d.team === teamFilter);
    }

    // 작성자 필터
    if (authorFilter) {
      filtered = filtered.filter((d) => d.author_id === authorFilter);
    }

    return filtered;
  }, [docs, statusFilter, debouncedSearch, teamFilter, authorFilter]);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Status Tabs */}
      <div className="flex border-b px-2 pt-2" role="tablist" aria-label="콘텐츠 상태 필터">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={statusFilter === tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-2 text-sm font-medium transition rounded-t ${
              statusFilter === tab.key
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                : `text-gray-500 hover:text-gray-700 ${tab.color || ''}`
            }`}
          >
            {tab.label}
            {statusCounts[tab.key] > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                  statusFilter === tab.key ? 'bg-blue-200' : 'bg-gray-200'
                }`}
              >
                {statusCounts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="p-3 border-b space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목 검색..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="제목 검색"
        />
        <div className="flex gap-2">
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="팀 필터"
          >
            <option value="">모든 팀</option>
            {teamOptions.map((team) => (
              <option key={team} value={team}>
                {team}
              </option>
            ))}
          </select>
          <select
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="작성자 필터"
          >
            <option value="">모든 작성자</option>
            {authorOptions.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="px-3 py-2 text-xs text-gray-500 border-b">{filteredDocs.length}개 문서</div>

      {/* Document List */}
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="문서 목록">
        {filteredDocs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">검색 결과가 없습니다.</div>
        ) : (
          filteredDocs.map((doc) => (
            <div
              key={doc.id}
              role="option"
              aria-selected={selectedDocId === doc.id}
              onClick={() => onSelectDoc(doc)}
              className={`p-3 border-b cursor-pointer transition ${
                selectedDocId === doc.id
                  ? 'bg-blue-50 border-l-4 border-l-blue-500'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 truncate">{doc.title}</h4>
                  <p className="text-xs text-gray-500 mt-1">
                    {doc.author_name} · {doc.team} · {formatDate(doc.created_at)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <ContentStatusBadge status={doc.status || 'published'} />
                {doc.report_count > 0 && (
                  <span className="text-xs text-yellow-600">⚠️ 신고 {doc.report_count}건</span>
                )}
              </div>

              <ContentQuickActions
                doc={doc}
                onPreview={onSelectDoc}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                isSelected={selectedDocId === doc.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
