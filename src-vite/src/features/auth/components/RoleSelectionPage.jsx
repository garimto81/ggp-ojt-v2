// OJT Master v2.3.0 - Role Selection Page
// @agent auth-agent

import { useAuth } from '@/contexts/AuthContext';
import { Toast } from '@/contexts/ToastContext';
import { ROLES } from '@/constants';
import { SUCCESS, ERROR } from '@/constants/messages';

// 역할별 카드 스타일 설정 (Issue #170)
const ROLE_CARD_STYLES = {
  [ROLES.MENTOR]: {
    borderHover: 'hover:border-blue-500',
    bgHover: 'hover:bg-blue-50',
    iconBg: 'bg-blue-100',
    iconBgHover: 'group-hover:bg-blue-200',
    textHover: 'group-hover:text-blue-600',
    emoji: '👨‍🏫',
    title: 'Mentor (교육 담당자)',
    description: '교육 자료를 생성하고 관리합니다',
  },
  [ROLES.MENTEE]: {
    borderHover: 'hover:border-green-500',
    bgHover: 'hover:bg-green-50',
    iconBg: 'bg-green-100',
    iconBgHover: 'group-hover:bg-green-200',
    textHover: 'group-hover:text-green-600',
    emoji: '👨‍🎓',
    title: 'Mentee (학습자)',
    description: '교육 자료를 학습하고 퀴즈를 풀어봅니다',
  },
};

export default function RoleSelectionPage() {
  const { user, handleGoogleLogin, handleRoleSelect } = useAuth();

  const onGoogleLogin = async () => {
    try {
      await handleGoogleLogin();
    } catch (error) {
      Toast.error(ERROR.LOGIN_FAILED(error.message));
    }
  };

  const onRoleSelect = async (role) => {
    try {
      await handleRoleSelect(role);
      Toast.success(SUCCESS.ROLE_SAVED(role));
    } catch (error) {
      Toast.error(ERROR.ROLE_SAVE_FAILED);
    }
  };

  // Not logged in - show login page
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-bold text-2xl">OJT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">OJT Master</h1>
          <p className="text-gray-600 mb-8">AI 기반 온보딩 교육 플랫폼</p>

          <button
            onClick={onGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="font-medium text-gray-700">Google로 로그인</span>
          </button>

          <p className="text-xs text-gray-400 mt-6">
            로그인 시 서비스 이용약관에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    );
  }

  // Logged in but no role - show role selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">역할 선택</h2>
          <p className="text-gray-600 mt-2">{user.name}님, 사용할 역할을 선택해주세요.</p>
        </div>

        <div className="space-y-4">
          {/* Role Selection Cards - Issue #170 테마 시스템 적용 */}
          {[ROLES.MENTOR, ROLES.MENTEE].map((role) => {
            const style = ROLE_CARD_STYLES[role];
            return (
              <button
                key={role}
                onClick={() => onRoleSelect(role)}
                className={`w-full p-6 border-2 border-gray-200 rounded-xl ${style.borderHover} ${style.bgHover} transition text-left group`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${style.iconBg} rounded-xl flex items-center justify-center ${style.iconBgHover} transition`}
                  >
                    <span className="text-2xl">{style.emoji}</span>
                  </div>
                  <div>
                    <h3 className={`font-bold text-gray-800 ${style.textHover}`}>{style.title}</h3>
                    <p className="text-sm text-gray-500">{style.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
