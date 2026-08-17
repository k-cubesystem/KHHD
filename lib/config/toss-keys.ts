import 'server-only'

/**
 * 토스 시크릿 키 **단일 출처** — 상점아이디(MID)가 둘이라 키도 두 쌍이다.
 *
 * ## 🔴 왜 한 쌍으로는 안 되나
 * 토스는 MID 마다 별도 키쌍을 준다. 우리는 상점이 둘이다 —
 *   · 일반결제 `khaehwjxqe`      → 복채 충전 승인 · 충전 취소
 *   · 정기결제 `bill_khaehqj1a`  → 빌링키 발급 · 정기 청구 · 멤버십 취소
 *
 * 한 키로 다른 상점의 결제를 부르면 토스가 거절한다. 그래서 «어느 상점의 결제인가» 를
 * 호출자가 고르게 하고, 이 파일이 그 두 값을 만드는 유일한 자리다.
 *
 * ## 🔴 폴백을 남겨둔 이유
 * 새 환경변수가 들어오기 **전에** 이 리팩터를 배포해도 동작이 그대로여야 한다. 옛 이름
 * (`TOSS_PAYMENTS_SECRET_KEY`)으로 떨어지므로 배포와 키 투입 순서를 신경 쓰지 않아도 된다.
 * 빌링 키가 없으면 일반 키로 떨어진다 — 키를 한 쌍만 쓰던 지금 동작과 정확히 같다.
 *
 * 🔴 새 이름으로 값이 들어오면 폴백은 자동으로 비켜난다. **키 투입 확인 후 옛 변수를 지운다.**
 *    (`TOSS_WEBHOOK_SECRET` 은 읽는 코드가 없는 고아다 — 함께 지운다.)
 */

/** 일반결제 상점(`khaehwjxqe`) 시크릿 키. */
export const tossGeneralSecretKey = process.env.TOSS_SECRET_KEY ?? process.env.TOSS_PAYMENTS_SECRET_KEY ?? ''

/** 정기결제 상점(`bill_khaehqj1a`) 시크릿 키. 미설정이면 일반 키로 떨어진다(옛 동작 보존). */
export const tossBillingSecretKey = process.env.TOSS_BILLING_SECRET_KEY ?? tossGeneralSecretKey

/**
 * 웹훅 인증에 통과시킬 시크릿 목록.
 *
 * 🔴 상점이 둘이면 웹훅도 둘이고, 각자 **자기 상점 시크릿**으로 Basic 인증을 보낸다.
 *    하나만 비교하면 다른 상점의 웹훅이 **전량 거절**된다 — 취소·환불 통지가 통째로 사라진다.
 *    (빌링 키가 없어 두 값이 같을 때는 중복을 걷어낸다.)
 */
export const tossWebhookSecretKeys: readonly string[] = Array.from(
  new Set([tossGeneralSecretKey, tossBillingSecretKey].filter(Boolean))
)
