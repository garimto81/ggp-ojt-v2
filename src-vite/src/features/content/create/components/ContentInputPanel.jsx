/**
 * ContentInputPanel - 콘텐츠 입력 및 AI 생성
 * @agent content-create-agent
 * @blocks content.input, content.generate
 * @issue #198 - PDF 업로드 및 URL 텍스트 추출 기능
 */

import { useState, useRef } from 'react';
import { useAuth } from '@features/auth';
import { useAI } from '@features/ai';
import { Toast } from '@/contexts/ToastContext';
import { generateOJTContent, extractUrlText } from '@/utils/api';
import { extractPdfText, validatePdfFile, getPdfInfo } from '@/utils/pdf';
import { estimateReadingTime, calculateRequiredSteps, splitContentForSteps } from '@/utils/helpers';
import AIEngineSelector from '@features/ai/components/AIEngineSelector';

export default function ContentInputPanel({
  aiStatus,
  onDocumentsGenerated,
  rawInput,
  setRawInput,
}) {
  const { user } = useAuth();
  const { engine, webllmStatus, fallbackEnabled } = useAI();

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
    if (inputType === 'pdf' && !rawInput.trim()) {
      Toast.warning('PDF에서 텍스트를 먼저 추출해주세요.');
      return;
    }

    setIsProcessing(true);
    setProcessingStatus('콘텐츠 분석 중...');

    try {
      let contentText = rawInput;

      // Determine source info based on input type (#198)
      const currentSourceInfo = {
        type: inputType === 'url' ? 'url' : inputType === 'pdf' ? 'pdf' : 'manual',
        url: inputType === 'url' ? urlInput.trim() : null,
        file: inputType === 'pdf' && selectedPdf ? selectedPdf.name : null,
      };

      // Handle URL input - extract text first
      if (inputType === 'url') {
        setProcessingStatus('URL에서 텍스트 추출 중...');
        const extracted = await extractUrlText(urlInput, setProcessingStatus);
        contentText = extracted.text;
        setRawInput(contentText);
        if (extracted.wasTruncated) {
          Toast.warning(
            `텍스트가 ${extracted.originalLength}자에서 ${extracted.extractedLength}자로 잘렸습니다.`
          );
        }
      }

      // Warn if AI is offline but proceed anyway
      if (!aiStatus.online) {
        Toast.warning('AI 서비스 오프라인 - 원문으로 등록됩니다.');
      }

      const numSteps = autoSplit ? requiredSteps : 1;
      const segments = splitContentForSteps(contentText, numSteps);
      const docs = [];

      // AI 엔진 옵션 설정
      const aiOptions = {
        engine,
        fallbackEnabled,
      };

      // WebLLM 선택 시 모델 로드 확인
      if (engine === 'webllm' && !webllmStatus.loaded) {
        Toast.warning('WebLLM 모델을 먼저 로드해주세요.');
        setIsProcessing(false);
        return;
      }

      // Generate content for each step
      if (numSteps > 1) {
        const promises = segments.map((segment, i) =>
          generateOJTContent(
            segment,
            inputTitle || '새 OJT 문서',
            i + 1,
            numSteps,
            (status) => setProcessingStatus(`Step ${i + 1}: ${status}`),
            aiOptions
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
          }))
        );
      } else {
        const result = await generateOJTContent(
          contentText,
          inputTitle || '새 OJT 문서',
          1,
          1,
          setProcessingStatus,
          aiOptions
        );
        docs.push({
          ...result,
          step: 1,
          source_type: currentSourceInfo.type,
          source_url: currentSourceInfo.url,
          source_file: currentSourceInfo.file,
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
    } catch (error) {
      Toast.error(`오류: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
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
      {/* AI Engine Selector */}
      <AIEngineSelector />

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
                className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                           hover:border-blue-400 hover:bg-blue-50 transition block"
              >
                <div className="flex flex-col items-center gap-2">
                  <svg
                    className="w-12 h-12 text-gray-400"
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
              <div className="border rounded-lg p-4 bg-gray-50">
                {/* Selected file info */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 2l5 5h-5V4zM8.5 13.5l1.5 1.5-1.5 1.5L7 15l1.5-1.5zm7 1.5l-1.5 1.5L12.5 15l1.5-1.5 1.5 1.5zM11 18h2v-2h-2v2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 truncate max-w-xs">
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
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${pdfProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-center">{pdfProgress}%</p>
                  </div>
                )}

                {/* Extract button */}
                {!rawInput && (
                  <button
                    onClick={handlePdfExtract}
                    disabled={isProcessing}
                    className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                               disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {isProcessing ? processingStatus : '📄 텍스트 추출'}
                  </button>
                )}

                {/* Extracted text preview */}
                {rawInput && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">추출된 텍스트</span>
                      <span className="text-xs text-gray-500">
                        {rawInput.length.toLocaleString()}자
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto p-3 bg-white border rounded text-sm text-gray-600">
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
        <label className="flex items-center gap-2 mt-4">
          <input
            type="checkbox"
            checked={autoSplit}
            onChange={(e) => setAutoSplit(e.target.checked)}
          />
          <span className="text-sm text-gray-600">자동 스텝 분할 ({requiredSteps}개)</span>
        </label>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={isProcessing || (engine === 'webllm' && !webllmStatus.loaded)}
          className={`w-full mt-4 py-3 text-white font-medium rounded-lg disabled:bg-gray-300 disabled:cursor-not-allowed transition ${
            engine === 'webllm'
              ? 'bg-green-500 hover:bg-green-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
        >
          {isProcessing
            ? processingStatus
            : engine === 'webllm'
              ? webllmStatus.loaded
                ? '💻 WebLLM으로 교육 자료 생성'
                : '모델을 먼저 로드해주세요'
              : aiStatus.online
                ? '☁️ Gemini로 교육 자료 생성'
                : '원문으로 등록 (AI 오프라인)'}
        </button>
        {engine === 'gemini' && !aiStatus.online && (
          <p className="text-xs text-amber-600 mt-2 text-center">
            ⚠️ Gemini 서비스 오프라인 - 원문 그대로 등록됩니다
          </p>
        )}
        {engine === 'webllm' && !webllmStatus.loaded && (
          <p className="text-xs text-green-600 mt-2 text-center">
            💡 상단에서 모델을 로드한 후 사용할 수 있습니다
          </p>
        )}
      </div>
    </div>
  );
}

// Export clear function for parent component
ContentInputPanel.clearInputs = () => {};
