/**
 * MenteeStudy - Refactored (컴포넌트 조합)
 * @agents learning-study-agent, learning-quiz-agent
 * @issue #200 - Context API 기반 퀴즈 생성
 *
 * 분리된 컴포넌트:
 * - SectionViewer: 섹션 학습 뷰어 (learning-study-agent) - text 입력
 * - UrlViewer: URL 원본 뷰어 (learning-study-agent) - url 입력
 * - PdfViewer: PDF 원본 뷰어 (learning-study-agent) - pdf 입력
 * - QuizSession: 퀴즈 응시 (learning-quiz-agent)
 * - QuizResult: 퀴즈 결과 (learning-quiz-agent)
 *
 * source_type별 분기:
 * - 'manual' (text): SectionViewer (sections 표시)
 * - 'url': UrlViewer (iframe/새탭)
 * - 'pdf': PdfViewer (react-pdf)
 */

import { useState } from 'react';

import { VIEW_STATES } from '@/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useDocs } from '@/contexts/DocsContext';
import { Toast } from '@/contexts/ToastContext';

// Refactored components
import QuizSession from '@features/learning/quiz/components/QuizSession';

import PdfViewer from './PdfViewer';
import SectionViewer from './SectionViewer';
import UrlViewer from './UrlViewer';

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
      Toast.warning('이 문서에는 퀴즈가 없습니다.');
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
      <div className="py-12 text-center">
        <p className="text-gray-500">선택된 문서가 없습니다.</p>
        <button
          onClick={handleBackToList}
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
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

  // Study Mode - source_type별 뷰어 분기 (#200)
  const renderContentViewer = () => {
    const sourceType = selectedDoc.source_type || 'manual';

    // URL 문서: UrlViewer
    if (sourceType === 'url' && selectedDoc.source_url) {
      return (
        <UrlViewer url={selectedDoc.source_url} title={selectedDoc.title} className="h-[500px]" />
      );
    }

    // PDF 문서: PdfViewer
    if (sourceType === 'pdf') {
      return (
        <PdfViewer
          url={selectedDoc.source_url}
          fileName={selectedDoc.source_file}
          title={selectedDoc.title}
          className="h-[500px]"
        />
      );
    }

    // 텍스트 문서 (기본): SectionViewer
    return (
      <SectionViewer
        doc={selectedDoc}
        onStudyComplete={handleStudyComplete}
        onBackToList={handleBackToList}
      />
    );
  };

  // URL/PDF 문서는 별도 레이아웃 (퀴즈 버튼 포함)
  const sourceType = selectedDoc.source_type || 'manual';
  if (sourceType === 'url' || sourceType === 'pdf') {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={handleBackToList}
              className="mb-2 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              목록으로
            </button>
            <h1 className="text-xl font-bold text-gray-800">{selectedDoc.title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {sourceType === 'url' ? '🔗 URL 문서' : '📄 PDF 문서'}
            </p>
          </div>
          <button
            onClick={handleStudyComplete}
            disabled={!selectedDoc?.quiz || selectedDoc.quiz.length === 0}
            className="flex items-center gap-2 rounded-lg bg-green-500 px-6 py-2 text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            퀴즈 풀기 ({selectedDoc?.quiz?.length || 0}문제)
          </button>
        </div>

        {/* Content Viewer */}
        {renderContentViewer()}

        {/* Footer 안내 */}
        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            💡 위 콘텐츠를 학습한 후 &quot;퀴즈 풀기&quot; 버튼을 클릭하여 학습 내용을 확인하세요.
          </p>
        </div>
      </div>
    );
  }

  // 텍스트 문서 (기존 SectionViewer 사용)
  return (
    <SectionViewer
      doc={selectedDoc}
      onStudyComplete={handleStudyComplete}
      onBackToList={handleBackToList}
    />
  );
}
