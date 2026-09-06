/**
 * 기운 선물 — 상대에게 필요한 오행의 신당 살림을 복채로 사서 «놓아 준다»(PRD-energy-circle §3-5, P2).
 *
 * 순수 규칙만 둔다. 차감·지급·알림은 액션(`app/actions/circle/gift.ts`)이 하고, 여기 규칙을 읽는다.
 *
 * 🔴 받는 쪽은 재화를 얻지 않는다 — 살림 «한 점»이 보관함에 들어갈 뿐 복채는 0 이다(선물 파밍 차단).
 * 🔴 멱등 키는 «보낸 이·받는 이·품목·분(分)» — 같은 분 안의 재요청은 새 차감이 아니라 같은 선물이다.
 */
import { BAEKIL_ITEM_NAME } from '@/lib/domain/ritual/baekil'
import type { Element } from '@/lib/domain/shrine/types'

/** 하루에 보낼 수 있는 선물 수 — 대량 발송·파밍 차단(ARCH §7). */
export const GIFT_DAILY_LIMIT = 20

/** 한마디 최대 길이. */
export const GIFT_MESSAGE_MAX = 60

/** 어디로 갔는가 — 받는 사람이 실사용자면 그 사람 보관함, 아니면 내 보관함(내 신당의 그 사람 선반에 놓는다). */
export type GiftDelivery = 'inventory_recipient' | 'inventory_giver'

export interface GiftableItem {
  id: string
  name: string
  element: Element | null
  isActive: boolean
  priceBokchae: number
}

export type GiftRefusal = 'INACTIVE' | 'NO_ELEMENT' | 'REWARD_ONLY'

/** 선물할 수 있는 품목인가 — 보상 전용·오행 없음·비활성은 안 된다. */
export function giftRefusal(item: GiftableItem): GiftRefusal | null {
  if (!item.isActive) return 'INACTIVE'
  if (item.name === BAEKIL_ITEM_NAME) return 'REWARD_ONLY'
  if (!item.element) return 'NO_ELEMENT'
  return null
}

/** 멱등 키 — 분 단위 버킷. `now` 는 액션이 넘긴다(순수 함수는 시계를 읽지 않는다). */
export function giftIdempotencyKey(giverId: string, recipientMemberId: string, itemId: string, now: Date): string {
  const minute = Math.floor(now.getTime() / 60_000)
  return `${giverId}:${recipientMemberId}:${itemId}:${minute}`
}

/** 전달처 — 연결된 실사용자가 있으면 그쪽, 없으면 보낸 이 자신(내 신당에 놓아 준다). */
export function giftDelivery(recipientLinkedUserId: string | null): GiftDelivery {
  return recipientLinkedUserId ? 'inventory_recipient' : 'inventory_giver'
}

/** 한마디 정리 — 공백 정리, 비면 null, 길면 자른다. */
export function normalizeGiftMessage(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = raw.replace(/\s+/g, ' ').trim()
  if (text.length === 0) return null
  return text.slice(0, GIFT_MESSAGE_MAX)
}

/** 알림 문구 — 받는 사람이 실사용자일 때. 숫자·효능 없음. */
export function giftPushText(
  giverName: string,
  itemName: string,
  elementLabel: string
): { title: string; body: string } {
  return {
    title: `${giverName}님이 ${elementLabel} 기운을 보냈습니다`,
    body: `${itemName}이(가) 보관함에 들어왔어요. 신당에 놓아 보세요.`,
  }
}
