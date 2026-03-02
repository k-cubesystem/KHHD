/**
 * 명리학 지식 그래프 데이터
 * 오행, 천간, 지지, 십성, 신살 간의 관계를 노드/엣지로 표현
 */

export type NodeType = '오행' | '천간' | '지지' | '십성' | '신살'
export type EdgeType =
  | '상생'
  | '상극'
  | '천간합'
  | '천간충'
  | '지지육합'
  | '지지삼합'
  | '지지충'
  | '지지형'
  | '지지파'
  | '지지해'
  | '속함'

export interface KnowledgeNode {
  id: string
  label: string
  korean?: string
  type: NodeType
  element?: string // 소속 오행
  description: string
  detail?: string
}

export interface KnowledgeEdge {
  id: string
  source: string
  target: string
  type: EdgeType
  label: string
  weight: number // 관계 강도 1~3
  bidirectional?: boolean
}

// ─── 노드 ────────────────────────────────────────────────────────────────────

export const NODES: KnowledgeNode[] = [
  // 오행 (5)
  {
    id: '木',
    label: '木',
    korean: '목',
    type: '오행',
    description: '나무·봄·동쪽·생장의 기운',
    detail: '인(仁)의 덕목, 창의성과 성장을 상징',
  },
  {
    id: '火',
    label: '火',
    korean: '화',
    type: '오행',
    description: '불·여름·남쪽·확산의 기운',
    detail: '예(禮)의 덕목, 열정과 표현을 상징',
  },
  {
    id: '土',
    label: '土',
    korean: '토',
    type: '오행',
    description: '흙·사계·중앙·조화의 기운',
    detail: '신(信)의 덕목, 균형과 안정을 상징',
  },
  {
    id: '金',
    label: '金',
    korean: '금',
    type: '오행',
    description: '쇠·가을·서쪽·수렴의 기운',
    detail: '의(義)의 덕목, 결단력과 의리를 상징',
  },
  {
    id: '水',
    label: '水',
    korean: '수',
    type: '오행',
    description: '물·겨울·북쪽·저장의 기운',
    detail: '지(智)의 덕목, 지혜와 유연성을 상징',
  },

  // 천간 (10)
  { id: '甲', label: '甲', korean: '갑', type: '천간', element: '木', description: '양목(陽木) - 큰 나무, 리더십' },
  { id: '乙', label: '乙', korean: '을', type: '천간', element: '木', description: '음목(陰木) - 덩굴, 유연성' },
  { id: '丙', label: '丙', korean: '병', type: '천간', element: '火', description: '양화(陽火) - 태양, 카리스마' },
  { id: '丁', label: '丁', korean: '정', type: '천간', element: '火', description: '음화(陰火) - 촛불, 섬세함' },
  { id: '戊', label: '戊', korean: '무', type: '천간', element: '土', description: '양토(陽土) - 큰 산, 포용력' },
  { id: '己', label: '己', korean: '기', type: '천간', element: '土', description: '음토(陰土) - 들판, 실용성' },
  { id: '庚', label: '庚', korean: '경', type: '천간', element: '金', description: '양금(陽金) - 바위·칼, 결단력' },
  { id: '辛', label: '辛', korean: '신', type: '천간', element: '金', description: '음금(陰金) - 보석, 심미안' },
  { id: '壬', label: '壬', korean: '임', type: '천간', element: '水', description: '양수(陽水) - 큰 강, 지략' },
  { id: '癸', label: '癸', korean: '계', type: '천간', element: '水', description: '음수(陰水) - 빗물·안개, 직관' },

  // 지지 (12)
  { id: '子', label: '子', korean: '자', type: '지지', element: '水', description: '쥐·수(水)·11월·밤 11시~새벽 1시' },
  { id: '丑', label: '丑', korean: '축', type: '지지', element: '土', description: '소·토(土)·12월·새벽 1~3시' },
  { id: '寅', label: '寅', korean: '인', type: '지지', element: '木', description: '호랑이·목(木)·1월·새벽 3~5시' },
  { id: '卯', label: '卯', korean: '묘', type: '지지', element: '木', description: '토끼·목(木)·2월·새벽 5~7시' },
  { id: '辰', label: '辰', korean: '진', type: '지지', element: '土', description: '용·토(土)·3월·오전 7~9시' },
  { id: '巳', label: '巳', korean: '사', type: '지지', element: '火', description: '뱀·화(火)·4월·오전 9~11시' },
  { id: '午', label: '午', korean: '오', type: '지지', element: '火', description: '말·화(火)·5월·오전 11시~오후 1시' },
  { id: '未', label: '未', korean: '미', type: '지지', element: '土', description: '양·토(土)·6월·오후 1~3시' },
  { id: '申', label: '申', korean: '신', type: '지지', element: '金', description: '원숭이·금(金)·7월·오후 3~5시' },
  { id: '酉', label: '酉', korean: '유', type: '지지', element: '金', description: '닭·금(金)·8월·오후 5~7시' },
  { id: '戌', label: '戌', korean: '술', type: '지지', element: '土', description: '개·토(土)·9월·오후 7~9시' },
  { id: '亥', label: '亥', korean: '해', type: '지지', element: '水', description: '돼지·수(水)·10월·오후 9~11시' },

  // 십성 (10)
  {
    id: '비견',
    label: '비견',
    korean: '비견',
    type: '십성',
    element: '木',
    description: '比肩 - 일간과 같은 오행 양음, 경쟁·독립심',
  },
  {
    id: '겁재',
    label: '겁재',
    korean: '겁재',
    type: '십성',
    element: '木',
    description: '劫財 - 일간과 같은 오행 음양, 투쟁·야심',
  },
  {
    id: '식신',
    label: '식신',
    korean: '식신',
    type: '십성',
    element: '火',
    description: '食神 - 일간이 생하는 같은 음양, 식복·창의',
  },
  {
    id: '상관',
    label: '상관',
    korean: '상관',
    type: '십성',
    element: '火',
    description: '傷官 - 일간이 생하는 다른 음양, 재능·반항',
  },
  {
    id: '편재',
    label: '편재',
    korean: '편재',
    type: '십성',
    element: '土',
    description: '偏財 - 일간이 극하는 같은 음양, 편법·사업',
  },
  {
    id: '정재',
    label: '정재',
    korean: '정재',
    type: '십성',
    element: '土',
    description: '正財 - 일간이 극하는 다른 음양, 정직한 재물',
  },
  {
    id: '편관',
    label: '편관',
    korean: '편관',
    type: '십성',
    element: '金',
    description: '偏官(칠살) - 일간을 극하는 같은 음양, 권력·도전',
  },
  {
    id: '정관',
    label: '정관',
    korean: '정관',
    type: '십성',
    element: '金',
    description: '正官 - 일간을 극하는 다른 음양, 명예·책임',
  },
  {
    id: '편인',
    label: '편인',
    korean: '편인',
    type: '십성',
    element: '水',
    description: '偏印(효신) - 일간을 생하는 같은 음양, 독창·고독',
  },
  {
    id: '정인',
    label: '정인',
    korean: '정인',
    type: '십성',
    element: '水',
    description: '正印 - 일간을 생하는 다른 음양, 학문·인자함',
  },

  // 주요 신살 (6)
  { id: '역마살', label: '역마살', korean: '역마살', type: '신살', description: '驛馬殺 - 이동·변화·해외 인연' },
  {
    id: '천을귀인',
    label: '천을귀인',
    korean: '천을귀인',
    type: '신살',
    description: '天乙貴人 - 귀인의 도움, 최길신',
  },
  { id: '도화살', label: '도화살', korean: '도화살', type: '신살', description: '桃花殺 - 이성 인연, 매력' },
  { id: '양인살', label: '양인살', korean: '양인살', type: '신살', description: '羊刃殺 - 강렬한 에너지, 예리함' },
  { id: '화개살', label: '화개살', korean: '화개살', type: '신살', description: '華蓋殺 - 예술·종교·고독' },
  { id: '백호살', label: '백호살', korean: '백호살', type: '신살', description: '白虎殺 - 혈광지재, 강한 기운' },
]

// ─── 엣지 ────────────────────────────────────────────────────────────────────

export const EDGES: KnowledgeEdge[] = [
  // 오행 상생 (相生) - 木→火→土→金→水→木
  { id: 'e_sg_木火', source: '木', target: '火', type: '상생', label: '목생화', weight: 3, bidirectional: false },
  { id: 'e_sg_火土', source: '火', target: '土', type: '상생', label: '화생토', weight: 3, bidirectional: false },
  { id: 'e_sg_土金', source: '土', target: '金', type: '상생', label: '토생금', weight: 3, bidirectional: false },
  { id: 'e_sg_金水', source: '金', target: '水', type: '상생', label: '금생수', weight: 3, bidirectional: false },
  { id: 'e_sg_水木', source: '水', target: '木', type: '상생', label: '수생목', weight: 3, bidirectional: false },

  // 오행 상극 (相剋) - 木→土→水→火→金→木
  { id: 'e_sk_木土', source: '木', target: '土', type: '상극', label: '목극토', weight: 3, bidirectional: false },
  { id: 'e_sk_土水', source: '土', target: '水', type: '상극', label: '토극수', weight: 3, bidirectional: false },
  { id: 'e_sk_水火', source: '水', target: '火', type: '상극', label: '수극화', weight: 3, bidirectional: false },
  { id: 'e_sk_火金', source: '火', target: '金', type: '상극', label: '화극금', weight: 3, bidirectional: false },
  { id: 'e_sk_金木', source: '金', target: '木', type: '상극', label: '금극목', weight: 3, bidirectional: false },

  // 천간 속함 (오행 소속)
  { id: 'e_belong_甲', source: '甲', target: '木', type: '속함', label: '양목', weight: 1 },
  { id: 'e_belong_乙', source: '乙', target: '木', type: '속함', label: '음목', weight: 1 },
  { id: 'e_belong_丙', source: '丙', target: '火', type: '속함', label: '양화', weight: 1 },
  { id: 'e_belong_丁', source: '丁', target: '火', type: '속함', label: '음화', weight: 1 },
  { id: 'e_belong_戊', source: '戊', target: '土', type: '속함', label: '양토', weight: 1 },
  { id: 'e_belong_己', source: '己', target: '土', type: '속함', label: '음토', weight: 1 },
  { id: 'e_belong_庚', source: '庚', target: '金', type: '속함', label: '양금', weight: 1 },
  { id: 'e_belong_辛', source: '辛', target: '金', type: '속함', label: '음금', weight: 1 },
  { id: 'e_belong_壬', source: '壬', target: '水', type: '속함', label: '양수', weight: 1 },
  { id: 'e_belong_癸', source: '癸', target: '水', type: '속함', label: '음수', weight: 1 },

  // 천간합 (天干合) - 5합
  { id: 'e_gh_甲己', source: '甲', target: '己', type: '천간합', label: '갑기합(土)', weight: 2, bidirectional: true },
  { id: 'e_gh_乙庚', source: '乙', target: '庚', type: '천간합', label: '을경합(金)', weight: 2, bidirectional: true },
  { id: 'e_gh_丙辛', source: '丙', target: '辛', type: '천간합', label: '병신합(水)', weight: 2, bidirectional: true },
  { id: 'e_gh_丁壬', source: '丁', target: '壬', type: '천간합', label: '정임합(木)', weight: 2, bidirectional: true },
  { id: 'e_gh_戊癸', source: '戊', target: '癸', type: '천간합', label: '무계합(火)', weight: 2, bidirectional: true },

  // 천간충 (天干沖) - 5충
  { id: 'e_gc_甲庚', source: '甲', target: '庚', type: '천간충', label: '갑경충', weight: 2, bidirectional: true },
  { id: 'e_gc_乙辛', source: '乙', target: '辛', type: '천간충', label: '을신충', weight: 2, bidirectional: true },
  { id: 'e_gc_丙壬', source: '丙', target: '壬', type: '천간충', label: '병임충', weight: 2, bidirectional: true },
  { id: 'e_gc_丁癸', source: '丁', target: '癸', type: '천간충', label: '정계충', weight: 2, bidirectional: true },
  { id: 'e_gc_戊己', source: '戊', target: '己', type: '천간충', label: '무기충', weight: 2, bidirectional: true },

  // 지지육합 (地支六合) - 6합
  {
    id: 'e_zh_子丑',
    source: '子',
    target: '丑',
    type: '지지육합',
    label: '자축합(土)',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zh_寅亥',
    source: '寅',
    target: '亥',
    type: '지지육합',
    label: '인해합(木)',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zh_卯戌',
    source: '卯',
    target: '戌',
    type: '지지육합',
    label: '묘술합(火)',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zh_辰酉',
    source: '辰',
    target: '酉',
    type: '지지육합',
    label: '진유합(金)',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zh_巳申',
    source: '巳',
    target: '申',
    type: '지지육합',
    label: '사신합(水)',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zh_午未',
    source: '午',
    target: '未',
    type: '지지육합',
    label: '오미합(土)',
    weight: 2,
    bidirectional: true,
  },

  // 지지삼합 (地支三合) - 4국
  {
    id: 'e_zs_寅午戌1',
    source: '寅',
    target: '午',
    type: '지지삼합',
    label: '인오술화국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_寅午戌2',
    source: '午',
    target: '戌',
    type: '지지삼합',
    label: '인오술화국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_申子辰1',
    source: '申',
    target: '子',
    type: '지지삼합',
    label: '신자진수국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_申子辰2',
    source: '子',
    target: '辰',
    type: '지지삼합',
    label: '신자진수국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_亥卯未1',
    source: '亥',
    target: '卯',
    type: '지지삼합',
    label: '해묘미목국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_亥卯未2',
    source: '卯',
    target: '未',
    type: '지지삼합',
    label: '해묘미목국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_巳酉丑1',
    source: '巳',
    target: '酉',
    type: '지지삼합',
    label: '사유축금국',
    weight: 2,
    bidirectional: true,
  },
  {
    id: 'e_zs_巳酉丑2',
    source: '酉',
    target: '丑',
    type: '지지삼합',
    label: '사유축금국',
    weight: 2,
    bidirectional: true,
  },

  // 지지충 (地支沖) - 6충
  { id: 'e_zc_子午', source: '子', target: '午', type: '지지충', label: '자오충', weight: 2, bidirectional: true },
  { id: 'e_zc_丑未', source: '丑', target: '未', type: '지지충', label: '축미충', weight: 2, bidirectional: true },
  { id: 'e_zc_寅申', source: '寅', target: '申', type: '지지충', label: '인신충', weight: 2, bidirectional: true },
  { id: 'e_zc_卯酉', source: '卯', target: '酉', type: '지지충', label: '묘유충', weight: 2, bidirectional: true },
  { id: 'e_zc_辰戌', source: '辰', target: '戌', type: '지지충', label: '진술충', weight: 2, bidirectional: true },
  { id: 'e_zc_巳亥', source: '巳', target: '亥', type: '지지충', label: '사해충', weight: 2, bidirectional: true },

  // 지지형 (地支刑) - 3형 + 자형
  { id: 'e_zf_寅巳', source: '寅', target: '巳', type: '지지형', label: '인사형', weight: 2, bidirectional: true },
  { id: 'e_zf_巳申', source: '巳', target: '申', type: '지지형', label: '사신형', weight: 2, bidirectional: true },
  { id: 'e_zf_丑戌', source: '丑', target: '戌', type: '지지형', label: '축술형', weight: 2, bidirectional: true },
  { id: 'e_zf_戌未', source: '戌', target: '未', type: '지지형', label: '술미형', weight: 2, bidirectional: true },
  {
    id: 'e_zf_子卯',
    source: '子',
    target: '卯',
    type: '지지형',
    label: '자묘형(무례지형)',
    weight: 2,
    bidirectional: true,
  },

  // 지지파 (地支破)
  { id: 'e_zp_子酉', source: '子', target: '酉', type: '지지파', label: '자유파', weight: 1, bidirectional: true },
  { id: 'e_zp_丑辰', source: '丑', target: '辰', type: '지지파', label: '축진파', weight: 1, bidirectional: true },
  { id: 'e_zp_寅亥2', source: '寅', target: '亥', type: '지지파', label: '인해파', weight: 1, bidirectional: true },
  { id: 'e_zp_卯午', source: '卯', target: '午', type: '지지파', label: '묘오파', weight: 1, bidirectional: true },
  { id: 'e_zp_巳申2', source: '巳', target: '申', type: '지지파', label: '사신파', weight: 1, bidirectional: true },
  { id: 'e_zp_未戌', source: '未', target: '戌', type: '지지파', label: '미술파', weight: 1, bidirectional: true },

  // 지지해 (地支害)
  { id: 'e_ze_子未', source: '子', target: '未', type: '지지해', label: '자미해', weight: 1, bidirectional: true },
  { id: 'e_ze_丑午', source: '丑', target: '午', type: '지지해', label: '축오해', weight: 1, bidirectional: true },
  { id: 'e_ze_寅巳2', source: '寅', target: '巳', type: '지지해', label: '인사해', weight: 1, bidirectional: true },
  { id: 'e_ze_卯辰', source: '卯', target: '辰', type: '지지해', label: '묘진해', weight: 1, bidirectional: true },
  { id: 'e_ze_申亥', source: '申', target: '亥', type: '지지해', label: '신해해', weight: 1, bidirectional: true },
  { id: 'e_ze_酉戌', source: '酉', target: '戌', type: '지지해', label: '유술해', weight: 1, bidirectional: true },
]

// ─── 헬퍼 ────────────────────────────────────────────────────────────────────

export const NODE_MAP = new Map<string, KnowledgeNode>(NODES.map((n) => [n.id, n]))

export function getNeighborIds(nodeId: string, activeEdgeTypes: Set<EdgeType>): Set<string> {
  const neighbors = new Set<string>()
  for (const edge of EDGES) {
    if (!activeEdgeTypes.has(edge.type)) continue
    if (edge.source === nodeId) neighbors.add(edge.target)
    if (edge.target === nodeId) neighbors.add(edge.source)
  }
  return neighbors
}

export function getNodeEdges(nodeId: string, activeEdgeTypes: Set<EdgeType>): KnowledgeEdge[] {
  return EDGES.filter((e) => activeEdgeTypes.has(e.type) && (e.source === nodeId || e.target === nodeId))
}

// 오행별 색상
export const ELEMENT_COLORS: Record<string, { fill: string; stroke: string; text: string }> = {
  木: { fill: '#2d5a3d', stroke: '#4A7C59', text: '#a8d5b5' },
  火: { fill: '#6b2d1a', stroke: '#C07055', text: '#f0b09a' },
  土: { fill: '#5a4a1a', stroke: '#C5B358', text: '#e8d890' },
  金: { fill: '#3a3938', stroke: '#989390', text: '#d4d0cc' },
  水: { fill: '#1a2b45', stroke: '#4A5D7C', text: '#8aadcc' },
}

// 엣지 타입별 색상/스타일
export const EDGE_STYLES: Record<EdgeType, { color: string; dash?: string; label: string; emoji?: string }> = {
  상생: { color: '#4ade80', label: '상생(相生)', emoji: '↗' },
  상극: { color: '#f87171', dash: '6,3', label: '상극(相剋)', emoji: '✕' },
  천간합: { color: '#fbbf24', label: '천간합(天干合)', emoji: '♡' },
  천간충: { color: '#fb923c', dash: '4,2', label: '천간충(天干沖)', emoji: '↔' },
  지지육합: { color: '#c084fc', label: '지지육합(六合)', emoji: '○' },
  지지삼합: { color: '#818cf8', label: '지지삼합(三合)', emoji: '△' },
  지지충: { color: '#f43f5e', dash: '5,3', label: '지지충(六沖)', emoji: '↕' },
  지지형: { color: '#f97316', dash: '3,2', label: '지지형(三刑)', emoji: '⚡' },
  지지파: { color: '#94a3b8', dash: '2,2', label: '지지파(六破)', emoji: '∥' },
  지지해: { color: '#64748b', dash: '2,4', label: '지지해(六害)', emoji: '∽' },
  속함: { color: '#6b7280', dash: '1,3', label: '오행 소속', emoji: '·' },
}

export const ALL_EDGE_TYPES: EdgeType[] = [
  '상생',
  '상극',
  '천간합',
  '천간충',
  '지지육합',
  '지지삼합',
  '지지충',
  '지지형',
  '지지파',
  '지지해',
]
