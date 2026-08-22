/**
 * 하단 가이드 — 사주·풍수 지식 팁 풀 (오늘의 상식).
 *
 * 이미 있는 지식 자산을 평문으로 재구성한다:
 *  - 오행 5종: saju-knowledge-graph 노드에서 파생(재사용)
 *  - 십성·신살·십이운성·용신·합충형: saju-terms TERMINOLOGY 를 쉬운 한 줄로
 *  - 궁합 8대: compatibility-result CATEGORY_DEFINITIONS 를 평문으로
 *  - 풍수 기초: 통념 수준 평문(술수적 단정은 피함)
 *
 * 순수 데이터 모듈(side-effect 0). GuideBell 이 날짜 기반 결정적 인덱스로 하루 1개를 노출한다.
 */

import { NODES } from '@/lib/data/saju-knowledge-graph'

export interface KnowledgeTip {
  /** 용어명 (한글 + 한자) */
  term: string
  /** 쉬운 한 줄 설명 */
  plain: string
  /** 분류 — 접힌 바 하단 라벨 */
  category: string
}

/** 오행 5종 — saju-knowledge-graph 오행 노드 재사용(설명·덕목을 평문으로 합침) */
const ELEMENT_TIPS: KnowledgeTip[] = NODES.filter((n) => n.type === '오행').map((n) => ({
  term: `${n.korean ?? n.label} (${n.label})`,
  plain: n.detail ? `${n.description} — ${n.detail}` : n.description,
  category: '오행',
}))

/** 나머지 지식 팁 — 전문 용어를 쉬운 한 줄로 옮긴 평문 */
const CURATED_TIPS: KnowledgeTip[] = [
  // 오행 개념·관계
  { term: '오행 (五行)', plain: '세상 기운을 나무·불·흙·쇠·물 다섯으로 나눈 거예요.', category: '오행' },
  { term: '상생 (相生)', plain: '서로 살려주는 사이예요. 물이 나무를, 나무가 불을 키우죠.', category: '오행' },
  { term: '상극 (相剋)', plain: '서로 누르는 사이예요. 물이 불을, 불이 쇠를 이기죠.', category: '오행' },

  // 십성
  { term: '비견 (比肩)', plain: '나와 같은 기운. 형제·동료·경쟁자를 뜻해요.', category: '십성' },
  { term: '식신 (食神)', plain: '내가 낳는 기운. 재능과 먹복을 뜻해요.', category: '십성' },
  { term: '상관 (傷官)', plain: '톡톡 튀는 재능과 표현력의 기운이에요.', category: '십성' },
  { term: '정재 (正財)', plain: '성실하게 차곡차곡 모으는 재물의 기운이에요.', category: '십성' },
  { term: '편재 (偏財)', plain: '크게 벌고 크게 쓰는 사업·유동 재물이에요.', category: '십성' },
  { term: '정관 (正官)', plain: '명예·직장·질서를 뜻하는 반듯한 기운이에요.', category: '십성' },
  { term: '정인 (正印)', plain: '어머니·학문·문서처럼 나를 돕는 기운이에요.', category: '십성' },

  // 신살
  { term: '삼재 (三災)', plain: '12년에 한 번, 3년간 몸가짐을 조심하는 시기예요.', category: '신살' },
  { term: '역마살 (驛馬殺)', plain: '이동·여행·해외와 인연이 많은 별이에요.', category: '신살' },
  { term: '도화살 (桃花殺)', plain: '매력과 인기가 넘치는 별이에요.', category: '신살' },
  { term: '화개살 (華蓋殺)', plain: '예술·종교·사색에 재능이 깊은 별이에요.', category: '신살' },
  { term: '천을귀인 (天乙貴人)', plain: '위기에 귀인이 나타나 돕는 최고 길성이에요.', category: '신살' },
  { term: '문창귀인 (文昌貴人)', plain: '공부와 시험에 강한 학문의 별이에요.', category: '신살' },

  // 운의 흐름 (대운·세운·십이운성)
  { term: '대운 (大運)', plain: '10년마다 바뀌는 인생의 큰 계절이에요.', category: '운의 흐름' },
  { term: '세운 (歲運)', plain: '해마다 바뀌는 그 해의 운이에요.', category: '운의 흐름' },
  { term: '장생 (長生)', plain: '갓 튼 새싹처럼 시작·성장이 좋은 때예요.', category: '운의 흐름' },
  { term: '제왕 (帝旺)', plain: '기운이 가장 왕성한 인생의 정점이에요.', category: '운의 흐름' },
  { term: '묘 (墓)', plain: '씨앗을 갈무리하듯 조용히 준비하는 때예요.', category: '운의 흐름' },

  // 용신·관계
  { term: '용신 (用神)', plain: '내게 가장 필요한 기운, 개운의 열쇠예요.', category: '용신' },
  { term: '희신 (喜神)', plain: '용신을 돕는 두 번째로 좋은 기운이에요.', category: '용신' },
  { term: '합 (合)', plain: '두 기운이 만나 어우러지는 관계예요.', category: '관계' },
  { term: '충 (沖)', plain: '두 기운이 정면으로 부딪는 변화의 관계예요.', category: '관계' },
  { term: '공망 (空亡)', plain: '비어 있어 힘이 잘 실리지 않는 자리예요.', category: '관계' },

  // 궁합 (CATEGORY_DEFINITIONS 평문화)
  { term: '일간 궁합', plain: '처음 만나 대화가 통하는 정도를 봐요.', category: '궁합' },
  { term: '오행 균형', plain: '내게 부족한 기운을 상대가 채워주는지 봐요.', category: '궁합' },
  { term: '원진·귀문', plain: '이유 없이 밉고 예민해지는 기운이 있는지 봐요.', category: '궁합' },
  { term: '대운 싱크', plain: '지금 두 사람의 인생 흐름이 맞물리는지 봐요.', category: '궁합' },

  // 풍수 기초 (통념 수준 평문)
  { term: '배산임수 (背山臨水)', plain: '뒤는 산, 앞은 물. 예부터 좋게 본 집터예요.', category: '풍수' },
  { term: '현관 (玄關)', plain: '기운이 드나드는 문. 밝고 깔끔하면 좋다고 봐요.', category: '풍수' },
  { term: '침실 배치', plain: '침대 머리를 문과 일직선에 두지 않는 게 통념이에요.', category: '풍수' },
  { term: '채광 (採光)', plain: '볕이 잘 드는 집이 기운도 밝다고 여겨요.', category: '풍수' },
  { term: '정리정돈', plain: '묵은 물건을 치우면 기운도 흐른다고 봐요.', category: '풍수' },
  { term: '거울', plain: '현관 정면 거울은 들어온 기운을 되돌린다고 봐요.', category: '풍수' },
  { term: '푸른 식물', plain: '잎이 무성한 화분은 집에 생기를 더한다고 봐요.', category: '풍수' },
  { term: '책상 방향', plain: '문이 보이게 앉으면 마음이 안정된다고 해요.', category: '풍수' },
  { term: '환기 (換氣)', plain: '자주 창을 열어 공기를 바꾸면 좋다고 봐요.', category: '풍수' },
  { term: '문 (門)', plain: '기운이 오가는 길목이라 여닫힘이 매끄러워야 좋아요.', category: '풍수' },
]

/** 오늘의 상식 팁 풀 — 오행(파생) + 큐레이션 */
export const KNOWLEDGE_TIPS: readonly KnowledgeTip[] = [...ELEMENT_TIPS, ...CURATED_TIPS]

/** 날짜 기반 결정적 인덱스 — 같은 날엔 항상 같은 "오늘의 상식". */
export function todayTipIndex(now: number = Date.now()): number {
  const len = KNOWLEDGE_TIPS.length
  if (len === 0) return 0
  const epochDay = Math.floor(now / 86_400_000)
  return ((epochDay % len) + len) % len
}

/**
 * 페이지 성격에 맞는 분류 — 하단 가이드 바가 "지금 보고 있는 화면"과 상관있는 상식을 띄운다.
 * 여기 없는 경로는 전체 풀에서 고른다.
 */
const PATH_CATEGORIES: Record<string, readonly string[]> = {
  '/protected/analysis': ['십성', '오행', '용신'],
  '/protected/family': ['궁합', '관계'],
  '/protected/history': ['운의 흐름', '신살'],
  '/protected/store': ['풍수', '오행'],
  '/protected/profile': ['오행', '운의 흐름'],
}

/** 문자열 → 안정적 정수. 경로가 달라지면 인덱스도 달라진다(같은 날에도 페이지마다 다른 상식). */
function hashString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1_000_003
  return h
}

/**
 * 경로·날짜로 결정되는 상식 하나. 같은 날 같은 페이지면 항상 같고,
 * 페이지를 옮기면 바뀌며, 날이 바뀌어도 바뀐다.
 *
 * 경로에 어울리는 분류가 있으면 그 안에서 고르고, 없으면 전체에서 고른다.
 * 순수 함수 — now 를 주입받아 테스트 가능하게 했다.
 */
export function tipForPath(path: string, now: number = Date.now()): KnowledgeTip | null {
  if (KNOWLEDGE_TIPS.length === 0) return null
  const wanted = PATH_CATEGORIES[path]
  const pool = wanted?.length ? KNOWLEDGE_TIPS.filter((t) => wanted.includes(t.category)) : KNOWLEDGE_TIPS
  const effective = pool.length > 0 ? pool : KNOWLEDGE_TIPS
  const epochDay = Math.floor(now / 86_400_000)
  const idx = (((hashString(path) + epochDay) % effective.length) + effective.length) % effective.length
  return effective[idx]
}

/** 같은 풀 안에서 다음 상식으로 — 접힘 바를 눌러 펼친 뒤 '다른 상식 보기'가 쓰는 회전. */
export function nextTipInPath(path: string, current: KnowledgeTip, now: number = Date.now()): KnowledgeTip | null {
  if (KNOWLEDGE_TIPS.length === 0) return null
  const wanted = PATH_CATEGORIES[path]
  const pool = wanted?.length ? KNOWLEDGE_TIPS.filter((t) => wanted.includes(t.category)) : KNOWLEDGE_TIPS
  const effective = pool.length > 0 ? pool : KNOWLEDGE_TIPS
  const at = effective.findIndex((t) => t.term === current.term)
  if (at < 0) return tipForPath(path, now)
  return effective[(at + 1) % effective.length]
}
