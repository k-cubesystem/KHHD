import { describePaymentFailure, isUserCanceled } from './payment-failure'

/**
 * 결제 수단 변경 복귀 화면이 **무엇을 보여 줄지** 정하는 단일 출처.
 *
 * ## 🔴 왜 화면에서 정하지 않나
 * 문구를 화면에서 다시 만들면 결제 실패 화면과 갈라진다. 실제로 갈라져 있었다 —
 * 회원이 토스 창에서 «취소»를 눌러도 이 화면만 **붉은 X + 「바꾸지 못했습니다」**를 띄웠다.
 * `payment-failure.ts` 가 못 박아 둔 원칙(「취소는 실패가 아니다」)이 이 화면에는 닿지 않았던 것이다.
 *
 * ## 🔴 여기서는 «돈»을 말하지 않는다
 * 수단만 바꾸는 자리다. `describePaymentFailure` 의 문구는 결제용이라
 * (「아직 아무것도 결제되지 않았습니다」) 그대로 쓰면 엉뚱하다.
 * **분류(kind)만 빌려 오고 문장은 이 자리의 말로 쓴다.**
 */
export type BillingChangeTone =
  /** 아무 일도 없었다 — 경고할 것이 없다(취소 · 주소로 바로 들어옴). */
  | 'neutral'
  /** 바꾸려다 못 바꿨다 — 기존 수단은 그대로다. */
  | 'error'

export interface BillingChangeNotice {
  readonly tone: BillingChangeTone
  readonly title: string
  readonly body: string
}

/** 인증 뒤 돌아오지 않고 주소로 바로 들어온 자리. 아무 일도 없었으니 붉게 칠하지 않는다. */
const DIRECT_VISIT: BillingChangeNotice = {
  tone: 'neutral',
  title: '여기는 결제 수단 변경을 마치는 자리예요',
  body: '결제 · 구독 관리에서 「결제 수단 변경」을 눌러 주세요.',
}

/** 회원이 스스로 그만둠. 실패가 아니다 — 제목·아이콘까지 중립이어야 한다. */
const CANCELED: BillingChangeNotice = {
  tone: 'neutral',
  title: '결제 수단 변경을 그만두셨어요',
  body: '기존 결제 수단은 그대로입니다. 마음이 정해지면 언제든 다시 오세요.',
}

/**
 * URL 만 보고 아는 결과. 인증이 정상이면 null — 그때만 빌링키 발급으로 넘어간다.
 *
 * @param code       토스가 `failUrl` 쿼리로 주는 에러 코드
 * @param message    토스가 함께 주는 한국어 메시지(모르는 코드일 때 이걸 살린다)
 * @param authKey    토스가 성공 시 붙여 주는 일회성 인증 키
 * @param customerKey 우리가 successUrl 에 실어 보낸 대기 중인 키
 */
export function billingChangeNotice(
  code: string | null | undefined,
  message: string | null | undefined,
  authKey: string | null | undefined,
  customerKey: string | null | undefined
): BillingChangeNotice | null {
  if (code) {
    if (isUserCanceled(code)) return CANCELED
    return failedNotice(describePaymentFailure(code, message).description)
  }
  if (!authKey || !customerKey) return DIRECT_VISIT
  return null
}

/** 발급·교체가 실패했을 때. 회원이 가장 알고 싶은 것은 «내 카드가 어떻게 됐나»다. */
export function failedNotice(reason: string): BillingChangeNotice {
  const said = reason.trim()
  return {
    tone: 'error',
    title: '결제 수단을 바꾸지 못했습니다',
    body: said
      ? `${said} 기존 결제 수단은 그대로입니다.`
      : '기존 결제 수단은 그대로입니다. 잠시 뒤 다시 시도해 주세요.',
  }
}
