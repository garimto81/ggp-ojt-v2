/**
 * GeneratedDocsPreview - 생성된 문서 미리보기
 * @agent content-create-agent
 * @blocks content.preview
 */

import { validateQuizQuality } from '@/utils/api';

export default function GeneratedDocsPreview({ generatedDocs, onSave, onQuizPreview }) {
  if (generatedDocs.length === 0) return null;

  return (
    <div className="rounded-xl bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-gray-800">생성된 문서 ({generatedDocs.length}개)</h3>
        <button
          onClick={onSave}
          className="rounded-lg bg-green-500 px-4 py-2 text-white transition hover:bg-green-600"
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
              className={`rounded-lg border p-4 ${isAIFailed ? 'border-amber-300 bg-amber-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium">{doc.title}</h4>
                <div className="flex gap-1">
                  {doc.ai_engine && (
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        doc.ai_engine === 'webllm'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {doc.ai_engine === 'webllm' ? '💻 WebLLM' : '☁️ Gemini'}
                    </span>
                  )}
                  {isAIFailed && (
                    <span className="rounded bg-amber-200 px-2 py-1 text-xs font-medium text-amber-700">
                      AI 미처리
                    </span>
                  )}
                </div>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {doc.sections?.length || 0}개 섹션, {doc.quiz?.length || 0}개 퀴즈
              </p>
              {isAIFailed && doc.ai_error && (
                <p className="mt-1 text-xs text-amber-600">오류: {doc.ai_error}</p>
              )}
              {/* Quiz quality indicator */}
              <div className="mt-2 flex items-center gap-2">
                {isAIFailed ? (
                  <span className="text-xs text-gray-500">퀴즈 없음 (원문 모드)</span>
                ) : validation.valid ? (
                  <span className="rounded bg-green-50 px-2 py-1 text-xs text-green-600">
                    퀴즈 검증 통과
                  </span>
                ) : (
                  <span className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-600">
                    {validation.stats.placeholders}개 더미 문제
                  </span>
                )}
                {!isAIFailed && (
                  <button
                    onClick={() => onQuizPreview(doc, i)}
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
  );
}
