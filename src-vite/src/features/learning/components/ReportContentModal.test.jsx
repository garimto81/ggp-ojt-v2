// OJT Master v2.10.0 - Report Content Modal Tests

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ReportContentModal from './ReportContentModal';
import { Toast } from '@contexts/ToastContext';

// Mock Supabase
vi.mock('@utils/api', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

// Mock Toast
vi.mock('@contexts/ToastContext', () => ({
  Toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ReportContentModal', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    docId: 'doc-123',
    docTitle: 'Test Document',
    userId: 'user-456',
  };

  it('should not render when isOpen is false', () => {
    render(<ReportContentModal {...mockProps} isOpen={false} />);
    expect(screen.queryByText('콘텐츠 신고')).not.toBeInTheDocument();
  });

  it('should render modal when isOpen is true', () => {
    render(<ReportContentModal {...mockProps} />);
    expect(screen.getByText('콘텐츠 신고')).toBeInTheDocument();
    expect(screen.getByText('Test Document')).toBeInTheDocument();
  });

  it('should display all report reason options', () => {
    render(<ReportContentModal {...mockProps} />);
    expect(screen.getByText('부적절한 내용')).toBeInTheDocument();
    expect(screen.getByText('오래된 정보')).toBeInTheDocument();
    expect(screen.getByText('중복 콘텐츠')).toBeInTheDocument();
    expect(screen.getByText('스팸/광고')).toBeInTheDocument();
    expect(screen.getByText('기타')).toBeInTheDocument();
  });

  it('should show warning when submitting without selecting reason', async () => {
    render(<ReportContentModal {...mockProps} />);

    const submitButton = screen.getByText('신고하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(Toast.warning).toHaveBeenCalledWith('신고 사유를 선택해주세요.');
    });
  });

  it('should show warning when submitting without description', async () => {
    render(<ReportContentModal {...mockProps} />);

    // Select reason
    const reasonRadio = screen.getByLabelText('부적절한 내용');
    fireEvent.click(reasonRadio);

    const submitButton = screen.getByText('신고하기');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(Toast.warning).toHaveBeenCalledWith('상세 설명을 입력해주세요.');
    });
  });

  it('should handle reason selection', () => {
    render(<ReportContentModal {...mockProps} />);

    const reasonRadio = screen.getByLabelText('부적절한 내용');
    fireEvent.click(reasonRadio);

    expect(reasonRadio).toBeChecked();
  });

  it('should handle description input', () => {
    render(<ReportContentModal {...mockProps} />);

    const textarea = screen.getByPlaceholderText(/신고 사유에 대해 구체적으로 설명해주세요/);
    fireEvent.change(textarea, { target: { value: 'This is a test description' } });

    expect(textarea.value).toBe('This is a test description');
  });

  it('should show character count', () => {
    render(<ReportContentModal {...mockProps} />);

    const textarea = screen.getByPlaceholderText(/신고 사유에 대해 구체적으로 설명해주세요/);
    fireEvent.change(textarea, { target: { value: 'Test' } });

    expect(screen.getByText('4 / 500자')).toBeInTheDocument();
  });

  it('should call onClose when cancel button is clicked', () => {
    render(<ReportContentModal {...mockProps} />);

    const cancelButton = screen.getByText('취소');
    fireEvent.click(cancelButton);

    expect(mockProps.onClose).toHaveBeenCalled();
  });

  it('should call onClose when backdrop is clicked', () => {
    const { container } = render(<ReportContentModal {...mockProps} />);

    const backdrop = container.querySelector('.fixed.inset-0.bg-black');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(mockProps.onClose).toHaveBeenCalled();
    }
  });
});
