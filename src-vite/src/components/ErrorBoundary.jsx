// OJT Master - Error Boundary Component (Issue #136)
// 전역 에러 처리 및 사용자 친화적 에러 화면

import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // 프로덕션에서는 에러 로깅 서비스로 전송 가능
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    // 홈으로 이동
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-xl">
            {/* 에러 아이콘 */}
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* 에러 메시지 */}
            <h1 className="mb-2 text-xl font-bold text-gray-800">문제가 발생했습니다</h1>
            <p className="mb-6 text-gray-600">
              예기치 않은 오류가 발생했습니다. 불편을 드려 죄송합니다.
            </p>

            {/* 에러 상세 (개발 환경에서만) */}
            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 rounded-lg bg-gray-100 p-3 text-left">
                <p className="font-mono text-xs break-all text-red-600">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            {/* 버튼 */}
            <div className="flex justify-center gap-3">
              <button
                onClick={this.handleReload}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white transition hover:bg-blue-700"
              >
                새로고침
              </button>
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 transition hover:bg-gray-300"
              >
                홈으로 이동
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
