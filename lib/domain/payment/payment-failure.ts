/**
 * 결제가 끝나지 못했을 때 **사람에게 무슨 말을 할지** 정하는 단일 출처.
 *
 * ## 🔴 왜 필요한가
 * 예전 화면은 사용자가 스스로 «취소» 를 눌러도 **붉은 경고 + 「결제 실패」 + 오류 코드**를 띄웠다.
 * 취소는 실패가 아니다. 자기가 그만둔 것을 실패라고 하면, 잘못한 것 같고 뭔가 망가진 것 같다.
 * 게다가 `PAY_PROCESS_CANCELED` 같은 코드는 사용자에게 아무 의미가 없는데 제일 크게 보였다.
 *
 * 그래서 **취소·거절·실패를 갈라** 톤과 다음 행동을 다르게 준다.
 * 화면은 이 판정을 그리기만 한다 — 문구를 화면에서 다시 만들지 않는다(두 화면이 갈라지는 원인).
 *
 * 🔴 토스가 주는 `message` 는 이미 한국어 사용자 문구다. 우리가 아는 코드는 우리 말로 바꾸고,
 *    모르는 코드는 **토스 문구를 그대로 살린다** — 지어내면 실제 원인과 어긋난다.
 */

export type PaymentFailureKind =
  /** 사용자가 스스로 그만둠. 실패가 아니다. */
  | 'canceled'
  /** 카드사·계약 등에서 거절. 사용자가 조건을 바꾸면 될 수 있다. */
  | 'rejected'
  /** 우리 쪽/토스 쪽 문제. 사용자가 할 수 있는 게 없다. */
  | 'failed'

export interface PaymentFailureNotice {
  readonly kind: PaymentFailureKind
  /** 큰 제목 — 무슨 일이 있었는지 한 줄. */
  readonly title: string
  /** 설명 한두 문장. */
  readonly description: string
  /** 다시 시도가 의미 있는가. 취소·거절은 의미 있고, 설정 오류는 없다. */
  readonly canRetry: boolean
  /** 1:1 문의를 안내할 것인가. **취소에는 절대 띄우지 않는다**(불안만 준다). */
  readonly showSupport: boolean
}

interface Rule {
  readonly kind: PaymentFailureKind
  readonly title: string
  readonly description: string
  readonly canRetry?: boolean
  readonly showSupport?: boolean
}

/**
 * 코드별 문구. 여기 없는 코드는 토스 메시지를 그대로 쓴다.
 * 🔴 취소 계열에 «실패»·«오류» 라는 낱말을 쓰지 않는다(회귀 테스트가 막는다).
 */
const RULES: Record<string, Rule> = {
  PAY_PROCESS_CANCELED: {
    kind: 'canceled',
    title: '결제를 그만두셨어요',
    description: '아직 아무것도 결제되지 않았습니다. 마음이 정해지면 언제든 다시 오세요.',
  },
  USER_CANCEL: {
    kind: 'canceled',
    title: '결제를 그만두셨어요',
    description: '아직 아무것도 결제되지 않았습니다. 마음이 정해지면 언제든 다시 오세요.',
  },
  PAY_PROCESS_ABORTED: {
    kind: 'failed',
    title: '결제가 끝까지 가지 못했어요',
    description: '결제 도중 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요.',
    showSupport: true,
  },
  REJECT_CARD_COMPANY: {
    kind: 'rejected',
    title: '카드사에서 승인하지 않았어요',
    description: '카드 한도나 상태를 확인하시고, 다른 카드로도 시도해 보세요.',
  },
  INVALID_CARD_EXPIRATION: {
    kind: 'rejected',
    title: '카드 유효기간을 다시 확인해 주세요',
    description: '입력하신 유효기간이 카드와 맞지 않습니다.',
  },
  INVALID_STOPPED_CARD: {
    kind: 'rejected',
    title: '정지된 카드예요',
    description: '다른 카드로 시도해 주세요.',
  },
  EXCEED_MAX_DAILY_PAYMENT_COUNT: {
    kind: 'rejected',
    title: '오늘 결제 횟수를 넘었어요',
    description: '카드사 기준으로 하루 한도를 넘었습니다. 내일 다시 시도하거나 다른 카드를 써 주세요.',
  },
  NOT_ENOUGH_BALANCE: {
    kind: 'rejected',
    title: '잔액이 모자라요',
    description: '카드 잔액이나 한도를 확인해 주세요.',
  },
  NOT_SUPPORTED_METHOD: {
    kind: 'failed',
    title: '지금은 이 결제수단을 쓸 수 없어요',
    description: '결제수단 설정에 문제가 있습니다. 잠시 뒤 다시 시도해 주세요.',
    canRetry: false,
    showSupport: true,
  },
  UNAUTHORIZED_KEY: {
    kind: 'failed',
    title: '결제 설정에 문제가 있어요',
    description: '잠시 뒤 다시 시도해 주세요. 계속되면 알려주시면 바로 손보겠습니다.',
    canRetry: false,
    showSupport: true,
  },
}

/** 취소로 볼 코드 — 붉은 경고를 띄우면 안 되는 부류. */
export function isUserCanceled(code: string | null | undefined): boolean {
  return RULES[String(code ?? '')]?.kind === 'canceled'
}

/**
 * 실패 코드·메시지를 화면이 그릴 수 있는 안내로 바꾼다.
 *
 * @param code    토스가 `failUrl` 쿼리로 주는 에러 코드
 * @param message 토스가 함께 주는 한국어 메시지(모르는 코드일 때 이걸 살린다)
 */
export function describePaymentFailure(code: string | null | undefined, message?: string | null): PaymentFailureNotice {
  const rule = RULES[String(code ?? '')]
  if (rule) {
    return {
      kind: rule.kind,
      title: rule.title,
      description: rule.description,
      canRetry: rule.canRetry ?? true,
      showSupport: rule.showSupport ?? false,
    }
  }

  const fromToss = (message ?? '').trim()
  return {
    kind: 'failed',
    title: '결제가 끝까지 가지 못했어요',
    // 🔴 모르는 코드는 토스 문구를 살린다. 없을 때만 우리 문장으로 덮는다.
    description: fromToss || '잠시 뒤 다시 시도해 주세요.',
    canRetry: true,
    showSupport: true,
  }
}
