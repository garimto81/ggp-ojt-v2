/**
 * SectionViewer Component Tests
 * @agent learning-study-agent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SectionViewer from './SectionViewer';

// Mock sanitizeHtml
vi.mock('@/utils/helpers', () => ({
  sanitizeHtml: vi.fn((html) => html),
}));

describe('SectionViewer', () => {
  const mockDoc = {
    id: 'doc-1',
    title: '테스트 문서',
    step: 1,
    estimated_minutes: 30,
    source_url: 'https://example.com',
    source_type: 'url',
    ai_processed: true,
    sections: [
      { title: '섹션 1', content: '<p>첫 번째 섹션 내용</p>' },
      { title: '섹션 2', content: '<p>두 번째 섹션 내용</p>' },
      { title: '섹션 3', content: '<p>세 번째 섹션 내용</p>' },
    ],
    quiz: [{ question: 'Q1', options: ['A', 'B'], answer: 'A' }],
  };

  const mockOnStudyComplete = vi.fn();
  const mockOnBackToList = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render document title', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('테스트 문서')).toBeInTheDocument();
  });

  it('should show section progress', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('섹션 1 / 3')).toBeInTheDocument();
  });

  it('should navigate to next section on button click', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    // First section
    expect(screen.getByText('섹션 1')).toBeInTheDocument();

    // Click next
    fireEvent.click(screen.getByText('다음 섹션 →'));

    // Should be on second section
    expect(screen.getByText('섹션 2')).toBeInTheDocument();
    expect(screen.getByText('섹션 2 / 3')).toBeInTheDocument();
  });

  it('should navigate to previous section', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    // Go to section 2
    fireEvent.click(screen.getByText('다음 섹션 →'));
    expect(screen.getByText('섹션 2')).toBeInTheDocument();

    // Go back to section 1
    fireEvent.click(screen.getByText('← 이전 섹션'));
    expect(screen.getByText('섹션 1')).toBeInTheDocument();
  });

  it('should disable prev button on first section', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    const prevButton = screen.getByText('← 이전 섹션');
    expect(prevButton).toBeDisabled();
  });

  it('should show quiz button after completing all sections', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    // Navigate to last section
    fireEvent.click(screen.getByText('다음 섹션 →')); // Section 2
    fireEvent.click(screen.getByText('다음 섹션 →')); // Section 3
    fireEvent.click(screen.getByText('학습 완료')); // Complete study

    // Quiz button should appear
    expect(screen.getAllByText('퀴즈 시작하기').length).toBeGreaterThan(0);
  });

  it('should call onStudyComplete when quiz button clicked', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    // Complete all sections
    fireEvent.click(screen.getByText('다음 섹션 →'));
    fireEvent.click(screen.getByText('다음 섹션 →'));
    fireEvent.click(screen.getByText('학습 완료'));

    // Click quiz button
    const quizButtons = screen.getAllByText('퀴즈 시작하기');
    fireEvent.click(quizButtons[0]);

    expect(mockOnStudyComplete).toHaveBeenCalled();
  });

  it('should show back to list message when no doc provided', () => {
    render(
      <SectionViewer
        doc={null}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('선택된 문서가 없습니다.')).toBeInTheDocument();
  });

  it('should call onBackToList when back button clicked', () => {
    render(
      <SectionViewer
        doc={null}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    fireEvent.click(screen.getByText('목록으로 돌아가기'));
    expect(mockOnBackToList).toHaveBeenCalled();
  });

  it('should show AI warning for non-processed docs', () => {
    const nonProcessedDoc = { ...mockDoc, ai_processed: false };

    render(
      <SectionViewer
        doc={nonProcessedDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('AI 미처리 문서')).toBeInTheDocument();
  });

  it('should show source link when source_url exists', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('원문 보기')).toBeInTheDocument();
  });

  it('should show estimated reading time', () => {
    render(
      <SectionViewer
        doc={mockDoc}
        onStudyComplete={mockOnStudyComplete}
        onBackToList={mockOnBackToList}
      />
    );

    expect(screen.getByText('예상 학습 시간: 30분')).toBeInTheDocument();
  });
});
