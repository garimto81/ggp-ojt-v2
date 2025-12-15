/**
 * QuizPreviewModal - 퀴즈 검증 및 재생성 모달
 * @agent content-manage-agent
 * @blocks content.quiz-mgmt
 */

import { useState } from 'react';
import { Toast } from '@/contexts/ToastContext';
import { validateQuizQuality, regenerateQuizQuestions } from '@/utils/api';

export default function QuizPreviewModal({ previewingDoc, onClose, onQuizUpdated, rawInput }) {
  const [quizValidation, setQuizValidation] = useState(() =>
    previewingDoc ? validateQuizQuality(previewingDoc.quiz) : null
  );
  const [selectedQuizIndices, setSelectedQuizIndices] = useState([]);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [localQuiz, setLocalQuiz] = useState(previewingDoc?.quiz || []);

  if (!previewingDoc) return null;

  // Toggle quiz selection for regeneration
  const toggleQuizSelection = (idx) => {
    setSelectedQuizIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  // Select all problematic quizzes
  const selectProblematicQuizzes = () => {
    const problematic = localQuiz
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

    if (!rawInput?.trim()) {
      Toast.warning('원본 텍스트가 필요합니다.');
      return;
    }

    setIsRegenerating(true);
    try {
      const updatedQuiz = await regenerateQuizQuestions(
        rawInput,
        selectedQuizIndices,
        localQuiz,
        setProcessingStatus
      );

      setLocalQuiz(updatedQuiz);
      setQuizValidation(validateQuizQuality(updatedQuiz));
      setSelectedQuizIndices([]);

      // Notify parent
      onQuizUpdated(updatedQuiz, previewingDoc._index);

      Toast.success(`${selectedQuizIndices.length}개 퀴즈가 재생성되었습니다.`);
    } catch (error) {
      Toast.error(`재생성 실패: ${error.message}`);
    } finally {
      setIsRegenerating(false);
      setProcessingStatus('');
    }
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="mx-4 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-800">퀴즈 검증: {previewingDoc.title}</h3>
            {quizValidation && (
              <p className="mt-1 text-sm text-gray-500">
                총 {quizValidation.stats.total}개 중 {quizValidation.stats.validCount}개 유효
                {quizValidation.stats.placeholders > 0 && (
                  <span className="ml-2 text-amber-600">
                    ({quizValidation.stats.placeholders}개 더미)
                  </span>
                )}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600">
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Action buttons */}
          <div className="mb-4 flex gap-2">
            <button
              onClick={selectProblematicQuizzes}
              disabled={quizValidation?.stats.placeholders === 0}
              className="rounded bg-amber-100 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-200 disabled:opacity-50"
            >
              더미 문제 선택
            </button>
            <button
              onClick={handleRegenerateQuizzes}
              disabled={selectedQuizIndices.length === 0 || isRegenerating}
              className="rounded bg-blue-500 px-3 py-1.5 text-sm text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {isRegenerating
                ? processingStatus || '재생성 중...'
                : `선택 항목 재생성 (${selectedQuizIndices.length}개)`}
            </button>
          </div>

          {/* Quiz list */}
          <div className="space-y-3">
            {localQuiz?.map((q, idx) => {
              const isProblematic = q.isPlaceholder || q.question?.includes('[자동 생성]');
              const isSelected = selectedQuizIndices.includes(idx);

              return (
                <div
                  key={idx}
                  onClick={() => toggleQuizSelection(idx)}
                  className={`cursor-pointer rounded-lg border p-4 transition ${
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
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-gray-500">Q{idx + 1}</span>
                        {isProblematic && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-600">
                            더미
                          </span>
                        )}
                      </div>
                      <p className="mb-2 font-medium text-gray-800">{q.question}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {q.options?.map((opt, optIdx) => (
                          <div
                            key={optIdx}
                            className={`rounded px-2 py-1 ${
                              optIdx === q.correct
                                ? 'bg-green-100 font-medium text-green-800'
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
        <div className="flex justify-end gap-3 border-t bg-gray-50 p-4">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:text-gray-800">
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
