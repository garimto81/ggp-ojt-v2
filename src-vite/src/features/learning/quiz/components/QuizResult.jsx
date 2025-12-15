/**
 * QuizResult - 퀴즈 결과 화면
 * @agent learning-quiz-agent
 * @blocks learning.record
 */

import { CONFIG } from '@/constants';

export default function QuizResult({ score, totalQuestions, onRetry, onBackToList }) {
  const passed = score >= CONFIG.QUIZ_PASS_THRESHOLD;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            passed ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <span className="text-4xl">{passed ? '🎉' : '😢'}</span>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-gray-800">
          {passed ? '축하합니다!' : '아쉽습니다'}
        </h2>

        <p className="mb-6 text-gray-600">
          {totalQuestions}문제 중 {score}문제 정답
          {passed ? ' - 통과!' : ` - ${CONFIG.QUIZ_PASS_THRESHOLD}문제 이상 맞춰야 통과입니다.`}
        </p>

        <div className="mb-6 h-3 w-full rounded-full bg-gray-200">
          <div
            className={`h-3 rounded-full transition-all ${passed ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${(score / totalQuestions) * 100}%`,
            }}
          />
        </div>

        <div className="flex justify-center gap-4">
          {!passed && (
            <button
              onClick={onRetry}
              className="rounded-lg bg-blue-500 px-6 py-3 text-white transition hover:bg-blue-600"
            >
              다시 도전하기
            </button>
          )}
          <button
            onClick={onBackToList}
            className="rounded-lg bg-gray-100 px-6 py-3 text-gray-700 transition hover:bg-gray-200"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}
