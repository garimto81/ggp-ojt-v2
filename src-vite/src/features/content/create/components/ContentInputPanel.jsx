/**
 * ContentInputPanel - 콘텐츠 입력 및 AI 생성
 * @agent content-create-agent
 * @blocks content.input, content.generate
 * @issue #198 - PDF 업로드 및 URL 텍스트 추출 기능
 * @issue #200 - WebLLM 제거, Gemini 단일 엔진
 * @issue #202 - PDF Supabase Storage 저장
 * @issue #215 - Gemini 생성 중 프로그레스바 + UI 비활성화
 */

import { useState, useRef } from 'react';
import { Toast } from '@/contexts/ToastContext';
import { generateOJTContent, extractUrlText, generateUrlQuizOnly } from '@/utils/api';
import { extractPdfText, validatePdfFile, getPdfInfo } from '@/utils/pdf';
import { uploadPdfToStorage } from '@/utils/storage';
import { estimateReadingTime, calculateRequiredSteps, splitContentForSteps } from '@/utils/helpers';
import { SUCCESS, ERROR, WARNING, INFO } from '@/constants/messages';
import { Progress } from '@/components/ui';

export default function ContentInputPanel({
  aiStatus,
  onDocumentsGenerated,
  rawInput,
  setRawInput,
}) {
  // Input states
  const [inputType, setInputType] = useState('text');
  const [urlInput, setUrlInput] = useState('');
  const [inputTitle, setInputTitle] = useState('');
  const [autoSplit, setAutoSplit] = useState(true);
  const [skipAiAnalysis, setSkipAiAnalysis] = useState(false); // #219 - AI 분석 없이 원본 저장

  // PDF states (#198, #202)
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [, setPdfStorageInfo] = useState(null); // Storage 업로드 결과 (#202)
  const pdfInputRef = useRef(null);

  // Processing states (#215 - 프로그레스바 및 UI 비활성화)
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [progress, setProgress] = useState(0); // 0-100 진행률

  // Derived values
  const estimatedTime = rawInput ? estimateReadingTime(rawInput) : 0;
  const requiredSteps = rawInput ? calculateRequiredSteps(rawInput) : 1;

  // Handle PDF file selection (#198)
  const handlePdfSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 유효성 검사
    const validation = validatePdfFile(file);
    if (!validation.valid) {
      Toast.error(validation.error);
      return;
    }

    setSelectedPdf(file);
    setPdfProgress(0);

    // PDF 메타데이터 가져오기
    try {
      const info = await getPdfInfo(file);
      setPdfInfo(info);

      // 제목이 비어있으면 PDF 제목으로 설정
      if (!inputTitle && info.title) {
        setInputTitle(info.title);
      }

      Toast.success(SUCCESS.PDF_SELECTED(info.pages));
    } catch (error) {
      Toast.error(ERROR.PDF_INFO_FAILED(error.message));
      setSelectedPdf(null);
    }
  };

  // Clear PDF selection
  const clearPdfSelection = () => {
    setSelectedPdf(null);
    setPdfInfo(null);
    setPdfProgress(0);
    setPdfStorageInfo(null); // (#202)
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  // Upload PDF to Supabase Storage (#202)
  const handlePdfStorageUpload = async (docId) => {
    if (!selectedPdf) return null;

    try {
      const result = await uploadPdfToStorage(selectedPdf, docId, {
        onProgress: setProcessingStatus,
      });
      setPdfStorageInfo(result);
      return result;
    } catch (error) {
      console.error('[ContentInputPanel] Storage 업로드 실패:', error);
      // Storage 업로드 실패해도 문서 생성은 진행 (graceful degradation)
      Toast.warning(WARNING.PDF_SAVE_FALLBACK(error.message));
      return null;
    }
  };

  // Handle content generation
  const handleGenerate = async () => {
    // Validate input based on type
    if (inputType === 'text' && !rawInput.trim()) {
      Toast.warning(WARNING.TEXT_REQUIRED);
      return;
    }
    if (inputType === 'url' && !urlInput.trim()) {
      Toast.warning(WARNING.URL_REQUIRED);
      return;
    }
    if (inputType === 'pdf' && !selectedPdf) {
      Toast.warning(WARNING.PDF_REQUIRED);
      return;
    }

    setIsProcessing(true);
    setProgress(5); // 시작
    setProcessingStatus(skipAiAnalysis ? '원본 저장 중...' : '콘텐츠 분석 중...');

    try {
      const contentText = rawInput;

      // Source 정보 초기화 (#211 리팩토링)
      const tempDocId = crypto.randomUUID();
      const currentSourceInfo = {
        type: inputType,
        url: null,
        file: null,
        storage_path: null,
      };

      // ============================================
      // #219: AI 분석 없이 원본 저장 모드
      // ============================================
      if (skipAiAnalysis) {
        setProgress(50);
        setProcessingStatus('원본 저장 중...');

        // PDF 원본 저장
        if (inputType === 'pdf' && selectedPdf) {
          setProcessingStatus('PDF를 Supabase Storage에 업로드 중...');
          const storageResult = await handlePdfStorageUpload(tempDocId);

          const pdfDoc = {
            title: inputTitle || selectedPdf.name.replace(/\.pdf$/i, ''),
            team: '',
            sections: [],
            quiz: [],
            ai_processed: false,
            step: 1,
            source_type: 'pdf',
            source_url: storageResult?.publicUrl || null,
            source_file: selectedPdf.name,
            source_storage_path: storageResult?.path || null,
          };

          setProgress(100);
          onDocumentsGenerated([pdfDoc]);
          Toast.success(SUCCESS.PDF_SAVED_RAW);
          setIsProcessing(false);
          setProcessingStatus('');
          setProgress(0);
          return;
        }

        // URL 원본 저장
        if (inputType === 'url') {
          let normalizedUrl = urlInput.trim();
          if (!normalizedUrl.match(/^https?:\/\//i)) {
            normalizedUrl = 'https://' + normalizedUrl;
          }

          const urlDoc = {
            title: inputTitle || new URL(normalizedUrl).hostname,
            team: '',
            sections: [],
            quiz: [],
            ai_processed: false,
            step: 1,
            source_type: 'url',
            source_url: normalizedUrl,
            source_file: null,
            source_storage_path: null,
          };

          setProgress(100);
          onDocumentsGenerated([urlDoc]);
          Toast.success(SUCCESS.URL_SAVED_RAW);
          setIsProcessing(false);
          setProcessingStatus('');
          setProgress(0);
          return;
        }

        // 텍스트 원본 저장
        if (inputType === 'text') {
          const textDoc = {
            title: inputTitle || '새 OJT 문서',
            team: '',
            sections: [
              {
                title: inputTitle || '원본 텍스트',
                content: contentText,
              },
            ],
            quiz: [],
            ai_processed: false,
            step: 1,
            source_type: 'manual',
            source_url: null,
            source_file: null,
            source_storage_path: null,
          };

          setProgress(100);
          onDocumentsGenerated([textDoc]);
          Toast.success(SUCCESS.TEXT_SAVED_RAW);
          setIsProcessing(false);
          setProcessingStatus('');
          setProgress(0);
          return;
        }
      }

      // ============================================
      // 입력 타입별 텍스트 추출 (PDF/URL 동일 패턴)
      // ============================================

      // 1. PDF 처리 (#198, #202, #206, #211, #217 - 퀴즈만 생성, 학습 시 PDF 원본 표시)
      if (inputType === 'pdf' && selectedPdf) {
        // 1-1. 텍스트 추출 (퀴즈 생성용으로만 사용, OCR fallback 포함)
        setProgress(10);
        setProcessingStatus('PDF 텍스트 추출 중...');
        const extracted = await extractPdfText(selectedPdf, (progress) => {
          setPdfProgress(progress);
          setProcessingStatus(`PDF 텍스트 추출 중... ${progress}%`);
        });
        const quizSourceText = extracted.text;

        // OCR 사용 알림 (#217)
        if (extracted.method === 'ocr') {
          Toast.info(INFO.IMAGE_PDF_OCR);
        }

        if (extracted.wasTruncated) {
          Toast.info(
            `퀴즈 생성용 텍스트가 ${extracted.extractedLength.toLocaleString()}자로 잘렸어요`
          );
        }

        // 1-2. Storage 업로드 (#202)
        setProgress(30);
        setProcessingStatus('PDF를 Supabase Storage에 업로드 중...');
        const storageResult = await handlePdfStorageUpload(tempDocId);

        // 1-3. 퀴즈만 생성 (섹션 없음 - 원본 PDF 직접 표시 예정)
        setProgress(50);
        setProcessingStatus('PDF 퀴즈 생성 중 (Gemini)...');
        const result = await generateUrlQuizOnly(
          quizSourceText,
          inputTitle || selectedPdf.name.replace(/\.pdf$/i, ''),
          setProcessingStatus
        );

        // 1-4. PDF 문서는 단일 문서로 생성 (스텝 분할 없음)
        const pdfDoc = {
          ...result,
          step: 1,
          source_type: 'pdf',
          source_url: storageResult?.publicUrl || null, // Storage URL (학습 시 PDF 표시)
          source_file: selectedPdf.name,
          source_storage_path: storageResult?.path || null,
        };

        // PDF 문서 즉시 반환 (아래 텍스트 처리 스킵)
        setProgress(100);
        onDocumentsGenerated([pdfDoc]);
        Toast.success(SUCCESS.PDF_CONTENT_CREATED);
        setIsProcessing(false);
        setProcessingStatus('');
        setProgress(0);
        return;
      }

      // 2. URL 처리 (#208, #211 - 퀴즈만 생성, 학습 시 원본 URL 직접 호출)
      if (inputType === 'url') {
        // 2-1. URL 정규화 (프로토콜 자동 추가)
        let normalizedUrl = urlInput.trim();
        if (!normalizedUrl.match(/^https?:\/\//i)) {
          normalizedUrl = 'https://' + normalizedUrl;
        }

        // 2-2. 텍스트 추출 (퀴즈 생성용으로만 사용)
        setProgress(20);
        setProcessingStatus('URL에서 텍스트 추출 중...');
        const extracted = await extractUrlText(normalizedUrl, setProcessingStatus);
        const quizSourceText = extracted.text;

        if (extracted.wasTruncated) {
          Toast.info(
            `퀴즈 생성용 텍스트가 ${extracted.extractedLength.toLocaleString()}자로 잘렸어요`
          );
        }

        // 2-3. 퀴즈만 생성 (섹션 없음 - 원본 URL 직접 표시 예정)
        setProgress(50);
        setProcessingStatus('URL 퀴즈 생성 중 (Gemini)...');
        const result = await generateUrlQuizOnly(
          quizSourceText,
          inputTitle || new URL(normalizedUrl).hostname,
          setProcessingStatus
        );

        // 2-4. URL 문서는 단일 문서로 생성 (스텝 분할 없음)
        const urlDoc = {
          ...result,
          step: 1,
          source_type: 'url',
          source_url: normalizedUrl, // 원본 URL 저장 (학습 시 직접 호출)
          source_file: null,
          source_storage_path: null,
        };

        // URL 문서 즉시 반환 (아래 PDF/텍스트 처리 스킵)
        setProgress(100);
        onDocumentsGenerated([urlDoc]);
        Toast.success(SUCCESS.URL_CONTENT_CREATED);
        setIsProcessing(false);
        setProcessingStatus('');
        setProgress(0);
        return;
      }

      // 3. 텍스트 직접 입력
      if (inputType === 'text') {
        currentSourceInfo.type = 'manual';
      }

      // Warn if AI is offline but proceed anyway
      if (!aiStatus.online) {
        Toast.warning(WARNING.AI_OFFLINE);
      }

      const numSteps = autoSplit ? requiredSteps : 1;
      const segments = splitContentForSteps(contentText, numSteps);
      const docs = [];

      // Generate content for each step (Gemini API)
      setProgress(30);
      if (numSteps > 1) {
        const promises = segments.map((segment, i) =>
          generateOJTContent(segment, inputTitle || '새 OJT 문서', i + 1, numSteps, (status) =>
            setProcessingStatus(`Step ${i + 1}: ${status}`)
          )
        );
        const results = await Promise.all(promises);
        docs.push(
          ...results.map((r, i) => ({
            ...r,
            step: i + 1,
            source_type: currentSourceInfo.type,
            source_url: currentSourceInfo.url,
            source_file: currentSourceInfo.file,
            source_storage_path: currentSourceInfo.storage_path, // (#202)
          }))
        );
      } else {
        const result = await generateOJTContent(
          contentText,
          inputTitle || '새 OJT 문서',
          1,
          1,
          setProcessingStatus
        );
        docs.push({
          ...result,
          step: 1,
          source_type: currentSourceInfo.type,
          source_url: currentSourceInfo.url,
          source_file: currentSourceInfo.file,
          source_storage_path: currentSourceInfo.storage_path, // (#202)
        });
      }

      // Callback with generated docs
      setProgress(95);
      onDocumentsGenerated(docs);
      setProgress(100);

      // Check if any doc was created with fallback
      const fallbackDocs = docs.filter((d) => d.ai_processed === false);
      if (fallbackDocs.length > 0) {
        Toast.warning(SUCCESS.FALLBACK_CREATED(fallbackDocs.length));
      } else {
        Toast.success(SUCCESS.CONTENT_CREATED(docs.length));
      }
    } catch (error) {
      Toast.error(ERROR.CONTENT_CREATE_FAILED(error.message));
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
      setProgress(0);
    }
  };

  // Clear inputs after save (#198) - exported via static property
  const _clearInputs = () => {
    setRawInput('');
    setUrlInput('');
    setInputTitle('');
    clearPdfSelection();
  };
  void _clearInputs; // Suppress unused warning (exported via static property)

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800">콘텐츠 입력</h2>

        {/* Input Type Selector (#215 - 생성 중 비활성화) */}
        <div className="mb-4 flex gap-2">
          {['text', 'url', 'pdf'].map((type) => (
            <button
              key={type}
              onClick={() => setInputType(type)}
              disabled={isProcessing}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                inputType === type
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              } ${isProcessing ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              {type === 'text' && '텍스트'}
              {type === 'url' && 'URL'}
              {type === 'pdf' && 'PDF'}
            </button>
          ))}
        </div>

        {/* Title Input (#215 - 생성 중 비활성화) */}
        <input
          type="text"
          value={inputTitle}
          onChange={(e) => setInputTitle(e.target.value)}
          placeholder="문서 제목"
          disabled={isProcessing}
          className={`mb-4 w-full rounded-lg border px-4 py-2 ${isProcessing ? 'bg-gray-100 opacity-50' : ''}`}
        />

        {/* Content Input (#215 - 생성 중 비활성화) */}
        {inputType === 'text' && (
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="교육 콘텐츠를 입력하세요..."
            disabled={isProcessing}
            className={`h-64 w-full resize-none rounded-lg border px-4 py-3 ${isProcessing ? 'bg-gray-100 opacity-50' : ''}`}
          />
        )}

        {inputType === 'url' && (
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article"
            disabled={isProcessing}
            className={`w-full rounded-lg border px-4 py-2 ${isProcessing ? 'bg-gray-100 opacity-50' : ''}`}
          />
        )}

        {/* PDF Upload (#198) */}
        {inputType === 'pdf' && (
          <div className="space-y-4">
            {/* Hidden file input */}
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfSelect}
              className="hidden"
              id="pdf-upload"
              ref={pdfInputRef}
            />

            {/* File selection area */}
            {!selectedPdf ? (
              <label
                htmlFor="pdf-upload"
                className="block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition hover:border-blue-400 hover:bg-blue-50"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span className="text-gray-500">PDF 파일을 선택하거나 드래그하세요</span>
                  <span className="text-xs text-gray-400">최대 50MB, 100페이지</span>
                </div>
              </label>
            ) : (
              <div className="rounded-lg border bg-gray-50 p-4">
                {/* Selected file info */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-100">
                      <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5l1.5 1.5-1.5 1.5L7 15l1.5-1.5zm7 1.5l-1.5 1.5L12.5 15l1.5-1.5 1.5 1.5zM11 18h2v-2h-2v2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="max-w-xs truncate font-medium text-gray-800">
                        {selectedPdf.name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {(selectedPdf.size / (1024 * 1024)).toFixed(2)} MB
                        {pdfInfo && ` · ${pdfInfo.pages}페이지`}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={clearPdfSelection}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    title="파일 제거"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Progress bar */}
                {isProcessing && pdfProgress > 0 && (
                  <div className="mb-3">
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    </div>
                    <p className="mt-1 text-center text-xs text-gray-500">{pdfProgress}%</p>
                  </div>
                )}

                {/* PDF 선택 완료 안내 (#206) */}
                {selectedPdf && !rawInput && !isProcessing && (
                  <p className="text-center text-sm text-green-600">
                    ✓ PDF 선택 완료 - 아래 &quot;교육 자료 생성&quot; 버튼을 클릭하세요
                  </p>
                )}

                {/* Extracted text preview */}
                {rawInput && (
                  <div className="mt-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">추출된 텍스트</span>
                      <span className="text-xs text-gray-500">
                        {rawInput.length.toLocaleString()}자
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto rounded border bg-white p-3 text-sm text-gray-600">
                      {rawInput.substring(0, 500)}
                      {rawInput.length > 500 && '...'}
                    </div>
                  </div>
                )}
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
        <label className="mt-4 flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoSplit}
            onChange={(e) => setAutoSplit(e.target.checked)}
            disabled={skipAiAnalysis}
          />
          <span className={`text-sm ${skipAiAnalysis ? 'text-gray-400' : 'text-gray-600'}`}>
            자동 스텝 분할 ({requiredSteps}개)
          </span>
        </label>

        {/* Skip AI Analysis Toggle (#219) */}
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={skipAiAnalysis}
              onChange={(e) => setSkipAiAnalysis(e.target.checked)}
              className="h-4 w-4 rounded text-amber-500 focus:ring-amber-500"
            />
            <span className="text-sm font-medium text-amber-800">AI 분석 없이 원본 저장</span>
          </label>
          {skipAiAnalysis && (
            <p className="mt-2 ml-6 text-xs text-amber-700">
              ⚠️ 원본 그대로 저장됩니다. 퀴즈가 생성되지 않습니다.
            </p>
          )}
        </div>

        {/* Progress Bar (#215 - Gemini 생성 중 프로그레스바) */}
        {isProcessing && (
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              <span className="text-sm font-medium text-blue-700">{processingStatus}</span>
            </div>
            <Progress value={progress} className="h-3" />
            <p className="mt-2 text-center text-xs text-blue-600">{progress}% 완료</p>
          </div>
        )}

        {/* Generate Button (Gemini Only - Issue #200, #219) */}
        <button
          onClick={handleGenerate}
          disabled={isProcessing}
          className={`mt-4 w-full rounded-lg py-3 font-medium text-white transition disabled:cursor-not-allowed disabled:bg-gray-300 ${
            skipAiAnalysis ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              처리 중...
            </span>
          ) : skipAiAnalysis ? (
            '📄 원본 그대로 저장'
          ) : aiStatus.online ? (
            '✨ Gemini로 교육 자료 생성'
          ) : (
            '원문으로 등록 (AI 오프라인)'
          )}
        </button>
        {!aiStatus.online && !skipAiAnalysis && (
          <p className="mt-2 text-center text-xs text-amber-600">
            ⚠️ Gemini 서비스 오프라인 - 원문 그대로 등록됩니다
          </p>
        )}
      </div>
    </div>
  );
}

// Export clear function for parent component
ContentInputPanel.clearInputs = () => {};
