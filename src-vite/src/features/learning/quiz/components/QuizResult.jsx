/**
 * QuizResult - 퀴즈 결과 화면
 * @agent learning-quiz-agent
 * @blocks learning.record
 */

import { CONFIG } from '@/constants';

export default function QuizResult({ score, totalQuestions, onRetry, onBackToList }) {
  const passed = score >= CONFIG.QUIZ_PASS_THRESHOLD;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-8 text-center">
        <div
          className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-6 ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <span className="text-4xl">{passed ? '🎉' : '😢'}</span>
        </div>

        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {passed ? '축하합니다!' : '아쉽습니다'}
        </h2>

        <p className="text-gray-600 mb-6">
          {totalQuestions}문제 중 {score}문제 정답
          {passed ? ' - 통과!' : ` - ${CONFIG.QUIZ_PASS_THRESHOLD}문제 이상 맞춰야 통과입니다.`}
        </p>

        <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
          <div
            className={`h-3 rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${(score / totalQuestions) * 100}%`,
            }}
          />
        </div>

        <div className="flex gap-4 justify-center">
          {!passed && (
            <button
              onClick={onRetry}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              다시 도전하기
            </button>
          )}
          <button
            onClick={onBackToList}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
