// VersionContext 테스트
// Issue #231: 동일 버전에서 업데이트 알림 오류 수정 검증

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { VersionProvider, useVersion } from './VersionContext';

// Mock version.js
vi.mock('../version', () => ({
  APP_VERSION: '2.34.0',
  BUILD_HASH: 'test-hash-123',
}));

// Mock ToastContext
vi.mock('./ToastContext', () => ({
  Toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('VersionContext', () => {
  let fetchMock;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // navigator.onLine mock
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  const wrapper = ({ children }) => <VersionProvider>{children}</VersionProvider>;

  it('동일 버전이면 업데이트 알림을 표시하지 않아야 함', async () => {
    // 서버에서 동일한 버전 반환
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          version: '2.34.0', // APP_VERSION과 동일
          buildHash: 'different-hash', // buildHash는 다르지만 무시해야 함
        }),
    });

    const { result } = renderHook(() => useVersion(), { wrapper });

    // 초기 체크 트리거 (10초 후)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(fetchMock).toHaveBeenCalled();

    // 버전이 동일하므로 updateAvailable은 false여야 함
    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.newVersion).toBe(null);
  });

  it('새 버전이 있으면 업데이트 알림을 표시해야 함', async () => {
    // 서버에서 새 버전 반환
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          version: '2.35.0', // 새 버전
          buildHash: 'new-hash',
        }),
    });

    const { result } = renderHook(() => useVersion(), { wrapper });

    // 초기 체크 트리거
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(result.current.updateAvailable).toBe(true);
    expect(result.current.newVersion).toBe('2.35.0');
  });

  it('buildHash만 다르고 버전이 같으면 업데이트 알림을 표시하지 않아야 함 (Issue #231 핵심)', async () => {
    // 서버에서 동일 버전, 다른 buildHash 반환
    fetchMock.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          version: '2.34.0', // 동일 버전
          buildHash: 'completely-different-hash', // 다른 해시
        }),
    });

    const { result } = renderHook(() => useVersion(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(fetchMock).toHaveBeenCalled();

    // buildHash가 달라도 버전이 같으면 업데이트 없음
    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.newVersion).toBe(null);
  });

  it('오프라인 상태에서는 버전 체크를 스킵해야 함', async () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    renderHook(() => useVersion(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    // fetch가 호출되지 않아야 함
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('version.json이 없으면 조용히 실패해야 함', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useVersion(), { wrapper });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(11000);
    });

    expect(fetchMock).toHaveBeenCalled();

    // 에러 없이 기본 상태 유지
    expect(result.current.updateAvailable).toBe(false);
  });
});
