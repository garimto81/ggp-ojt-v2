// OJT Master v2.5.0 - Mentor Dashboard Component

import { useState } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../contexts/ToastContext';
import {
  generateOJTContent,
  validateQuizQuality,
  regenerateQuizQuestions,
  extractUrlText,
} from '../utils/api';
import {
  estimateReadingTime,
  calculateRequiredSteps,
  splitContentForSteps,
  confirmDeleteWithCSRF,
  formatDate,
} from '../utils/helpers';

export default function MentorDashboard({ aiStatus }) {
  const { myDocs, saveDocument, deleteDocument, loadMyDocs } = useDocs();
  const { user } = useAuth();

  // Input states
  const [inputType, setInputType] = useState('text');
  const [rawInput, setRawInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [autoSplit, setAutoSplit] = useState(true);

  // Source tracking for URL/PDF
  const [sourceInfo, setSourceInfo] = useState({ type: 'manual', url: null, file: null });

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

  // Generated content
  const [generatedDocs, setGeneratedDocs] = useState([]);

  // Editing
  const [editingDoc, setEditingDoc] = useState(null);

  // Quiz preview
  const [previewingDoc, setPreviewingDoc] = useState(null);
  const [quizValidation, setQuizValidation] = useState(null);
  const [selectedQuizIndices, setSelectedQuizIndices] = useState([]);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Derived values
  const estimatedTime = rawInput ? estimateReadingTime(rawInput) : 0;
  const requiredSteps = rawInput ? calculateRequiredSteps(rawInput) : 1;

  // Handle content generation
  const handleGenerate = async () => {
    // Validate input based on type
    if (inputType === 'text' && !rawInput.trim()) {
      Toast.warning('텍스트를 입력해주세요.');
      return;
    }
    if (inputType === 'url' && !urlInput.trim()) {
      Toast.warning('URL을 입력해주세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('콘텐츠 분석 중...');

    try {
      let contentText = rawInput;

      // Set source info based on input type
      if (inputType === 'text') {
        setSourceInfo({ type: 'manual', url: null, file: null });
      } else if (inputType === 'url') {
        setSourceInfo({ type: 'url', url: urlInput.trim(), file: null });
      }
      // PDF source info is set in handlePdfUpload

      // Handle URL input - extract text first
      if (inputType === 'url') {
        setProcessingStatus('URL에서 텍스트 추출 중...');
        const extracted = await extractUrlText(urlInput, setProcessingStatus);
        contentText = extracted.text;
        setRawInput(contentText); // Store for potential quiz regeneration
        if (extracted.wasTruncated) {
          Toast.warning(`텍스트가 ${extracted.originalLength}자에서 ${extracted.extractedLength}자로 잘렸습니다.`);
        }
      }

      // Warn if AI is offline but proceed anyway (graceful degradation)
      if (!aiStatus.online) {
        Toast.warning('AI 서비스 오프라인 - 원문으로 등록됩니다.');
      }

      const numSteps = autoSplit ? requiredSteps : 1;
      const segments = splitContentForSteps(contentText, numSteps);
      const docs = [];

      // Generate content for each step (in parallel if multiple)
      if (numSteps > 1) {
        const promises = segments.map((segment, i) =>
          generateOJTContent(segment, inputTitle || '새 OJT 문서', i + 1, numSteps, (status) =>
            setProcessingStatus(`Step ${i + 1}: ${status}`)
          )
        );
        const results = await Promise.all(promises);
        docs.push(...results.map((r, i) => ({ ...r, step: i + 1 })));
      } else {
        const result = await generateOJTContent(
          contentText,
          inputTitle || '새 OJT 문서',
          1,
          1,
          setProcessingStatus
        );
        docs.push({ ...result, step: 1 });
      }

      setGeneratedDocs(docs);

      // Check if any doc was created with fallback (AI failed)
      const fallbackDocs = docs.filter((d) => d.ai_processed === false);
      if (fallbackDocs.length > 0) {
        Toast.warning(`${fallbackDocs.length}개 문서가 AI 분석 없이 원문으로 생성되었습니다.`);
      } else {
        Toast.success(`${docs.length}개 문서가 생성되었습니다.`);
      }
    } catch (error) {
      Toast.error(`오류: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      for (const doc of generatedDocs) {
        await saveDocument({
          ...doc,
          author_id: user.id,
          author_name: user.name,
          // Source tracking fields
          source_type: sourceInfo.type,
          source_url: sourceInfo.url,
          source_file: sourceInfo.file,
        });
      }

      Toast.success(`${generatedDocs.length}개 문서가 저장되었습니다.`);
      setGeneratedDocs([]);
      setRawInput('');
      setUrlInput('');
      setInputTitle('');
      setSourceInfo({ type: 'manual', url: null, file: null });
      await loadMyDocs();
    } catch (error) {
      Toast.error('저장 중 오류가 발생했습니다.');
    }
  };

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

  // Open quiz preview for a generated document
  const handleQuizPreview = (doc, index) => {
    setPreviewingDoc({ ...doc, _index: index });
    const validation = validateQuizQuality(doc.quiz);
    setQuizValidation(validation);
    setSelectedQuizIndices([]);
  };

  // Close quiz preview
  const handleCloseQuizPreview = () => {
    setPreviewingDoc(null);
    setQuizValidation(null);
    setSelectedQuizIndices([]);
  };

  // Toggle quiz selection for regeneration
  const toggleQuizSelection = (idx) => {
    setSelectedQuizIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Select all problematic quizzes
  const selectProblematicQuizzes = () => {
    if (!previewingDoc?.quiz) return;
    const problematic = previewingDoc.quiz
      .map((q, i) => (q.isPlaceholder || q.question?.includes('[자동 생성]') ? i : null))
      .filter((i) => i !== null);
    setSelectedQuizIndices(problematic);
  };

  // Regenerate selected quizzes
  const handleRegenerateQuizzes = async () => {
    if (selectedQuizIndices.length === 0) {
      Toast.warning('재생성할 퀴즈를 선택해주세요.');
      return;
    }

    if (!rawInput.trim()) {
      Toast.warning('원본 텍스트가 필요합니다.');
      return;
    }

    setIsRegenerating(true);
    try {
      const updatedQuiz = await regenerateQuizQuestions(
        rawInput,
        selectedQuizIndices,
        previewingDoc.quiz,
        setProcessingStatus
      );

      // Update the document in generatedDocs
      const docIndex = previewingDoc._index;
      setGeneratedDocs((prev) => {
        const updated = [...prev];
        updated[docIndex] = { ...updated[docIndex], quiz: updatedQuiz };
        return updated;
      });

      // Update preview
      setPreviewingDoc((prev) => ({ ...prev, quiz: updatedQuiz }));
      setQuizValidation(validateQuizQuality(updatedQuiz));
      setSelectedQuizIndices([]);

      Toast.success(`${selectedQuizIndices.length}개 퀴즈가 재생성되었습니다.`);
    } catch (error) {
      Toast.error(`재생성 실패: ${error.message}`);
    } finally {
      setIsRegenerating(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Left: Input Panel */}
      <div className="col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">콘텐츠 입력</h2>

          {/* Input Type Selector */}
          <div className="flex gap-2 mb-4">
            {['text', 'url', 'pdf'].map((type) => (
              <button
                key={type}
                onClick={() => setInputType(type)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  inputType === type
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type === 'text' && '텍스트'}
                {type === 'url' && 'URL'}
                {type === 'pdf' && 'PDF'}
              </button>
            ))}
          </div>

          {/* Title Input */}
          <input
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="문서 제목"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          {/* Content Input */}
          {inputType === 'text' && (
            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="교육 콘텐츠를 입력하세요..."
              className="w-full h-64 px-4 py-3 border rounded-lg resize-none"
            />
          )}

          {inputType === 'url' && (
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-2 border rounded-lg"
            />
          )}

          {inputType === 'pdf' && (
            <div className="border-2 border-dashed rounded-lg p-8 text-center text-gray-500">
              PDF 업로드 (구현 예정)
            </div>
          )}

          {/* Stats */}
          {rawInput && (
            <div className="mt-4 flex gap-4 text-sm text-gray-500">
              <span>예상 학습 시간: {estimatedTime}분</span>
              <span>권장 스텝 수: {requiredSteps}</span>
            </div>
          )}

          {/* Auto Split Toggle */}
          <label className="flex items-center gap-2 mt-4">
            <input
              type="checkbox"
              checked={autoSplit}
              onChange={(e) => setAutoSplit(e.target.checked)}
              disabled={editingDoc !== null}
            />
            <span className="text-sm text-gray-600">자동 스텝 분할 ({requiredSteps}개)</span>
          </label>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isProcessing}
            className="w-full mt-4 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
          >
            {isProcessing
              ? processingStatus
              : aiStatus.online
                ? 'AI로 교육 자료 생성'
                : '원문으로 등록 (AI 오프라인)'}
          </button>
          {!aiStatus.online && (
            <p className="text-xs text-amber-600 mt-2 text-center">
              ⚠️ AI 서비스 오프라인 - 원문 그대로 등록됩니다
            </p>
          )}
        </div>

        {/* Generated Content Preview */}
        {generatedDocs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-800">생성된 문서 ({generatedDocs.length}개)</h3>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                저장
              </button>
            </div>
            <div className="space-y-4">
              {generatedDocs.map((doc, i) => {
                const validation = validateQuizQuality(doc.quiz);
                const isAIFailed = doc.ai_processed === false;
                return (
                  <div
                    key={i}
                    className={`p-4 border rounded-lg ${isAIFailed ? 'border-amber-300 bg-amber-50' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="font-medium">{doc.title}</h4>
                      {isAIFailed && (
                        <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded font-medium">
                          AI 미처리
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {doc.sections?.length || 0}개 섹션, {doc.quiz?.length || 0}개 퀴즈
                    </p>
                    {isAIFailed && doc.ai_error && (
                      <p className="text-xs text-amber-600 mt-1">오류: {doc.ai_error}</p>
                    )}
                    {/* Quiz quality indicator */}
                    <div className="mt-2 flex items-center gap-2">
                      {isAIFailed ? (
                        <span className="text-xs text-gray-500">퀴즈 없음 (원문 모드)</span>
                      ) : validation.valid ? (
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                          퀴즈 검증 통과
                        </span>
                      ) : (
                        <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          {validation.stats.placeholders}개 더미 문제
                        </span>
                      )}
                      {!isAIFailed && (
                        <button
                          onClick={() => handleQuizPreview(doc, i)}
                          className="text-xs text-blue-500 hover:text-blue-700"
                        >
                          퀴즈 확인
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Right: My Documents */}
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
                    onClick={() => setEditingDoc(doc)}
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

      {/* Quiz Preview Modal */}
      {previewingDoc && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  퀴즈 검증: {previewingDoc.title}
                </h3>
                {quizValidation && (
                  <p className="text-sm text-gray-500 mt-1">
                    총 {quizValidation.stats.total}개 중 {quizValidation.stats.validCount}개 유효
                    {quizValidation.stats.placeholders > 0 && (
                      <span className="text-amber-600 ml-2">
                        ({quizValidation.stats.placeholders}개 더미)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <button
                onClick={handleCloseQuizPreview}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Action buttons */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={selectProblematicQuizzes}
                  disabled={quizValidation?.stats.placeholders === 0}
                  className="px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded hover:bg-amber-200 disabled:opacity-50"
                >
                  더미 문제 선택
                </button>
                <button
                  onClick={handleRegenerateQuizzes}
                  disabled={selectedQuizIndices.length === 0 || isRegenerating}
                  className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {isRegenerating
                    ? '재생성 중...'
                    : `선택 항목 재생성 (${selectedQuizIndices.length}개)`}
                </button>
              </div>

              {/* Quiz list */}
              <div className="space-y-3">
                {previewingDoc.quiz?.map((q, idx) => {
                  const isProblematic = q.isPlaceholder || q.question?.includes('[자동 생성]');
                  const isSelected = selectedQuizIndices.includes(idx);

                  return (
                    <div
                      key={idx}
                      onClick={() => toggleQuizSelection(idx)}
                      className={`p-4 border rounded-lg cursor-pointer transition ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : isProblematic
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuizSelection(idx)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                            {isProblematic && (
                              <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">
                                더미
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-800 mb-2">{q.question}</p>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {q.options?.map((opt, optIdx) => (
                              <div
                                key={optIdx}
                                className={`px-2 py-1 rounded ${
                                  optIdx === q.correct
                                    ? 'bg-green-100 text-green-800 font-medium'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {String.fromCharCode(65 + optIdx)}. {opt}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handleCloseQuizPreview}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
