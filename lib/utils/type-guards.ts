/**
 * 타입 가드 유틸리티 함수
 * Type guard utility functions for safe type checking
 */

/**
 * 에러 타입 가드
 * Check if value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Supabase 에러 타입 가드
 * Check if value is a Supabase error object
 */
export function isSupabaseError(
  error: unknown
): error is { code: string; message: string; details?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    "message" in error &&
    typeof (error as { code: unknown }).code === "string" &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * 객체 타입 가드
 * Check if value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * 문자열 타입 가드
 * Check if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * 배열 타입 가드
 * Check if value is an array
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 숫자 타입 가드 (NaN 제외)
 * Check if value is a valid number (excluding NaN)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * null 또는 undefined 체크
 * Check if value is null or undefined
 */
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Promise 타입 가드
 * Check if value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return (
    isObject(value) &&
    "then" in value &&
    typeof (value as { then: unknown }).then === "function"
  );
}

/**
 * API 응답 성공 타입 가드
 * Check if API response is successful
 */
export function isSuccessResponse<T>(
  response: unknown
): response is { success: true; data: T } {
  return (
    isObject(response) &&
    "success" in response &&
    response.success === true &&
    "data" in response
  );
}

/**
 * API 응답 에러 타입 가드
 * Check if API response is an error
 */
export function isErrorResponse(
  response: unknown
): response is { success: false; error: string } {
  return (
    isObject(response) &&
    "success" in response &&
    response.success === false &&
    "error" in response &&
    typeof (response as { error: unknown }).error === "string"
  );
}

/**
 * 날짜 문자열 유효성 검사 (YYYY-MM-DD 형식)
 * Validate date string format
 */
export function isValidDateString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(value)) return false;
  const date = new Date(value);
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * 시간 문자열 유효성 검사 (HH:mm 형식)
 * Validate time string format
 */
export function isValidTimeString(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
  return timeRegex.test(value);
}
