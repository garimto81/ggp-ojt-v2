// OJT Master - Header Component (Chrome AI 전용)

import { useState } from 'react';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { useAI } from '@features/ai/hooks/AIContext';
import { ROLES, ROLE_COLORS } from '@/constants';
import { sanitizeText } from '@utils/helpers';
import { getVersionString } from '@/version';

export default function Header() {
  const { user, displayRole, sessionMode, handleLogout, handleModeSwitch } = useAuth();
  const { aiStatus, isSupported, isReady, isLoading, CHROME_AI_STATUS } = useAI();
  const [showModeMenu, setShowModeMenu] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isTempMentorMode = sessionMode === 'mentor';

  // AI 상태 결정
  const getAIStatusText = () => {
    if (isSupported === null) return 'AI 확인 중...';
    if (isSupported === false) return 'Chrome 138+ 필요';
    if (isLoading) return 'AI 준비 중...';
    if (isReady) return 'AI 준비됨';
    if (aiStatus.status === CHROME_AI_STATUS.NOT_DOWNLOADED) return 'AI 다운로드 필요';
    return 'AI 대기 중';
  };

  return (
    <header className="bg-white shadow-sm border-b" role="banner">
      <div className="container mx-auto px-4 py-3">
        <nav
          className="flex items-center justify-between"
          role="navigation"
          aria-label="메인 네비게이션"
        >
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center"
              aria-hidden="true"
            >
              <span className="text-white font-bold text-lg">OJT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">OJT Master</h1>
              <p className="text-xs text-gray-500">
                {isTempMentorMode ? 'MENTOR MODE (임시)' : getVersionString()}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* AI Status */}
            <div
              className="flex items-center gap-2"
              role="status"
              aria-live="polite"
              aria-label="AI 모델 상태"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isReady
                    ? 'bg-green-500'
                    : isLoading
                      ? 'bg-amber-500 animate-pulse'
                      : isSupported === false
                        ? 'bg-red-400'
                        : 'bg-gray-400'
                }`}
                aria-hidden="true"
              />
              <span className="text-sm text-gray-600">{getAIStatusText()}</span>
            </div>

            {/* Mode Switch (Admin only) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                  aria-haspopup="menu"
                  aria-expanded={showModeMenu}
                  aria-label="모드 전환 메뉴"
                >
                  모드
                </button>
                {showModeMenu && (
                  <div
                    className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-50"
                    role="menu"
                  >
                    <button
                      onClick={() => {
                        handleModeSwitch('admin');
                        setShowModeMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        !isTempMentorMode ? 'bg-blue-50 text-blue-600' : ''
                      }`}
                      role="menuitem"
                      aria-label="Admin 대시보드 모드로 전환"
                    >
                      Admin 대시보드
                    </button>
                    <button
                      onClick={() => {
                        handleModeSwitch('mentor');
                        setShowModeMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        isTempMentorMode ? 'bg-amber-50 text-amber-600' : ''
                      }`}
                      role="menuitem"
                      aria-label="Mentor 작업실 모드로 전환"
                    >
                      Mentor 작업실
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* User info */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-800">{sanitizeText(user.name)}</p>
                  {isTempMentorMode ? (
                    <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Mentor (임시)
                    </span>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border capitalize ${
                        ROLE_COLORS[displayRole]?.badge ||
                        'bg-gray-100 text-gray-700 border-gray-200'
                      }`}
                    >
                      {sanitizeText(displayRole)}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                  aria-label="로그아웃"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* Temp mode warning banner */}
        {isTempMentorMode && (
          <div
            className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between"
            role="alert"
            aria-live="polite"
          >
            <span className="text-sm text-amber-700">MENTOR 모드로 작업 중입니다 (임시)</span>
            <button
              onClick={() => handleModeSwitch('admin')}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
              aria-label="Admin 모드로 복귀"
            >
              Admin으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
