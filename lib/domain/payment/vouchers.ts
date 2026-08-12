/**
 * 이용권(voucher) 카탈로그 · 순수 로직 — v1(선물·1회용 기반 구조).
 *
 * 상품은 voucher_type 추가만으로 늘릴 수 있게 카탈로그로 관리한다.
 * v1 상품은 '고민상담 1일권'(CHAT_DAY_PASS) 1종 — 복채 1만냥, 구매 즉시 24시간 유효.
 * 선물하기(gift)는 v2 — source='gift' + 수신자 지정 컬럼 확장으로 이어갈 수 있게 구조만 남긴다.
 *
 * 순수 함수(side-effect 없음) — 단위테스트 대상.
 */

export type VoucherType = 'CHAT_DAY_PASS'

export interface VoucherProduct {
  type: VoucherType
  label: string
  description: string
  /** 복채 가격(만냥). */
  priceBokchae: number
  /** 유효기간(시간) — 구매 즉시 now + durationHours 만료. */
  durationHours: number
  /** 멤버십에 상시 포함되는지(안내 문구용). */
  includedInMembership: boolean
}

export const VOUCHER_CATALOG: Record<VoucherType, VoucherProduct> = {
  CHAT_DAY_PASS: {
    type: 'CHAT_DAY_PASS',
    // 🔴 «무제한» 금지 — 이 이용권이 여는 것은 고민상담 «입장»이다(app/protected/ai-shaman/page.tsx 게이트).
    //    전송 경로는 등급·이용권을 보지 않고 하루 질문 한도만 본다(shaman-chat.ts sendShamanMessage).
    label: '고민상담 1일권',
    description: '구매 즉시 24시간 동안 해화지기 고민상담에 들어갈 수 있습니다. 질문은 하루 무료분까지 쓰십니다.',
    priceBokchae: 1,
    durationHours: 24,
    includedInMembership: true,
  },
}

export const VOUCHER_TYPES = Object.keys(VOUCHER_CATALOG) as VoucherType[]

export function getVoucherProduct(type: VoucherType): VoucherProduct {
  return VOUCHER_CATALOG[type]
}

/** 임의 문자열이 유효한 voucher_type 인지(런타임 가드 — 서버 액션 입력 검증). */
export function isVoucherType(value: string): value is VoucherType {
  return Object.prototype.hasOwnProperty.call(VOUCHER_CATALOG, value)
}

/** 만료 시각 = 기준시각(ms) + durationHours. 순수. */
export function computeVoucherExpiry(product: VoucherProduct, fromMs: number): Date {
  return new Date(fromMs + product.durationHours * 3_600_000)
}

/** 활성 여부: status 'active' 이고 만료 전(now 주입 — 순수·테스트 가능). */
export function isVoucherActive(voucher: { status: string; expires_at: string | null }, nowMs: number): boolean {
  if (voucher.status !== 'active') return false
  if (!voucher.expires_at) return false
  return new Date(voucher.expires_at).getTime() > nowMs
}
