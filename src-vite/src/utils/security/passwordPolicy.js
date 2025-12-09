// OJT Master - Password Policy (Issue #122)
// 비밀번호 정책 유효성 검사

/**
 * 비밀번호 정책 설정
 */
export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false, // 특수문자는 선택사항
  MIN_CATEGORIES: 3, // 대문자, 소문자, 숫자, 특수문자 중 최소 3가지
};

/**
 * 일반적인 취약 비밀번호 목록
 */
const COMMON_PASSWORDS = [
  'password',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'password123',
  'admin',
  '1234567890',
];

/**
 * 비밀번호 유효성 검사
 * @param {string} password - 검사할 비밀번호
 * @returns {{ isValid: boolean, errors: string[] }} 검사 결과
 */
export function validatePassword(password) {
  const errors = [];

  if (!password) {
    return { isValid: false, errors: ['비밀번호를 입력해주세요.'] };
  }

  // 최소 길이 검사
  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`비밀번호는 ${PASSWORD_POLICY.MIN_LENGTH}자 이상이어야 합니다.`);
  }

  // 카테고리 검사
  let categoryCount = 0;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  if (hasUppercase) categoryCount++;
  if (hasLowercase) categoryCount++;
  if (hasNumber) categoryCount++;
  if (hasSpecial) categoryCount++;

  if (categoryCount < PASSWORD_POLICY.MIN_CATEGORIES) {
    errors.push('대문자, 소문자, 숫자, 특수문자 중 3가지 이상을 포함해야 합니다.');
  }

  // 일반적인 비밀번호 차단
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('너무 일반적인 비밀번호입니다. 다른 비밀번호를 사용해주세요.');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * 비밀번호 강도 계산
 * @param {string} password - 검사할 비밀번호
 * @returns {{ score: number, label: string, color: string }} 강도 정보
 */
export function getPasswordStrength(password) {
  if (!password) {
    return { score: 0, label: '', color: '' };
  }

  let score = 0;

  // 길이 점수
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  // 복잡성 점수
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score += 1;

  // 점수를 0-4 범위로 정규화
  const normalizedScore = Math.min(4, Math.floor(score / 2));

  const strengthMap = [
    { label: '매우 약함', color: 'bg-red-500' },
    { label: '약함', color: 'bg-orange-500' },
    { label: '보통', color: 'bg-yellow-500' },
    { label: '강함', color: 'bg-green-500' },
    { label: '매우 강함', color: 'bg-green-600' },
  ];

  return {
    score: normalizedScore,
    ...strengthMap[normalizedScore],
  };
}
