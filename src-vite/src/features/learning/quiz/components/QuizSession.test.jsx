/**
 * QuizSession Component Tests
 * @agent learning-quiz-agent
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { WARNING } from '@/constants/messages';

import QuizSession from './QuizSession';

// Mock dependencies
vi.mock('@/contexts/ToastContext', () => ({
  Toast: {
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/utils/helpers', () => ({
  shuffleArray: vi.fn((arr) => [...arr]), // No shuffle for predictable tests
}));

vi.mock('@/constants', () => ({
  CONFIG: {
    QUIZ_QUESTIONS_PER_TEST: 2,
    QUIZ_PASS_THRESHOLD: 1,
  },
}));

vi.mock('../hooks/useLearningRecord', () => ({
  useLearningRecord: () => ({
    saveLearningRecord: vi.fn(() => Promise.resolve(true)),
  }),
}));

describe('QuizSession', () => {
  const mockDoc = {
    id: 'doc-1',
    title: '테스트 퀴즈',
    quiz: [
      { question: '질문 1', options: ['A', 'B', 'C', 'D'], answer: 'A' },
      { question: '질문 2', options: ['가', '나', '다', '라'], answer: '가' },
      { question: '질문 3', options: ['1', '2', '3', '4'], answer: '1' },
    ],
  };

  const mockOnBackToList = vi.fn();
  const mockOnExitQuiz = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render quiz question', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    expect(screen.getByText('테스트 퀴즈')).toBeInTheDocument();
    expect(screen.getByText('질문 1')).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('should allow selecting an answer', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    // Find option button containing "A."
    const optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent.includes('A.'));
    const optionA = optionButtons[0];
    fireEvent.click(optionA);

    // Button should have blue border when selected
    expect(optionA).toHaveClass('border-blue-500');
  });

  it('should show warning when submitting without selection', async () => {
    const { Toast } = await import('@/contexts/ToastContext');

    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    fireEvent.click(screen.getByText('정답 확인'));

    expect(Toast.warning).toHaveBeenCalledWith(WARNING.ANSWER_REQUIRED);
  });

  it('should show correct answer feedback', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    // Select correct answer (first option)
    const optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent.includes('A.'));
    fireEvent.click(optionButtons[0]);
    fireEvent.click(screen.getByText('정답 확인'));

    expect(screen.getByText('정답입니다!')).toBeInTheDocument();
  });

  it('should show incorrect answer feedback', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    // Select wrong answer (second option)
    const optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent.includes('B.'));
    fireEvent.click(optionButtons[0]);
    fireEvent.click(screen.getByText('정답 확인'));

    expect(screen.getByText(/틀렸습니다/)).toBeInTheDocument();
  });

  it('should progress to next question', () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    // Answer first question
    const optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent.includes('A.'));
    fireEvent.click(optionButtons[0]);
    fireEvent.click(screen.getByText('정답 확인'));
    fireEvent.click(screen.getByText('다음 문제'));

    // Should be on second question
    expect(screen.getByText('질문 2')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  it('should show result screen after last question', async () => {
    render(<QuizSession doc={mockDoc} userId="user-1" onBackToList={mockOnBackToList} />);

    // Answer first question
    let optionButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.textContent.includes('A.'));
    fireEvent.click(optionButtons[0]);
    fireEvent.click(screen.getByText('정답 확인'));
    fireEvent.click(screen.getByText('다음 문제'));

    // Answer second question
    optionButtons = screen.getAllByRole('button').filter((btn) => btn.textContent.includes('A.'));
    fireEvent.click(optionButtons[0]);
    fireEvent.click(screen.getByText('정답 확인'));
    fireEvent.click(screen.getByText('결과 보기'));

    // Should show result screen
    await waitFor(() => {
      expect(screen.getByText(/2문제 중/)).toBeInTheDocument();
    });
  });

  it('should show empty state when no quiz questions', () => {
    const docWithoutQuiz = { ...mockDoc, quiz: [] };

    render(
      <QuizSession
        doc={docWithoutQuiz}
        userId="user-1"
        onBackToList={mockOnBackToList}
        onExitQuiz={mockOnExitQuiz}
      />
    );

    expect(screen.getByText('퀴즈 문제가 없습니다.')).toBeInTheDocument();
  });

  it('should call onExitQuiz when back button clicked in empty state', () => {
    const docWithoutQuiz = { ...mockDoc, quiz: [] };

    render(
      <QuizSession
        doc={docWithoutQuiz}
        userId="user-1"
        onBackToList={mockOnBackToList}
        onExitQuiz={mockOnExitQuiz}
      />
    );

    fireEvent.click(screen.getByText('돌아가기'));
    expect(mockOnExitQuiz).toHaveBeenCalled();
  });
});
