// OJT Master v2.7.0 - Quiz Editor Component
// FR-302: 퀴즈 개별 수정 UI

import { useState, useCallback } from 'react';
import { useDocs } from '../contexts/DocsContext';
import { Toast } from '../contexts/ToastContext';

/**
 * 퀴즈 에디터 컴포넌트
 * 인라인 편집 모드로 질문, 선택지, 정답 수정 가능
 *
 * @param {Object} quiz - 퀴즈 객체 { question, options, correct, isPlaceholder }
 * @param {number} quizIndex - 퀴즈 인덱스
 * @param {string} docId - 문서 ID
 * @param {function} onUpdate - 수정 완료 콜백
 * @param {function} onDelete - 삭제 콜백
 * @param {function} onCancel - 취소 콜백
 * @param {boolean} canDelete - 삭제 가능 여부 (최소 4개 유지)
 */
export default function QuizEditor({
  quiz,
  quizIndex,
  docId,
  onUpdate,
  onDelete,
  onCancel,
  canDelete = true,
}) {
  const { updateQuiz, deleteQuiz } = useDocs();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 편집 폼 상태
  const [editedQuestion, setEditedQuestion] = useState(quiz.question || '');
  const [editedOptions, setEditedOptions] = useState(quiz.options || ['', '', '', '']);
  const [editedCorrect, setEditedCorrect] = useState(quiz.correct ?? 0);

  // 편집 모드 진입
  const handleEdit = () => {
    setEditedQuestion(quiz.question || '');
    setEditedOptions([...(quiz.options || ['', '', '', ''])]);
    setEditedCorrect(quiz.correct ?? 0);
    setIsEditing(true);
  };

  // 편집 취소
  const handleCancel = () => {
    setIsEditing(false);
    setShowDeleteConfirm(false);
    onCancel?.();
  };

  // 저장
  const handleSave = useCallback(async () => {
    // 검증
    if (!editedQuestion.trim()) {
      Toast.warning('질문을 입력해주세요.');
      return;
    }

    const emptyOptions = editedOptions.filter((opt) => !opt.trim());
    if (emptyOptions.length > 0) {
      Toast.warning('모든 선택지를 입력해주세요.');
      return;
    }

    setIsSaving(true);
    try {
      const updatedQuiz = {
        question: editedQuestion.trim(),
        options: editedOptions.map((opt) => opt.trim()),
        correct: editedCorrect,
        is_placeholder: false,
      };

      await updateQuiz(docId, quizIndex, updatedQuiz);
      setIsEditing(false);
      onUpdate?.(updatedQuiz);
      Toast.success('퀴즈가 수정되었습니다.');
    } catch (error) {
      Toast.error(`수정 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [docId, quizIndex, editedQuestion, editedOptions, editedCorrect, updateQuiz, onUpdate]);

  // 삭제
  const handleDelete = useCallback(async () => {
    if (!canDelete) {
      Toast.warning('최소 4개의 퀴즈가 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      await deleteQuiz(docId, quizIndex);
      onDelete?.();
      Toast.success('퀴즈가 삭제되었습니다.');
    } catch (error) {
      Toast.error(`삭제 실패: ${error.message}`);
    } finally {
      setIsSaving(false);
      setShowDeleteConfirm(false);
    }
  }, [docId, quizIndex, canDelete, deleteQuiz, onDelete]);

  // 선택지 변경 핸들러
  const handleOptionChange = (index, value) => {
    const newOptions = [...editedOptions];
    newOptions[index] = value;
    setEditedOptions(newOptions);
  };

  // 더미 문제 여부
  const isPlaceholder = quiz.is_placeholder || quiz.question?.includes('[자동 생성]');

  // 편집 모드
  if (isEditing) {
    return (
      <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
        {/* 질문 입력 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            질문 (Q{quizIndex + 1})
          </label>
          <textarea
            value={editedQuestion}
            onChange={(e) => setEditedQuestion(e.target.value)}
            placeholder="질문을 입력하세요"
            className="w-full px-3 py-2 border rounded-lg resize-none h-20"
          />
        </div>

        {/* 선택지 입력 */}
        <div className="mb-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">선택지</label>
          {editedOptions.map((option, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <input
                type="radio"
                name={`correct-${quizIndex}`}
                checked={editedCorrect === idx}
                onChange={() => setEditedCorrect(idx)}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-medium text-gray-500 w-6">
                {String.fromCharCode(65 + idx)}.
              </span>
              <input
                type="text"
                value={option}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                placeholder={`선택지 ${String.fromCharCode(65 + idx)}`}
                className={`flex-1 px-3 py-2 border rounded-lg ${
                  editedCorrect === idx ? 'border-green-400 bg-green-50' : ''
                }`}
              />
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">라디오 버튼을 클릭하여 정답을 선택하세요</p>
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    );
  }

  // 삭제 확인 모달
  if (showDeleteConfirm) {
    return (
      <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
        <p className="text-sm text-red-700 mb-4">
          이 퀴즈를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setShowDeleteConfirm(false)}
            disabled={isSaving}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleDelete}
            disabled={isSaving}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
          >
            {isSaving ? '삭제 중...' : '삭제'}
          </button>
        </div>
      </div>
    );
  }

  // 보기 모드
  return (
    <div
      className={`border rounded-lg p-4 transition ${
        isPlaceholder ? 'border-amber-300 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
      }`}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500">Q{quizIndex + 1}</span>
          {isPlaceholder && (
            <span className="text-xs text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded">더미</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleEdit}
            className="text-xs text-blue-500 hover:text-blue-700 px-2 py-1"
            title="수정"
          >
            수정
          </button>
          {canDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
              title="삭제"
            >
              삭제
            </button>
          )}
        </div>
      </div>

      {/* 질문 */}
      <p className="font-medium text-gray-800 mb-3">{quiz.question}</p>

      {/* 선택지 */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {quiz.options?.map((opt, optIdx) => (
          <div
            key={optIdx}
            className={`px-2 py-1.5 rounded ${
              optIdx === quiz.correct
                ? 'bg-green-100 text-green-800 font-medium'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {String.fromCharCode(65 + optIdx)}. {opt}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 퀴즈 리스트 에디터 컴포넌트
 * 문서의 전체 퀴즈 목록을 관리
 *
 * @param {string} docId - 문서 ID
 * @param {Array} quizzes - 퀴즈 배열
 * @param {function} onClose - 닫기 콜백
 */
export function QuizListEditor({ docId, quizzes, onClose }) {
  const { addQuiz } = useDocs();
  const [isAddingQuiz, setIsAddingQuiz] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 퀴즈 추가
  const handleAddQuiz = async () => {
    setIsAddingQuiz(true);
    try {
      await addQuiz(docId, {
        question: '새 질문을 입력하세요',
        options: ['선택지 A', '선택지 B', '선택지 C', '선택지 D'],
        correct: 0,
      });
      setRefreshKey((k) => k + 1);
      Toast.success('새 퀴즈가 추가되었습니다.');
    } catch (error) {
      Toast.error(`추가 실패: ${error.message}`);
    } finally {
      setIsAddingQuiz(false);
    }
  };

  const quizList = quizzes || [];
  const canDelete = quizList.length > 4;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">퀴즈 편집</h3>
            <p className="text-sm text-gray-500 mt-1">총 {quizList.length}개 퀴즈</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleAddQuiz}
              disabled={isAddingQuiz}
              className="px-3 py-1.5 text-sm bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {isAddingQuiz ? '추가 중...' : '퀴즈 추가'}
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              &times;
            </button>
          </div>
        </div>

        {/* 퀴즈 목록 */}
        <div className="p-6 overflow-y-auto flex-1" key={refreshKey}>
          <div className="space-y-4">
            {quizList.map((quiz, idx) => (
              <QuizEditor
                key={`${docId}-${idx}-${refreshKey}`}
                quiz={quiz}
                quizIndex={idx}
                docId={docId}
                canDelete={canDelete}
                onUpdate={() => setRefreshKey((k) => k + 1)}
                onDelete={() => setRefreshKey((k) => k + 1)}
              />
            ))}
          </div>

          {quizList.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              퀴즈가 없습니다. 위의 "퀴즈 추가" 버튼을 클릭하여 추가하세요.
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-xs text-gray-500">최소 4개의 퀴즈가 필요합니다</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
