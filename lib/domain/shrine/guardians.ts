/**
 * 신수(神獸) — 신을 곁에서 모시고, 신이 자리를 비울 때 신당을 지키는 영물.
 *
 * 종전에는 좌정 主神의 초상 오브가 방을 거닐었다(WalkingKeeper). 신은 **제단에 좌정**해 있는데
 * 같은 신이 바닥을 뛰어다니는 것은 세계가 어긋난다 — 거니는 일은 이제 신수의 몫이다.
 * 전승에서도 그렇다: 산신 곁의 호랑이, 궁궐 앞의 해태, 집을 지키는 업(業) — 신 곁에는 늘
 * 영물이 있었고, 그 영물이 자리를 지켰다.
 *
 * ⚠️ 신수는 **배치 아이템이 아니다.** 시렁·촛불처럼 놓는 물건이 아니라 스스로 거니는 존재라,
 *    보관함(트레이)에도 배치 저장에도 끼면 안 된다 — 두 곳 모두 type 으로 거른다(테스트 강제).
 * ⚠️ 착좌(모시기)는 **admin 경유**다. shrines 는 컬럼 화이트리스트(20260731 감사 A3)라 사용자
 *    클라이언트 update 가 막혀 있고, 열면 구매 검증을 우회해 무료 착좌가 된다(테마와 같은 규율).
 */

import type { Element } from './types'
import type { ObangkiMatter } from '@/lib/domain/ritual/obangki'

/** 카탈로그 type — DB CHECK 와 문자열이 같아야 한다. */
export const GUARDIAN_TYPE = 'guardian'

/** 한 신당에 모실 수 있는 신수 수. 셋부터는 방이 마당이 된다. */
export const MAX_GUARDIANS = 2

export type GuardianCategory = 'beast' | 'chasa' | 'dokkaebi' | 'spirit'

export const GUARDIAN_CATEGORY_LABEL: Readonly<Record<GuardianCategory, string>> = Object.freeze({
  beast: '영수(靈獸)',
  chasa: '저승 차사',
  dokkaebi: '도깨비',
  spirit: '정령·불',
})

export interface Guardian {
  /** 파일·저장 키 (shrines.guardians 에 이 값이 들어간다) */
  readonly slug: string
  readonly name: string
  readonly category: GuardianCategory
  readonly element: Element
  /** 복채(만냥) */
  readonly price: number
  readonly rarity: 'common' | 'rare' | 'legendary'
  /** 전승 한 줄 — 어디서 온 존재인가 */
  readonly origin: string
  /** 이 신당에서 무엇을 하는가 */
  readonly role: string
  readonly matters: readonly ObangkiMatter[]
}

/**
 * 32신수 — 영수 12 · 저승 차사 4 · 도깨비 8 · 정령·불 8.
 * 오행 분포 木6 火7 土6 金5 水8 — 어느 기운의 신당이든 맞는 신수가 있다.
 */
export const GUARDIANS: readonly Guardian[] = Object.freeze([
  // ── 영수(靈獸) 12 ─────────────────────────────────────────
  {
    slug: 'cheongryong',
    name: '청룡',
    category: 'beast',
    element: 'wood',
    price: 5,
    rarity: 'legendary',
    origin: '사신(四神)의 동방 수호신 — 고구려 고분 벽화 동벽에 그려졌다',
    role: '동쪽에서 드는 기운을 다스리고, 터의 큰 흐름을 지킨다',
    matters: ['teo', 'sinsu'],
  },
  {
    slug: 'baekho',
    name: '백호',
    category: 'beast',
    element: 'metal',
    price: 5,
    rarity: 'legendary',
    origin: '사신의 서방 수호신 — 산군(山君)이라 불리며 산신을 곁에서 모신다',
    role: '삿된 것이 문턱을 넘지 못하게 서쪽을 막아선다',
    matters: ['gwanjae'],
  },
  {
    slug: 'jujak',
    name: '주작',
    category: 'beast',
    element: 'fire',
    price: 5,
    rarity: 'legendary',
    origin: '사신의 남방 수호신 — 붉은 날개의 신조(神鳥)',
    role: '남쪽의 볕을 부르고, 식은 인연에 온기를 되돌린다',
    matters: ['honsa', 'sinsu'],
  },
  {
    slug: 'hyeonmu',
    name: '현무',
    category: 'beast',
    element: 'water',
    price: 5,
    rarity: 'legendary',
    origin: '사신의 북방 수호신 — 거북과 뱀이 얽힌 모습',
    role: '북쪽의 찬 기운을 눌러 앉히고, 오래 가는 것을 지킨다',
    matters: ['mom', 'teo'],
  },
  {
    slug: 'haetae',
    name: '해태',
    category: 'beast',
    element: 'earth',
    price: 3,
    rarity: 'rare',
    origin: '시비를 가리는 법수(法獸) — 경복궁 앞에 세워 화기를 눌렀다',
    role: '옳고 그름이 얽힌 일을 가려 주고, 불같은 화를 삭인다',
    matters: ['gwanjae'],
  },
  {
    slug: 'girin',
    name: '기린',
    category: 'beast',
    element: 'wood',
    price: 3,
    rarity: 'rare',
    origin: '어진 임금의 치세에만 나타난다는 인수(仁獸)',
    role: '어질고 바른 기운을 방에 들이고, 자라나는 것을 돌본다',
    matters: ['jason', 'sinsu'],
  },
  {
    slug: 'samjogo',
    name: '삼족오',
    category: 'beast',
    element: 'fire',
    price: 3,
    rarity: 'rare',
    origin: '해 속에 산다는 세 발 까마귀 — 고구려의 상징',
    role: '해의 정기를 물어 나르며, 벌이의 길을 밝힌다',
    matters: ['jaesu'],
  },
  {
    slug: 'bonghwang',
    name: '봉황',
    category: 'beast',
    element: 'earth',
    price: 3,
    rarity: 'rare',
    origin: '오동나무에만 깃들고 대나무 열매만 먹는다는 서조(瑞鳥)',
    role: '다섯 덕을 갖춘 상서로움으로 집안의 격을 세운다',
    matters: ['sinsu', 'honsa'],
  },
  {
    slug: 'imugi',
    name: '이무기',
    category: 'beast',
    element: 'water',
    price: 2,
    rarity: 'common',
    origin: '천 년을 물에서 견디면 용이 된다는 큰 뱀',
    role: '오래 견디는 법을 알기에, 더딘 일의 끝을 지켜본다',
    matters: ['jaesu', 'sinsu'],
  },
  {
    slug: 'cheonma',
    name: '천마',
    category: 'beast',
    element: 'metal',
    price: 3,
    rarity: 'rare',
    origin: '하늘을 달리는 백마 — 천마총 장니에 그려졌다',
    role: '길 떠나는 일과 돌아오는 일, 오가는 걸음을 지킨다',
    matters: ['teo', 'sinsu'],
  },
  {
    slug: 'hyeonhak',
    name: '현학',
    category: 'beast',
    element: 'wood',
    price: 2,
    rarity: 'common',
    origin: '천 년을 산 학은 검게 변한다 했다 — 장수의 영물',
    role: '느리고 길게 숨쉬는 법으로 몸의 기운을 고른다',
    matters: ['mom'],
  },
  {
    slug: 'okto',
    name: '옥토끼',
    category: 'beast',
    element: 'earth',
    price: 2,
    rarity: 'common',
    origin: '달에서 불사약을 찧는다는 토끼',
    role: '밤마다 약을 찧어 몸이 축나지 않게 돌본다',
    matters: ['mom', 'jason'],
  },

  // ── 저승 차사 4 ───────────────────────────────────────────
  {
    slug: 'gangnim',
    name: '강림차사',
    category: 'chasa',
    element: 'metal',
    price: 4,
    rarity: 'legendary',
    origin: '차사본풀이의 우두머리 차사 — 염라대왕도 그 강단을 아꼈다',
    role: '어지러운 일의 매듭을 짓고, 끊을 것을 끊어 준다',
    matters: ['gwanjae'],
  },
  {
    slug: 'iljik',
    name: '일직차사',
    category: 'chasa',
    element: 'fire',
    price: 2,
    rarity: 'common',
    origin: '낮의 일을 맡아 보는 차사',
    role: '해가 떠 있는 동안의 신당을 지킨다',
    matters: ['sinsu'],
  },
  {
    slug: 'woljik',
    name: '월직차사',
    category: 'chasa',
    element: 'water',
    price: 2,
    rarity: 'common',
    origin: '밤의 일을 맡아 보는 차사',
    role: '달이 떠 있는 동안의 신당을 지킨다',
    matters: ['sinsu'],
  },
  {
    slug: 'saja',
    name: '저승사자',
    category: 'chasa',
    element: 'water',
    price: 3,
    rarity: 'rare',
    origin: '갓에 검은 도포 — 문 앞의 사잣밥은 이들을 대접하는 상이다',
    role: '무거운 것을 데려가는 이가 곁에 있으면, 잡스러운 것은 얼씬도 못 한다',
    matters: ['gwanjae', 'mom'],
  },

  // ── 도깨비 8 ──────────────────────────────────────────────
  {
    slug: 'ssireum',
    name: '씨름도깨비',
    category: 'dokkaebi',
    element: 'earth',
    price: 2,
    rarity: 'common',
    origin: '밤길에 씨름을 걸어온다 — 왼다리를 걸면 넘어간다',
    role: '힘겨루기를 좋아해, 방에 드는 궂은 기운과 밤새 씨름한다',
    matters: ['gwanjae'],
  },
  {
    slug: 'bangmangi',
    name: '방망이도깨비',
    category: 'dokkaebi',
    element: 'wood',
    price: 3,
    rarity: 'rare',
    origin: '「금 나와라 뚝딱」 — 도깨비방망이의 임자',
    role: '방망이를 두드려 벌이의 길을 두들겨 연다',
    matters: ['jaesu'],
  },
  {
    slug: 'gat',
    name: '갓도깨비',
    category: 'dokkaebi',
    element: 'metal',
    price: 2,
    rarity: 'common',
    origin: '의관을 갖춰 입은 점잖은 도깨비 — 사람과 겨루기보다 어울리기를 즐긴다',
    role: '예를 갖춘 손님만 문을 넘게 가려 세운다',
    matters: ['sinsu'],
  },
  {
    slug: 'dokgak',
    name: '독각귀',
    category: 'dokkaebi',
    element: 'wood',
    price: 2,
    rarity: 'common',
    origin: '외다리 도깨비 — 비 오는 밤 빗자루가 변해 된다 했다',
    role: '한 다리로도 지치지 않고 밤새 방을 돈다',
    matters: ['teo'],
  },
  {
    slug: 'meokbo',
    name: '먹보도깨비',
    category: 'dokkaebi',
    element: 'earth',
    price: 2,
    rarity: 'common',
    origin: '메밀묵과 막걸리를 좋아한다 — 상을 차려 주면 은혜를 갚는다',
    role: '올린 공물을 맛보고, 그 답례로 살림을 지킨다',
    matters: ['jaesu'],
  },
  {
    slug: 'gimseobang',
    name: '김서방도깨비',
    category: 'dokkaebi',
    element: 'earth',
    price: 2,
    rarity: 'common',
    origin: '사람을 「김서방」이라 부르며 따르는 붙임성 좋은 도깨비',
    role: '집안 사람의 이름을 다 외워, 낯선 것이 오면 먼저 안다',
    matters: ['teo'],
  },
  {
    slug: 'natdokkaebi',
    name: '낮도깨비',
    category: 'dokkaebi',
    element: 'fire',
    price: 2,
    rarity: 'common',
    origin: '대낮에 나타나는 별난 도깨비 — 밤 도깨비보다 겁이 없다',
    role: '해가 떠 있어도 물러가지 않고 자리를 지킨다',
    matters: ['sinsu'],
  },
  {
    slug: 'muldokkaebi',
    name: '물도깨비',
    category: 'dokkaebi',
    element: 'water',
    price: 2,
    rarity: 'common',
    origin: '물가에 사는 도깨비 — 어부의 그물에 고기를 몰아 주기도 한다',
    role: '물길의 재수를 몰아다 방에 부린다',
    matters: ['jaesu'],
  },

  // ── 정령·불 8 ─────────────────────────────────────────────
  {
    slug: 'cheongbul',
    name: '청도깨비불',
    category: 'spirit',
    element: 'water',
    price: 2,
    rarity: 'common',
    origin: '비 오는 밤 물가를 떠도는 푸른 불 — 도깨비불의 본색이다',
    role: '푸른 불빛으로 방구석의 어둠을 살핀다',
    matters: ['sinsu'],
  },
  {
    slug: 'hongbul',
    name: '홍도깨비불',
    category: 'spirit',
    element: 'fire',
    price: 2,
    rarity: 'common',
    origin: '산등성이를 넘어 다니는 붉은 불덩이',
    role: '붉은 온기로 식은 자리를 데운다',
    matters: ['honsa'],
  },
  {
    slug: 'honbul',
    name: '혼불',
    category: 'spirit',
    element: 'water',
    price: 3,
    rarity: 'rare',
    origin: '사람의 넋이 담긴 푸른 불 — 최명희의 『혼불』로 남은 말',
    role: '흔들리는 마음의 심지를 곧게 세운다',
    matters: ['mom'],
  },
  {
    slug: 'dalbit',
    name: '달빛정령',
    category: 'spirit',
    element: 'metal',
    price: 2,
    rarity: 'common',
    origin: '보름달빛이 오래 고인 자리에 맺힌다는 정령',
    role: '달빛처럼 은은하게, 잠든 신당을 비춘다',
    matters: ['sinsu', 'mom'],
  },
  {
    slug: 'byeolbit',
    name: '별똥정령',
    category: 'spirit',
    element: 'fire',
    price: 2,
    rarity: 'common',
    origin: '떨어지는 별똥을 보고 빌면 소원이 이뤄진다 했다',
    role: '빌어 둔 소원을 물고 하늘과 방 사이를 오간다',
    matters: ['sinsu'],
  },
  {
    slug: 'barampung',
    name: '바람정령',
    category: 'spirit',
    element: 'wood',
    price: 2,
    rarity: 'common',
    origin: '영등할미가 부리는 바람 — 이월 영등바람에 실려 온다',
    role: '고인 공기를 흔들어 방의 기운을 돌린다',
    matters: ['teo'],
  },
  {
    slug: 'angae',
    name: '안개정령',
    category: 'spirit',
    element: 'water',
    price: 2,
    rarity: 'common',
    origin: '새벽 강안개가 걷히지 않고 남은 자락',
    role: '안개로 방을 감싸 바깥의 눈을 가린다',
    matters: ['teo'],
  },
  {
    slug: 'sutbul',
    name: '숯불정령',
    category: 'spirit',
    element: 'fire',
    price: 2,
    rarity: 'common',
    origin: '화로 깊이 밤새 살아남은 불씨 — 불씨를 꺼뜨리면 복이 나간다 했다',
    role: '꺼지지 않는 불씨로 집의 복을 붙든다',
    matters: ['jaesu', 'mom'],
  },
] as const)

const BY_SLUG: ReadonlyMap<string, Guardian> = new Map(GUARDIANS.map((g) => [g.slug, g]))

export function findGuardian(slug: string): Guardian | undefined {
  return BY_SLUG.get(slug)
}

export function guardianSpriteUrl(slug: string): string {
  return `/shrine/guardians/${slug}.webp`
}

export function isGuardianType(type: string | null | undefined): boolean {
  return type === GUARDIAN_TYPE
}

/**
 * DB 의 text[] → 검증된 슬러그 배열.
 *
 * ⚠️ 모르는 슬러그는 조용히 버린다 — 카탈로그에서 빠진 신수가 남아 있으면 깨진 그림이
 *    방을 돌아다닌다. 상한(MAX_GUARDIANS)도 여기서 자른다(DB CHECK 와 이중 방어).
 */
export function parseGuardianSlugs(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  const out: string[] = []
  for (const item of v) {
    if (typeof item !== 'string' || !BY_SLUG.has(item) || out.includes(item)) continue
    out.push(item)
    if (out.length >= MAX_GUARDIANS) break
  }
  return out
}
