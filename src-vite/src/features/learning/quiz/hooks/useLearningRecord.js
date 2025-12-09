/**
 * useLearningRecord - 학습 기록 저장 훅
 * @agent learning-quiz-agent
 * @blocks learning.record
 */

import { useCallback } from 'react';
import { supabase } from '@/utils/api';
import { Toast } from '@/contexts/ToastContext';
import { CONFIG } from '@/constants';

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
      await supabase.from('learning_records').insert({
        user_id: userId,
        doc_id: docId,
        score: score,
        total_questions: totalQuestions,
        passed: passed,
        completed_at: Date.now(),
      });

      if (passed) {
        Toast.success('축하합니다! 퀴즈를 통과했습니다!');
      } else {
        Toast.warning('아쉽습니다. 다시 도전해보세요.');
      }

      return passed;
    } catch (error) {
      console.error('Failed to save learning record:', error);
      Toast.error('학습 기록 저장에 실패했습니다.');
      return passed;
    }
  }, []);

  return { saveLearningRecord };
}

export default useLearningRecord;
