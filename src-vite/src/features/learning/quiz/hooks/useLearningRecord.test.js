/**
 * useLearningRecord Hook Tests
 * @agent learning-quiz-agent
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLearningRecord } from './useLearningRecord';

// Mock dependencies
vi.mock('@/utils/api', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  },
}));

vi.mock('@/contexts/ToastContext', () => ({
  Toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/constants', () => ({
  CONFIG: {
    QUIZ_PASS_THRESHOLD: 3,
  },
}));

describe('useLearningRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return saveLearningRecord function', () => {
    const { result } = renderHook(() => useLearningRecord());

    expect(result.current.saveLearningRecord).toBeDefined();
    expect(typeof result.current.saveLearningRecord).toBe('function');
  });

  it('should return true when score >= QUIZ_PASS_THRESHOLD', async () => {
    const { result } = renderHook(() => useLearningRecord());

    let passed;
    await act(async () => {
      passed = await result.current.saveLearningRecord({
        userId: 'user-1',
        docId: 'doc-1',
        score: 4,
        totalQuestions: 5,
      });
    });

    expect(passed).toBe(true);
  });

  it('should return false when score < QUIZ_PASS_THRESHOLD', async () => {
    const { result } = renderHook(() => useLearningRecord());

    let passed;
    await act(async () => {
      passed = await result.current.saveLearningRecord({
        userId: 'user-1',
        docId: 'doc-1',
        score: 2,
        totalQuestions: 5,
      });
    });

    expect(passed).toBe(false);
  });

  it('should show success toast when passed', async () => {
    const { Toast } = await import('@/contexts/ToastContext');
    const { result } = renderHook(() => useLearningRecord());

    await act(async () => {
      await result.current.saveLearningRecord({
        userId: 'user-1',
        docId: 'doc-1',
        score: 4,
        totalQuestions: 5,
      });
    });

    expect(Toast.success).toHaveBeenCalledWith('축하합니다! 퀴즈를 통과했습니다!');
  });

  it('should show warning toast when failed', async () => {
    const { Toast } = await import('@/contexts/ToastContext');
    const { result } = renderHook(() => useLearningRecord());

    await act(async () => {
      await result.current.saveLearningRecord({
        userId: 'user-1',
        docId: 'doc-1',
        score: 1,
        totalQuestions: 5,
      });
    });

    expect(Toast.warning).toHaveBeenCalledWith('아쉽습니다. 다시 도전해보세요.');
  });
});
