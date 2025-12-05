// OJT Master v2.7.0 - Document Edit Modal Component
// FR-102, FR-202: URL/PDF 문서 수정 UI

import { useState, useCallback } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { Toast } from '../contexts/ToastContext';
import { QuizListEditor } from './QuizEditor';
import PdfUploader from './PdfUploader';
import { PdfThumbnail, PdfViewerModal } from './PdfViewer';
import UrlPreviewPanel from './UrlPreviewPanel';
import { extractUrlText, extractPdfText } from '../utils/api';

/**
 * 문서 수정 모달 컴포넌트
 *
 * @param {Object} doc - 수정할 문서
 * @param {function} onClose - 닫기 콜백
 * @param {function} onSave - 저장 완료 콜백
 */
export default function DocumentEditModal({ doc, onClose, onSave }) {
  const { updateDocument, allDocs } = useDocs();

  // 편집 상태
  const [editedTitle, setEditedTitle] = useState(doc.title || '');
  const [editedTeam, setEditedTeam] = useState(doc.team || '');
  const [editedStep, setEditedStep] = useState(doc.step || 1);
  const [editedSections, setEditedSections] = useState(doc.sections || []);

  // URL 수정 상태 (source_type === 'url')
  const [isChangingUrl, setIsChangingUrl] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [urlPreviewData, setUrlPreviewData] = useState(null);

  // PDF 수정 상태 (source_type === 'pdf')
  const [isChangingPdf, setIsChangingPdf] = useState(false);
  const [newPdfData, setNewPdfData] = useState(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);

  // 퀴즈 편집
  const [showQuizEditor, setShowQuizEditor] = useState(false);

  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  // 사용 가능한 팀 목록
  const availableTeams = [...new Set(allDocs.map((d) => d.team).filter(Boolean))];

  // 변경 감지
  const markAsChanged = () => setHasChanges(true);

  // URL 재추출
  const handleReextractUrl = useCallback(async () => {
    if (!newUrl.trim()) {
      Toast.warning('새 URL을 입력해주세요.');
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractUrlText(newUrl, (status) => {
        Toast.loading(status);
      });

      // 새 섹션으로 교체 또는 기존 유지 선택
      const confirmReplace = window.confirm(
        '추출된 텍스트로 기존 섹션을 교체하시겠습니까?\n(취소를 누르면 기존 섹션이 유지됩니다)'
      );

      if (confirmReplace) {
        setEditedSections([
          {
            title: '추출된 내용',
            content: result.text,
          },
        ]);
      }

      markAsChanged();
      setIsChangingUrl(false);
      Toast.success('URL 재추출 완료');
    } catch (error) {
      Toast.error(`URL 추출 실패: ${error.message}`);
    } finally {
      setIsExtracting(false);
    }
  }, [newUrl]);

  // PDF 교체 처리
  const handlePdfReplace = useCallback(async (uploadData) => {
    setNewPdfData(uploadData);
    markAsChanged();

    const confirmRegenerate = window.confirm(
      'PDF가 업로드되었습니다. 새 PDF에서 퀴즈를 재생성하시겠습니까?\n(취소를 누르면 기존 퀴즈가 유지됩니다)'
    );

    if (confirmRegenerate) {
      try {
        setIsExtracting(true);
        const pdfText = await extractPdfText(uploadData.url, (status) => {
          Toast.loading(status);
        });

        setEditedSections([
          {
            title: '추출된 내용',
            content: pdfText.text,
          },
        ]);
        Toast.success('PDF 텍스트 추출 완료. 저장 시 퀴즈가 재생성됩니다.');
      } catch (error) {
        Toast.error(`PDF 텍스트 추출 실패: ${error.message}`);
      } finally {
        setIsExtracting(false);
      }
    }

    setIsChangingPdf(false);
  }, []);

  // 섹션 편집
  const handleSectionChange = (index, field, value) => {
    setEditedSections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    markAsChanged();
  };

  // 섹션 추가
  const handleAddSection = () => {
    setEditedSections((prev) => [...prev, { title: '새 섹션', content: '' }]);
    markAsChanged();
  };

  // 섹션 삭제
  const handleRemoveSection = (index) => {
    if (editedSections.length <= 1) {
      Toast.warning('최소 1개의 섹션이 필요합니다.');
      return;
    }
    setEditedSections((prev) => prev.filter((_, i) => i !== index));
    markAsChanged();
  };

  // 저장
  const handleSave = async () => {
    if (!editedTitle.trim()) {
      Toast.warning('제목을 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        title: editedTitle.trim(),
        team: editedTeam,
        step: editedStep,
        sections: editedSections,
      };

      // URL 변경 시
      if (isChangingUrl && newUrl.trim()) {
        updates.source_url = newUrl.trim();
      }

      // PDF 변경 시
      if (newPdfData?.url) {
        updates.source_file = newPdfData.url;
      }

      await updateDocument(doc.id, updates);
      Toast.success('문서가 수정되었습니다.');
      onSave?.();
      onClose();
    } catch (error) {
      Toast.error(`저장 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 닫기 (변경사항 확인)
  const handleClose = () => {
    if (hasChanges) {
      const confirmClose = window.confirm(
        '저장되지 않은 변경사항이 있습니다. 정말 닫으시겠습니까?'
      );
      if (!confirmClose) return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">문서 수정</h3>
            <p className="text-sm text-gray-500 mt-1">
              {doc.source_type === 'url' && '🔗 URL 문서'}
              {doc.source_type === 'pdf' && '📄 PDF 문서'}
              {(!doc.source_type || doc.source_type === 'manual') && '✍️ 직접 작성'}
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 text-2xl">
            &times;
          </button>
        </div>

        {/* 본문 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* 기본 정보 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => {
                  setEditedTitle(e.target.value);
                  markAsChanged();
                }}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">팀</label>
              <select
                value={editedTeam}
                onChange={(e) => {
                  setEditedTeam(e.target.value);
                  markAsChanged();
                }}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">팀 선택</option>
                {availableTeams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">스텝</label>
              <input
                type="number"
                min={1}
                value={editedStep}
                onChange={(e) => {
                  setEditedStep(parseInt(e.target.value) || 1);
                  markAsChanged();
                }}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* URL 원본 정보 */}
          {doc.source_type === 'url' && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">원본 URL</label>
                <button
                  onClick={() => setIsChangingUrl(!isChangingUrl)}
                  className="text-sm text-blue-500 hover:text-blue-700"
                >
                  {isChangingUrl ? '취소' : 'URL 변경'}
                </button>
              </div>

              {!isChangingUrl ? (
                <a
                  href={doc.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 truncate block"
                >
                  {doc.source_url}
                </a>
              ) : (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="새 URL 입력"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                  <UrlPreviewPanel url={newUrl} onExtracted={setUrlPreviewData} />
                  <button
                    onClick={handleReextractUrl}
                    disabled={isExtracting || !urlPreviewData}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {isExtracting ? '추출 중...' : '재추출'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* PDF 원본 정보 */}
          {doc.source_type === 'pdf' && (
            <div className="border rounded-lg p-4 bg-purple-50">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-700">원본 PDF</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPdfViewer(true)}
                    className="text-sm text-purple-500 hover:text-purple-700"
                  >
                    전체 보기
                  </button>
                  <button
                    onClick={() => setIsChangingPdf(!isChangingPdf)}
                    className="text-sm text-blue-500 hover:text-blue-700"
                  >
                    {isChangingPdf ? '취소' : 'PDF 교체'}
                  </button>
                </div>
              </div>

              {!isChangingPdf ? (
                <div className="flex items-center gap-4">
                  <PdfThumbnail
                    url={newPdfData?.url || doc.source_file}
                    onClick={() => setShowPdfViewer(true)}
                  />
                  <div>
                    <p className="text-sm text-gray-600">
                      {newPdfData?.filename || 'document.pdf'}
                    </p>
                    {newPdfData && (
                      <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded mt-1 inline-block">
                        새 파일
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <PdfUploader onUploadComplete={handlePdfReplace} />
              )}
            </div>
          )}

          {/* 섹션 편집 */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">섹션</label>
              <button
                onClick={handleAddSection}
                className="text-sm text-green-500 hover:text-green-700"
              >
                + 섹션 추가
              </button>
            </div>

            <div className="space-y-4">
              {editedSections.map((section, idx) => (
                <div key={idx} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="text"
                      value={section.title || ''}
                      onChange={(e) => handleSectionChange(idx, 'title', e.target.value)}
                      placeholder="섹션 제목"
                      className="font-medium text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none px-1"
                    />
                    <button
                      onClick={() => handleRemoveSection(idx)}
                      className="text-red-400 hover:text-red-600 text-sm"
                    >
                      삭제
                    </button>
                  </div>
                  <textarea
                    value={section.content || ''}
                    onChange={(e) => handleSectionChange(idx, 'content', e.target.value)}
                    placeholder="섹션 내용"
                    className="w-full h-32 px-3 py-2 border rounded-lg resize-none text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 퀴즈 관리 */}
          <div className="border rounded-lg p-4 bg-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">퀴즈</label>
                <p className="text-xs text-gray-500 mt-1">{doc.quiz?.length || 0}개 퀴즈</p>
              </div>
              <button
                onClick={() => setShowQuizEditor(true)}
                className="px-3 py-1.5 text-sm bg-amber-500 text-white rounded hover:bg-amber-600"
              >
                퀴즈 편집
              </button>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {hasChanges && (
              <span className="text-amber-600">저장되지 않은 변경사항이 있습니다</span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={handleClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </div>

      {/* 퀴즈 편집 모달 */}
      {showQuizEditor && (
        <QuizListEditor
          docId={doc.id}
          quizzes={doc.quiz}
          onClose={() => setShowQuizEditor(false)}
        />
      )}

      {/* PDF 뷰어 모달 */}
      {showPdfViewer && (
        <PdfViewerModal
          url={newPdfData?.url || doc.source_file}
          filename={newPdfData?.filename || 'document.pdf'}
          onClose={() => setShowPdfViewer(false)}
        />
      )}
    </div>
  );
}
