/**
 * MyDocsList - 내 문서 목록 및 관리
 * @agent content-manage-agent
 * @blocks content.document
 */

import { useDocs } from '@/contexts/DocsContext';
import { Toast } from '@/contexts/ToastContext';
import { confirmDeleteWithCSRF, formatDate } from '@/utils/helpers';

export default function MyDocsList({ onEdit }) {
  const { myDocs, deleteDocument } = useDocs();

  // Handle delete
  const handleDelete = async (docId) => {
    const doc = myDocs.find((d) => d.id === docId);
    if (!doc) return;

    if (!confirmDeleteWithCSRF(doc.title)) {
      return;
    }

    try {
      await deleteDocument(docId);
      Toast.success('문서가 삭제되었습니다.');
    } catch (error) {
      Toast.error('삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h2 className="text-lg font-bold text-gray-800 mb-4">내 문서</h2>
      <div className="space-y-3">
        {myDocs.length === 0 ? (
          <p className="text-gray-500 text-sm">아직 작성한 문서가 없습니다.</p>
        ) : (
          myDocs.map((doc) => (
            <div key={doc.id} className="p-3 border rounded-lg hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-sm">{doc.title}</h4>
                {doc.source_type && doc.source_type !== 'manual' && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded ${
                      doc.source_type === 'url'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    {doc.source_type === 'url' ? '🔗 URL' : '📄 PDF'}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {doc.team} · {formatDate(doc.created_at)}
              </p>
              {doc.source_url && (
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:text-blue-700 mt-1 block truncate"
                  title={doc.source_url}
                >
                  {doc.source_url}
                </a>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onEdit(doc)}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  수정
                </button>
                <button
                  onClick={() => handleDelete(doc.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  삭제
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
