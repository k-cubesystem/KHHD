/**
 * 감사 로그 액션의 **우리말 라벨 단일 출처**.
 *
 * 🔴 예전엔 `app/admin/audit/page.tsx` 안에 라벨 표가 박혀 있었다. 조작을 늘리면 화면이 즉시
 *    뒤처져 영문 코드가 그대로 노출된다 — 기록 카테고리 라벨이 똑같이 뒤처졌던 전례가 있다
 *    (`lib/domain/analysis/category-labels.ts` 로 해소했다). 같은 실수를 반복하지 않는다.
 *
 * 🔴 액션을 새로 만들면 **여기에도 넣는다.** 빠지면 회귀 테스트가 먼저 운다.
 */

export const ADMIN_AUDIT_ACTIONS = [
  // 회원 — 재화·권한
  'balance_adjust',
  'role_change',
  'subscription_change',
  'user_delete',
  // 돈 — 구독 운영
  'talisman_grant',
  'subscription_status_change',
  // 가격·혜택 (표시광고법 사안)
  'plan_update',
  'plan_toggle',
  'product_update',
  // 대외 발신
  'notification_setting_change',
  'notification_manual_run',
  // 서비스 전체
  'service_toggle',
] as const

export type AdminAuditAction = (typeof ADMIN_AUDIT_ACTIONS)[number]

interface ActionLabel {
  readonly label: string
  readonly cls: string
  /** 되돌리기 어렵거나 돈·대외 노출이 걸린 조작 — 목록에서 눈에 띄어야 한다. */
  readonly heavy?: boolean
}

const DANGER = 'bg-red-500/10 text-red-400 border-red-500/20'
const MONEY = 'bg-gold-500/10 text-gold-400 border-gold-500/20'
const CHANGE = 'bg-purple-500/10 text-purple-400 border-purple-500/20'
const OUTBOUND = 'bg-blue-500/10 text-blue-400 border-blue-500/20'

export const ADMIN_AUDIT_LABELS: Record<AdminAuditAction, ActionLabel> = {
  balance_adjust: { label: '복채 조정', cls: MONEY, heavy: true },
  talisman_grant: { label: '복채 지급', cls: MONEY, heavy: true },
  role_change: { label: '권한 변경', cls: DANGER, heavy: true },
  user_delete: { label: '회원 삭제', cls: DANGER, heavy: true },
  subscription_change: { label: '구독 변경', cls: CHANGE },
  subscription_status_change: { label: '구독 상태 변경', cls: CHANGE },
  plan_update: { label: '멤버십 플랜 수정', cls: MONEY, heavy: true },
  plan_toggle: { label: '플랜 판매 전환', cls: MONEY, heavy: true },
  product_update: { label: '상품 가격 수정', cls: MONEY, heavy: true },
  notification_setting_change: { label: '알림 설정 변경', cls: OUTBOUND },
  notification_manual_run: { label: '알림 수동 발송', cls: OUTBOUND, heavy: true },
  service_toggle: { label: '서비스 스위치', cls: DANGER, heavy: true },
}

/** 모르는 액션도 영문 코드를 그대로 노출하지 않는다. */
export function describeAuditAction(action: string): ActionLabel {
  return (
    ADMIN_AUDIT_LABELS[action as AdminAuditAction] ?? {
      label: '기타 조작',
      cls: 'bg-white/5 text-ink-light/60 border-white/10',
    }
  )
}
