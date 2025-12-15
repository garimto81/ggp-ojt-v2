// OJT Master v2.19.0 - Header Component
// Issue #200: AI 상태 표시 개선 (Gemini 단일 엔진)

import { useState } from 'react';

import { ROLES } from '../constants';
import { useAuth } from '../contexts/AuthContext';

export default function Header({ aiStatus }) {
  const { user, displayRole, sessionMode, handleLogout, handleModeSwitch } = useAuth();
  const [showModeMenu, setShowModeMenu] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isTempMentorMode = sessionMode === 'mentor';

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600">
              <span className="text-lg font-bold text-white">OJT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">OJT Master</h1>
              <p className="text-xs text-gray-500">
                {isTempMentorMode ? 'MENTOR MODE (임시)' : 'v2.3.0'}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* AI Status */}
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  aiStatus.online ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {aiStatus.online
                  ? `Gemini${aiStatus.latency ? ` (${aiStatus.latency}ms)` : ''}`
                  : 'Gemini 오프라인'}
              </span>
            </div>

            {/* Mode Switch (Admin only) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm transition hover:bg-gray-200"
                >
                  모드
                </button>
                {showModeMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border bg-white shadow-lg">
                    <button
                      onClick={() => {
                        handleModeSwitch('admin');
                        setShowModeMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        !isTempMentorMode ? 'bg-blue-50 text-blue-600' : ''
                      }`}
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
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500 capitalize">
                    {isTempMentorMode ? (
                      <span className="text-amber-600">Mentor (임시)</span>
                    ) : (
                      displayRole
                    )}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className="rounded-lg px-3 py-1.5 text-sm text-gray-600 transition hover:bg-gray-100 hover:text-gray-800"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Temp mode warning banner */}
        {isTempMentorMode && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-4 py-2">
            <span className="text-sm text-amber-700">MENTOR 모드로 작업 중입니다 (임시)</span>
            <button
              onClick={() => handleModeSwitch('admin')}
              className="text-sm font-medium text-amber-600 hover:text-amber-800"
            >
              Admin으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
