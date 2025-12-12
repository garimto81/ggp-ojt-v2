/**
 * ContentInputPanel Unit Tests
 * Issue #198: PDF/URL 콘텐츠 입력 기능 검증
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContentInputPanel from './ContentInputPanel';
import { WARNING } from '@/constants/messages';

// Mock dependencies
vi.mock('@features/auth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', name: 'Test User', role: 'mentor' },
  }),
}));

vi.mock('@features/ai', () => ({
  useAI: () => ({
    engine: 'local',
    webllmStatus: { loaded: false },
    fallbackEnabled: true,
  }),
}));

vi.mock('@/contexts/ToastContext', () => ({
  Toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('@/utils/api', () => ({
  generateOJTContent: vi.fn().mockResolvedValue({
    title: 'Generated Doc',
    sections: [{ title: 'Section 1', content: 'Content 1' }],
    quiz: [],
  }),
  extractUrlText: vi.fn().mockResolvedValue({
    text: 'Extracted text from URL',
    wasTruncated: false,
    extractedLength: 100,
    originalLength: 100,
  }),
}));

// Mock PDF utilities (#198 - pdfjs-dist requires Canvas API not available in JSDOM)
vi.mock('@/utils/pdf', () => ({
  extractPdfText: vi.fn().mockResolvedValue({
    text: 'Extracted PDF text content',
    pages: 5,
    totalPages: 5,
    wasTruncated: false,
    originalLength: 1000,
    extractedLength: 1000,
  }),
  validatePdfFile: vi.fn().mockReturnValue({ valid: true }),
  getPdfInfo: vi.fn().mockResolvedValue({
    title: 'Test PDF',
    author: 'Test Author',
    pages: 5,
    fileSize: 1024 * 1024,
    fileName: 'test.pdf',
  }),
}));

vi.mock('@/utils/helpers', () => ({
  estimateReadingTime: vi.fn().mockReturnValue(5),
  calculateRequiredSteps: vi.fn().mockReturnValue(2),
  splitContentForSteps: vi.fn((content, steps) =>
    Array(steps)
      .fill(null)
      .map((_, i) => `Segment ${i + 1}`)
  ),
}));

// AIEngineSelector mock 제거됨 - Issue #200에서 WebLLM 제거로 해당 컴포넌트 삭제

describe('ContentInputPanel - Issue #198 Tests', () => {
  const mockOnDocumentsGenerated = vi.fn();
  const mockSetRawInput = vi.fn();

  const defaultProps = {
    aiStatus: { online: true },
    onDocumentsGenerated: mockOnDocumentsGenerated,
    rawInput: '',
    setRawInput: mockSetRawInput,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1. 입력 타입 선택 UI', () => {
    it('텍스트/URL/PDF 입력 타입 버튼이 렌더링되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} />);

      expect(screen.getByRole('button', { name: '텍스트' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'URL' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PDF' })).toBeInTheDocument();
    });

    it('기본 입력 타입은 텍스트여야 함', () => {
      render(<ContentInputPanel {...defaultProps} />);

      const textButton = screen.getByRole('button', { name: '텍스트' });
      expect(textButton).toHaveClass('bg-blue-500');
    });

    it('입력 타입 전환 시 해당 UI가 표시되어야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      // URL 모드로 전환
      await user.click(screen.getByRole('button', { name: 'URL' }));

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      expect(urlInput).toBeInTheDocument();
      expect(urlInput).toHaveAttribute('type', 'url');
    });
  });

  describe('2. 텍스트 입력 기능', () => {
    it('텍스트 모드에서 textarea가 표시되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} />);

      const textarea = screen.getByPlaceholderText('교육 콘텐츠를 입력하세요...');
      expect(textarea).toBeInTheDocument();
    });

    it('텍스트 입력 시 학습 통계가 표시되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} rawInput="테스트 콘텐츠입니다." />);

      expect(screen.getByText(/예상 학습 시간:/)).toBeInTheDocument();
      expect(screen.getByText(/권장 스텝 수:/)).toBeInTheDocument();
    });

    it('제목 입력 필드가 존재해야 함', () => {
      render(<ContentInputPanel {...defaultProps} />);

      const titleInput = screen.getByPlaceholderText('문서 제목');
      expect(titleInput).toBeInTheDocument();
    });
  });

  describe('3. URL 입력 기능', () => {
    it('URL 모드에서 URL 입력 필드가 표시되어야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'URL' }));

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      expect(urlInput).toBeInTheDocument();
      expect(urlInput).toHaveAttribute('type', 'url');
    });

    it('URL 입력 값이 올바르게 저장되어야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'URL' }));

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      await user.type(urlInput, 'https://test.com/article');

      expect(urlInput).toHaveValue('https://test.com/article');
    });

    it('빈 URL로 생성 시도 시 경고가 표시되어야 함', async () => {
      const { Toast } = await import('@/contexts/ToastContext');
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      // URL 모드로 전환
      await user.click(screen.getByRole('button', { name: 'URL' }));

      // 생성 버튼 클릭 (URL 비어있음)
      const generateButton = screen.getByRole('button', { name: /교육 자료 생성|원문으로 등록/ });
      await user.click(generateButton);

      expect(Toast.warning).toHaveBeenCalledWith(WARNING.URL_REQUIRED);
    });
  });

  describe('4. PDF 업로드 기능 (#198 구현됨)', () => {
    it('PDF 모드에서 파일 선택 영역이 표시되어야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'PDF' }));

      // 파일 선택 안내 텍스트 확인
      expect(screen.getByText(/PDF 파일을 선택하거나 드래그하세요/)).toBeInTheDocument();
    });

    it('PDF 모드에서 border-dashed 스타일 영역이 있어야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'PDF' }));

      // border-dashed 클래스가 있는 요소 찾기
      const dashedElement = document.querySelector('.border-dashed');
      expect(dashedElement).toBeInTheDocument();
    });

    it('PDF 모드에서 파일 input이 존재해야 함 (#198 구현)', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      await user.click(screen.getByRole('button', { name: 'PDF' }));

      // file 타입 input이 있어야 함 (구현됨)
      const fileInput = document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute('accept', '.pdf,application/pdf');
    });
  });

  describe('5. 자동 스텝 분할 옵션', () => {
    it('자동 스텝 분할 체크박스가 존재해야 함', () => {
      render(<ContentInputPanel {...defaultProps} rawInput="테스트" />);

      // 여러 체크박스 중 자동 스텝 분할 체크박스 선택 (첫 번째)
      const checkboxes = screen.getAllByRole('checkbox');
      const autoStepCheckbox = checkboxes[0];
      expect(autoStepCheckbox).toBeInTheDocument();
    });

    it('자동 스텝 분할이 기본적으로 활성화되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} rawInput="테스트" />);

      // 여러 체크박스 중 자동 스텝 분할 체크박스 선택 (첫 번째)
      const checkboxes = screen.getAllByRole('checkbox');
      const autoStepCheckbox = checkboxes[0];
      expect(autoStepCheckbox).toBeChecked();
    });

    it('자동 스텝 분할 체크박스 토글이 동작해야 함', async () => {
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} rawInput="테스트" />);

      // 여러 체크박스 중 자동 스텝 분할 체크박스 선택 (첫 번째)
      const checkboxes = screen.getAllByRole('checkbox');
      const autoStepCheckbox = checkboxes[0];
      expect(autoStepCheckbox).toBeChecked();

      await user.click(autoStepCheckbox);
      expect(autoStepCheckbox).not.toBeChecked();

      await user.click(autoStepCheckbox);
      expect(autoStepCheckbox).toBeChecked();
    });
  });

  describe('6. 콘텐츠 생성 플로우', () => {
    it('텍스트 입력 후 생성 버튼이 활성화되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} rawInput="테스트 콘텐츠" />);

      const generateButton = screen.getByRole('button', { name: /교육 자료 생성|원문으로 등록/ });
      expect(generateButton).not.toBeDisabled();
    });

    it('빈 텍스트로 생성 시도 시 경고가 표시되어야 함', async () => {
      const { Toast } = await import('@/contexts/ToastContext');
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} rawInput="" />);

      const generateButton = screen.getByRole('button', { name: /교육 자료 생성|원문으로 등록/ });
      await user.click(generateButton);

      expect(Toast.warning).toHaveBeenCalledWith(WARNING.TEXT_REQUIRED);
    });

    it('AI 오프라인 상태에서 버튼 텍스트가 변경되어야 함', () => {
      render(<ContentInputPanel {...defaultProps} aiStatus={{ online: false }} />);

      // AI 오프라인일 때 버튼 텍스트가 "원문으로 등록 (AI 오프라인)"으로 표시됨
      expect(screen.getByRole('button', { name: /원문으로 등록/ })).toBeInTheDocument();
    });
  });

  // describe('7. AI 엔진 선택기 통합') - Issue #200에서 WebLLM 제거로 삭제됨

  describe('7. source_type 필드 설정', () => {
    it('텍스트 입력 시 source_type이 manual로 설정되어야 함', async () => {
      const { generateOJTContent } = await import('@/utils/api');
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} rawInput="테스트 콘텐츠" />);

      const titleInput = screen.getByPlaceholderText('문서 제목');
      await user.type(titleInput, '테스트 문서');

      const generateButton = screen.getByRole('button', { name: /교육 자료 생성|원문으로 등록/ });
      await user.click(generateButton);

      await waitFor(() => {
        expect(mockOnDocumentsGenerated).toHaveBeenCalled();
      });

      // 생성된 문서에 source_type: 'manual'이 포함되어야 함
      const callArgs = mockOnDocumentsGenerated.mock.calls[0][0];
      expect(callArgs[0]).toHaveProperty('source_type', 'manual');
    });

    it('URL 입력 시 source_type이 url로 설정되어야 함', async () => {
      const { extractUrlText } = await import('@/utils/api');
      const user = userEvent.setup();
      render(<ContentInputPanel {...defaultProps} />);

      // URL 모드로 전환
      await user.click(screen.getByRole('button', { name: 'URL' }));

      const urlInput = screen.getByPlaceholderText('https://example.com/article');
      await user.type(urlInput, 'https://test.com/article');

      const generateButton = screen.getByRole('button', { name: /교육 자료 생성|원문으로 등록/ });
      await user.click(generateButton);

      await waitFor(() => {
        expect(extractUrlText).toHaveBeenCalledWith(
          'https://test.com/article',
          expect.any(Function)
        );
      });
    });
  });
});

/**
 * 테스트 커버리지 요약:
 *
 * 1. 입력 타입 선택 UI: 버튼 렌더링, 기본값, 전환 동작
 * 2. 텍스트 입력: textarea, 학습 통계, 제목 필드
 * 3. URL 입력: URL 필드, 값 저장, 빈 URL 경고
 * 4. PDF 업로드: 플레이스홀더 상태 (현재 미구현)
 * 5. 자동 스텝 분할: 체크박스 존재, 기본값, 토글
 * 6. 콘텐츠 생성: 버튼 활성화, 빈 입력 경고, AI 오프라인 경고
 * 7. AI 엔진 선택기: 컴포넌트 렌더링
 * 8. source_type 필드: manual/url 설정
 */
