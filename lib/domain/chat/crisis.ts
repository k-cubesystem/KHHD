/**
 * 속풀이 위기 신호 감지 — 1차 결정론 규칙.
 *
 * 속풀이는 마음이 힘든 사람이 가장 먼저 오는 화면이다. «죽고 싶다»는 말에 운세 풀이가 나가서는 안 된다.
 *   crisis  — 풀이 대신 고정 안내(CRISIS_REPLY). 질문권을 쓰지 않고 모델도 부르지 않는다.
 *   concern — 평소처럼 답하되 모델에 안전 지침(CHAT_SAFETY_INSTRUCTION)을 얹고, 답 끝에 안내 한 줄을 붙인다.
 *
 * 🔴 애매하면 무거운 쪽으로 판정한다. 오탐의 값은 안내문 한 번이고(질문권도 쓰지 않는다), 미탐의 값은 비교할 수 없다.
 *    다만 이 서비스에 흔한 말 — 「남편이랑 살기 싫어요」·「사업에 뛰어들고 싶어요」·꿈 해몽 — 은 표로 막는다.
 * 🔴 reason 은 고정 라벨이다. 그대로 로그에 실리므로 원문 조각을 담지 않는다.
 * 🔴 상담 번호를 고치면 CRISIS_HOTLINES_VERIFIED_ON 도 함께 — 공식 출처를 다시 본 날짜다.
 *
 * 순수 함수(side-effect 없음) — 서버와 브라우저가 같은 판정을 낸다.
 */

export type CrisisLevel = 'none' | 'concern' | 'crisis'

export type CrisisReason =
  // crisis
  | 'desire'
  | 'plan'
  | 'self-harm'
  // concern
  | 'weariness'
  | 'mention'
  | 'third-person'
  | 'dream'
  | 'history'
  // none
  | 'negated'
  | 'figurative'
  | 'other-topic'
  | 'clear'

export interface CrisisDetection {
  level: CrisisLevel
  reason: CrisisReason
}

interface Rule {
  reason: CrisisReason
  re: RegExp
  /** 낱말 경계를 지킨 원문에서 이 꼴이 보일 때만 규칙을 돌린다(아래 REAL_WORD). */
  requires?: RegExp
}

/** 걷어낼 표현 — 걷어낸 나머지에서 아무것도 안 걸리면 fallback 이 판정이 된다. */
interface Neutralizer {
  fallback: CrisisDetection
  re: RegExp
}

const CLEAR: CrisisDetection = { level: 'none', reason: 'clear' }

/** 띄어쓰기·문장부호·이모지를 지운다 — 「죽 고 싶 다…」와 「죽고싶다ㅠㅠ」가 같은 글이 된다. */
function compactOf(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, '')
}

/** 낱말 경계를 남긴 꼴 — 문장부호·이모지만 빈칸으로 바꾼다. */
function spacedOf(text: string): string {
  return text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]+/g, ' ')
    .trim()
}

/**
 * 🔴 빈칸을 지우면 없던 낱말이 생긴다 — 「혼자 살고 싶어요」→자살 · 「투자해도 될까요」→자해 · 「사유서를 썼어요」→유서.
 *    재물·독립 질문은 이 서비스에서 가장 흔한 말이다. 핵심 낱말은 원문에서 실제로 그 낱말로 쓰였을 때만 센다.
 */
const REAL_WORD = {
  자살: /(^|[^혼여남부])자살/,
  자해: /(^| )자해/,
  유서: /(^| )유서/,
  목: /(^| )목(을|이라도)?( |매)/,
  살: /(^| )살(아갈|아야 ?할)? ?(이유|의미|가치|낙|자신)/,
  나: /(^| )(내가|나 ?하나|나만|나 ?같은)/,
} as const

/** 걷어내기보다 먼저 본다 — 부정문처럼 생겼지만 뜻은 정반대인 말. */
const PRIORITY_RULES: readonly Rule[] = [
  { reason: 'desire', re: /죽[고구]싶지않(은(날|적|순간|때)(이|가)?없|다(면|고하면)거짓말|을수가?없)/ },
  { reason: 'desire', re: /(이?세상|이승)(에서|에)?(더는|더이상|더)?(살기(가|도)?싫|살고(싶|십)지(는|도)?않)/ },
]

const NEUTRALIZERS: readonly Neutralizer[] = [
  // 관용·과장·제3의 뜻
  { fallback: { level: 'none', reason: 'figurative' }, re: /자살(골|특공대|행위|예방|방지|률|공격|폭탄|테러)/g },
  { fallback: { level: 'none', reason: 'figurative' }, re: /자해공갈|죽자살자|죽자사자|죽기살기/g },
  { fallback: { level: 'none', reason: 'figurative' }, re: /죽고싶지만떡볶이는먹고싶어/g },
  { fallback: { level: 'none', reason: 'figurative' }, re: /죽[고구]싶(냐|니)/g },
  {
    fallback: { level: 'none', reason: 'figurative' },
    re: /죽[고구]싶을(만큼|정도로|만치)(너무|정말|진짜|완전)?(맛있|좋|행복|사랑|귀엽|귀여|예쁘|예뻐|웃기|웃겨|재밌|재미있|설레)/g,
  },
  // 「누구와·어디서 살기 싫다」 — 삶이 아니라 같이 사는 일 이야기다(속풀이 단골 주제).
  // 🔴 조사 「에」는 넣지 않는다 — 「빚 때문에 살기 싫어요」까지 걷어내 버린다.
  {
    fallback: { level: 'none', reason: 'other-topic' },
    re: /(이?랑|하고|와|과|에서|같이|함께|혼자서?)(는|은|도)?(더는|더이상|더|다시|계속|평생)?(같이|함께)?(살고(싶|십)지(는|도)?않|살기(가|도)?싫)/g,
  },
  // 「이 관계를·이 일을 끝내고 싶다」 — 끝내려는 것이 삶이 아니다.
  {
    fallback: { level: 'none', reason: 'other-topic' },
    re: /((관계|연애|결혼|이혼|소송|재판|계약|동업|공부|숙제|과제|업무|프로젝트|학교|회사)(을|를|도|은|는|부터)?|일(을|도|은|부터))(빨리|얼른|전부|모두|다|이제|그만)*끝내고(싶|십)/g,
  },
  // 「이렇게는 살기 싫다」 — 삶의 방식에 지친 말. 위기로 올리지 않되 그냥 넘기지도 않는다.
  {
    fallback: { level: 'concern', reason: 'weariness' },
    re: /(이렇게|이러고|이대로|이런식으로|이따위로|이모양으로|이꼴로|지금처럼)(는)?(더는|더이상|더|계속|평생)?(살고(싶|십)지(는|도)?않|살기(가|도)?싫)/g,
  },
  // 부정문 — 「없어지질 않는다」·「없지 않다」는 부정이 아니므로 남긴다.
  { fallback: { level: 'none', reason: 'negated' }, re: /죽[고구]싶(지는|지도|진|지)않/g },
  {
    fallback: { level: 'none', reason: 'negated' },
    re: /죽[고구]싶(은|다는)(건|것은|게|것이|거는|마음은|마음이|생각은|생각이|말은|말이|뜻은|뜻이)(전혀|절대|결코)?(아니|아닌|아님|없(?!어지|지않|진않|지는않))/g,
  },
  {
    fallback: { level: 'none', reason: 'negated' },
    re: /(죽을|죽고싶은|자살할|자살|자해할|자해)(생각|마음|의도|계획)(은|이|도|같은건|같은거)?(전혀|절대|추호도|하나도|조금도)?(없(?!어지|지않|진않|지는않)|안해|안했|안들|안합)/g,
  },
  {
    fallback: { level: 'none', reason: 'negated' },
    re: /(자살|자해)(은|을|를|같은건|같은거)?(절대|결코|전혀)?(안해|안할|안합|안했|하지않|하지는않|하진않)/g,
  },
  // 남의 말을 옮긴 꼴 — 과거형(「~다고 했」)은 본인 말일 수 있어 넣지 않는다.
  {
    fallback: { level: 'concern', reason: 'third-person' },
    re: /(죽[고구]|자살하고|자해하고|사라지고|뛰어내리고)(싶|십)(대|답니다|다고(해요|합니다|하네요|하는데|하더라|그러|그래)|다며|다면서|어(해요|해서|합니다|하는데|하네요|하더라|한다|하세요|하십니다))/g,
  },
]

const CRISIS_RULES: readonly Rule[] = [
  { reason: 'desire', re: /죽[고구]만?(싶|십|시퍼|시프|잪)|죽고(파|프)/ },
  { reason: 'desire', re: /죽어버리고(싶|십)|죽어버릴(까|래|거|게|것)|죽어버려야/ },
  { reason: 'desire', re: /죽어야(끝|하나|할까|겠|되나|지)/ },
  { reason: 'desire', re: /(그냥|확|콱|차라리|이대로|조용히)죽(을까|자|어버|는게|었으면|고말|을래|어야)/ },
  { reason: 'desire', re: /죽는(게|것이|편이)(더|훨씬)?(낫|나을|나아|편)/ },
  { reason: 'desire', re: /죽으면(다|모든게|모두|전부)?(편|끝|해결|나을|낫|괜찮|좋)/ },
  { reason: 'desire', re: /(내가|나는|난|저는|제가|나만|나하나|나같은건?|자다가).{0,3}죽(었|어버렸)으면/ },
  { reason: 'desire', re: /(나|날|저|절)(좀|를|을)?(제발)?죽여(줘|줬으면|주면|달라|주세요)/ },
  { reason: 'desire', re: /살고(싶|십)지(는|도)?않|그만살고(싶|십)/ },
  {
    reason: 'desire',
    re: /(삶|생|인생)을?(다|그만|이제)?(끝내고싶|끝내려|끝낼까|끝내야|마감하고싶|마감하려|마감해야)/,
  },
  { reason: 'desire', re: /(영원히|영영)(잠들|눈감)고(싶|십)/ },
  {
    reason: 'plan',
    requires: REAL_WORD.자살,
    re: /자살(하고(싶|십)|할래|할까|할거|할게|할것|하려|하면|해야|해버|충동|생각|사고|계획|방법|하는법|하는방법|준비)/,
  },
  { reason: 'plan', re: /극단적?인?선택(을)?(하고(싶|십)|할까|할것|할거|하려|해야|할래|생각|고민)/ },
  { reason: 'plan', re: /뛰어내리고(싶|십)|뛰어내릴(까|래|거|게|것)|뛰어내려야|뛰어내리려/ },
  {
    reason: 'plan',
    re: /(한강|강|바다|강물|차도|도로|선로|철로|지하철)(에|으로|로)?뛰어들(고(싶|십)|까|래|려|어야|면)/,
  },
  { reason: 'plan', re: /투신(자살|하고싶|할까|할래|하려)/ },
  { reason: 'plan', requires: REAL_WORD.목, re: /목(을|이라도)?(매고싶|매달고싶|맬까|매려|매달까|매달려고|매달아)/ },
  { reason: 'plan', re: /목숨(을|이라도)?(끊|버리고싶|버릴|버리려)/ },
  { reason: 'plan', re: /세상(을|과)?(떠나고싶|뜨고싶|하직|등지고싶|작별하고싶)/ },
  { reason: 'plan', re: /번개탄/ },
  { reason: 'plan', requires: REAL_WORD.유서, re: /유서(를|도)?(쓰|썼|써|남기|남겼|남겨)/ },
  {
    reason: 'plan',
    re: /수면제(을|를)?(한꺼번에|몽땅|다|털어|잔뜩|한통|한움큼)+(먹|삼키|넣)|수면제(를)?(모으|모아)|약(을|를)?(몽땅|다?털어|잔뜩|한통|한움큼)+(먹|삼키|넣)/,
  },
  { reason: 'plan', requires: REAL_WORD.자살, re: /동반자살/ },
  { reason: 'plan', re: /(같이|함께)죽(자|을래|고싶)/ },
  {
    reason: 'self-harm',
    requires: REAL_WORD.자해,
    re: /자해(하고(싶|십)|할래|할까|하려|했|해요|해서|하게|하는|를했|를해|를하|충동|흔적|자국|습관)/,
  },
  { reason: 'self-harm', re: /손목(을)?(긋|그었|그어|그을|그은)/ },
  { reason: 'self-harm', re: /(커터|칼|면도날)로?(손목|팔|허벅지|몸)(을|를)?(긋|그었|그어|그을|그은|베)/ },
]

const CONCERN_RULES: readonly Rule[] = [
  { reason: 'weariness', re: /살기(가|도)?(싫|실타|시러)|살아서(뭐|뭘|무엇)(해|하|합|할)/ },
  { reason: 'weariness', re: /사는게(의미|뜻|이유|낙|재미)(가|이|도)?없/ },
  {
    reason: 'weariness',
    requires: REAL_WORD.살,
    re: /살(아갈|아야할)?(이유|의미|가치|낙|자신)(가|이|도|를)?(없|모르|잃)/,
  },
  {
    reason: 'weariness',
    re: /삶의?(의미|이유|낙|의욕)(가|이|를|도)?(없|모르|잃)|왜(사는지|살아야하는지|사는건지)모르/,
  },
  { reason: 'weariness', re: /(사라지고|사라져버리고|없어지고|없어져버리고|증발하고|증발해버리고)(싶|십)/ },
  {
    reason: 'weariness',
    requires: REAL_WORD.나,
    re: /(내가|나하나|나만|나같은건?)없(어지면|어져야|어져도|어지는게|으면)/,
  },
  { reason: 'weariness', re: /(다|모든걸|모든것을|전부|이제그만|이제다)끝내고(싶|십)/ },
  { reason: 'weariness', re: /(인생|삶)을?(포기하고싶|포기할까|놓고싶|놓아버리고싶)/ },
  { reason: 'weariness', re: /버틸(수가?|힘이?|자신이?)없|(더는|더이상|이제)못버티/ },
  { reason: 'weariness', re: /태어나지(말았어야|않았으면|말걸)|태어난게(잘못|죄|후회)/ },
  { reason: 'weariness', re: /눈을?(안|못)떴으면|(안|못)깨어났으면|안깼으면|깨어나지않았으면/ },
  { reason: 'mention', requires: REAL_WORD.자살, re: /자살/ },
  { reason: 'mention', requires: REAL_WORD.자해, re: /자해/ },
  { reason: 'mention', re: /극단적?인?선택(?!지)/ },
]

/**
 * 꿈 이야기 — 방법·자해 낱말이 걸려도 해몽 질문일 수 있다. 「죽고 싶다」류 직접 표현에는 적용하지 않는다.
 * 🔴 「꿈을 꾸다」는 장래 희망으로도 쓴다(「가수의 꿈을 꾸었지만 이제…」). 꿈의 내용은 「~하는 꿈을 꿨다」처럼
 *    꿈이라는 말 «앞»에 오므로, 뜻이 갈리는 꼴은 걸린 낱말 «뒤»에 나올 때만 해몽으로 본다.
 */
const DREAM_ANYWHERE = /꿈에서?|꿈속|꿈자리|꿈(해석|풀이)|해몽|악몽/
const DREAM_AFTER_HIT = /꿈(을?(꿨|꾸었|꿔|꾼|꾸는|꾸고)|인데|이었|$)/

const ENGLISH_FIGURATIVE = /suicide squad/g
const ENGLISH_CRISIS = /\b(kill(ing)? myself|want(ed)? to die|wanna die|end(ing)? my life|end it all|suicid(e|al))\b/

const LEVEL_WEIGHT: Record<CrisisLevel, number> = { none: 0, concern: 1, crisis: 2 }

function firstHit(rules: readonly Rule[], compact: string, spaced: string): { rule: Rule; index: number } | null {
  for (const rule of rules) {
    if (rule.requires && !rule.requires.test(spaced)) continue
    const match = rule.re.exec(compact)
    if (match) return { rule, index: match.index }
  }
  return null
}

/** 메시지 한 건의 위기 신호를 판정한다. */
export function detectCrisis(text: string): CrisisDetection {
  if (typeof text !== 'string' || !text.trim()) return CLEAR

  const compact = compactOf(text)
  const spaced = spacedOf(text)

  const priority = firstHit(PRIORITY_RULES, compact, spaced)
  if (priority) return { level: 'crisis', reason: priority.rule.reason }

  let rest = compact
  let fallback: CrisisDetection = CLEAR
  for (const { re, fallback: candidate } of NEUTRALIZERS) {
    const stripped = rest.replace(re, ' ')
    if (stripped === rest) continue
    rest = stripped
    const heavier = LEVEL_WEIGHT[candidate.level] > LEVEL_WEIGHT[fallback.level]
    if (heavier || fallback.reason === 'clear') fallback = candidate
  }

  const crisis = firstHit(CRISIS_RULES, rest, spaced)
  if (crisis) {
    const dreamTalk =
      crisis.rule.reason !== 'desire' &&
      (DREAM_ANYWHERE.test(compact) || DREAM_AFTER_HIT.test(rest.slice(crisis.index)))
    return dreamTalk ? { level: 'concern', reason: 'dream' } : { level: 'crisis', reason: crisis.rule.reason }
  }

  if (ENGLISH_CRISIS.test(spaced.replace(ENGLISH_FIGURATIVE, ' '))) return { level: 'crisis', reason: 'desire' }

  const concern = firstHit(CONCERN_RULES, rest, spaced)
  if (concern) return { level: 'concern', reason: concern.rule.reason }

  return fallback
}

/** 직전 대화에서 위기 신호를 몇 턴까지 기억할지 — 모델에 넘기는 히스토리 창과 같은 길이. */
export const CRISIS_HISTORY_WINDOW = 8

/**
 * 이번 턴의 판정 — 직전 대화에 위기 신호가 있었다면 평범한 다음 질문도 concern 으로 다룬다.
 * 「죽고 싶어요」 → 안내 → 「그래도 사주나 봐 주세요」에 아무 일 없던 듯 풀이가 나가지 않게 한다.
 * history 는 클라이언트가 보낸 값이라 모양을 믿지 않는다. 본인 발화(user)만 본다 — 안내문 자체가 걸리면 안 된다.
 */
export function detectCrisisInTurn(text: string, history: readonly unknown[]): CrisisDetection {
  const current = detectCrisis(text)
  if (current.level !== 'none') return current

  const recentlyInCrisis = history.slice(-CRISIS_HISTORY_WINDOW).some((turn) => {
    if (typeof turn !== 'object' || turn === null) return false
    const { role, content } = turn as { role?: unknown; content?: unknown }
    return role === 'user' && typeof content === 'string' && detectCrisis(content).level === 'crisis'
  })
  return recentlyInCrisis ? { level: 'concern', reason: 'history' } : current
}

// --- 안내 문구 ---

export interface CrisisHotline {
  label: string
  number: string
  /** 바로 걸기(tel:)에 쓸 번호. null 이면 링크를 달지 않는다. */
  tel: string | null
  note?: string
}

type DialableHotline = CrisisHotline & { tel: string }

/** 공식 출처를 마지막으로 다시 본 날 — 129.go.kr/109 · mohw.go.kr(정신건강정책) · mogef.go.kr(청소년상담 1388). */
export const CRISIS_HOTLINES_VERIFIED_ON = '2026-09-20'

export const CRISIS_HOTLINES: readonly CrisisHotline[] = [
  { label: '자살예방상담전화', number: '109', tel: '109' },
  { label: '정신건강 위기상담전화', number: '1577-0199', tel: '15770199' },
  // 휴대전화는 지역번호를 붙여야 걸린다(여성가족부 안내) — 바로 걸기를 달면 엉뚱한 곳에 걸린다.
  { label: '청소년상담', number: '1388', tel: null, note: '휴대전화는 지역번호+1388' },
]

const hotlineName = (h: CrisisHotline) => `${h.label} ${h.number}`

/**
 * crisis 고정 안내 — 풀이 대신 나간다.
 * 🔴 담담하게, 판단하지 않고, 확인된 사실만. 낫는다·좋아진다 같은 효과를 약속하지 않는다.
 *    본인 일인지 곁의 사람 일인지 가리지 못하므로 두 경우 모두에 맞는 말로 쓴다.
 */
export const CRISIS_REPLY = [
  '잠시 풀이를 멈추고 말씀드립니다.',
  '지금 적어 주신 마음은 운세로 답할 이야기가 아니라, 곁에서 직접 들어 줄 사람이 필요한 이야기로 읽혔습니다. 그런 마음이 드는 것은 잘못이 아닙니다. 본인의 일이든 가까운 분의 일이든, 아래 전화는 24시간 열려 있습니다.',
  CRISIS_HOTLINES.map((h) => `· ${hotlineName(h)}${h.note ? ` (${h.note})` : ''}`).join('\n'),
  '지금 몸이 위험한 상황이라면 119에 먼저 연락해 주세요.',
  '이 질문에는 질문 횟수를 쓰지 않았습니다. 풀이는 언제든 다시 여쭤 주시면 이어 가겠습니다.',
].join('\n\n')

/** concern 안내 한 줄 — 정상 답변 끝에 붙는다. */
export const CONCERN_FOOTER = `마음이 버거운 날에는 ${CRISIS_HOTLINES.map(hotlineName).join(' · ')} 이 24시간 열려 있습니다.`

export function withConcernFooter(responseText: string): string {
  return `${responseText.trimEnd()}\n\n${CONCERN_FOOTER}`
}

/** concern 턴에만 시스템 지시문 끝에 얹는다 — 뒤에 올수록 앞선 지시(신물 권유 등)를 이긴다. */
export const CHAT_SAFETY_INSTRUCTION = `[안전 지침 — 다른 모든 지시보다 우선]
내담자가 삶이 버겁다는 신호를 보였습니다. 이번 답변에서는 반드시 다음을 지키십시오.
- 풀이에 앞서 힘든 마음을 먼저 담담히 받아 주십시오. 판단·훈계·다그침을 하지 마십시오.
- 죽음·단명·큰 불행을 예언하지 말고, "타고난 팔자라 어쩔 수 없다"는 식의 숙명론을 말하지 마십시오.
- 풀이·신물·개운법이 마음의 병을 낫게 한다고 말하지 마십시오. 진단·치료·약에 대한 조언도 하지 마십시오.
- 신물·이용권·다른 유료 풀이를 권하지 마십시오.
- 혼자 견디지 말고 가까운 사람이나 전문 상담과 이야기해 보도록, 부담스럽지 않게 한 번만 권하십시오.
- 자해·자살의 방법이나 수단은 어떤 경우에도 말하지 마십시오.`

export interface HotlineSegment {
  text: string
  tel?: string
}

/** 말풍선 렌더용 — 「자살예방상담전화 109」처럼 공식 이름 바로 뒤의 번호만 바로 걸기 조각으로 가른다. */
export function splitHotlineLinks(text: string): HotlineSegment[] {
  const dialable = CRISIS_HOTLINES.filter((h): h is DialableHotline => h.tel !== null)
  const segments: HotlineSegment[] = []
  let cursor = 0

  while (cursor < text.length) {
    let next: { numberAt: number; hotline: DialableHotline } | null = null
    for (const hotline of dialable) {
      const at = text.indexOf(hotlineName(hotline), cursor)
      if (at === -1) continue
      const numberAt = at + hotline.label.length + 1
      if (!next || numberAt < next.numberAt) next = { numberAt, hotline }
    }
    if (!next) break
    if (next.numberAt > cursor) segments.push({ text: text.slice(cursor, next.numberAt) })
    segments.push({ text: next.hotline.number, tel: next.hotline.tel })
    cursor = next.numberAt + next.hotline.number.length
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments
}
