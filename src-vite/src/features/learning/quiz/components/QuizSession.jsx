/**
 * QuizSession - 퀴즈 응시 컴포넌트
 * @agent learning-quiz-agent
 * @blocks learning.quiz
 */

import { useState } from 'react';

import { CONFIG } from '@/constants';
import { WARNING } from '@/constants/messages';
import { Toast } from '@/contexts/ToastContext';
import { shuffleArray } from '@/utils/helpers';

import { useLearningRecord } from '../hooks/useLearningRecord';

import QuizResult from './QuizResult';

// Prepare quiz questions (컴포넌트 외부로 이동 - 호이스팅 문제 해결)
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

export default function QuizSession({ doc, userId, onBackToList, onExitQuiz }) {
  const { saveLearningRecord } = useLearningRecord();

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState(() => prepareQuestions(doc.quiz));
  const [currentQuiz, setCurrentQuiz] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Handle answer selection
  const handleAnswerSelect = (answer) => {
    if (showResult) return;
    setSelectedAnswer(answer);
  };

  // Submit answer
  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) {
      Toast.warning(WARNING.ANSWER_REQUIRED);
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
      <div className="py-12 text-center">
        <p className="text-gray-500">퀴즈 문제가 없습니다.</p>
        <button
          onClick={onExitQuiz || onBackToList}
          className="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl bg-white p-6 shadow-sm">
        {/* Quiz Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">{doc.title}</h2>
          <span className="text-sm text-gray-500">
            {currentQuiz + 1} / {quizQuestions.length}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{
              width: `${((currentQuiz + 1) / quizQuestions.length) * 100}%`,
            }}
          />
        </div>

        {/* Question */}
        <div className="mb-6">
          <p className="mb-4 text-lg font-medium text-gray-800">{currentQuestion.question}</p>

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
                  <span className="mr-2 font-medium">{String.fromCharCode(65 + idx)}.</span>
                  {option}
                </button>
              );
            })}
          </div>
        </div>

        {/* Result Message */}
        {showResult && (
          <div
            className={`mb-6 rounded-lg p-4 ${
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
          className="w-full rounded-lg bg-blue-500 py-3 font-medium text-white transition hover:bg-blue-600"
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
