/**
 * AI 풀이 — 처방전·그룹 지도의 «엔진 값을 사람의 말로 풀어 쓰기» (CEO 2026-09-07: 「가족·인연 관리에도 AI 풀이」).
 *
 * 🔴 AI 는 새로 판정하지 않는다. 여기서 만든 프롬프트는 엔진이 이미 정한 값(모자란 기운·채워 주는 기운·
 *    곁에 둘 것·관계 라벨·역할 결)을 그대로 싣고, 모델에게는 «풀어 쓰라»고만 한다(remedyPromptBlock 규율).
 * 🔴 돌봄의 말이다 — 점수·순위·채용 어휘 금지. 출력은 validateNarrative 가 다시 거른다.
 *
 * 순수 함수만 둔다. 해시·DB·모델 호출은 액션이 한다.
 */
import { EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { bannedWordsIn, elementNeeds } from './element-lore'
import type { Prescription } from './prescription'
import { PAIR_LABEL_KO, type CircleEnergy } from './team-energy'

export type NarrativeKind = 'prescription' | 'circle' | 'together'

export const NARRATIVE_MIN_CHARS = 180
export const NARRATIVE_MAX_CHARS = 1600
/** 함께 보기는 다섯 토막이라 길다. */
export const NARRATIVE_MAX_CHARS_TOGETHER = 2400
/** 캐시 유효 기간 — 같은 입력이면 이 안에서는 다시 사지 않는다. */
export const NARRATIVE_CACHE_DAYS = 30

/** 함께 보기 다섯 토막의 머리말 — 프롬프트·거르기·화면이 같은 문자열을 쓴다(CEO 2026-09-13 「장점·단점·필요한 것」). */
export const TOGETHER_SECTIONS = ['서로의 오행', '장점', '단점', '필요한 것', '이번 주 한 가지'] as const
export type TogetherSection = (typeof TOGETHER_SECTIONS)[number]

function label(el: Element): string {
  return `${EL_LABEL[el]}(${EL_KO[el]})`
}

export const NARRATIVE_SYSTEM_PROMPT = `당신은 신당에서 마주 앉은 상담가입니다. 아래 [엔진이 정한 값]을 사람의 말로 풀어 씁니다.

지켜야 할 것:
- 새로 판정하지 않습니다. 값을 바꾸거나, 없는 기운·없는 관계를 지어내지 않습니다.
- 이 글은 «판단»이 아니라 «돌봄»입니다. 사람을 고르거나 재는 말(뽑다·평가·적합·합격·선발·승진·해고)은 쓰지 않습니다.
- 효과를 단정하지 않습니다(보장·반드시·확실히·완치·치유·성공·대박·부자·평생·무제한 금지). 「~이 붙습니다」「~이 트입니다」「~을 곁에 둡니다」처럼 결의 말로 씁니다.
- 숫자 점수·퍼센트·순위를 쓰지 않습니다.
- 한자 용어는 처음 한 번만 괄호로 풀고, 그 뒤로는 우리말로 부릅니다.
- 주어를 지우고 씁니다("당신은" 금지). 부사(매우·정말·상당히·다소)는 지웁니다.
- 첫 문장은 인사·요약이 아니라 관찰로 시작합니다.`

const FORMAT_THREE = `형식:
- 세 문단, 전체 500~800자. 각 문단은 세 문장에서 다섯 문장.
- 마지막 문단은 오늘 할 수 있는 한 가지로 끝냅니다.
- 출력은 본문만. 제목·머리말·목록 기호·따옴표 없이 문단 사이는 빈 줄 하나.`

const FORMAT_TOGETHER = `형식:
- 다섯 토막, 전체 700~1200자. 토막마다 첫 줄에 머리말만 한 줄로 적고(정확히 이 다섯: ${TOGETHER_SECTIONS.join(' / ')}), 다음 줄부터 본문 두 문장에서 네 문장.
- 머리말 밖에는 제목·목록 기호·따옴표를 쓰지 않습니다. 토막 사이는 빈 줄 하나.
- 「필요한 것」 토막은 [필요한 것] 에 적힌 물건·자리·색·방향만 부릅니다. 새 물건을 지어내지 않습니다.
- 「이번 주 한 가지」 토막은 같이 할 수 있는 한 가지로 끝냅니다.`

/** 갈래마다 형식이 다르다 — 처방전·그룹은 세 문단, 함께 보기는 머리말 다섯 토막. */
export function systemPromptFor(kind: NarrativeKind): string {
  return `${NARRATIVE_SYSTEM_PROMPT}\n\n${kind === 'together' ? FORMAT_TOGETHER : FORMAT_THREE}`
}

/** 처방전 → 프롬프트. 값은 전부 처방전에서 온다. */
export function prescriptionPrompt(p: Prescription): string {
  const fillers = p.fillers
    .map((f) => {
      const who = f.kind === 'direct' ? '직접' : f.kind === 'mother' ? '낳아 주는 기운' : '사람에게서'
      return `- [${who}] ${f.title} — ${f.reason}`
    })
    .join('\n')
  const life = p.items.life.map((l) => `- ${l.label}: ${l.value} (${l.action})`).join('\n')
  const avoid = p.avoid.items.map((a) => `- ${a.label}: ${a.value}`).join('\n')
  const shrine = p.items.shrine.map((s) => s.name).join(', ') || '없음'

  return [
    `[엔진이 정한 값 — ${p.name}님의 기운 처방전]`,
    `모자란 기운: ${label(p.lacking)} · 넘치는 기운: ${label(p.strongest)}`,
    `모자랄 때의 결: ${p.lore.lacking}`,
    `채우면 트이는 것: ${p.lore.gains}`,
    p.mansikNote ? `명식 메모: ${p.mansikNote}` : '',
    '[채워 주는 기운과 이유]',
    fillers,
    p.caution ? `[주의] ${p.caution}` : '',
    '[곁에 둘 것]',
    `- 신당 살림: ${shrine}`,
    `- 책상 위: ${p.items.real.desk}`,
    `- 집 안: ${p.items.real.home}`,
    `- 선물: ${p.items.real.gifts.join(', ')}`,
    life,
    `[덜어낼 것 — ${label(p.avoid.element)} 기운은 지금 더 채우지 않습니다]`,
    avoid,
    '',
    '위 값을 세 문단으로 풀어 쓰세요. ① 지금 이 사람의 기운이 삶에서 어떻게 보이는지 ② 왜 그 기운을 그 방법으로 채우는지 ③ 오늘 곁에 둘 것 한 가지와 덜어낼 것 하나.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

/** 그룹 지도 → 프롬프트. 관계는 라벨과 문장만 싣는다(점수 없음). */
export function circlePrompt(circleName: string, ce: CircleEnergy): string {
  const members = ce.entries
    .map((e) => `- ${e.name}(${e.relation}): 모자란 ${label(e.yongsin)}, 넉넉한 ${label(e.strongest)}`)
    .join('\n')
  const holders =
    ce.holders.length > 0 ? ce.holders.map((h) => h.name).join(', ') : `없음 → 물건으로: ${ce.fallbackItem}`
  const pairs = ce.pairs
    .filter((pr) => pr.label !== 'independent')
    .map((pr) => `- ${pr.aName} ↔ ${pr.bName}: ${PAIR_LABEL_KO[pr.label]} — ${pr.reason}`)
    .join('\n')

  return [
    `[엔진이 정한 값 — 「${circleName}」 그룹의 기운 지도]`,
    ce.notice ? `고지: ${ce.notice}` : '',
    '[구성원]',
    members,
    `함께 채울 기운: ${label(ce.lowest)} · 든 사람: ${holders}`,
    '[서로의 관계]',
    pairs || '- 뚜렷한 관계 없음 — 각자 서는 사이',
    ce.roles ? `[역할 결] ${ce.roles.sentence}` : '',
    '',
    '위 값을 세 문단으로 풀어 쓰세요. ① 이 그룹 전체의 기운이 어떤 결인지 ② 누가 누구 곁에 있으면 트이고, 어디에 거리가 약인지 ③ 옅은 결을 지금 있는 사람과 물건으로 어떻게 채울지. 사람을 새로 들이라는 말은 쓰지 않습니다.',
  ]
    .filter((line) => line !== '')
    .join('\n')
}

function needsLine(el: Element): string {
  const n = elementNeeds(el)
  return `책상 위 ${n.desk} · 집 안 ${n.home} · 선물 ${n.gifts.join(', ')} · 색 ${n.color} · 방향 ${n.direction} · 시간 ${n.hourBand}`
}

/**
 * 둘·셋·넷 함께 보기 — 고른 사람들만으로 엮은 그룹 기운을 프롬프트로(CEO 2026-09-13: 서로의 오행 · 장점 · 단점 · 필요한 것).
 * 관계의 이치·실천 문장과 「필요한 것」 물건·자리(사전·개운 표)가 여기서 AI 재료가 된다 — AI 는 새 물건을 짓지 않는다.
 */
export function togetherPrompt(ce: CircleEnergy): string {
  const names = ce.entries.map((e) => e.name).join('·')
  const members = ce.entries
    .map(
      (e) =>
        `- ${e.name}(${e.relation}): 옅은 ${label(e.yongsin)}, 넉넉한 ${label(e.strongest)}${e.dayMaster ? `, 일간 ${label(e.dayMaster)}` : ''}`
    )
    .join('\n')
  const pairs = ce.pairs
    .map((pr) => `- ${pr.aName} ↔ ${pr.bName}: ${PAIR_LABEL_KO[pr.label]}\n  이치: ${pr.reason}\n  실천: ${pr.how}`)
    .join('\n')
  const needs = ce.entries.map((e) => `- ${e.name}(옅은 ${label(e.yongsin)}): ${needsLine(e.yongsin)}`).join('\n')
  return [
    `[엔진이 정한 값 — ${names} 함께 보기(${ce.entries.length}명)]`,
    ce.notice ? `고지: ${ce.notice}` : '',
    '[사람]',
    members,
    `함께 있을 때 가장 옅은 기운: ${label(ce.lowest)} · 든 사람: ${ce.holders.length > 0 ? ce.holders.map((h) => h.name).join(', ') : `없음 → 물건으로: ${ce.fallbackItem}`}`,
    '[서로의 관계 — 엔진 판정]',
    pairs || '- 뚜렷한 관계 없음 — 각자 서는 사이',
    ce.roles ? `[역할 결] ${ce.roles.sentence}` : '',
    '[필요한 것 — 사람마다]',
    needs,
    `[서로에게 맞는 풍수·물건 — 함께 옅은 ${label(ce.lowest)}] ${needsLine(ce.lowest)}`,
    '',
    `위 값을 다섯 토막으로 풀어 쓰세요. 머리말은 정확히 ${TOGETHER_SECTIONS.map((s) => `「${s}」`).join(' ')} 순서입니다. ① 서로의 오행: 각자의 넉넉한·옅은 기운이 함께 있을 때 어떤 결이 되는지 ② 장점: 서로 채우고 끌어 주는 자리(엔진의 이치 그대로, 새로 판정하지 말 것) ③ 단점: 부딪히거나 지치는 자리와 그것을 푸는 법 ④ 필요한 것: 위 물건·자리·색·방향을 그대로 부르며 누가 무엇을 곁에 두면 좋은지 ⑤ 이번 주 한 가지: 같이 할 한 가지. 사람을 고르거나 재는 말은 쓰지 않습니다.`,
  ]
    .filter((line) => line !== '')
    .join('\n')
}

export interface NarrativeSection {
  /** 머리말(다섯 중 하나). 머리말 없이 시작한 본문은 ''. */
  heading: TogetherSection | ''
  body: string
}

const HEADING_LEAD = /^[\s「『[(#*\-•]+/
const HEADING_TRAIL = /[\s」』\])：:.]+$/
/** 「장점: …」「단점 — …」처럼 머리말 뒤에 구분 기호를 두고 본문이 같은 줄에 붙은 경우. 띄어쓰기만으로는 머리말이 아니다. */
const INLINE_HEADING = new RegExp(`^(${TOGETHER_SECTIONS.join('|')})[」』\\])]*\\s*[:：—–-]\\s*(.+)$`)

/** 함께 보기 본문 → 머리말별 토막. 머리말이 하나도 없으면 본문 한 덩이(옛 풀이 캐시 호환). */
export function parseTogetherSections(text: string): NarrativeSection[] {
  const out: NarrativeSection[] = []
  let current: NarrativeSection | null = null
  const isSection = (s: string): s is TogetherSection => (TOGETHER_SECTIONS as readonly string[]).includes(s)
  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const lead = line.replace(HEADING_LEAD, '')
    const bare = lead.replace(HEADING_TRAIL, '')
    if (isSection(bare)) {
      current = { heading: bare, body: '' }
      out.push(current)
      continue
    }
    const inline = lead.match(INLINE_HEADING)
    if (inline && isSection(inline[1])) {
      current = { heading: inline[1], body: inline[2].trim() }
      out.push(current)
      continue
    }
    if (!current) {
      current = { heading: '', body: '' }
      out.push(current)
    }
    current.body = current.body ? `${current.body}\n${line}` : line
  }
  return out.filter((s) => s.body || s.heading)
}

/** 캐시 키의 재료 — 화면에 영향을 주는 값만 뽑아 안정된 문자열로. 같은 입력이면 같은 문자열. */
export function prescriptionFingerprint(p: Prescription): string {
  return JSON.stringify({
    t: p.targetId,
    l: p.lacking,
    s: p.strongest,
    e: p.energy,
    f: p.fillers.map((f) => `${f.kind}:${f.personId ?? ''}`),
    sh: p.items.shrine.map((s) => s.id),
    a: p.avoid.element,
    c: p.caution ? 1 : 0,
    m: p.mansikNote ? 1 : 0,
  })
}

/** 함께 보기 지문 — 사람 순서와 무관하게(정렬) 같은 조합이면 같은 값. */
export function togetherFingerprint(ce: CircleEnergy): string {
  const sorted = [...ce.entries].sort((a, b) => a.targetId.localeCompare(b.targetId))
  return JSON.stringify({
    m: sorted.map((e) => `${e.targetId}:${e.yongsin}:${e.strongest}:${e.dayMaster ?? ''}`),
    p: [...ce.pairs].map((pr) => `${[pr.aId, pr.bId].sort().join('-')}:${pr.label}`).sort(),
    l: ce.lowest,
  })
}

export function circleFingerprint(ce: CircleEnergy): string {
  return JSON.stringify({
    k: ce.kind,
    m: ce.entries.map((e) => `${e.targetId}:${e.yongsin}:${e.strongest}`),
    l: ce.lowest,
    h: ce.holders.map((h) => h.targetId),
    p: ce.pairs.map((pr) => `${pr.aId}-${pr.bId}:${pr.label}`),
    r: ce.roles ? `${ce.roles.thick.key}/${ce.roles.thin.key}` : null,
  })
}

export type NarrativeCheck = { ok: true; text: string } | { ok: false; reason: string }

/** 모델 출력 거르기 — 길이·금지어·점수. 통과한 본문만 저장한다. */
export interface NarrativeCheckOptions {
  /** 이 머리말들이 (하나 빠지는 것까지 봐주고) 본문에 서 있어야 한다 — 함께 보기의 다섯 토막. */
  headings?: readonly string[]
  maxChars?: number
}

export function validateNarrative(raw: string, options: NarrativeCheckOptions = {}): NarrativeCheck {
  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/^[#*>\-•\s]+|["「」"]+$/gm, (m) => (m.includes('\n') ? m : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length < NARRATIVE_MIN_CHARS) return { ok: false, reason: 'TOO_SHORT' }
  if (text.length > (options.maxChars ?? NARRATIVE_MAX_CHARS)) return { ok: false, reason: 'TOO_LONG' }
  const hits = bannedWordsIn(text)
  if (hits.length > 0) return { ok: false, reason: `BANNED:${hits.join(',')}` }
  if (/\d+\s*(점|%|퍼센트|위)\b/.test(text) || /\d+\s*(점|%|퍼센트)/.test(text)) return { ok: false, reason: 'SCORE' }
  if (options.headings && options.headings.length > 0) {
    const found = new Set(parseTogetherSections(text).map((s) => s.heading))
    const present = options.headings.filter((h) => found.has(h as TogetherSection)).length
    if (present < options.headings.length - 1) return { ok: false, reason: 'HEADINGS' }
  }
  return { ok: true, text }
}
