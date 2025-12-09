/**
 * SectionViewer - 섹션 학습 뷰어
 * @agent learning-study-agent
 * @blocks learning.section
 */

import { useState } from 'react';
import { sanitizeHtml } from '@/utils/helpers';

export default function SectionViewer({
  doc,
  onStudyComplete,
  onBackToList,
}) {
  const [currentSection, setCurrentSection] = useState(0);
  const [studyCompleted, setStudyCompleted] = useState(false);

  const sections = doc?.sections || [];
  const totalSections = sections.length;
  const hasQuiz = doc?.quiz && doc.quiz.length > 0;
  const isAIProcessed = doc?.ai_processed !== false;

  const handlePrevSection = () => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  };

  const handleNextSection = () => {
    if (currentSection < totalSections - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      setStudyCompleted(true);
    }
  };

  const handleStartQuiz = () => {
    if (onStudyComplete) {
      onStudyComplete();
    }
  };

  if (!doc) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">선택된 문서가 없습니다.</p>
        <button
          onClick={onBackToList}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          목록으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBackToList}
            className="text-gray-500 hover:text-gray-700 transition"
          >
            ← 목록으로
          </button>
          <span className="text-sm text-gray-500">Step {doc.step || 1}</span>
        </div>

        <h1 className="text-2xl font-bold text-gray-800 mb-2">{doc.title}</h1>

        {doc.estimated_minutes && (
          <p className="text-sm text-gray-500">예상 학습 시간: {doc.estimated_minutes}분</p>
        )}

        {/* 원문 보기 버튼 */}
        {doc.source_url && (
          <a
            href={doc.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-3 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition text-sm"
          >
            <span>🔗</span>
            <span>원문 보기</span>
            <span className="text-xs text-blue-400">
              ({doc.source_type === 'url' ? 'URL' : 'PDF'})
            </span>
          </a>
        )}

        {/* Section Progress */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
            <span>
              섹션 {currentSection + 1} / {totalSections}
            </span>
            <span>{Math.round(((currentSection + 1) / totalSections) * 100)}% 완료</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all"
              style={{
                width: `${((currentSection + 1) / totalSections) * 100}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Section Content */}
      {sections.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            {sections[currentSection]?.title || `섹션 ${currentSection + 1}`}
          </h2>

          <div
            className="prose prose-blue max-w-none"
            dangerouslySetInnerHTML={{
              __html: sanitizeHtml(sections[currentSection]?.content || ''),
            }}
          />

          {/* Section Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t">
            <button
              onClick={handlePrevSection}
              disabled={currentSection === 0}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              ← 이전 섹션
            </button>

            {studyCompleted ? (
              hasQuiz ? (
                <button
                  onClick={handleStartQuiz}
                  className="px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
                >
                  퀴즈 시작하기
                </button>
              ) : (
                <button
                  onClick={onBackToList}
                  className="px-6 py-3 bg-gray-500 text-white font-medium rounded-lg hover:bg-gray-600 transition"
                >
                  목록으로 돌아가기
                </button>
              )
            ) : (
              <button
                onClick={handleNextSection}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                {currentSection < totalSections - 1 ? '다음 섹션 →' : '학습 완료'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
          이 문서에는 학습 섹션이 없습니다.
        </div>
      )}

      {/* AI 미처리 문서 알림 */}
      {!isAIProcessed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-amber-500 text-xl">⚠️</span>
            <div>
              <h4 className="font-medium text-amber-800">AI 미처리 문서</h4>
              <p className="text-sm text-amber-700 mt-1">
                이 문서는 AI 분석 없이 원문 그대로 등록되었습니다. 퀴즈가 제공되지 않습니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Quiz Button */}
      {studyCompleted && hasQuiz && (
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white text-center">
          <h3 className="text-lg font-bold mb-2">학습 완료!</h3>
          <p className="opacity-90 mb-4">이제 퀴즈를 풀어 학습 내용을 확인해보세요.</p>
          <button
            onClick={handleStartQuiz}
            className="px-6 py-3 bg-white text-blue-600 font-medium rounded-lg hover:bg-gray-100 transition"
          >
            퀴즈 시작하기
          </button>
        </div>
      )}

      {/* Study Complete without Quiz */}
      {studyCompleted && !hasQuiz && (
        <div className="bg-gradient-to-r from-gray-500 to-gray-600 rounded-xl p-6 text-white text-center">
          <h3 className="text-lg font-bold mb-2">학습 완료!</h3>
          <p className="opacity-90 mb-4">이 문서는 퀴즈가 없습니다. 다른 문서를 학습해보세요.</p>
          <button
            onClick={onBackToList}
            className="px-6 py-3 bg-white text-gray-600 font-medium rounded-lg hover:bg-gray-100 transition"
          >
            목록으로 돌아가기
          </button>
        </div>
      )}
    </div>
  );
}
