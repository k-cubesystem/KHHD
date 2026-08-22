/**
 * 「오늘의 지도」 — 그날의 일진(日辰)에서 오늘의 성격 한 줄을 «결정론»으로 뽑는다.
 *
 * 스레드 마케팅의 점심 한줄형 「오늘의 지도」(TEAM_A_PM/threads-week1-mon-wed.md)와 **같은 문법**이다.
 * 그쪽은 반말(스레드), 이쪽은 신위의 존댓말 — 소재와 판정은 하나의 엔진에서 나온다.
 *
 * 판정 = 천간(하늘·드러난 기운) 오행 × 지지(땅·바탕) 오행의 상생상극. 25조합이 문장의 뼈대이고,
 * 지지 12자의 계절 이미지가 살을 붙여 60갑자가 각각 다른 하루로 읽힌다.
 *
 * 🔴 AI 호출 없음(원가 0·즉시). 선문안이 «로딩 없이 뜨는» 계약을 지켜야 하기 때문이다.
 * 🔴 사주 용어(일간·일진·상관…)를 문장에 쓰지 않는다 — 독자의 말로 쓴다(마케팅 v3 교훈).
 */

/** 만세력(SajuPillar)의 영문 오행 → 한자 오행 */
const EN_TO_HAN: Record<string, string> = {
  Wood: '木',
  Fire: '火',
  Earth: '土',
  Metal: '金',
  Water: '水',
}

export type DayFlow = 'support' | 'output' | 'same' | 'control' | 'pressure'

export interface DayMap {
  /** 오늘의 흐름 — 바탕이 나를 받치는지(support), 내가 내보내는지(output) 등 */
  flow: DayFlow
  /** "흙이 쇠를 기르는 날" — 오늘의 성격 한 줄(자연 은유) */
  headline: string
  /** 오늘 하면 잘 풀리는 것 */
  doLine: string
  /** 오늘 조심할 것 */
  avoidLine: string
}

interface DayMapEntry {
  flow: DayFlow
  headline: string
  doLine: string
  avoidLine: string
}

/**
 * 25조합 — key = `${천간오행}${지지오행}`.
 * 같은 관계(예: 바탕이 나를 생함)라도 오행 조합마다 그림이 다르다 — 흙→쇠는 «다듬기»,
 * 쇠→물은 «물꼬»다. 그래서 관계 5종으로 뭉뚱그리지 않고 25칸을 각각 쓴다.
 */
const DAY_MAP_TABLE: Record<string, DayMapEntry> = {
  // 천간 木
  木木: {
    flow: 'same',
    headline: '나무가 숲을 이루는 날',
    doLine: '함께 도모하는 일이 잘 나아갑니다',
    avoidLine: '내 뜻만 세우면 숲이 빽빽해져 볕이 들지 않습니다',
  },
  木火: {
    flow: 'output',
    headline: '나무가 불을 피우는 날',
    doLine: '말과 글로 드러내는 일이 잘 됩니다',
    avoidLine: '다 쏟고 나면 허해지니 저녁은 비워 두십시오',
  },
  木土: {
    flow: 'control',
    headline: '나무가 흙을 파고드는 날',
    doLine: '자리를 잡고 터를 다지는 일에 힘이 붙습니다',
    avoidLine: '너무 넓게 벌이면 뿌리가 뜹니다',
  },
  木金: {
    flow: 'pressure',
    headline: '쇠가 나무를 다듬는 날',
    doLine: '지적을 받아들이면 그만큼 모양이 잡힙니다',
    avoidLine: '맞서 부딪히면 상처만 남습니다',
  },
  木水: {
    flow: 'support',
    headline: '물이 나무를 기르는 날',
    doLine: '배우고 채우는 일에 물이 잘 오릅니다',
    avoidLine: '물에 잠겨 하루를 흘려보내기 쉽습니다',
  },

  // 천간 火
  火木: {
    flow: 'support',
    headline: '나무가 불을 살리는 날',
    doLine: '벌여둔 일에 기운이 붙어 속도가 납니다',
    avoidLine: '불길이 커지니 말이 앞서기 쉽습니다',
  },
  火火: {
    flow: 'same',
    headline: '불이 겹치는 날',
    doLine: '마음먹은 일을 밀어붙이기 좋습니다',
    avoidLine: '뜨거울 때 뱉은 말은 되돌릴 수 없습니다',
  },
  火土: {
    flow: 'output',
    headline: '불이 흙을 만드는 날',
    doLine: '벌인 일을 갈무리해 형태로 남기기 좋습니다',
    avoidLine: '다 태우고 나면 재만 남으니 힘을 남겨 두십시오',
  },
  火金: {
    flow: 'control',
    headline: '불이 쇠를 녹이는 날',
    doLine: '미뤄둔 담판과 결단에 힘이 실립니다',
    avoidLine: '녹이려다 사람까지 태우지 않도록 하십시오',
  },
  火水: {
    flow: 'pressure',
    headline: '물이 불을 식히는 날',
    doLine: '벌인 일을 점검하고 식히기에 알맞습니다',
    avoidLine: '의욕이 꺾여도 오늘 하루의 일입니다',
  },

  // 천간 土
  土木: {
    flow: 'pressure',
    headline: '나무가 흙을 흔드는 날',
    doLine: '흔들리는 자리를 살펴 뿌리를 다시 잡으십시오',
    avoidLine: '맞받아 버티면 흙이 무너집니다',
  },
  土火: {
    flow: 'support',
    headline: '불이 흙을 데우는 날',
    doLine: '사람을 품고 신뢰를 쌓는 일이 잘 됩니다',
    avoidLine: '따뜻함에 머물다 할 일을 미루기 쉽습니다',
  },
  土土: {
    flow: 'same',
    headline: '흙이 두터워지는 날',
    doLine: '모으고 지키는 일에 알맞습니다',
    avoidLine: '움직이지 않으면 그대로 굳어 버립니다',
  },
  土金: {
    flow: 'output',
    headline: '흙이 쇠를 낳는 날',
    doLine: '가진 것을 내주고 이름을 얻기 좋습니다',
    avoidLine: '내주기만 하면 속이 빕니다',
  },
  土水: {
    flow: 'control',
    headline: '흙이 물을 가두는 날',
    doLine: '새는 것을 막고 셈을 정리하기 좋습니다',
    avoidLine: '너무 조이면 답답함이 사람에게 갑니다',
  },

  // 천간 金
  金木: {
    flow: 'control',
    headline: '쇠가 나무를 베는 날',
    doLine: '끊어낼 것을 끊는 결단이 섭니다',
    avoidLine: '한 번에 다 잘라내면 그루터기만 남습니다',
  },
  金火: {
    flow: 'pressure',
    headline: '쇠가 불을 만나는 날',
    doLine: '달궈지는 만큼 그릇이 됩니다 — 미뤄둔 결단 하나 내리기 좋습니다',
    avoidLine: '성급하면 덴다는 것만 기억하십시오',
  },
  金土: {
    flow: 'support',
    headline: '흙이 쇠를 기르는 날',
    doLine: '새로 벌이기보다 하던 것을 다듬으면 술술 끝납니다',
    avoidLine: '오늘 새 판을 벌이면 다음 날 다시 손봐야 합니다',
  },
  金金: {
    flow: 'same',
    headline: '쇠가 쇠를 만나는 날',
    doLine: '판단이 날카로워 옳고 그름이 잘 보입니다',
    avoidLine: '그 날은 말에도 실려 사람을 벱니다',
  },
  金水: {
    flow: 'output',
    headline: '쇠가 물을 낳는 날',
    doLine: '이야기를 꺼내고 흘려보내기 좋습니다',
    avoidLine: '말이 트인 만큼 새어 나가는 것도 있습니다',
  },

  // 천간 水
  水木: {
    flow: 'output',
    headline: '물이 나무로 흐르는 날',
    doLine: '사람과 일을 키우는 데 쓰면 남습니다',
    avoidLine: '여기저기 대면 정작 내 몫이 마릅니다',
  },
  水火: {
    flow: 'control',
    headline: '물이 불을 다스리는 날',
    doLine: '뜨거워진 일을 가라앉히기 좋습니다',
    avoidLine: '다 꺼뜨리면 다시 불붙이기 어렵습니다',
  },
  水土: {
    flow: 'pressure',
    headline: '흙이 물길을 막는 날',
    doLine: '막힌 김에 안을 정비하십시오',
    avoidLine: '뚫으려 서두르면 흙탕만 입니다',
  },
  水金: {
    flow: 'support',
    headline: '쇠가 물꼬를 트는 날',
    doLine: '연락·이동·말 꺼내기가 수월합니다',
    avoidLine: '물꼬와 함께 지갑도 트이니 오늘 결제는 한 번 더 생각하십시오',
  },
  水水: {
    flow: 'same',
    headline: '물이 깊어지는 날',
    doLine: '생각이 멀리까지 닿습니다',
    avoidLine: '깊이 잠기면 그 안에서 나오기 어렵습니다',
  },
}

/** 지지 12자의 계절·시간 이미지 — 같은 조합도 날마다 다르게 읽히도록 살을 붙인다. */
const BRANCH_COLOR: Record<string, string> = {
  子: '깊은 밤의 물기가 도는 하루입니다',
  丑: '언 흙이 아직 풀리지 않은 하루입니다',
  寅: '이른 봄 숲의 기운이 도는 하루입니다',
  卯: '새순이 오르는 결의 하루입니다',
  辰: '비 머금은 흙의 하루입니다',
  巳: '볕이 길게 드는 하루입니다',
  午: '한낮의 불이 가장 높은 하루입니다',
  未: '마른 흙에 볕이 남은 하루입니다',
  申: '서늘한 쇠붙이 결의 하루입니다',
  酉: '벼린 날처럼 또렷한 하루입니다',
  戌: '해 저무는 흙담의 하루입니다',
  亥: '넓은 물이 잔잔한 하루입니다',
}

/**
 * 오늘의 지도 판정. 만세력 일주(日柱)의 오행 두 개로 뼈대를 잡고 지지로 색을 입힌다.
 *
 * @param ganElement 일간 오행 — 영문('Metal') 또는 한자('金')
 * @param jiElement  일지 오행 — 영문('Earth') 또는 한자('土')
 * @param branchHan  일지 한자('未') — 없으면 색채 문장을 생략한다
 */
export function deriveDayMap(ganElement: string, jiElement: string, branchHan?: string): DayMap | null {
  const gan = EN_TO_HAN[ganElement] ?? ganElement
  const ji = EN_TO_HAN[jiElement] ?? jiElement
  const entry = DAY_MAP_TABLE[`${gan}${ji}`]
  if (!entry) return null
  const color = branchHan ? BRANCH_COLOR[branchHan] : undefined
  return {
    flow: entry.flow,
    headline: entry.headline,
    doLine: entry.doLine,
    avoidLine: color ? `${color} ${entry.avoidLine}` : entry.avoidLine,
  }
}

/**
 * 선문안에 얹을 한 문장 — "오늘은 ~하는 날이에요. ~" (신위 화법).
 * 인사말 안에 녹여 넣을 것이므로 두 문장을 넘기지 않는다.
 */
export function dayMapGreetingLine(map: DayMap): string {
  return `오늘은 ${map.headline}이에요.\n${map.doLine}.`
}
