// OJT Master - Login Rate Limiting (Issue #131)
// 브루트포스 공격 방지를 위한 로그인 시도 제한

const LOGIN_ATTEMPTS_KEY = 'ojt_login_attempts';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15분

/**
 * 로그인 시도 정보 가져오기
 * @param {string} username - 사용자 아이디
 * @returns {{ attempts: number, lockedUntil: number | null }}
 */
function getAttemptInfo(username) {
  try {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    if (!data) return { attempts: 0, lockedUntil: null };

    const allAttempts = JSON.parse(data);
    return allAttempts[username] || { attempts: 0, lockedUntil: null };
  } catch {
    return { attempts: 0, lockedUntil: null };
  }
}

/**
 * 로그인 시도 정보 저장
 * @param {string} username - 사용자 아이디
 * @param {{ attempts: number, lockedUntil: number | null }} info
 */
function setAttemptInfo(username, info) {
  try {
    const data = localStorage.getItem(LOGIN_ATTEMPTS_KEY);
    const allAttempts = data ? JSON.parse(data) : {};
    allAttempts[username] = info;
    localStorage.setItem(LOGIN_ATTEMPTS_KEY, JSON.stringify(allAttempts));
  } catch {
    // localStorage 실패 시 무시
  }
}

/**
 * 로그인 가능 여부 확인
 * @param {string} username - 사용자 아이디
 * @returns {{ canLogin: boolean, remainingTime: number | null, remainingAttempts: number }}
 */
export function checkLoginAllowed(username) {
  const info = getAttemptInfo(username);

  // 잠금 상태 확인
  if (info.lockedUntil) {
    const now = Date.now();
    if (now < info.lockedUntil) {
      const remainingTime = Math.ceil((info.lockedUntil - now) / 1000 / 60);
      return { canLogin: false, remainingTime, remainingAttempts: 0 };
    }
    // 잠금 해제
    setAttemptInfo(username, { attempts: 0, lockedUntil: null });
  }

  return {
    canLogin: true,
    remainingTime: null,
    remainingAttempts: MAX_ATTEMPTS - info.attempts,
  };
}

/**
 * 로그인 실패 기록
 * @param {string} username - 사용자 아이디
 * @returns {{ isLocked: boolean, remainingAttempts: number }}
 */
export function recordLoginFailure(username) {
  const info = getAttemptInfo(username);
  const newAttempts = info.attempts + 1;

  if (newAttempts >= MAX_ATTEMPTS) {
    // 계정 잠금
    setAttemptInfo(username, {
      attempts: newAttempts,
      lockedUntil: Date.now() + LOCKOUT_DURATION_MS,
    });
    return { isLocked: true, remainingAttempts: 0 };
  }

  setAttemptInfo(username, { attempts: newAttempts, lockedUntil: null });
  return { isLocked: false, remainingAttempts: MAX_ATTEMPTS - newAttempts };
}

/**
 * 로그인 성공 시 시도 횟수 초기화
 * @param {string} username - 사용자 아이디
 */
export function resetLoginAttempts(username) {
  setAttemptInfo(username, { attempts: 0, lockedUntil: null });
}

/**
 * 남은 잠금 시간 포맷팅
 * @param {number} minutes - 남은 분
 * @returns {string} 포맷된 시간
 */
export function formatLockoutTime(minutes) {
  if (minutes <= 1) return '약 1분';
  return `약 ${minutes}분`;
}
