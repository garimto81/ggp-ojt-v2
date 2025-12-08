// OJT Master v2.13.6 - Pending Approval Page (Issue #105)
/**
 * 승인 대기 화면
 *
 * Email 회원가입 후 관리자 승인 대기 상태를 표시
 * - 승인 대기 안내 메시지
 * - 로그아웃 버튼
 * - 관리자 연락처 정보
 */

import { useAuth } from '../hooks/AuthContext';

export default function PendingApprovalPage() {
  const { user, handleLogout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        {/* 아이콘 */}
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* 제목 */}
        <h1 className="text-2xl font-bold text-gray-800 mb-2">승인 대기 중</h1>

        {/* 사용자 정보 */}
        {user && (
          <p className="text-gray-600 mb-4">
            <span className="font-medium">{user.name || user.email}</span>님
          </p>
        )}

        {/* 안내 메시지 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm leading-relaxed">
            회원가입이 완료되었습니다.
            <br />
            관리자 승인 후 로그인할 수 있습니다.
          </p>
        </div>

        {/* 추가 안내 */}
        <div className="text-gray-500 text-sm mb-6">
          <p>승인까지 최대 24시간이 소요될 수 있습니다.</p>
          <p className="mt-2">
            문의:{' '}
            <a href="mailto:admin@company.com" className="text-blue-600 hover:underline">
              admin@company.com
            </a>
          </p>
        </div>

        {/* 로그아웃 버튼 */}
        <button
          onClick={handleLogout}
          className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
        >
          로그인 페이지로 돌아가기
        </button>

        {/* 상태 표시 */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
          <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></span>
          <span>관리자 검토 중</span>
        </div>
      </div>
    </div>
  );
}
