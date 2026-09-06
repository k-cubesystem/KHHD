import { BAEKIL_ITEM_NAME } from '@/lib/domain/ritual/baekil'
import { bannedWordsIn } from '@/lib/domain/circle/element-lore'
import {
  GIFT_DAILY_LIMIT,
  GIFT_MESSAGE_MAX,
  giftDelivery,
  giftIdempotencyKey,
  giftPushText,
  giftRefusal,
  normalizeGiftMessage,
} from '@/lib/domain/circle/gift'

const ITEM = { id: 'i1', name: '인등', element: 'fire' as const, isActive: true, priceBokchae: 1500 }

describe('기운 선물 규칙', () => {
  it('보상 전용·오행 없음·비활성은 선물할 수 없다', () => {
    expect(giftRefusal(ITEM)).toBeNull()
    expect(giftRefusal({ ...ITEM, name: BAEKIL_ITEM_NAME })).toBe('REWARD_ONLY')
    expect(giftRefusal({ ...ITEM, element: null })).toBe('NO_ELEMENT')
    expect(giftRefusal({ ...ITEM, isActive: false })).toBe('INACTIVE')
  })

  it('🔴 멱등 키는 같은 분(分) 안에서 같고, 분이 바뀌면 다르다', () => {
    const t0 = new Date('2026-09-04T10:15:05Z')
    const t1 = new Date('2026-09-04T10:15:59Z')
    const t2 = new Date('2026-09-04T10:16:00Z')
    expect(giftIdempotencyKey('u', 'm', 'i', t0)).toBe(giftIdempotencyKey('u', 'm', 'i', t1))
    expect(giftIdempotencyKey('u', 'm', 'i', t0)).not.toBe(giftIdempotencyKey('u', 'm', 'i', t2))
    expect(giftIdempotencyKey('u', 'm', 'i', t0)).not.toBe(giftIdempotencyKey('u', 'm2', 'i', t0))
  })

  it('전달처 — 연결된 실사용자면 그쪽 보관함, 아니면 내 보관함', () => {
    expect(giftDelivery('user-2')).toBe('inventory_recipient')
    expect(giftDelivery(null)).toBe('inventory_giver')
  })

  it('한마디는 공백을 정리하고 상한에서 자른다', () => {
    expect(normalizeGiftMessage('  힘내   요 ')).toBe('힘내 요')
    expect(normalizeGiftMessage('   ')).toBeNull()
    expect(normalizeGiftMessage(null)).toBeNull()
    expect(normalizeGiftMessage('가'.repeat(GIFT_MESSAGE_MAX + 5))).toHaveLength(GIFT_MESSAGE_MAX)
  })

  it('상한은 유한한 숫자다', () => {
    expect(GIFT_DAILY_LIMIT).toBeGreaterThan(0)
    expect(Number.isFinite(GIFT_DAILY_LIMIT)).toBe(true)
  })

  it('알림 문구에 효능·채용 금지어가 없다', () => {
    const text = giftPushText('민수', '인등', '화(火)')
    expect(bannedWordsIn(text.title)).toEqual([])
    expect(bannedWordsIn(text.body)).toEqual([])
    expect(text.title).toContain('민수님이')
  })
})
