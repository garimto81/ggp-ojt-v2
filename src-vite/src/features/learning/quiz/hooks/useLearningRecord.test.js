/**
 * useLearningRecord Hook Tests
 * @agent learning-quiz-agent
 *
 * 학습 완료 판단 기준 (Issue #221):
 * - 퀴즈 있음 → 퀴즈 통과 (passed=true, score>=3)
 * - 퀴즈 없음 → 열람 완료 (passed=true, score=null)
 */

import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { SUCCESS, WARNING } from '@/constants/messages';

import { useLearningRecord } from './useLearningRecord';

// Mock Supabase with upsert support
const mockUpsert = vi.fn(() => Promise.resolve({ data: null, error: null }));
vi.mock('@/utils/api', () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
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

    expect(Toast.success).toHaveBeenCalledWith(SUCCESS.QUIZ_PASSED);
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

    expect(Toast.warning).toHaveBeenCalledWith(WARNING.QUIZ_FAILED);
  });

  // === Issue #221: 새로운 테스트 케이스 ===

  describe('saveViewCompletion (퀴즈 없는 문서 열람 완료)', () => {
    it('should return saveViewCompletion function', () => {
      const { result } = renderHook(() => useLearningRecord());

      expect(result.current.saveViewCompletion).toBeDefined();
      expect(typeof result.current.saveViewCompletion).toBe('function');
    });

    it('should save with score=null and passed=true for view completion', async () => {
      const { supabase } = await import('@/utils/api');
      const { result } = renderHook(() => useLearningRecord());

      await act(async () => {
        await result.current.saveViewCompletion({
          userId: 'user-1',
          docId: 'doc-1',
        });
      });

      // upsert가 호출되었는지 확인
      expect(supabase.from).toHaveBeenCalledWith('learning_records');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          doc_id: 'doc-1',
          score: null,
          total_questions: 0,
          passed: true,
        }),
        { onConflict: 'user_id,doc_id' }
      );
    });

    it('should show success toast on view completion', async () => {
      const { Toast } = await import('@/contexts/ToastContext');
      const { result } = renderHook(() => useLearningRecord());

      await act(async () => {
        await result.current.saveViewCompletion({
          userId: 'user-1',
          docId: 'doc-1',
        });
      });

      expect(Toast.success).toHaveBeenCalledWith(SUCCESS.VIEW_COMPLETE);
    });

    it('should return true on successful view completion', async () => {
      const { result } = renderHook(() => useLearningRecord());

      let completed;
      await act(async () => {
        completed = await result.current.saveViewCompletion({
          userId: 'user-1',
          docId: 'doc-1',
        });
      });

      expect(completed).toBe(true);
    });
  });

  describe('upsert behavior (재학습 시나리오)', () => {
    it('should use upsert with onConflict for saveLearningRecord', async () => {
      const { supabase } = await import('@/utils/api');
      const { result } = renderHook(() => useLearningRecord());

      await act(async () => {
        await result.current.saveLearningRecord({
          userId: 'user-1',
          docId: 'doc-1',
          score: 4,
          totalQuestions: 5,
        });
      });

      expect(supabase.from).toHaveBeenCalledWith('learning_records');
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-1',
          doc_id: 'doc-1',
          score: 4,
          total_questions: 5,
          passed: true,
        }),
        { onConflict: 'user_id,doc_id' }
      );
    });
  });
});
