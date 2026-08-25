import { deityMood, deityMoodUrl, deityStandUrl, type DeityMood } from '../deity-mood'
import { bondUnlocks } from '../deities'

const full = (o: { prayedToday: boolean; devotionLevel: number }) => ({ ...o, allowedEmotions: 7 })
const l1 = (o: { prayedToday: boolean; devotionLevel: number }) => ({ ...o, allowedEmotions: 2 })

describe('좌정 신위 표정 — 사용자의 행동에 대한 답이다', () => {
  it('★ 오늘 기도를 올렸으면 흡족하다', () => {
    expect(deityMood(full({ prayedToday: true, devotionLevel: 3 }))).toBe('bless')
    expect(deityMood(full({ prayedToday: true, devotionLevel: 0 }))).toBe('bless')
  })

  it('★ 시작해 놓고 오늘 안 왔으면 기다린다', () => {
    expect(deityMood(full({ prayedToday: false, devotionLevel: 1 }))).toBe('sad')
  })

  it('★ 아직 시작하지 않았으면 평상이다 — 시작도 안 한 사람에게 서운한 얼굴을 보이지 않는다', () => {
    expect(deityMood(full({ prayedToday: false, devotionLevel: 0 }))).toBe('neutral')
  })

  it('소수·음수 단수에도 무너지지 않는다', () => {
    expect(deityMood(full({ prayedToday: false, devotionLevel: 0.9 }))).toBe('neutral')
    expect(deityMood(full({ prayedToday: false, devotionLevel: -2 }))).toBe('neutral')
    expect(deityMood(full({ prayedToday: false, devotionLevel: 1.4 }))).toBe('sad')
  })

  it('★ angry 는 어떤 입력으로도 나오지 않는다 — 모신 신이 화나 있으면 연출이 아니라 불안이다', () => {
    for (const prayedToday of [true, false]) {
      for (const devotionLevel of [0, 1, 5, 10]) {
        for (const allowedEmotions of [2, 7]) {
          expect(deityMood({ prayedToday, devotionLevel, allowedEmotions })).not.toBe('angry')
        }
      }
    }
  })
})

describe('좌정 신위 표정 — 유대 단계가 허용하는 만큼만', () => {
  it('★ L1 은 표정이 둘뿐이다 (해금의 뜻을 지킨다)', () => {
    expect(bondUnlocks(1).emotions).toBe(2)
    const seen = new Set<DeityMood>()
    for (const prayedToday of [true, false]) {
      for (const devotionLevel of [0, 1, 7]) {
        seen.add(deityMood(l1({ prayedToday, devotionLevel })))
      }
    }
    expect([...seen].sort()).toEqual(['neutral', 'smile'])
  })

  it('L2+ 는 접지 않는다', () => {
    expect(bondUnlocks(2).emotions).toBe(7)
    expect(deityMood(full({ prayedToday: true, devotionLevel: 3 }))).toBe('bless')
    expect(deityMood(full({ prayedToday: false, devotionLevel: 3 }))).toBe('sad')
  })
})

describe('좌정 신위 표정 — 그림 주소', () => {
  const base = 'https://x.supabase.co/storage/v1/object/public/shrine/deities/sansin/base.webp'

  it('★ 평상은 넘겨받은 주소를 그대로 쓴다 — 갈아끼우면 없는 그림을 가리킬 수 있다', () => {
    expect(deityMoodUrl(base, 'neutral')).toBe(base)
  })

  it('표정이 있으면 마지막 칸만 바꾼다', () => {
    expect(deityMoodUrl(base, 'bless')).toBe(base.replace('base.webp', 'bless.webp'))
    expect(deityMoodUrl(base, 'sad')).toBe(base.replace('base.webp', 'sad.webp'))
  })

  it('.webp 가 아닌 주소는 건드리지 않는다 (스프라이트 규약이 바뀌어도 안 깨진다)', () => {
    expect(deityMoodUrl('/img/sansin.png', 'bless')).toBe('/img/sansin.png')
    expect(deityMoodUrl('', 'bless')).toBe('')
  })
})

/**
 * 🔴 2026-08-25 「신위가 상반신만 나온다」 회귀 방지.
 *
 * 표정 그림 7종은 **흉상 프레이밍**이다(실측 종횡비 0.85~1.01 · 세로 420px). 방의 신위 스탠드는
 * 발(감실 바닥)과 머리(감실 윗턱)로 높이가 고정된 상자라, 흉상을 넣으면 «머리~가슴»이 상자를
 * 다 채워 크게 확대된 상반신이 된다. 전신(base·회전 4종)은 종횡비 0.456 · 세로 480px 이다.
 */
describe('deityStandUrl — 서 있는 신위는 언제나 전신', () => {
  const base = '/shrine/deities/chilseong/base.webp'

  it('표정과 무관하게 base 를 그대로 돌려준다', () => {
    expect(deityStandUrl(base)).toBe(base)
  })

  it('어떤 표정 파일도 서 있는 자리에 오지 않는다', () => {
    const moods: DeityMood[] = ['neutral', 'smile', 'stern', 'sad', 'surprised', 'bless', 'angry']
    for (const mood of moods) {
      expect(deityStandUrl(base)).not.toContain(`${mood}.webp`)
    }
  })

  it('portrait(메달리온 흉상)도 아니다', () => {
    expect(deityStandUrl(base)).not.toContain('portrait.webp')
  })

  it('🔴 표정 URL 산출 자체는 살아 있다 — 얼굴이 주인공인 자리(메달리온·채팅)의 몫이다', () => {
    expect(deityMoodUrl(base, 'bless')).toBe(base.replace('base.webp', 'bless.webp'))
  })
})
