/**
 * 첫 구독 첫 달 할인 — 순수 로직(서버·클라이언트 공용). CEO 결정 2026-09-19.
 *
 * 복채 시절의 «첫 충전 2배»를 대신한다. 충전을 부추기는 보너스는 충전업종 판정을 강하게 하지만,
 * 구독 첫 달 요금 할인은 재화를 더 주는 것이 아니라 값을 깎는 것이라 그 문제가 없다.
 *
 * 🔴 대상은 계정당 생애 1회 — 유료 멤버십 결제(성공) 이력이 한 번도 없는 회원. 판정은 서버가 한다
 *    (`app/actions/payment/subscription.ts`). 해지 후 재가입으로 할인을 되풀이할 수 없다.
 * 🔴 할인은 «첫 결제 한 번»뿐이다. 다음 결제부터는 정가가 자동 결제되므로, 결제 전 화면(멤버십 카드·결제 확인·
 *    구매조건 동의)에 첫 결제 금액과 정가를 **함께** 적는다 — 자동결제 금액이 바뀌는 것을 알리지 않으면
 *    전자상거래법·표시광고법 문제가 된다. 문구는 아래 함수가 단일 출처다.
 * 🔴 즉시 해지 환불은 «실제로 낸 금액»(subscription_payments.amount) 기준이다 — 정가로 환불하지 않는다.
 */

/** 첫 달 할인율. */
export const FIRST_MONTH_DISCOUNT_RATE = 0.5

/** 화면에 적는 할인율(%). */
export function firstMonthDiscountPercent(): number {
  return Math.round(FIRST_MONTH_DISCOUNT_RATE * 100)
}

/** 첫 결제 금액(원). 1원 단위는 반올림. */
export function firstMonthPrice(regularPrice: number): number {
  if (!Number.isFinite(regularPrice) || regularPrice <= 0) return 0
  return Math.round(regularPrice * (1 - FIRST_MONTH_DISCOUNT_RATE))
}

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

/** 가격 아래 한 줄 — 「첫 달 6,400원 · 다음 결제부터 12,800원」. */
export function firstMonthOfferLine(regularPrice: number): string {
  return `첫 달 ${won(firstMonthPrice(regularPrice))} · 다음 결제부터 ${won(regularPrice)}`
}

/** 자격 안내 — 누가 받는지 숨기지 않는다. */
export function firstMonthEligibilityLine(): string {
  return `멤버십을 처음 결제하시는 분께 첫 달 요금을 ${firstMonthDiscountPercent()}% 할인해 드립니다(계정당 1회).`
}
