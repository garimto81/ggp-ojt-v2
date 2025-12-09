/**
 * QuizSession - 퀴즈 응시 컴포넌트
 * @agent learning-quiz-agent
 * @blocks learning.quiz
 */

import { useState } from 'react';
import { Toast } from '@/contexts/ToastContext';
import { shuffleArray } from '@/utils/helpers';
import { CONFIG } from '@/constants';
import QuizResult from './QuizResult';
import { useLearningRecord } from '../hooks/useLearningRecord';

export default function QuizSession({
  doc,
  userId,
  onBackToList,
  onExitQuiz,
}) {
  const { saveLearningRecord } = useLearningRecord();

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState(() => prepareQuestions(doc.quiz));
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Prepare quiz questions
  function prepareQuestions(quiz) {
    if (!quiz || quiz.length === 0) return [];

    // Shuffle and pick questions
    const shuffled = shuffleArray([...quiz]);
    const selected = shuffled.slice(0, CONFIG.QUIZ_QUESTIONS_PER_TEST);

    // Normalize quiz format and shuffle answers
    return selected.map((q) => {
      const correctAnswer = q.answer || q.options[q.correct] || q.options[0];
      return {
        ...q,
        answer: correctAnswer,
        shuffledOptions: shuffleArray([...q.options]),
      };
    });
  }

  // Handle answer selection
  const handleAnswerSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  // Submit answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      Toast.warning('답을 선택해주세요.');
      return;
    }

    const currentQuestion = quizQuestions[currentQuiz];
    const isCorrect = selectedAnswer === currentQuestion.answer;

    if (isCorrect) {
      setScore((prev) => prev + 1);
    }

    setShowResult(true);
  };

  // Next question or finish
  const handleNextQuestion = async () => {
    if (currentQuiz < quizQuestions.length - 1) {
      setCurrentQuiz((prev) => prev + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      // Quiz finished - save record
      setQuizFinished(true);
      await saveLearningRecord({
        userId,
        docId: doc.id,
        score: score + (selectedAnswer === quizQuestions[currentQuiz].answer ? 1 : 0),
        totalQuestions: quizQuestions.length,
      });
    }
  };

  // Retry quiz
  const handleRetryQuiz = () => {
    setQuizQuestions(prepareQuestions(doc.quiz));
    setCurrentQuiz(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
  };

  // Show result screen
  if (quizFinished) {
    return (
      <QuizResult
        score={score}
        totalQuestions={quizQuestions.length}
        onRetry={handleRetryQuiz}
        onBackToList={onBackToList}
      />
    );
  }

  const currentQuestion = quizQuestions[currentQuiz];

  if (!currentQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">퀴즈 문제가 없습니다.</p>
        <button
          onClick={onExitQuiz || onBackToList}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm p-6">
        {/* Quiz Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-800">{doc.title}</h2>
          <span className="text-sm text-gray-500">
            {currentQuiz + 1} / {quizQuestions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all"
            style={{
              width: `${((currentQuiz + 1) / quizQuestions.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="text-gray-800 font-medium text-lg mb-4">{currentQuestion.question}</p>

          <div className="space-y-3">
            {currentQuestion.shuffledOptions.map((option, idx) => {
              let optionClass = 'w-full p-4 border-2 rounded-lg text-left transition ';

              if (showResult) {
                if (option === currentQuestion.answer) {
                  optionClass += 'border-green-500 bg-green-50';
                } else if (option === selectedAnswer && option !== currentQuestion.answer) {
                  optionClass += 'border-red-500 bg-red-50';
                } else {
                  optionClass += 'border-gray-200 opacity-50';
                }
              } else {
                optionClass +=
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300';
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerSelect(option)}
                  disabled={showResult}
                  className={optionClass}
                >
                  <span className="font-medium mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result Message */}
        {showResult && (
          <div
            className={`p-4 rounded-lg mb-6 ${
              selectedAnswer === currentQuestion.answer
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {selectedAnswer === currentQuestion.answer ? (
              <p>정답입니다!</p>
            ) : (
              <p>
                틀렸습니다. 정답은 <strong>{currentQuestion.answer}</strong> 입니다.
              </p>
            )}
            {currentQuestion.explanation && (
              <p className="mt-2 text-sm opacity-80">{currentQuestion.explanation}</p>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={showResult ? handleNextQuestion : handleSubmitAnswer}
          className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
        >
          {showResult
            ? currentQuiz < quizQuestions.length - 1
              ? '다음 문제'
              : '결과 보기'
            : '정답 확인'}
        </button>
      </div>
    </div>
  );
}
