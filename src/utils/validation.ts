// BE SignUpRequest·UpdateMyInfoRequest·ChangePasswordRequest 검증 규칙과 동일하게 유지
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)[\x21-\x7E]{8,20}$/;
export const PASSWORD_RULE_MESSAGE = "공백 없이 영문과 숫자를 함께 넣어 8~20자로 입력해 주세요.";

export function validateNickname(value: string): string | null {
  const nickname = value.trim();
  if (nickname === "") return "닉네임을 입력해 주세요.";
  if (nickname.length < 2 || nickname.length > 16) return "닉네임은 2~16자로 입력해 주세요.";
  return null;
}
