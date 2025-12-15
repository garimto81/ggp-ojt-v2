// OJT Master v2.19.0 - Header Component
// Issue #200: AI 상태 표시 개선 (Gemini 단일 엔진)
// PRD-0015: shadcn/ui 적용

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ROLES } from '../constants';
import { APP_VERSION, BUILD_HASH, BUILD_SUMMARY } from '../version';
import { Button, Badge } from '@/components/ui';

export default function Header({ aiStatus }) {
  const { user, displayRole, sessionMode, handleLogout, handleModeSwitch } = useAuth();
  const [showModeMenu, setShowModeMenu] = useState(false);

  const isAdmin = user?.role === ROLES.ADMIN;
  const isTempMentorMode = sessionMode === 'mentor';

  // NOTE: currentTheme, departmentTheme은 PRD-0015 shadcn/ui 전환으로 Badge variant 사용
  // 기존 테마 로직은 constants.js에 보존 (향후 커스텀 테마 지원 시 활용)

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
                {isTempMentorMode
                  ? 'MENTOR MODE (임시)'
                  : `v${APP_VERSION} (${BUILD_HASH} - ${BUILD_SUMMARY})`}
              </p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* AI Status (Gemini) */}
            <div className="flex items-center gap-2" title={aiStatus.model || 'Gemini API'}>
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

            {/* Mode Switch (Admin only) - PRD-0015 */}
            {isAdmin && (
              <div className="relative">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowModeMenu(!showModeMenu)}
                >
                  모드
                </Button>
                {showModeMenu && (
                  <div className="absolute right-0 z-50 mt-2 w-40 rounded-lg border bg-white shadow-lg">
                    <button
                      onClick={() => {
                        handleModeSwitch('admin');
                        setShowModeMenu(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                        !isTempMentorMode ? 'bg-primary-50 text-primary-600' : ''
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

            {/* User info with Role/Department Badges (Issue #170, PRD-0015) */}
            {user && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800">{user.name}</span>
                  {/* Role Badge - PRD-0015 */}
                  {isTempMentorMode ? (
                    <Badge variant="mentor">Mentor (임시)</Badge>
                  ) : (
                    <Badge variant={user.role || 'default'}>{displayRole}</Badge>
                  )}
                  {/* Department Badge */}
                  {user.department && <Badge variant="outline">{user.department}</Badge>}
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  로그아웃
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Temp mode warning banner - PRD-0015 */}
        {isTempMentorMode && (
          <div className="bg-warning-50 border-warning-200 mt-3 flex items-center justify-between rounded-lg border px-4 py-2">
            <span className="text-warning-700 text-sm">MENTOR 모드로 작업 중입니다 (임시)</span>
            <Button
              variant="link"
              size="sm"
              className="text-warning-600 hover:text-warning-800"
              onClick={() => handleModeSwitch('admin')}
            >
              Admin으로 돌아가기
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
