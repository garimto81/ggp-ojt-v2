// OJT Master - Version Update Context
// 새 버전 감지 및 사용자 알림 시스템
//
// 동작 원리:
// 1. 빌드 시 vite-plugin-version이 dist/version.json 생성
// 2. 런타임에 5분 간격으로 version.json 폴링
// 3. 버전 불일치 감지 시 Toast 알림 표시
// 4. 사용자가 새로고침하면 새 버전 적용

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

import { APP_VERSION, BUILD_HASH } from '../version';

import { Toast } from './ToastContext';

const VersionContext = createContext(null);

// 버전 체크 간격 (5분)
const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;

// 초기 체크 지연 (앱 로딩 완료 대기)
const INITIAL_CHECK_DELAY = 10 * 1000;

export function VersionProvider({ children }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState(null);
  const [newBuildHash, setNewBuildHash] = useState(null);
  const hasNotified = useRef(false);

  const checkForUpdate = useCallback(async () => {
    // 오프라인 상태면 스킵
    if (!navigator.onLine) {
      return;
    }

    try {
      // 캐시 무시를 위한 timestamp 쿼리 파라미터
      const response = await fetch(`/version.json?t=${Date.now()}`);

      // version.json이 없으면 (첫 배포 전 등) 조용히 스킵
      if (!response.ok) {
        console.debug('[Version] version.json not found (first deploy?)');
        return;
      }

      const data = await response.json();

      // 버전이 다르면 업데이트 있음
      // Note: buildHash는 디버깅용으로만 사용 (빌드마다 새 값 생성되므로 비교하지 않음)
      const isNewVersion = data.version !== APP_VERSION;

      if (isNewVersion) {
        setUpdateAvailable(true);
        setNewVersion(data.version);
        setNewBuildHash(data.buildHash);

        // 이미 알림을 보냈으면 중복 알림 방지
        if (!hasNotified.current) {
          hasNotified.current = true;

          // 사용자에게 알림 (강제 리로드 X)
          Toast.info(`새 버전(v${data.version})이 있어요. 새로고침하면 적용됩니다.`);

          console.info('[Version] Update available:', {
            current: `v${APP_VERSION} (${BUILD_HASH})`,
            new: `v${data.version} (${data.buildHash})`,
          });
        }
      }
    } catch (error) {
      // 네트워크 오류 시 조용히 실패 (다음 체크에서 재시도)
      console.debug('[Version] Check failed:', error.message);
    }
  }, []);

  // 주기적 버전 체크
  useEffect(() => {
    // 초기 체크 (앱 로딩 완료 후)
    const initialTimeout = setTimeout(checkForUpdate, INITIAL_CHECK_DELAY);

    // 5분 간격 체크
    const interval = setInterval(checkForUpdate, VERSION_CHECK_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [checkForUpdate]);

  // 탭 활성화 시 즉시 체크
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [checkForUpdate]);

  // 새로고침 함수
  const refresh = useCallback(() => {
    window.location.reload();
  }, []);

  // 알림 리셋 (테스트용)
  const resetNotification = useCallback(() => {
    hasNotified.current = false;
    setUpdateAvailable(false);
    setNewVersion(null);
    setNewBuildHash(null);
  }, []);

  return (
    <VersionContext.Provider
      value={{
        updateAvailable,
        newVersion,
        newBuildHash,
        currentVersion: APP_VERSION,
        currentBuildHash: BUILD_HASH,
        refresh,
        checkForUpdate,
        resetNotification,
      }}
    >
      {children}
    </VersionContext.Provider>
  );
}

export function useVersion() {
  const context = useContext(VersionContext);
  if (!context) {
    throw new Error('useVersion은 VersionProvider 내부에서 사용해야 합니다.');
  }
  return context;
}
