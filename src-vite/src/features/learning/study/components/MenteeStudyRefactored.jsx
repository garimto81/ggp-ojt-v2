/**
 * MenteeStudy - Refactored (컴포넌트 조합)
 * @agents learning-study-agent, learning-quiz-agent
 *
 * 분리된 컴포넌트:
 * - SectionViewer: 섹션 학습 뷰어 (learning-study-agent)
 * - QuizSession: 퀴즈 응시 (learning-quiz-agent)
 * - QuizResult: 퀴즈 결과 (learning-quiz-agent)
 */

import { useState } from 'react';
import { useDocs } from '@/contexts/DocsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Toast } from '@/contexts/ToastContext';
import { VIEW_STATES } from '@/constants';
import { WARNING, EMPTY } from '@/constants/messages';

// Refactored components
import SectionViewer from './SectionViewer';
import QuizSession from '@features/learning/quiz/components/QuizSession';

export default function MenteeStudy() {
  const { selectedDoc, setSelectedDoc } = useDocs();
  const { user, setViewState } = useAuth();

  // Quiz mode state
  const [quizMode, setQuizMode] = useState(false);

  // Back to list
  const handleBackToList = () => {
    setSelectedDoc(null);
    setViewState(VIEW_STATES.MENTEE_LIST);
  };

  // Start quiz after study complete
  const handleStudyComplete = () => {
    if (!selectedDoc?.quiz || selectedDoc.quiz.length === 0) {
      Toast.warning(WARNING.NO_QUIZ);
      return;
    }
    setQuizMode(true);
  };

  // Exit quiz mode
  const handleExitQuiz = () => {
    setQuizMode(false);
  };

  if (!selectedDoc) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{EMPTY.NO_SELECTED_DOC}</p>
        <button
          onClick={handleBackToList}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  // Quiz Mode
  if (quizMode) {
    return (
      <QuizSession
        doc={selectedDoc}
        userId={user.id}
        onBackToList={handleBackToList}
        onExitQuiz={handleExitQuiz}
      />
    );
  }

  // Study Mode
  return (
    <SectionViewer
      doc={selectedDoc}
      userId={user.id}
      onStudyComplete={handleStudyComplete}
      onBackToList={handleBackToList}
    />
  );
}
