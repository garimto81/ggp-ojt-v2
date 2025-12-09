/**
 * ContentInputPanel - 콘텐츠 입력 및 AI 생성
 * @agent content-create-agent
 * @blocks content.input, content.generate
 */

import { useState } from 'react';
import { useAuth } from '@features/auth';
import { useAI } from '@features/ai';
import { Toast } from '@/contexts/ToastContext';
import {
  generateOJTContent,
  extractUrlText,
} from '@/utils/api';
import {
  estimateReadingTime,
  calculateRequiredSteps,
  splitContentForSteps,
} from '@/utils/helpers';
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

  // Processing states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');

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

      // Determine source info based on input type
      const currentSourceInfo = {
        type: inputType === 'url' ? 'url' : inputType === 'pdf' ? 'pdf' : 'manual',
        url: inputType === 'url' ? urlInput.trim() : null,
        file: null,
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

  // Clear inputs after save
  const clearInputs = () => {
    setRawInput('');
    setUrlInput('');
    setInputTitle('');
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
