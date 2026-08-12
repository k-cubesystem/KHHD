/**
 * 비밀번호 정책 단일 출처.
 *
 * Supabase Auth 프로젝트 설정(`password_min_length`)과 **반드시 같은 값**이어야 한다.
 * 폼에만 적어 두면 서버가 거절할 때 사용자는 이유를 못 듣고, 서버에만 두면 제출 후에야 막힌다.
 * 값을 바꿀 때는 Management API 설정도 함께 바꾼다:
 *   PATCH /v1/projects/{ref}/config/auth  {"password_min_length": N}
 */
export const PASSWORD_MIN_LENGTH = 8
