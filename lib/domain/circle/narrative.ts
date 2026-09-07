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
import { bannedWordsIn } from './element-lore'
import type { Prescription } from './prescription'
import { PAIR_LABEL_KO, type CircleEnergy } from './team-energy'

export type NarrativeKind = 'prescription' | 'circle'

export const NARRATIVE_MIN_CHARS = 180
export const NARRATIVE_MAX_CHARS = 1600
/** 캐시 유효 기간 — 같은 입력이면 이 안에서는 다시 사지 않는다. */
export const NARRATIVE_CACHE_DAYS = 30

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
- 세 문단, 전체 500~800자. 각 문단은 세 문장에서 다섯 문장. 첫 문장은 인사·요약이 아니라 관찰로 시작합니다.
- 주어를 지우고 씁니다("당신은" 금지). 부사(매우·정말·상당히·다소)는 지웁니다.
- 마지막 문단은 오늘 할 수 있는 한 가지로 끝냅니다.
- 출력은 본문만. 제목·머리말·목록 기호·따옴표 없이 문단 사이는 빈 줄 하나.`

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

/** 캐시 키의 재료 — 화면에 영향을 주는 값만 뽑아 안정된 문자열로. 같은 입력이면 같은 문자열. */
export function prescriptionFingerprint(p: Prescription): string {
  return JSON.stringify({
    t: p.targetId,
    l: p.lacking,
    s: p.strongest,
    e: p.energyNow,
    f: p.fillers.map((f) => `${f.kind}:${f.personId ?? ''}`),
    sh: p.items.shrine.map((s) => s.id),
    a: p.avoid.element,
    c: p.caution ? 1 : 0,
    m: p.mansikNote ? 1 : 0,
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
export function validateNarrative(raw: string): NarrativeCheck {
  const text = raw
    .replace(/\r\n/g, '\n')
    .replace(/^[#*>\-•\s]+|["「」"]+$/gm, (m) => (m.includes('\n') ? m : ''))
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (text.length < NARRATIVE_MIN_CHARS) return { ok: false, reason: 'TOO_SHORT' }
  if (text.length > NARRATIVE_MAX_CHARS) return { ok: false, reason: 'TOO_LONG' }
  const hits = bannedWordsIn(text)
  if (hits.length > 0) return { ok: false, reason: `BANNED:${hits.join(',')}` }
  if (/\d+\s*(점|%|퍼센트|위)\b/.test(text) || /\d+\s*(점|%|퍼센트)/.test(text)) return { ok: false, reason: 'SCORE' }
  return { ok: true, text }
}
