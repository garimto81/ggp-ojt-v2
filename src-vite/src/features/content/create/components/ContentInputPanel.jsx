/**
 * ContentInputPanel - 콘텐츠 입력 및 AI 생성
 * @agent content-create-agent
 * @blocks content.input, content.generate
 * @issue #198 - PDF 업로드 및 URL 텍스트 추출 기능
 * @issue #200 - WebLLM 제거, Gemini 단일 엔진, Context API 퀴즈 생성
 *
 * 입력 타입별 처리:
 * - text: Gemini 정제 → sections[] + quiz[]
 * - url: 원본 URL 저장 → context-quiz-agent → quiz[] only (sections=null)
 * - pdf: 원본 파일 저장 → context-quiz-agent → quiz[] only (sections=null)
 */

import { useState, useRef } from 'react';

import { Toast } from '@/contexts/ToastContext';
import { generateOJTContent, extractUrlText } from '@/utils/api';
import { estimateReadingTime, calculateRequiredSteps, splitContentForSteps } from '@/utils/helpers';
import { extractPdfText, validatePdfFile, getPdfInfo } from '@/utils/pdf';

// Context Quiz Agent - URL/PDF 퀴즈 전용 생성 (#200)
import {
  generateQuizFromUrl,
  generateQuizFromLocalFile,
  extractTitleFromUrl,
  isPdfUrl,
} from '@features/ai/agents/context-quiz';

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

  // PDF states (#198)
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [pdfInfo, setPdfInfo] = useState(null);
  const [pdfProgress, setPdfProgress] = useState(0);
  const pdfInputRef = useRef(null);

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

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

      Toast.success(`PDF 선택됨: ${info.pages}페이지`);
    } catch (error) {
      Toast.error(`PDF 정보 읽기 실패: ${error.message}`);
      setSelectedPdf(null);
    }
  };

  // Handle PDF text extraction (#198)
  const handlePdfExtract = async () => {
    if (!selectedPdf) {
      Toast.warning('PDF 파일을 먼저 선택해주세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('PDF 텍스트 추출 중...');
    setPdfProgress(0);

    try {
      const result = await extractPdfText(selectedPdf, (progress) => {
        setPdfProgress(progress);
        setProcessingStatus(`PDF 텍스트 추출 중... ${progress}%`);
      });

      setRawInput(result.text);

      if (result.wasTruncated) {
        Toast.warning(
          `텍스트가 ${result.originalLength.toLocaleString()}자에서 ${result.extractedLength.toLocaleString()}자로 잘렸습니다.`
        );
      } else {
        Toast.success(
          `${result.pages}페이지에서 ${result.extractedLength.toLocaleString()}자 추출 완료`
        );
      }
    } catch (error) {
      Toast.error(`PDF 추출 실패: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Clear PDF selection
  const clearPdfSelection = () => {
    setSelectedPdf(null);
    setPdfInfo(null);
    setPdfProgress(0);
    if (pdfInputRef.current) {
      pdfInputRef.current.value = '';
    }
  };

  // Handle content generation - 입력 타입별 분기 (#200)
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
    if (inputType === 'pdf' && !selectedPdf) {
      Toast.warning('PDF 파일을 선택해주세요.');
      return;
    }

    setIsProcessing(true);

    try {
      // 입력 타입별 분기 처리
      switch (inputType) {
        case 'url':
          await handleUrlGenerate();
          break;
        case 'pdf':
          await handlePdfGenerate();
          break;
        case 'text':
        default:
          await handleTextGenerate();
          break;
      }
    } catch (error) {
      Toast.error(`오류: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  /**
   * URL 입력 처리 - Context Quiz Agent 사용 (#200)
   * URL 원본 저장 + 퀴즈만 생성 (sections = null)
   */
  const handleUrlGenerate = async () => {
    const url = urlInput.trim();
    setProcessingStatus('URL 콘텐츠 분석 중...');

    // URL 제목 추출 (사용자 입력 없으면)
    const title = inputTitle || extractTitleFromUrl(url);

    // Gemini URL Context Tool로 퀴즈 생성
    const quiz = await generateQuizFromUrl(url, {
      quizCount: 10,
      onProgress: setProcessingStatus,
    });

    // 문서 생성 (sections = null, 원본 URL 저장)
    const doc = {
      title,
      sections: null, // 원본 표시용
      quiz,
      source_type: 'url',
      source_url: url,
      source_file: null,
      step: 1,
      ai_processed: true,
    };

    onDocumentsGenerated([doc]);
    Toast.success(`URL 문서 생성 완료! 퀴즈 ${quiz.length}개`);
  };

  /**
   * PDF 입력 처리 - Context Quiz Agent 사용 (#200)
   * PDF 원본 저장 + 퀴즈만 생성 (sections = null)
   */
  const handlePdfGenerate = async () => {
    setProcessingStatus('PDF 분석 중...');

    // PDF 제목 추출
    const title = inputTitle || pdfInfo?.title || selectedPdf.name.replace('.pdf', '');

    // Online PDF URL인지 확인
    const isOnlinePdf = isPdfUrl(urlInput);

    let quiz;
    let sourceUrl = null;

    if (isOnlinePdf) {
      // Online PDF: URL Context Tool 사용
      sourceUrl = urlInput.trim();
      quiz = await generateQuizFromUrl(sourceUrl, {
        quizCount: 10,
        onProgress: setProcessingStatus,
      });
    } else {
      // Local PDF: Files API 사용
      const result = await generateQuizFromLocalFile(selectedPdf, {
        quizCount: 10,
        onProgress: setProcessingStatus,
      });
      quiz = result.quiz;
      // fileInfo는 48시간 유효 - 필요시 source_file_uri 저장 가능
    }

    // 문서 생성 (sections = null, 원본 PDF 저장)
    const doc = {
      title,
      sections: null, // 원본 표시용
      quiz,
      source_type: 'pdf',
      source_url: sourceUrl,
      source_file: selectedPdf.name,
      step: 1,
      ai_processed: true,
    };

    onDocumentsGenerated([doc]);
    Toast.success(`PDF 문서 생성 완료! 퀴즈 ${quiz.length}개`);
  };

  /**
   * 텍스트 입력 처리 - 기존 Gemini 정제 방식
   * sections[] + quiz[] 생성
   */
  const handleTextGenerate = async () => {
    setProcessingStatus('콘텐츠 분석 중...');

    // Warn if AI is offline but proceed anyway
    if (!aiStatus.online) {
      Toast.warning('AI 서비스 오프라인 - 원문으로 등록됩니다.');
    }

    const numSteps = autoSplit ? requiredSteps : 1;
    const segments = splitContentForSteps(rawInput, numSteps);
    const docs = [];

    // Generate content for each step (Gemini API)
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
          source_type: 'manual',
          source_url: null,
          source_file: null,
        }))
      );
    } else {
      const result = await generateOJTContent(
        rawInput,
        inputTitle || '새 OJT 문서',
        1,
        1,
        setProcessingStatus
      );
      docs.push({
        ...result,
        step: 1,
        source_type: 'manual',
        source_url: null,
        source_file: null,
      });
    }

    // Callback with generated docs
    onDocumentsGenerated(docs);

    // Check if any doc was created with fallback
    const fallbackDocs = docs.filter((d) => d.ai_processed === false);
    if (fallbackDocs.length > 0) {
      Toast.warning(`${fallbackDocs.length}개 문서가 AI 분석 없이 원문으로 생성되었습니다.`);
    } else {
      Toast.success(`${docs.length}개 문서가 생성되었습니다.`);
    }
  };

  // Clear inputs after save (#198)
  const clearInputs = () => {
    setRawInput('');
    setUrlInput('');
    setInputTitle('');
    clearPdfSelection();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-gray-800">콘텐츠 입력</h2>

        {/* Input Type Selector */}
        <div className="mb-4 flex gap-2">
          {['text', 'url', 'pdf'].map((type) => (
            <button
              key={type}
              onClick={() => setInputType(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
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
          className="mb-4 w-full rounded-lg border px-4 py-2"
        />

        {/* Content Input */}
        {inputType === 'text' && (
          <textarea
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder="교육 콘텐츠를 입력하세요..."
            className="h-64 w-full resize-none rounded-lg border px-4 py-3"
          />
        )}

        {inputType === 'url' && (
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full rounded-lg border px-4 py-2"
          />
        )}

        {/* PDF Upload - Context API 기반 (#200) */}
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
                  <span className="text-xs text-gray-400">최대 50MB · Gemini Files API 사용</span>
                </div>
              </label>
            ) : (
              <div className="rounded-lg border bg-gray-50 p-4">
                {/* Selected file info */}
                <div className="flex items-center justify-between">
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
                    disabled={isProcessing}
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

                {/* Context API 안내 (#200) */}
                <p className="mt-3 rounded bg-blue-50 px-3 py-2 text-xs text-blue-600">
                  💡 PDF 원본이 학습 화면에 표시되고, Gemini가 자동으로 퀴즈를 생성합니다.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Stats - 텍스트 입력 시에만 표시 (#200) */}
        {inputType === 'text' && rawInput && (
          <div className="mt-4 flex gap-4 text-sm text-gray-500">
            <span>예상 학습 시간: {estimatedTime}분</span>
            <span>권장 스텝 수: {requiredSteps}</span>
          </div>
        )}

        {/* Auto Split Toggle - 텍스트 입력 시에만 표시 (#200) */}
        {inputType === 'text' && (
          <label className="mt-4 flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoSplit}
              onChange={(e) => setAutoSplit(e.target.checked)}
            />
            <span className="text-sm text-gray-600">자동 스텝 분할 ({requiredSteps}개)</span>
          </label>
        )}

        {/* URL/PDF 안내 메시지 (#200) */}
        {inputType === 'url' && urlInput && (
          <p className="mt-4 rounded bg-blue-50 px-3 py-2 text-xs text-blue-600">
            💡 URL 원본이 학습 화면에 표시되고, Gemini URL Context Tool로 퀴즈를 생성합니다.
          </p>
        )}

        {/* Generate Button - 입력 타입별 텍스트 (#200) */}
        <button
          onClick={handleGenerate}
          disabled={
            isProcessing ||
            (inputType === 'url' && !urlInput) ||
            (inputType === 'pdf' && !selectedPdf) ||
            (inputType === 'text' && !rawInput)
          }
          className="mt-4 w-full rounded-lg bg-blue-500 py-3 font-medium text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isProcessing
            ? processingStatus
            : inputType === 'url'
              ? '🔗 URL에서 퀴즈 생성'
              : inputType === 'pdf'
                ? '📄 PDF에서 퀴즈 생성'
                : aiStatus.online
                  ? '✨ Gemini로 교육 자료 생성'
                  : '원문으로 등록 (AI 오프라인)'}
        </button>
        {inputType === 'text' && !aiStatus.online && (
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
