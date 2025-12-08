// OJT Master v2.13.6 - Mentor Dashboard Component (Local AI + WebLLM + Fallback)
// Issue #104: 타임아웃 및 취소 지원

import { useState, useRef, useCallback } from 'react';
import { useDocs } from '@contexts/DocsContext';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { useAI } from '@features/ai/hooks/AIContext';
import { Toast } from '@contexts/ToastContext';
import {
  generateOJTContent,
  validateQuizQuality,
  regenerateQuizQuestions,
  extractUrlText,
  uploadFileToR2,
  extractPdfText,
} from '@utils/api';
import {
  estimateReadingTime,
  calculateRequiredSteps,
  splitContentForSteps,
  confirmDeleteWithCSRF,
  formatDate,
} from '@utils/helpers';
import AIEngineSelector from '@features/ai/components/AIEngineSelector';

export default function MentorDashboard() {
  const { myDocs, saveDocument, deleteDocument, loadMyDocs } = useDocs();
  const { user } = useAuth();
  // 방어적 코딩: AI Context가 불완전해도 페이지 로드 보장
  const { webllmStatus = { loaded: false, loading: false } } = useAI();

  // Input states
  const [inputType, setInputType] = useState('text');
  const [rawInput, setRawInput] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [autoSplit, setAutoSplit] = useState(true);

  // PDF upload states
  const [pdfFile, setPdfFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const abortControllerRef = useRef(null);

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

  // PDF file handlers
  const handlePdfSelect = (file) => {
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      Toast.error('PDF 파일만 업로드 가능합니다.');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      Toast.error('파일 크기는 10MB를 초과할 수 없습니다.');
      return;
    }

    setPdfFile(file);
    // Auto-fill title from filename
    if (!inputTitle) {
      const nameWithoutExt = file.name.replace(/\.pdf$/i, '');
      setInputTitle(nameWithoutExt);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handlePdfSelect(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handlePdfSelect(file);
  };

  const removePdfFile = () => {
    setPdfFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
    if (inputType === 'pdf' && !pdfFile) {
      Toast.warning('PDF 파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('콘텐츠 분석 중...');

    try {
      let contentText = rawInput;
      let pdfR2Url = null;

      // Determine source info based on input type (local variable, not state)
      const currentSourceInfo = {
        type: inputType === 'url' ? 'url' : inputType === 'pdf' ? 'pdf' : 'manual',
        url: inputType === 'url' ? urlInput.trim() : null,
        file: null, // Will be set after PDF upload
      };

      // Handle PDF input - upload and extract text
      if (inputType === 'pdf' && pdfFile) {
        try {
          // Step 1: Upload PDF to R2
          setProcessingStatus('PDF 업로드 중...');
          pdfR2Url = await uploadFileToR2(pdfFile, 'pdf');
          currentSourceInfo.file = pdfR2Url;

          // Step 2: Extract text from PDF
          setProcessingStatus('PDF 텍스트 추출 중...');
          const extractedText = await extractPdfText(pdfFile);
          contentText = extractedText;
          setRawInput(contentText);

          if (contentText.length < 100) {
            Toast.warning('PDF에서 추출된 텍스트가 너무 짧습니다. 이미지 기반 PDF일 수 있습니다.');
          }
        } catch (pdfError) {
          console.error('PDF 처리 오류:', pdfError);
          Toast.error('PDF 처리 중 오류가 발생했습니다: ' + pdfError.message);
          setIsProcessing(false);
          return;
        }
      }

      // Handle URL input - extract text first
      if (inputType === 'url') {
        setProcessingStatus('URL에서 텍스트 추출 중...');
        const extracted = await extractUrlText(urlInput, setProcessingStatus);
        contentText = extracted.text;
        setRawInput(contentText); // Store for potential quiz regeneration
        if (extracted.wasTruncated) {
          Toast.warning(
            `텍스트가 ${extracted.originalLength}자에서 ${extracted.extractedLength}자로 잘렸습니다.`
          );
        }
      }

      // AbortController 생성 (취소 지원)
      abortControllerRef.current = new AbortController();
      const { signal } = abortControllerRef.current;

      const numSteps = autoSplit ? requiredSteps : 1;
      const segments = splitContentForSteps(contentText, numSteps);
      const docs = [];

      // Generate content for each step
      // AbortController를 전달하여 취소 가능하게 함
      if (numSteps > 1) {
        // 병렬 처리 시에도 signal 전달
        for (let i = 0; i < segments.length; i++) {
          if (signal.aborted) break;
          setProcessingStatus(`Step ${i + 1}/${numSteps}: 콘텐츠 생성 중...`);
          const result = await generateOJTContent(
            segments[i],
            inputTitle || '새 OJT 문서',
            i + 1,
            numSteps,
            (status) => setProcessingStatus(`Step ${i + 1}/${numSteps}: ${status}`),
            { signal }
          );
          docs.push({
            ...result,
            step: i + 1,
            source_type: currentSourceInfo.type,
            source_url: currentSourceInfo.url,
            source_file: currentSourceInfo.file,
          });
        }
      } else {
        const result = await generateOJTContent(
          contentText,
          inputTitle || '새 OJT 문서',
          1,
          1,
          setProcessingStatus,
          { signal }
        );
        docs.push({
          ...result,
          step: 1,
          source_type: currentSourceInfo.type,
          source_url: currentSourceInfo.url,
          source_file: currentSourceInfo.file,
        });
      }

      setGeneratedDocs(docs);

      // Check if any doc was created with fallback (AI failed or user skipped)
      const fallbackDocs = docs.filter((d) => d.ai_processed === false);
      const userInitiatedFallbacks = docs.filter((d) => d._fallback?.userInitiated);

      if (userInitiatedFallbacks.length > 0) {
        Toast.success(
          `${docs.length}개 문서가 Fallback 모드로 생성되었습니다. (키워드 기반 퀴즈 포함)`
        );
      } else if (fallbackDocs.length > 0) {
        Toast.warning(`${fallbackDocs.length}개 문서가 AI 분석 없이 원문으로 생성되었습니다.`);
      } else {
        Toast.success(`${docs.length}개 문서가 생성되었습니다.`);
      }
    } catch (error) {
      // USER_CANCELLED는 이제 Fallback으로 처리되므로 여기 도달하지 않음
      // 다른 예외적 에러만 처리
      Toast.error(`오류: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      abortControllerRef.current = null;
    }
  };

  // 콘텐츠 생성 취소 (Fallback으로 전환)
  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      Toast.info('Fallback 모드로 전환 중...');
    }
  }, []);

  // Handle save
  const handleSave = async () => {
    try {
      for (const doc of generatedDocs) {
        // source_type, source_url, source_file are already included in doc
        await saveDocument({
          ...doc,
          author_id: user.id,
          author_name: user.name,
        });
      }

      Toast.success(`${generatedDocs.length}개 문서가 저장되었습니다.`);
      setGeneratedDocs([]);
      setRawInput('');
      setUrlInput('');
      setInputTitle('');
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
        {/* AI Engine Selector */}
        <AIEngineSelector />

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">콘텐츠 입력</h2>

          {/* Input Type Selector */}
          <div className="flex gap-2 mb-4" role="group" aria-label="콘텐츠 입력 방식 선택">
            {['text', 'url', 'pdf'].map((type) => (
              <button
                key={type}
                onClick={() => setInputType(type)}
                aria-pressed={inputType === type}
                aria-label={`${type === 'text' ? '텍스트' : type === 'url' ? 'URL' : 'PDF'} 입력 방식`}
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
          <label htmlFor="doc-title-input" className="sr-only">
            문서 제목
          </label>
          <input
            id="doc-title-input"
            type="text"
            value={inputTitle}
            onChange={(e) => setInputTitle(e.target.value)}
            placeholder="문서 제목"
            aria-label="문서 제목 입력"
            className="w-full px-4 py-2 border rounded-lg mb-4"
          />

          {/* Content Input */}
          {inputType === 'text' && (
            <>
              <label htmlFor="content-textarea" className="sr-only">
                교육 콘텐츠 입력
              </label>
              <textarea
                id="content-textarea"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder="교육 콘텐츠를 입력하세요..."
                aria-label="교육 콘텐츠 입력"
                className="w-full h-64 px-4 py-3 border rounded-lg resize-none"
              />
            </>
          )}

          {inputType === 'url' && (
            <>
              <label htmlFor="url-input" className="sr-only">
                URL 입력
              </label>
              <input
                id="url-input"
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com/article"
                aria-label="웹 페이지 URL 입력"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </>
          )}

          {inputType === 'pdf' && (
            <div className="space-y-4">
              {!pdfFile ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
                    isDragging
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label="PDF 파일 선택 또는 드래그 앤 드롭"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileInputChange}
                    className="hidden"
                    aria-label="PDF 파일 선택"
                  />
                  <div className="text-4xl mb-2" aria-hidden="true">
                    📁
                  </div>
                  <p className="text-gray-600 font-medium">파일 선택 또는 드래그</p>
                  <p className="text-sm text-gray-400 mt-1">지원 형식: PDF (최대 10MB)</p>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-medium text-gray-800">{pdfFile.name}</p>
                      <p className="text-sm text-gray-500">
                        {(pdfFile.size / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={removePdfFile}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition"
                    aria-label={`${pdfFile.name} 파일 제거`}
                  >
                    ✕ 제거
                  </button>
                </div>
              )}
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
            disabled={isProcessing || !webllmStatus.loaded}
            className="w-full mt-4 py-3 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition bg-green-500 hover:bg-green-600"
          >
            {isProcessing
              ? processingStatus
              : webllmStatus.loaded
                ? '💻 WebLLM으로 교육 자료 생성'
                : '모델을 먼저 로드해주세요'}
          </button>

          {/* 처리 중일 때 Fallback 건너뛰기 버튼 표시 */}
          {isProcessing && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-amber-700">
                  <span className="animate-spin">⏳</span>
                  <span>AI 콘텐츠 생성 중... 시간이 오래 걸릴 수 있습니다.</span>
                </div>
                <button
                  onClick={handleCancelGeneration}
                  className="px-3 py-1.5 text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg transition flex items-center gap-1"
                  aria-label="AI 생성 취소하고 Fallback 모드로 전환"
                >
                  <span>⏭️</span>
                  <span>Fallback으로 건너뛰기</span>
                </button>
              </div>
              <p className="text-xs text-amber-600 mt-2">
                💡 AI 분석 없이 원문 기반으로 자료를 생성합니다 (키워드 퀴즈 자동 생성)
              </p>
            </div>
          )}

          {!webllmStatus.loaded && !isProcessing && (
            <p className="text-xs text-green-600 mt-2 text-center">
              💡 상단에서 모델을 로드한 후 사용할 수 있습니다
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
                      <div className="flex gap-1">
                        {doc.ai_engine && (
                          <span className="text-xs px-2 py-1 rounded font-medium text-green-700 bg-green-100">
                            💻 WebLLM
                          </span>
                        )}
                        {isAIFailed && (
                          <span className="text-xs text-amber-700 bg-amber-200 px-2 py-1 rounded font-medium">
                            AI 미처리
                          </span>
                        )}
                      </div>
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
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="quiz-modal-title"
        >
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 id="quiz-modal-title" className="text-lg font-bold text-gray-800">
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
                aria-label="퀴즈 검증 모달 닫기"
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
              <div className="space-y-3" role="list" aria-label="퀴즈 목록">
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
                      role="listitem"
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleQuizSelection(idx)}
                          className="mt-1"
                          aria-label={`퀴즈 ${idx + 1}번 선택`}
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
