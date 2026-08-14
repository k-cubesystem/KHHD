/**
 * Gemini/Claude 단가 및 비용 추정 (순수 함수 — 서버 의존 없음, 단위 테스트 가능).
 *
 * ⚠️ 단가는 추측 금지 — 외부 공식 출처를 확인해 상수화하고 출처·확인일을 주석에 남긴다.
 */

// ============================================================
// 텍스트 모델 토큰 단가 (USD per 1M tokens)
//
// 주력 모델 검증: Google 공식 https://ai.google.dev/gemini-api/docs/pricing (확인일 2026-07-21)
//   - gemini-3.5-flash: input $1.50 / output $9.00  ← 구값(0.075/0.3)이 실제의 1/20 이었음.
//     세션26 원가율 표를 본 값으로 재해석할 것(과거 로그의 estimated_cost_usd 는 과소계상).
//   - gemini-2.5-flash: input $0.30 / output $2.50
// 2026-08-14 갱신 — 주력을 3.7-flash 로 옮기며 라인업 재확인(https://ai.google.dev/gemini-api/docs/models):
//   - gemini-3.7-flash(최신 GA): $1.50 / $7.50 · 인트로 $0.75/$3.75(~2026-12-31)
//   - gemini-3.1-pro-preview: $2.00 / $12.00 — **구 상수 1.25/5.0 은 오류였다**
//   - gemini-3.5-pro 는 미출시(라인업에 없다)
// 미검증 레거시(1.5/2.0 계열)는 현재 코드가 사용하지 않아 구값 유지.
// ============================================================
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  'gemini-2.0-flash-lite': { input: 0.0375, output: 0.15 },
  'gemini-2.0-flash-exp': { input: 0.075, output: 0.3 },
  'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  'gemini-1.5-pro': { input: 1.25, output: 5.0 },
  'gemini-3.5-flash': { input: 1.5, output: 9.0 },
  // 주력(2026-08-14~). 인트로가 $0.75/$3.75(2026-12-31까지)이나 **정상가로 계상**한다 —
  // 과소계상보다 과대계상이 안전하고, 2027-01-01 에 상수를 고칠 필요가 없다.
  'gemini-3.7-flash': { input: 1.5, output: 7.5 },
  'gemini-3.6-flash': { input: 1.5, output: 7.5 },
  'gemini-3.5-flash-lite': { input: 0.3, output: 2.5 },
  'gemini-3-flash-preview': { input: 1.5, output: 9.0 },
  // 🔴 정정(2026-08-14): 구값 1.25/5.0 은 1.5 Pro 값이었다 — 실제는 2/12(200K 초과 시 4/18).
  'gemini-3.1-pro-preview': { input: 2.0, output: 12.0 },
  'gemini-2.5-flash-preview': { input: 0.3, output: 2.5 },
  // Claude models
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
}

// ============================================================
// 이미지 모델 단가 (호출당 고정 — 장당 과금, 토큰 무관)
//
// 출처: Google 공식 — https://ai.google.dev/gemini-api/docs/pricing (확인일 2026-07-21)
//   "Gemini 3.1 Flash Image (Nano Banana 2)" Standard: 1K 해상도 = $0.067/image
//   ($60.00 / 1M output tokens, 1K 이미지 = 1,120 tokens → 1120 × 60 / 1e6 = $0.0672).
//   앱(generateFortuneImage)은 해상도를 API 에 명시하지 않아 기본(~1K) 기준 채택.
//   프로젝트 상수 `gemini-3.1-flash-image-preview`(preview) → 위 실모델에 매핑.
//   ※ preview 정식가 상이 시 이 상수만 갱신하면 됨.
// ============================================================
export const IMAGE_MODEL_PRICE_USD: Record<string, number> = {
  'gemini-3.1-flash-image-preview': 0.067,
}

/** 기본 이미지 단가(등록 안 된 image 모델 폴백) — 위 3.1 Flash Image 1K 기준 */
export const DEFAULT_IMAGE_PRICE_USD = 0.067

/** 폴백 텍스트 단가(등록 안 된 텍스트 모델) — 주력 3.5-flash 와 동일(과소계상보다 과대계상이 안전) */
const FALLBACK_TEXT_PRICING = { input: 1.5, output: 9.0 }

export function isImageModel(model: string): boolean {
  return model in IMAGE_MODEL_PRICE_USD || model.includes('image')
}

/**
 * 호출 비용(USD) 추정.
 * - 이미지 모델: 장당 고정 단가(입력 토큰 무관).
 * - 텍스트 모델: (input×단가 + output×단가) / 1M.
 */
export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  if (isImageModel(model)) {
    return IMAGE_MODEL_PRICE_USD[model] ?? DEFAULT_IMAGE_PRICE_USD
  }
  const pricing = MODEL_PRICING[model] ?? FALLBACK_TEXT_PRICING
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
}
