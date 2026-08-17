/**
 * 이벤트 추첨 — 결정론·재현 가능·공정성 검증 가능.
 *
 * 왜 Math.random 이 아닌가: «누가 왜 뽑혔나»를 나중에 증명할 수 있어야 한다. seed 를 공개하면
 * 누구든 같은 후보 목록으로 같은 결과를 재현할 수 있다(척전 도구의 공정성 원칙과 같은 결).
 *
 * 가중치: 질문을 «구체적으로» 쓴 사람이 콘텐츠 품질을 만든다(결과 카드가 다음 라운드 광고다).
 * 그래서 질문 길이·구체성 표지에 가중치를 주되, 상한을 둬 «긴 글 = 당첨»이 되지 않게 한다.
 */

export interface DrawCandidate {
  id: string
  /** 응모 시 «궁금한 점» — 가중치 산정 근거 */
  question: string
  /** 로그인 회원이면 소폭 가산(전환 동선이 이미 있으므로) */
  isMember?: boolean
}

export interface DrawResult {
  winners: Array<{ id: string; rank: number; weight: number }>
  seed: string
  /** 후보별 최종 가중치(공개·검증용) */
  weights: Record<string, number>
}

/** 문자열 → 32bit 해시 (FNV-1a). 시드와 후보 id 를 섞는 데 쓴다. */
function fnv1a(str: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h >>> 0
}

/** mulberry32 — 작고 결정론적인 PRNG. */
function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SPECIFICITY_MARKERS = [
  /\d{4}년|\d+월|\d+살|\d+세/, // 시기·나이
  /이직|퇴사|창업|합격|시험|승진|사업|투자|집|이사|결혼|연애|재회|이별|임신|출산|건강|수술/,
  /남편|아내|남친|여친|부모|엄마|아빠|아들|딸|자녀|형|누나|언니|동생/,
  /고민|망설|선택|갈림|결정|해야 할지|할까요|괜찮을까요/,
]

/**
 * 후보 가중치. 기본 1.0, 질문 길이(최대 +0.6)·구체성 표지(개당 +0.25, 최대 +0.75)·회원(+0.2).
 * 상한 2.55 — 최대/최소 비 약 2.5배. 그 이상 벌어지면 «추첨»이 «선발»이 된다.
 */
export function candidateWeight(c: DrawCandidate): number {
  const q = c.question.trim()
  const len = q.length
  const lenBonus = Math.min(0.6, Math.max(0, (len - 20) / 200))
  const markers = SPECIFICITY_MARKERS.filter((r) => r.test(q)).length
  const specBonus = Math.min(0.75, markers * 0.25)
  const memberBonus = c.isMember ? 0.2 : 0
  return Math.round((1 + lenBonus + specBonus + memberBonus) * 1000) / 1000
}

/**
 * 가중 비복원 추첨(Efraimidis-Spirakis): 후보마다 key = u^(1/w) 를 뽑아 큰 순으로 뽑는다.
 * seed 가 같고 후보 집합이 같으면 결과가 같다 — 후보 정렬은 id 로 고정한다.
 */
export function drawWinners(candidates: DrawCandidate[], count: number, seed: string): DrawResult {
  const sorted = [...candidates].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const weights: Record<string, number> = {}
  const keyed = sorted.map((c) => {
    const w = candidateWeight(c)
    weights[c.id] = w
    const rng = mulberry32(fnv1a(`${seed}:${c.id}`))
    const u = Math.max(rng(), Number.EPSILON)
    return { id: c.id, w, key: Math.pow(u, 1 / w) }
  })
  keyed.sort((a, b) => b.key - a.key || (a.id < b.id ? -1 : 1))
  const winners = keyed
    .slice(0, Math.max(0, Math.min(count, keyed.length)))
    .map((k, i) => ({ id: k.id, rank: i + 1, weight: k.w }))
  return { winners, seed, weights }
}

/** 공개 가능한 추첨 시드 — 라운드 id + 마감 시각. 운영자가 임의로 못 바꾸는 값들로만 만든다. */
export function makeDrawSeed(roundId: string, closesAtIso: string): string {
  return `${roundId}:${closesAtIso}`
}
