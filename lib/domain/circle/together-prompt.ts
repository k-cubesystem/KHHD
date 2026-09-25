/**
 * 함께 보기(둘·셋·넷) AI 풀이 프롬프트 — v2 (2026-09-14).
 *
 * CEO: 「무슨 말인지도 모르게 어렵고, 현실에서 쓰는 이해하기 편한 문법으로. 가볍게 비유를 들어. 지금은 AI 가 풀이한 것 같지 않게
 * 진부해. 프롬프트를 만들어서 제미나이가 풀이를 잘하게.」
 *
 * ## 옛 프롬프트에서 실측한 것 (gemini-3.8-flash, 세션 A/B 하네스)
 *  ① 목소리가 셋이 겹쳤다 — «신당 상담가»(합니다체) + 용어 사전(모든 개념을 «~결»로) + 문장 공예 레이어(문어). 결과가
 *     합니다체 40·해요체 0, «결» 같은 어려운 말 24곳, «형국입니다»·«이롭습니다».
 *  ② 재료가 엔진 문장 그대로였다(木生火·일간·기신) — 게다가 «판정 그대로 쓰라»고 해서 모델이 번역체로 되풀이했다.
 *  ③ 생각 토큰이 출력 한도를 먹었다 — 3인 조합은 한도 3,000 중 2,877 을 생각에 써 184자에서 끊겼다.
 *
 * ## 그래서
 *  - 목소리 하나 — 해요체 이야기꾼. 읽는 사람(엄마·아빠·팀장·사장님·모임 리더)을 적어 둔다.
 *  - 재료를 쉬운 말로 바꿔 넘긴다(한자·명리 용어 없이). 판단은 엔진이 하고, 설명과 비유는 모델이 새로 쓴다.
 *  - 비유 규칙과 ✗/○ 대비 예시 — 다른 사람·다른 기운으로 들어 베껴 쓸 수 없게 한다(Google: 예시는 넣되 과적합 주의).
 *  - Gemini 3 권고: 온도는 기본값 1.0, 데이터를 먼저 두고 지시는 끝에, 생각 토큰을 감안해 한도는 넉넉히.
 *
 * ## v2b (같은 날, 첫 A/B 출력 네 편을 읽고)
 *  - 물건이 기운을 «채워 준다·살아나게 한다»는 문장이 풀이마다 나왔다 — 쿠팡 링크 옆이라 표시광고법에 걸린다.
 *    데이터의 «물건으로 채워요»가 부추겼다 → 물건은 «떠올리는 신호»로만 쓰고, 볼 때 무엇을 해 볼지를 쓰게 한다.
 *  - 비유가 모두 «~하듯,» 한 모양이었고 소재 예시(모닥불·바통)를 그대로 가져왔다 → 목록을 빼고 관계별 장면과 모양 바꾸기.
 *  - 평균 문장이 53~57자였다 → «40자 안팎»으로 숫자를 준다. 다시 쓰라는 말도 해요체로(합니다체 안내가 말투를 되돌린다).
 *  - 자연스러운 말 속 금지어 조각(«코드를 뽑아»의 «뽑»)에 거르기가 걸렸다 → 자주 새는 말의 바꿔 쓰기를 적어 준다.
 *  - 물건 데이터 칸이 섞여 «동쪽 창가에 책상 위 작은 관엽 화분»이 나왔다 → 칸 이름(책상에 둘 것: / 집 안 자리:)을 붙인다.
 *
 * 순수 모듈이다. narrative.ts 가 가져다 쓰고, 이 파일은 narrative.ts 를 가져오지 않는다(순환 금지).
 */
import type { Element } from '@/lib/domain/shrine/types'
import { PROSE_CLICHES, PROSE_MACHINE_TICS } from '@/lib/ai/prose-quality'
import type { CircleKind } from './circle'
import { ELEMENT_PLAIN, LORE_BANNED_WORDS, elementNeeds } from './element-lore'
import type { CircleEnergy, CircleMemberEnergy, PairRelation, Vitality } from './team-energy'

/** 여섯 토막의 머리말 — 프롬프트·거르기·화면이 같은 문자열을 쓴다. */
export const TOGETHER_SECTIONS = [
  '한눈에 보면',
  '잘 맞는 점',
  '부딪히기 쉬운 점',
  '사람마다 이렇게',
  '곁에 두면 좋은 것',
  '이번 주에 해 볼 것',
] as const
export type TogetherSection = (typeof TOGETHER_SECTIONS)[number]

/** 39차까지의 머리말 → 새 머리말. 30일 캐시와 «최근 본 조합»에 남은 옛 풀이도 새 이름으로 보인다. */
export const TOGETHER_LEGACY_HEADINGS: Readonly<Record<string, TogetherSection>> = {
  '서로의 오행': '한눈에 보면',
  장점: '잘 맞는 점',
  단점: '부딪히기 쉬운 점',
  '필요한 것': '곁에 두면 좋은 것',
  '이번 주 한 가지': '이번 주에 해 볼 것',
}

/**
 * 호출 설정 — 🔴 maxTokens 는 «생각 + 본문» 한도다(gemini-3.8-flash 는 생각이 기본으로 켜져 한도를 같이 쓴다).
 * 본문 길이는 프롬프트와 validateNarrative 가 정하고, 과금은 쓴 만큼이라 한도는 넉넉히 둔다.
 * 온도는 Gemini 3 공식 권고대로 기본값 1.0(낮추면 반복·품질 저하가 날 수 있다고 적혀 있다).
 */
export const TOGETHER_GENERATION = { temperature: 1, maxTokens: 8192 } as const

/** 어려운 말(결·옅다·일간·한자 등)을 이만큼까지만 봐준다 — 넘으면 다시 쓴다. */
export const TOGETHER_JARGON_MAX = 2

/** 오행 이름과 그 힘 — 한자 없이. */
export const ELEMENT_WORD: Record<Element, { readonly name: string; readonly power: string }> = {
  wood: { name: '나무', power: '시작하는 힘·추진력' },
  fire: { name: '불', power: '활기·표현력' },
  earth: { name: '흙', power: '안정감·약속을 지키는 힘' },
  metal: { name: '쇠', power: '정리하고 마무리하는 힘·결단력' },
  water: { name: '물', power: '쉬어 가는 여유·들어 주는 힘' },
}

const VITALITY_WORD: Record<Vitality, string> = {
  strong: '힘이 넘치는 편 — 에너지가 쌓이면 몸을 움직여 풀어야 가벼워지는 사람',
  balanced: '고른 편 — 쉬는 것과 움직이는 것을 섞으면 되는 사람',
  weak: '쉽게 지치는 편 — 먼저 쉬어서 채워야 힘이 나는 사람',
}

export const KIND_CONTEXT: Partial<Record<CircleKind, string>> = {
  family: '가족이에요.',
  work: '직장 동료예요. 이미 함께 일하는 사람끼리 더 잘 지내기 위한 풀이예요.',
  friends: '친구·모임 사람들이에요.',
}

/** 누구에게나 해당해서 아무 말도 안 한 것과 같은 말 — 모임 풀이에서 특히 잘 새는 것을 더한다. */
export const TOGETHER_CLICHES: readonly string[] = [
  ...PROSE_CLICHES,
  ...PROSE_MACHINE_TICS,
  '서로 이해하고 배려',
  '소통이 중요',
  '균형을 맞추는 것이 중요',
  '조화를 이루',
  '시너지',
  '긍정적인 에너지',
  '좋은 기운이 흐르',
]

/**
 * 읽는 사람이 모르는 명리 용어 — 출력 검사용. «결»은 결정·해결·결단력 같은 낱말 속이 아니라 홀로 쓰인 것만 잡는다.
 * 🔴 «상관»은 «상관없어요»와 겹쳐 뺐다. 사람 이름(정재·한결 등)은 호출하는 쪽이 ignore 로 넘겨 먼저 지운다.
 */
const JARGON_PATTERNS: readonly RegExp[] = [
  /(?<![가-힣])결(?:이|을|로|은|의|과)?(?![가-힣])/g,
  /옅/g,
  /두껍|두텁|두터/g,
  /용신|기신|희신/g,
  /일간/g,
  /상생|상극/g,
  /십성|비견|겁재|식신|정재|편재|정관|편관|정인|편인/g,
  /신강|신약/g,
  /명식/g,
  /[一-鿿]/g,
]

export function togetherJargonHits(text: string, ignore: readonly string[] = []): string[] {
  let t = text
  for (const name of ignore) if (name) t = t.split(name).join(' ')
  const out: string[] = []
  for (const re of JARGON_PATTERNS) out.push(...(t.match(re) ?? []))
  return out
}

export const BANNED_ALL: readonly string[] = [...LORE_BANNED_WORDS.efficacy, ...LORE_BANNED_WORDS.hiring]

/** 자연스러운 말 속에 금지어 조각이 새는 자리 — 바꿔 쓸 말을 쥐여 준다(«코드를 뽑아»의 «뽑»이 거르기에 걸렸다, v2c). */
export const PLAIN_SWAPS = `'매일'→'아침마다'·'틈날 때마다', '낫다'→'좋다', '반드시'·'무조건'→'꼭', '확실히'→'분명히', '성공'→'잘 풀림', '최고'→'제일 좋은', '뽑다'→'빼다'(코드를 빼요), '잘라 말하다'→'딱 부러지게 말하다', '평가'→'살펴보기'`

export const TOGETHER_SYSTEM_PROMPT = `<역할>
사주 속 다섯 기운(나무·불·흙·쇠·물)을 쉬운 말로 풀어 주는 이야기꾼이에요. 명리를 잘 알지만, 설명은 동네에서 제일 말이 잘 통하는 선배가 커피 한잔하며 들려주는 말투로 해요.
</역할>

<읽는 사람>
가족의 기운을 챙기고 싶은 엄마·아빠, 팀을 이끄는 팀장·사장님, 모임을 꾸리는 리더예요. 사주 용어는 몰라요. 다 읽고 나서 "아, 그래서 우리는 이렇게 하면 되는구나" 하고 이번 주에 바로 해 볼 수 있어야 해요.
</읽는 사람>

<말투>
- 해요체로 써요(~해요, ~예요, ~거든요, ~잖아요, ~면 좋아요). 합니다체·옛말투·문어체는 쓰지 않아요.
- 한 문장은 40자 안팎으로 짧게 써요. 쉼표로 길게 이어지면 두 문장으로 나눠요.
- 사람은 이름에 '님'을 붙여 불러요. '당신'은 쓰지 않아요.
- 카톡으로 보내도 어색하지 않은, 요즘 사람들이 실제로 쓰는 말로 써요.
- '힘'이라는 낱말만 되풀이하지 않아요. 첫발, 여유, 활기, 뒷심, 마무리 솜씨처럼 바꿔 가며 써요.
</말투>

<비유>
- 토막마다 가벼운 비유를 하나씩 넣어요. '사람마다 이렇게'는 사람마다 하나씩이에요.
- 이 사람들 사이에 어울리는 생활 장면에서 가져와요. 가족이면 집·부엌·주말 나들이, 직장이면 회의·점심시간·출근길, 친구·모임이면 여행·운동·맛집처럼요.
- 톱니바퀴, 오케스트라, 퍼즐 조각, 음과 양, 캠핑 모닥불처럼 너무 흔한 비유는 쓰지 않아요.
- 비유는 데이터의 사실 하나를 보여 줘야 해요. 그럴듯하기만 한 비유는 빼요.
- 비유 문장의 모양을 바꿔 가며 써요. "~ 같아요", "마치 ~예요", "~잖아요"처럼요. "~하듯,"으로 앞에 붙이는 문장은 풀이 전체에서 두 번까지만 써요.
- 한 풀이 안에서 같은 소재를 두 번 쓰지 않고, 한 문장에 비유를 두 개 겹치지 않아요.
- "~한 형국", "~하는 격", "이롭습니다" 같은 옛말투는 쓰지 않아요.
</비유>

<쉬운 말>
데이터의 판단은 그대로 두고, 말만 이렇게 바꿔 써요.
- 나무 기운 → 시작하는 힘, 추진력, 첫발
- 불 기운 → 활기, 표현력
- 흙 기운 → 안정감, 약속을 지키는 힘
- 쇠 기운 → 정리하고 마무리하는 힘, 결단력
- 물 기운 → 쉬어 가는 여유, 들어 주는 힘
- 기운이 넉넉하다 → 그 힘이 넘치는 편 / 기운이 모자라다 → 그 힘이 모자란 편
</쉬운 말>

<지킬 것>
- 데이터에 없는 기운·관계·갈등·물건은 지어내지 않아요.
- 데이터의 문장을 그대로 옮기지 않고, 내 말로 다시 써요.
- 문단마다 사람 이름이 들어가요. 이 사람들한테만 할 수 있는 이야기를 써요.
- 좋은 말만 늘어놓지 않아요. 부딪히기 쉬운 점은 부드럽지만 분명하게 말해요.
- 이미 곁에 있는 사람과 잘 지내기 위한 글이에요. 누가 더 좋고 나쁜지 비교하지 않아요.
- '다 같이', '모두'라는 말은 데이터의 [다 같이 있을 때]에 적힌 것에만 써요.
</지킬 것>

<물건>
- 물건·색·방향·시간은 모자란 힘을 떠올리게 하는 생활 속 신호예요. 물건이 기운·마음·분위기·운을 바꿔 준다고 말하지 않아요.
- "두면 ~이 살아나요", "~을 채워 줘요", "~을 잡아 줘요" 대신, 그 물건을 보거나 쓸 때 무엇을 해 보면 좋은지 써요.
- 예시(이 물건은 목록에 없으니 가져다 쓰지 않아요)
  ✗ 탁상 달력을 두면 약속을 지키는 힘이 생겨요.
  ○ 탁상 달력을 눈앞에 두고, 볼 때마다 이번 주 약속 하나를 적어 봐요.
</물건>

<쓰지 않는 말>
- 명리 용어: 결, 옅다, 두껍다, 두텁다, 용신, 기신, 일간, 상생, 상극, 십성, 신강, 신약, 명식, 그리고 한자(木·火·土·金·水 같은 글자)
- 누구에게나 해당하는 말: ${TOGETHER_CLICHES.map((c) => `"${c}"`).join(', ')}
- 아래 낱말은 한 글자도 쓰지 않아요: ${BANNED_ALL.join(', ')}
  자주 새는 말은 이렇게 바꿔요: ${PLAIN_SWAPS}
- 점수, 퍼센트, 순위
</쓰지 않는 말>

<형식>
- 여섯 토막이에요. 토막마다 첫 줄에 머리말만 쓰고, 다음 줄부터 본문을 써요.
- 머리말은 정확히 이 순서예요: ${TOGETHER_SECTIONS.join(' / ')}
- 머리말에 기호(#, *, 「」, 번호)를 붙이지 않아요. 본문에는 목록 기호를 쓰지 않아요. 토막 사이는 빈 줄 하나예요.
- 전체 900~1,500자.
- 한눈에 보면: 두세 문장. 이 사람들을 생활 속 한 장면에 빗대어 한눈에 보여 줘요.
- 잘 맞는 점: 세 문장 안팎. 무엇이 왜 잘 맞는지.
- 부딪히기 쉬운 점: 세 문장 안팎. 어디서 왜 부딪히는지, 그리고 "이렇게 하면 괜찮아요"까지.
- 사람마다 이렇게: 사람마다 한 문단이고, 문단은 그 사람 이름으로 시작해요. 데이터의 '같이 있을 때 맞는 방법'(같이 밥·몸 움직이기·쉬게 두기·정해진 시간·같이 마무리)을 먼저 말하고, 왜 그런지, 해 주면 좋은 것 하나, 피하면 좋은 것 하나를 써요.
- 곁에 두면 좋은 것: 데이터 목록에 있는 물건과 자리만 불러요. 사람마다 한두 문장으로, 누구 자리에 무엇을 두고 그걸 볼 때 무엇을 해 보면 좋은지 써요.
- 이번 주에 해 볼 것: 다 같이 해 볼 일 하나. 언제·어디서·무엇을 할지 한두 문장.
</형식>

<예시>
말투와 비유를 쓰는 방법만 참고해요. 예시의 사람·문장·비유 소재·물건은 가져다 쓰지 않아요.
(예시 데이터: 수빈님은 흙 기운이 넉넉하고 불 기운이 모자란 쉽게 지치는 편, 태오님은 쇠 기운이 넉넉하고 나무 기운이 모자란 힘이 넘치는 편)

✗ 이렇게 쓰지 않아요
수빈님은 흙의 결이 두텁고 화의 기운이 옅은 형국이니, 태오님의 금 기운과 어우러지면 안정이 이롭습니다.

○ 이렇게 써요
한눈에 보면
수빈님은 늘 제자리를 지키는 식탁이고, 태오님은 흩어진 종이를 척척 묶는 스테이플러 같아요. 둘이 있으면 집 안이 반듯해요. 그런데 새 일을 먼저 꺼내는 사람이 잘 안 보여요.

사람마다 이렇게
수빈님은 같이 밥 먹는 시간이 힘이 돼요. 활기가 모자라서 혼자 두면 금방 가라앉거든요. 난로에 장작을 한꺼번에 밀어 넣으면 오히려 불이 죽잖아요. 그래서 긴 약속보다 따뜻한 점심 한 끼가 맞아요. 기분이 처져 보이면 좋은 소식부터 꺼내 주세요. 쌓아 둔 부탁을 한꺼번에 하는 건 피해 주세요.
</예시>`

export function elementWord(el: Element): string {
  return `${ELEMENT_WORD[el].name} 기운(${ELEMENT_WORD[el].power})`
}

function personLines(e: CircleMemberEnergy, ce: CircleEnergy): (string | null)[] {
  const care = ce.care.find((c) => c.targetId === e.targetId)
  return [
    `- ${e.name}님 (${e.relation})`,
    `  넉넉한 기운: ${elementWord(e.strongest)} — ${ELEMENT_PLAIN[e.strongest].rich}`,
    `  모자란 기운: ${elementWord(e.yongsin)} — ${ELEMENT_PLAIN[e.yongsin].lacking}`,
    e.vitality ? `  체력 타입: ${VITALITY_WORD[e.vitality]}` : null,
    care ? `  같이 있을 때 맞는 방법: ${care.label} — ${care.together}` : null,
    care ? `  그 이유: ${care.why.replace(/\s*\((신강|신약)\)/g, '')}` : null,
    care ? `  해 주면 좋은 것: ${care.do}` : null,
    care ? `  피하면 좋은 것: ${care.avoid}` : null,
  ]
}

/** 엔진의 관계 판정 하나를 쉬운 말 한 줄로 — 판정(라벨·주는 쪽·받는 쪽·기운)은 그대로, 용어와 한자는 뺀다. */
export function pairLine(pr: PairRelation, ce: CircleEnergy): string {
  const find = (id: string | null) => (id ? ce.entries.find((e) => e.targetId === id) : undefined)
  const giver = find(pr.giverId)
  const receiver = find(pr.receiverId)
  const head = `- ${pr.aName}님 ↔ ${pr.bName}님`
  const element = pr.element ? elementWord(pr.element) : null

  switch (pr.label) {
    case 'complement': {
      if (giver && receiver && element) {
        return `${head}: 채워 주는 사이 · 주는 사람 ${giver.name}님 · 받는 사람 ${receiver.name}님 · 오가는 힘 ${element} · 뜻: ${giver.name}님에게 넉넉한 힘이 ${receiver.name}님에게는 모자라서, 같이 있으면 그 힘이 옮아가요`
      }
      const a = find(pr.aId)
      const b = find(pr.bId)
      if (a && b) {
        return `${head}: 서로 채워 주는 사이 · ${a.name}님에게 모자란 ${elementWord(a.yongsin)}은 ${b.name}님이 넉넉해요 · ${b.name}님에게 모자란 ${elementWord(b.yongsin)}은 ${a.name}님이 넉넉해요`
      }
      return `${head}: 서로 채워 주는 사이`
    }
    case 'lift':
      if (giver && receiver && element) {
        return `${head}: 끌어 주는 사이 · 끌어 주는 사람 ${giver.name}님 · 힘을 얻는 사람 ${receiver.name}님 · 살아나는 힘 ${element} · 뜻: ${giver.name}님이 곁에 있으면 ${receiver.name}님에게 모자란 힘이 살아나요`
      }
      return `${head}: 끌어 주는 사이`
    case 'guard':
      if (giver && receiver && element) {
        return `${head}: 챙겨 줘야 하는 사이 · 조심할 사람 ${giver.name}님 · 챙김을 받을 사람 ${receiver.name}님 · 눌리기 쉬운 힘 ${element} · 뜻: ${giver.name}님의 타고난 성향이 ${receiver.name}님의 약한 부분을 누르기 쉬워요. ${giver.name}님이 ${receiver.name}님을 챙기는 쪽이 되면 좋아요`
      }
      return `${head}: 챙겨 줘야 하는 사이`
    case 'distance': {
      if (giver && receiver && element) {
        const overflow = !!receiver.mansikGisin && receiver.mansikGisin === giver.dayMaster
        if (overflow) {
          return `${head}: 거리가 약인 사이 · 먼저 지치기 쉬운 사람 ${receiver.name}님 · 까닭 ${giver.name}님의 타고난 ${element}이 ${receiver.name}님에게는 이미 넘치는 쪽이라서 · 뜻: 나쁜 사이가 아니라, 오래 붙어 있으면 ${receiver.name}님이 먼저 지쳐요. 틈틈이 각자 시간을 주면 좋아요`
        }
        return `${head}: 거리가 약인 사이 · 둘 다 넘치는 힘 ${element} · 뜻: 둘 다 같은 힘이 넘쳐서, 오래 붙어 있으면 한쪽으로 과열되기 쉬워요. 떨어져 있는 시간이 오히려 좋아요`
      }
      return `${head}: 거리가 약인 사이`
    }
    default:
      return `${head}: 각자 서는 사이 · 뜻: 크게 주고받는 것 없이 각자 자기 몫을 하는 사이예요`
  }
}

/**
 * 같이 있을 때 조심할 짝 — 엔진 문장 그대로, 괄호 한자만 뺀다.
 * «같은 기운 과열» 문장은 화면용 라벨(«화(火)»)을 쓴다 — 모델이 한자를 따라 쓰지 않게.
 */
export function cautionLines(ce: CircleEnergy): string[] {
  return ce.cautions.length > 0
    ? ce.cautions.map((c) => `- ${c.text.replace(/\([一-鿿]\)/g, '')}`)
    : ['- 뚜렷하게 부딪히는 짝은 없어요']
}

export function needsLine(label: string, el: Element): string {
  const n = elementNeeds(el)
  const desk = n.desk.replace(/^책상 위에\s*/, '')
  return `- ${label}: 책상에 둘 것: ${desk} · 집 안 자리: ${n.home} · 선물: ${n.gifts.join(', ')} · 어울리는 색: ${n.color} · 방향: ${n.direction} · 그 힘이 도는 시간: ${n.hourBand}`
}

/**
 * 함께 보기 사용자 프롬프트 — 쉬운 말로 바꾼 데이터를 먼저, 지시는 끝에(Gemini 3 권고).
 * 엔진의 판정만 싣는다: 넉넉·모자란 기운, 체력 타입, 같이 있을 때 맞는 방법, 둘씩 본 사이, 조심할 짝, 곁에 둘 물건.
 */
export function togetherPrompt(ce: CircleEnergy): string {
  const names = ce.entries.map((e) => `${e.name}님`).join('·')
  const context = KIND_CONTEXT[ce.kind]
  const lines: (string | null)[] = [
    '<데이터>',
    `함께 보는 사람: ${names} (${ce.entries.length}명)${context ? ` · ${context}` : ''}`,
    '',
    '[사람마다]',
    ...ce.entries.flatMap((e) => personLines(e, ce)),
    '',
    '[둘씩 보면]',
    ...(ce.pairs.length > 0 ? ce.pairs.map((pr) => pairLine(pr, ce)) : ['- 둘씩 볼 짝이 없어요']),
    '',
    '[같이 있을 때 조심할 것 — 이 목록 밖의 갈등은 지어내지 않아요]',
    ...cautionLines(ce),
    '',
    '[다 같이 있을 때]',
    `- 다 같이 모자란 기운: ${elementWord(ce.lowest)} — ${ELEMENT_PLAIN[ce.lowest].lacking}`,
    ce.holders.length > 0
      ? `- 이 힘이 넉넉한 사람: ${ce.holders.map((h) => `${h.name}님`).join(', ')}`
      : `- 이 힘이 넉넉한 사람은 없어요. 다 같이 쓰는 자리에 둘 물건: ${ce.fallbackItem}`,
    ce.roles ? `- 사람들의 성향: ${ce.roles.thick.people}이 많고, ${ce.roles.thin.people}은 적어요` : null,
    '',
    '[곁에 둘 물건과 자리 — 이 목록에 있는 것만 써요]',
    ...ce.entries.map((e) => needsLine(`${e.name}님 (모자란 ${ELEMENT_WORD[e.yongsin].name} 기운)`, e.yongsin)),
    needsLine(`다 같이 쓰는 자리 (다 같이 모자란 ${ELEMENT_WORD[ce.lowest].name} 기운)`, ce.lowest),
    '</데이터>',
    '',
    `위 데이터를 바탕으로 ${names}을 위한 함께 보기 풀이를 여섯 토막으로 써 주세요.`,
    '- 판단(누가 무엇이 넉넉하고 모자란지, 어떤 사이인지, 같이 있을 때 맞는 방법)은 데이터 그대로 두고, 설명과 비유는 새로 써요.',
    '- 첫 토막은 이 사람들을 생활 속 한 장면에 빗대어 시작해요.',
  ]
  return lines.filter((l): l is string => l !== null).join('\n')
}

const RETRY_WHY: Readonly<Record<string, string>> = {
  TOO_SHORT: '너무 짧았어요',
  TOO_LONG: '너무 길었어요',
  BANNED: '쓰지 않는 낱말이 들어갔어요',
  SCORE: '점수나 퍼센트가 들어갔어요',
  HEADINGS: '머리말 여섯 개가 순서대로 서지 않았어요',
  JARGON: '어려운 명리 용어가 들어갔어요',
}

/** 거르기(validateNarrative)에 걸려 다시 쓸 때 사용자 프롬프트 끝에 붙이는 말 — 본문과 같은 해요체로. */
export function togetherRetryNote(reason: string): string {
  const [code, words] = reason.split(':')
  const why = RETRY_WHY[code] ?? '규칙에 맞지 않았어요'
  return `(지난 답은 ${why}${words ? `: ${words}` : ''}. <쓰지 않는 말>과 <형식>을 지켜서 처음부터 다시 써 주세요.)`
}
