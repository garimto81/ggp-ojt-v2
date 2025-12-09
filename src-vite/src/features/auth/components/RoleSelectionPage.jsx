// OJT Master v2.14.0 - Role Selection Page (Local-Only Architecture)
// Issue #114: 이메일 인증만 지원, Google OAuth 제거

import { useAuth } from '@features/auth/hooks/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { ROLES } from '@/constants';
import AuthLoginPage from './AuthLoginPage';

export default function RoleSelectionPage() {
  const { user, handleRoleSelect } = useAuth();

  const onRoleSelect = async (role) => {
    try {
      await handleRoleSelect(role);
      Toast.success(`${role} 역할로 등록되었습니다.`);
    } catch (error) {
      Toast.error('역할 저장 중 오류가 발생했습니다.');
    }
  };

  // Not logged in - show AuthLoginPage (Email Authentication)
  if (!user) {
    return <AuthLoginPage />;
  }

  // Logged in but no role - show role selection
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">역할 선택</h2>
          <p className="text-gray-600 mt-2">{user.name}님, 사용할 역할을 선택해주세요.</p>
        </div>

        <div className="space-y-4" role="radiogroup" aria-label="역할 선택">
          <button
            onClick={() => onRoleSelect(ROLES.MENTOR)}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
            role="radio"
            aria-checked="false"
            aria-label="Mentor 역할 선택 - 교육 자료를 생성하고 관리합니다"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition"
                aria-hidden="true"
              >
                <span className="text-2xl">👨‍🏫</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-blue-600">
                  Mentor (교육 담당자)
                </h3>
                <p className="text-sm text-gray-500">교육 자료를 생성하고 관리합니다</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onRoleSelect(ROLES.MENTEE)}
            className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition text-left group"
            role="radio"
            aria-checked="false"
            aria-label="Mentee 역할 선택 - 교육 자료를 학습하고 퀴즈를 풀어봅니다"
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition"
                aria-hidden="true"
              >
                <span className="text-2xl">👨‍🎓</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 group-hover:text-green-600">
                  Mentee (학습자)
                </h3>
                <p className="text-sm text-gray-500">교육 자료를 학습하고 퀴즈를 풀어봅니다</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
