/**
 * useLearningRecord - 학습 기록 저장 훅
 * @agent learning-quiz-agent
 * @blocks learning.record
 *
 * 학습 완료 판단 기준 (Issue #221):
 * - 퀴즈 있음 → saveLearningRecord() → passed=true (score>=3)
 * - 퀴즈 없음 → saveViewCompletion() → passed=true (score=null)
 */

import { useCallback } from 'react';

import { CONFIG } from '@/constants';
import { SUCCESS, WARNING, ERROR } from '@/constants/messages';
import { Toast } from '@/contexts/ToastContext';
import { supabase } from '@/utils/api';

export function useLearningRecord() {
  /**
   * Save learning record after quiz completion
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.docId - Document ID
   * @param {number} params.score - Number of correct answers
   * @param {number} params.totalQuestions - Total number of questions
   * @returns {Promise<boolean>} Whether the user passed
   */
  const saveLearningRecord = useCallback(async ({ userId, docId, score, totalQuestions }) => {
    const passed = score >= CONFIG.QUIZ_PASS_THRESHOLD;

    try {
      // upsert: 재학습 시 기존 기록 갱신 (UNIQUE(user_id, doc_id) 제약조건)
      await supabase.from('learning_records').upsert(
        {
          user_id: userId,
          doc_id: docId,
          score: score,
          total_questions: totalQuestions,
          passed: passed,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,doc_id' }
      );

      if (passed) {
        Toast.success(SUCCESS.QUIZ_PASSED);
      } else {
        Toast.warning(WARNING.QUIZ_FAILED);
      }

      return passed;
    } catch (error) {
      console.error('Failed to save learning record:', error);
      Toast.error(ERROR.LEARNING_RECORD_FAILED);
      return passed;
    }
  }, []);

  /**
   * Save view completion for documents without quiz
   * @param {Object} params
   * @param {string} params.userId - User ID
   * @param {string} params.docId - Document ID
   * @returns {Promise<boolean>} Always returns true on success
   */
  const saveViewCompletion = useCallback(async ({ userId, docId }) => {
    try {
      // 퀴즈 없는 문서: score=null, passed=true로 저장
      await supabase.from('learning_records').upsert(
        {
          user_id: userId,
          doc_id: docId,
          score: null,
          total_questions: 0,
          passed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,doc_id' }
      );

      Toast.success(SUCCESS.VIEW_COMPLETE);
      return true;
    } catch (error) {
      console.error('Failed to save view completion:', error);
      Toast.error(ERROR.LEARNING_RECORD_FAILED);
      return false;
    }
  }, []);

  return { saveLearningRecord, saveViewCompletion };
}

export default useLearningRecord;
