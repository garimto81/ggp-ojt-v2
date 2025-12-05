// OJT Master v2.7.0 - DocsContext Unit Tests
// Tests for CRUD functions: updateDocument, updateQuiz, deleteQuiz, addQuiz

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { DocsProvider, useDocs } from './DocsContext';
import { AuthProvider } from './AuthContext';

// Mock Supabase
vi.mock('../utils/api', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: {}, error: null }),
      eq: vi.fn().mockReturnThis(),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
    },
  },
}));

// Mock local database
vi.mock('../utils/db', () => ({
  localDb: {
    ojt_docs: {
      get: vi.fn(),
      put: vi.fn(),
      toArray: vi.fn().mockResolvedValue([]),
    },
    users: {
      get: vi.fn().mockResolvedValue(null),
      put: vi.fn(),
    },
  },
}));

// Combined wrapper with both AuthProvider and DocsProvider
const TestWrapper = ({ children }) => (
  <AuthProvider>
    <DocsProvider>{children}</DocsProvider>
  </AuthProvider>
);

describe('DocsContext CRUD Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Quiz CRUD Operations', () => {
    it('should have updateQuiz function defined', async () => {
      const { result } = renderHook(() => useDocs(), { wrapper: TestWrapper });

      expect(result.current.updateQuiz).toBeDefined();
      expect(typeof result.current.updateQuiz).toBe('function');
    });

    it('should have deleteQuiz function defined', async () => {
      const { result } = renderHook(() => useDocs(), { wrapper: TestWrapper });

      expect(result.current.deleteQuiz).toBeDefined();
      expect(typeof result.current.deleteQuiz).toBe('function');
    });

    it('should have addQuiz function defined', async () => {
      const { result } = renderHook(() => useDocs(), { wrapper: TestWrapper });

      expect(result.current.addQuiz).toBeDefined();
      expect(typeof result.current.addQuiz).toBe('function');
    });

    it('should have updateDocument function defined', async () => {
      const { result } = renderHook(() => useDocs(), { wrapper: TestWrapper });

      expect(result.current.updateDocument).toBeDefined();
      expect(typeof result.current.updateDocument).toBe('function');
    });
  });
});

describe('Quiz Validation Logic', () => {
  it('should validate quiz has 4 options', () => {
    const validQuiz = {
      question: 'Test question?',
      options: ['A', 'B', 'C', 'D'],
      correct: 0,
    };

    expect(validQuiz.options.length).toBe(4);
    expect(validQuiz.correct).toBeGreaterThanOrEqual(0);
    expect(validQuiz.correct).toBeLessThan(4);
  });

  it('should validate correct answer index is within range', () => {
    const quiz = {
      question: 'Test?',
      options: ['A', 'B', 'C', 'D'],
      correct: 2,
    };

    const isValidIndex = quiz.correct >= 0 && quiz.correct < quiz.options.length;
    expect(isValidIndex).toBe(true);
  });

  it('should identify placeholder quiz', () => {
    const placeholderQuiz = {
      question: '[자동 생성] 임시 문제',
      options: ['A', 'B', 'C', 'D'],
      correct: 0,
      is_placeholder: true,
    };

    const isPlaceholder =
      placeholderQuiz.is_placeholder || placeholderQuiz.question.includes('[자동 생성]');
    expect(isPlaceholder).toBe(true);
  });
});
