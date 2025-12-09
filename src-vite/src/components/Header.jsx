// OJT Master v2.16.1 - Header Component

import { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES, ROLE_THEMES, DEFAULT_THEME, DEPARTMENT_THEMES, DEFAULT_DEPARTMENT_THEME } from '../constants';
import { APP_VERSION, BUILD_HASH } from '../version';

export default function Header({ aiStatus }) {
  const { user, displayRole, sessionMode, handleLogout, handleModeSwitch } = useAuth();
  const [showModeMenu, setShowModeMenu] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isTempMentorMode = sessionMode === 'mentor';

  // 현재 역할에 따른 테마 결정 (Issue #170)
  // Admin이 임시 Mentor 모드일 때는 Mentor 테마 적용
  const currentTheme = useMemo(() => {
    if (!user) return DEFAULT_THEME;
    if (isTempMentorMode) return ROLE_THEMES[ROLES.MENTOR];
    return ROLE_THEMES[user.role] || DEFAULT_THEME;
  }, [user, isTempMentorMode]);

  // 부서에 따른 테마 결정 (Issue #170)
  const departmentTheme = useMemo(() => {
    if (!user?.department) return DEFAULT_DEPARTMENT_THEME;
    return DEPARTMENT_THEMES[user.department] || DEFAULT_DEPARTMENT_THEME;
  }, [user?.department]);

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">OJT</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">OJT Master</h1>
              <p className="text-xs text-gray-500">
                {isTempMentorMode ? 'MENTOR MODE (임시)' : `v${APP_VERSION} (${BUILD_HASH})`}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* AI Status */}
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  aiStatus.online ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className="text-sm text-gray-600">
                {aiStatus.online ? 'Gemini 온라인' : 'AI 오프라인'}
              </span>
            </div>

            {/* Mode Switch (Admin only) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  모드
                </button>
                {showModeMenu && (
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border z-50">
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

            {/* User info with Role/Department Badges (Issue #170) */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{user.name}</span>
                  {/* Role Badge */}
                  {isTempMentorMode ? (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                      Mentor (임시)
                    </span>
                  ) : (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${currentTheme.badge} border ${currentTheme.border}`}>
                      {displayRole}
                    </span>
                  )}
                  {/* Department Badge */}
                  {user.department && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${departmentTheme.badge} border ${departmentTheme.border}`}>
                      {user.department}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition"
                >
                  로그아웃
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Temp mode warning banner */}
        {isTempMentorMode && (
          <div className="mt-3 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-amber-700">MENTOR 모드로 작업 중입니다 (임시)</span>
            <button
              onClick={() => handleModeSwitch('admin')}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Admin으로 돌아가기
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
