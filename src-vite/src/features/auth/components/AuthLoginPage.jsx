// OJT Master - Auth Login Page (Email + Google OAuth)
// Issue #105: Docker OAuth 리디렉션 문제 해결
// 탭 기반 로그인/회원가입 UI

import { useState } from 'react';
import { useAuth } from '@features/auth/hooks/AuthContext';
import { Toast } from '@contexts/ToastContext';
import { AUTH_CONFIG } from '@/constants';

// 탭 상수
const AUTH_TABS = {
  LOGIN: 'login',
  SIGNUP: 'signup',
};

export default function AuthLoginPage() {
  const { handleGoogleLogin, handleEmailLogin, handleEmailSignup } = useAuth();
  const [activeTab, setActiveTab] = useState(AUTH_TABS.LOGIN);
  const [isLoading, setIsLoading] = useState(false);

  // 환경별 인증 모드
  const authMode = AUTH_CONFIG?.MODE || 'hybrid';
  const showGoogle = authMode !== 'email';
  const showEmail = authMode !== 'google';

  // Google 로그인
  const onGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await handleGoogleLogin();
    } catch (error) {
      Toast.error('Google 로그인 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* 로고 */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">OJT</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">OJT Master</h1>
          <p className="text-gray-600 mt-1">AI 기반 온보딩 교육 플랫폼</p>
        </div>

        {/* Google OAuth (hybrid 또는 google 모드) */}
        {showGoogle && (
          <>
            <button
              onClick={onGoogleLogin}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Google 계정으로 로그인"
            >
              <GoogleIcon />
              <span className="font-medium text-gray-700">Google로 로그인</span>
            </button>

            {showEmail && (
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">또는</span>
                </div>
              </div>
            )}
          </>
        )}

        {/* Email 인증 (hybrid 또는 email 모드) */}
        {showEmail && (
          <>
            {/* 탭 전환 */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab(AUTH_TABS.LOGIN)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === AUTH_TABS.LOGIN
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                로그인
              </button>
              <button
                onClick={() => setActiveTab(AUTH_TABS.SIGNUP)}
                className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === AUTH_TABS.SIGNUP
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                회원가입
              </button>
            </div>

            {/* 로그인 폼 */}
            {activeTab === AUTH_TABS.LOGIN && (
              <LoginForm
                onSubmit={handleEmailLogin}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {/* 회원가입 폼 */}
            {activeTab === AUTH_TABS.SIGNUP && (
              <SignupForm
                onSubmit={handleEmailSignup}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
                onSuccess={() => setActiveTab(AUTH_TABS.LOGIN)}
              />
            )}
          </>
        )}

        {/* 안내 문구 */}
        <p className="text-xs text-gray-400 mt-6 text-center">
          로그인 시 서비스 이용약관에 동의하는 것으로 간주됩니다.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LoginForm 컴포넌트
// ============================================================
function LoginForm({ onSubmit, isLoading, setIsLoading }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit(email, password);
    } catch (err) {
      // 에러 메시지 한글화
      if (err.message?.includes('Invalid login credentials')) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else if (err.message?.includes('Email not confirmed')) {
        setError('이메일 인증이 완료되지 않았습니다.');
      } else if (err.message?.includes('pending')) {
        setError('관리자 승인 대기 중입니다.');
      } else {
        setError(err.message || '로그인 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호
        </label>
        <input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="current-password"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  );
}

// ============================================================
// SignupForm 컴포넌트
// ============================================================
function SignupForm({ onSubmit, isLoading, setIsLoading, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('mentee');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // 유효성 검사
    if (!name || !email || !password || !confirmPassword) {
      setError('모든 필드를 입력해주세요.');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    setIsLoading(true);
    try {
      await onSubmit({ name, email, password, role });
      setSuccess(true);
      Toast.success('회원가입이 완료되었습니다. 관리자 승인 후 로그인할 수 있습니다.');
    } catch (err) {
      if (err.message?.includes('already registered')) {
        setError('이미 등록된 이메일입니다.');
      } else {
        setError(err.message || '회원가입 중 오류가 발생했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 성공 화면
  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-gray-800 mb-2">회원가입 완료</h3>
        <p className="text-sm text-gray-600 mb-4">
          관리자 승인 후 로그인할 수 있습니다.
          <br />
          승인 완료 시 이메일로 알려드립니다.
        </p>
        <button
          onClick={onSuccess}
          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
        >
          로그인 페이지로 이동
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="signup-name" className="block text-sm font-medium text-gray-700 mb-1">
          이름
        </label>
        <input
          id="signup-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="name"
        />
      </div>

      <div>
        <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 mb-1">
          이메일
        </label>
        <input
          id="signup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@company.com"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="email"
        />
      </div>

      <div>
        <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호 (8자 이상)
        </label>
        <input
          id="signup-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 mb-1">
          비밀번호 확인
        </label>
        <input
          id="signup-confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoading}
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">역할 선택</label>
        <div className="flex gap-3">
          <label className="flex-1">
            <input
              type="radio"
              name="role"
              value="mentor"
              checked={role === 'mentor'}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="p-3 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-blue-500 peer-checked:bg-blue-50 hover:bg-gray-50 transition">
              <span className="text-xl">👨‍🏫</span>
              <p className="text-sm font-medium mt-1">Mentor</p>
            </div>
          </label>
          <label className="flex-1">
            <input
              type="radio"
              name="role"
              value="mentee"
              checked={role === 'mentee'}
              onChange={(e) => setRole(e.target.value)}
              className="sr-only peer"
              disabled={isLoading}
            />
            <div className="p-3 border-2 border-gray-200 rounded-xl text-center cursor-pointer peer-checked:border-green-500 peer-checked:bg-green-50 hover:bg-gray-50 transition">
              <span className="text-xl">👨‍🎓</span>
              <p className="text-sm font-medium mt-1">Mentee</p>
            </div>
          </label>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
        ⚠️ 회원가입 후 관리자 승인이 필요합니다.
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? '처리 중...' : '회원가입 신청'}
      </button>
    </form>
  );
}

// ============================================================
// Google 아이콘 컴포넌트
// ============================================================
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
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
  );
}
