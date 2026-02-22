'use client'

import { useState } from 'react'
import { getSajuData, WU_XING_COLORS, SajuData } from '@/lib/domain/saju/saju'
import {
  analyzeGekguk,
  calculateSinsal,
  analyzeYongsin,
  analyzeYukchin,
  calculateDaeun,
  getGaeunbubRecommendation,
} from '@/lib/domain/saju/saju-analysis'
import {
  analyzeSipseong,
  GAN_MULSANG,
  analyzeSibjiunseong,
  analyzeRelations,
  calculateExtendedSinsal,
  type SipseongMap,
  type SibjiunseongResult,
  type RelationResult,
  type SinsalResult,
} from '@/lib/saju-engine'
import { analyzeManseAdvanced } from '@/lib/domain/saju/manse-advanced'
import { AdvancedManseDisplay } from '@/components/saju/advanced-manse-display'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollText, User, Info, Sparkles, BookOpen, Crown, Palette, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// 전문 용어 사전 (45개 이상)
const TERMINOLOGY: Record<string, { title: string; desc: string }> = {
  // 십신 (10개)
  비견: {
    title: '비견 (比肩)',
    desc: '나와 같은 오행으로, 형제자매, 동료, 경쟁자를 의미합니다. 독립심과 경쟁의식을 나타냅니다.',
  },
  겁재: {
    title: '겁재 (劫財)',
    desc: '나와 같은 오행이나 음양이 다릅니다. 재물 경쟁, 형제간 갈등의 의미가 있습니다.',
  },
  식신: {
    title: '식신 (食神)',
    desc: '내가 생하는 오행으로 음양이 같습니다. 재능, 표현력, 자녀(여명)를 의미합니다.',
  },
  상관: {
    title: '상관 (傷官)',
    desc: '내가 생하는 오행으로 음양이 다릅니다. 창의력, 반항심, 관을 손상시키는 기운입니다.',
  },
  편재: {
    title: '편재 (偏財)',
    desc: '내가 극하는 오행으로 음양이 같습니다. 투기성 재물, 아버지(남명)를 의미합니다.',
  },
  정재: {
    title: '정재 (正財)',
    desc: '내가 극하는 오행으로 음양이 다릅니다. 정당한 재물, 아내(남명)를 의미합니다.',
  },
  편관: {
    title: '편관 (偏官)',
    desc: '나를 극하는 오행으로 음양이 같습니다. 칠살이라고도 하며, 권위와 스트레스를 의미합니다.',
  },
  정관: {
    title: '정관 (正官)',
    desc: '나를 극하는 오행으로 음양이 다릅니다. 명예, 직장, 남편(여명)을 의미합니다.',
  },
  편인: {
    title: '편인 (偏印)',
    desc: '나를 생하는 오행으로 음양이 같습니다. 학문, 예술, 고독을 의미합니다.',
  },
  정인: {
    title: '정인 (正印)',
    desc: '나를 생하는 오행으로 음양이 다릅니다. 어머니, 학문, 자격증을 의미합니다.',
  },

  // 용신론 (3개)
  용신: {
    title: '용신 (用神)',
    desc: '사주에서 부족하거나 필요한 오행을 보충해주는 가장 중요한 기운입니다. 개운의 핵심입니다.',
  },
  희신: { title: '희신 (喜神)', desc: '용신을 돕는 기운으로, 용신 다음으로 좋은 작용을 합니다.' },
  기신: { title: '기신 (忌神)', desc: '사주에 해로운 작용을 하는 기운으로, 피해야 할 오행입니다.' },

  // 신살 (15개)
  역마살: {
    title: '역마살 (驛馬殺)',
    desc: '이동과 변화를 상징하는 별입니다. 평생 이동이 많고 변화가 많으며, 여행, 이사, 직업 변경이 잦습니다. 해외와 인연이 깊을 수 있습니다.',
  },
  천을귀인: {
    title: '천을귀인 (天乙貴人)',
    desc: '하늘이 내린 귀인입니다. 위기 상황에서 반드시 도와주는 귀인이 나타나며, 평생 고귀한 사람들의 도움을 받습니다.',
  },
  화개살: {
    title: '화개살 (華蓋殺)',
    desc: '예술과 종교의 별입니다. 예술, 종교, 철학에 재능이 있으며, 고독을 즐기고 깊은 사색을 좋아합니다.',
  },
  도화살: {
    title: '도화살 (桃花殺)',
    desc: '복숭아꽃 같은 인기운입니다. 매력이 넘치고 이성에게 인기가 많으며, 예술적 감각이 뛰어납니다.',
  },
  월덕귀인: {
    title: '월덕귀인 (月德貴人)',
    desc: '달의 덕을 받는 귀인입니다. 여성과의 인연이 좋고, 모성애가 강하며, 부드러운 도움을 많이 받습니다.',
  },
  천덕귀인: {
    title: '천덕귀인 (天德貴人)',
    desc: '하늘의 덕을 받는 귀인입니다. 하늘의 보호를 받아 큰 재난을 피할 수 있으며, 복이 많습니다.',
  },
  문창귀인: {
    title: '문창귀인 (文昌貴人)',
    desc: '학문과 문장의 별입니다. 학업 운이 좋고, 글 쓰는 재능이 뛰어나며, 시험에 강합니다.',
  },
  학당귀인: {
    title: '학당귀인 (學堂貴人)',
    desc: '배움의 전당입니다. 평생 배우는 것을 좋아하고, 지식 습득이 빠릅니다.',
  },
  삼재: {
    title: '삼재 (三災)',
    desc: '3년간의 시련입니다. 12년마다 3년간 겪는 시련의 시기로, 들삼재, 눌삼재, 날삼재로 나뉩니다.',
  },
  양인살: {
    title: '양인살 (羊刃殺)',
    desc: '날카로운 칼날입니다. 성격이 강하고 결단력이 있으며, 무(武)의 기운이 강합니다.',
  },
  육해: {
    title: '육해 (六害)',
    desc: '6가지 해로움입니다. 지지 간의 해로운 관계로, 갈등과 방해를 의미합니다.',
  },
  고란과숙: {
    title: '고란과숙 (孤鸞寡宿)',
    desc: '외로운 학과 홀로 사는 별입니다. 독신 생활을 하거나, 배우자와 떨어져 사는 경우가 많습니다.',
  },
  괴강살: {
    title: '괴강살 (魁罡殺)',
    desc: '강력한 기운입니다. 성격이 강직하고 용맹하며, 리더십이 강합니다.',
  },
  백호대살: {
    title: '백호대살 (白虎大殺)',
    desc: '흰 호랑이의 살기입니다. 용맹하지만 흉폭한 기운이 있으며, 사고와 혈광을 조심해야 합니다.',
  },
  원진살: {
    title: '원진살 (怨嗔殺)',
    desc: '원한과 분노입니다. 지지 간의 반목으로 인한 갈등을 의미합니다.',
  },

  // 십이운성 (12개)
  장생: {
    title: '장생 (長生)',
    desc: '생명이 시작되는 단계입니다. 새로운 시작, 성장, 발전의 시기로 모든 일이 잘 풀립니다.',
  },
  목욕: {
    title: '목욕 (沐浴)',
    desc: '깨끗이 씻는 단계입니다. 새로운 변화와 정화의 시기로, 유혹이 많고 감정 기복이 심할 수 있습니다.',
  },
  관대: {
    title: '관대 (冠帶)',
    desc: '관을 쓰는 성인식입니다. 사회적으로 인정받는 시기로, 명예와 지위가 높아집니다.',
  },
  건록: {
    title: '건록 (建祿)',
    desc: '녹을 세우는 단계입니다. 안정적인 수입과 지위를 얻는 시기로, 열심히 일하면 성과가 나옵니다.',
  },
  제왕: {
    title: '제왕 (帝旺)',
    desc: '황제처럼 왕성한 시기입니다. 인생에서 가장 강력한 시기로, 모든 면에서 정점에 달합니다.',
  },
  쇠: {
    title: '쇠 (衰)',
    desc: '쇠퇴하기 시작하는 단계입니다. 기운이 약해지기 시작하므로 과욕을 부리지 말고 안정을 추구해야 합니다.',
  },
  병: {
    title: '병 (病)',
    desc: '병이 드는 단계입니다. 건강과 운이 약해지는 시기로, 몸과 마음을 잘 관리해야 합니다.',
  },
  사: {
    title: '사 (死)',
    desc: '기운이 죽는 단계입니다. 운이 매우 약한 시기로, 새로운 일을 시작하기보다 정리하는 시기입니다.',
  },
  묘: {
    title: '묘 (墓)',
    desc: '무덤에 들어가는 단계입니다. 모든 것을 저장하고 감추는 시기로, 잠복기로 조용히 준비해야 합니다.',
  },
  절: {
    title: '절 (絶)',
    desc: '끊어지는 단계입니다. 운이 가장 약한 시기로, 인내하고 기다리는 지혜가 필요합니다.',
  },
  태: {
    title: '태 (胎)',
    desc: '태아가 잉태되는 단계입니다. 새로운 시작을 준비하는 시기로, 씨앗이 심어지는 단계입니다.',
  },
  양: {
    title: '양 (養)',
    desc: '자양분을 받는 단계입니다. 서서히 기운을 회복하는 시기로, 배우고 준비하면 좋습니다.',
  },

  // 기타 핵심 용어 (8개)
  대운: {
    title: '대운 (大運)',
    desc: '10년마다 바뀌는 큰 운입니다. 10년 단위로 변화하는 큰 운세의 흐름으로, 인생의 계절과 같습니다.',
  },
  세운: {
    title: '세운 (歲運)',
    desc: '1년마다 바뀌는 운입니다. 매년 바뀌는 운세로, 올해의 흐름을 알려줍니다.',
  },
  월운: {
    title: '월운 (月運)',
    desc: '매달 바뀌는 운입니다. 매달 바뀌는 운세로, 한 달의 흐름을 알려줍니다.',
  },
  공망: {
    title: '공망 (空亡)',
    desc: '비어있는 망입니다. 육십갑자에서 빠진 두 지지로, 운이 작용하지 않는 자리입니다.',
  },
  합: {
    title: '합 (合)',
    desc: '서로 합쳐지는 관계입니다. 천간이나 지지가 만나 새로운 오행으로 변화하며, 조화와 협력을 의미합니다.',
  },
  충: {
    title: '충 (沖)',
    desc: '정면으로 부딪치는 관계입니다. 지지가 서로 충돌하여 변화와 갈등을 일으키며, 이동, 변화, 이별을 의미합니다.',
  },
  형: {
    title: '형 (刑)',
    desc: '형벌을 주는 관계입니다. 지지가 서로 해를 끼치는 관계로, 구설, 소송, 질병을 조심해야 합니다.',
  },
  해: {
    title: '해 (害)',
    desc: '서로 해치는 관계입니다. 지지 간의 해로운 작용으로, 방해와 손해를 의미합니다.',
  },
}

// 오행별 기운 보충법
const ELEMENT_BOOST: Record<
  string,
  {
    color: string
    direction: string
    season: string
    time: string
    activities: string[]
    foods: string[]
    jobs: string[]
    advice: string
  }
> = {
  Wood: {
    color: '초록색, 청록색',
    direction: '동쪽',
    season: '봄',
    time: '새벽 3-7시',
    activities: [
      '아침 산책이나 공원 방문하기',
      '식물 키우기, 원예 활동',
      '목재 가구나 초록색 소품 사용',
      '산림욕, 자연 속 휴식',
    ],
    foods: ['신맛 음식 (레몬, 식초)', '녹색 채소 (시금치, 브로콜리)', '나무 열매 (대추, 밤)'],
    jobs: ['교육, 상담, 예술', '환경, 임업, 원예', '출판, 문화 사업'],
    advice:
      '목 기운이 필요한 당신은 자연과 가까이 지내면 운이 좋아집니다. 매일 아침 초록색 식물에 물을 주는 습관을 들여보세요. 동쪽 창가에 책상을 두고 공부하거나 일하면 집중력이 높아집니다.',
  },
  Fire: {
    color: '빨간색, 주황색, 자주색',
    direction: '남쪽',
    season: '여름',
    time: '오전 9시-오후 1시',
    activities: [
      '햇볕 쬐기, 따뜻한 곳에서 활동',
      '운동, 춤, 활발한 신체 활동',
      '빨간 옷 입기, 붉은 악세사리 착용',
      '촛불 명상, 모닥불 피우기',
    ],
    foods: ['쓴맛 음식 (고추, 커피)', '붉은 과일 (토마토, 딸기)', '따뜻한 음식, 볶은 요리'],
    jobs: ['영업, 마케팅, 홍보', '연예, 방송, 공연', '요식업, 에너지 산업'],
    advice:
      '화 기운이 필요한 당신은 밝고 활기찬 환경에서 에너지를 얻습니다. 오전 시간에 중요한 일을 하고, 사람들과 활발히 교류하세요. 남쪽 방향을 바라보며 일하면 아이디어가 샘솟습니다.',
  },
  Earth: {
    color: '노란색, 갈색, 베이지',
    direction: '중앙, 남서, 북동',
    season: '환절기 (계절의 끝 18일)',
    time: '오후 1-3시, 7-9시',
    activities: ['도자기, 도예 활동', '텃밭 가꾸기, 흙 만지기', '명상, 안정적인 루틴 유지', '노란색 소품 사용'],
    foods: ['단맛 음식 (고구마, 단호박)', '곡물 (쌀, 옥수수)', '뿌리 채소 (감자, 당근)'],
    jobs: ['부동산, 건설, 인테리어', '농업, 식품업', '행정, 관리직'],
    advice:
      '토 기운이 필요한 당신은 안정과 신뢰를 중시합니다. 규칙적인 생활 습관을 유지하고, 황토색 인테리어를 활용하세요. 맨발로 흙을 밟거나 도예 활동을 하면 마음이 안정됩니다.',
  },
  Metal: {
    color: '흰색, 금색, 은색',
    direction: '서쪽',
    season: '가을',
    time: '오후 3-7시',
    activities: ['금속 악세사리 착용', '서쪽에서 활동하기', '정리 정돈, 단정한 외모 관리', '음악 듣기, 악기 연주'],
    foods: ['매운맛 음식 (마늘, 생강)', '흰 음식 (무, 배, 도라지)', '견과류 (호두, 아몬드)'],
    jobs: ['금융, 회계, 법조', '기계, 제조업', '음악, 보석업'],
    advice:
      '금 기운이 필요한 당신은 깨끗하고 정돈된 환경에서 능력을 발휘합니다. 흰색이나 금색 소품을 활용하고, 오후 시간에 중요한 결정을 내리세요. 서쪽 방향에서 명상하면 직관력이 높아집니다.',
  },
  Water: {
    color: '검은색, 남색, 파란색',
    direction: '북쪽',
    season: '겨울',
    time: '밤 9시-새벽 3시',
    activities: [
      '물 가까이에서 생활 (바다, 강, 분수)',
      '수영, 목욕, 반신욕',
      '검은색 옷, 파란색 소품 사용',
      '밤 시간 활용, 조용한 사색',
    ],
    foods: ['짠맛 음식 (소금, 간장)', '검은 음식 (검은콩, 흑미)', '해산물 (생선, 미역, 김)'],
    jobs: ['물 관련 업종 (수산업, 음료)', '여행, 운수업', '연구, 철학, 종교'],
    advice:
      '수 기운이 필요한 당신은 유연성과 지혜가 강점입니다. 물을 자주 마시고, 분수나 어항을 북쪽에 두세요. 밤 시간에 아이디어를 정리하면 창의력이 샘솟습니다.',
  },
}

// 신살별 활용법
const SINSAL_ADVICE: Record<
  string,
  {
    positive: string[]
    caution?: string[]
    solution: string
  }
> = {
  역마살: {
    positive: [
      '여행업, 무역업, 운수업에서 강점 발휘',
      '해외 진출, 유학, 이민 고려해보기',
      '다양한 경험 쌓기, 새로운 장소 탐험',
    ],
    caution: ['한곳에 정착하지 못하는 성향 주의', '중요한 결정 전 신중히 생각하기', '가족과의 시간 소홀하지 않기'],
    solution:
      '정기적인 여행이나 출장을 통해 역마살 에너지를 긍정적으로 소화하세요. 1년에 2-3회 새로운 장소를 방문하는 것이 좋습니다.',
  },
  천을귀인: {
    positive: [
      '어려울 때 반드시 도움의 손길이 나타남',
      '멘토, 스승을 만나면 크게 발전',
      '인맥을 잘 활용하면 성공 가능성 높음',
    ],
    caution: ['타인 의존이 너무 강해지지 않도록 주의', '스스로의 노력도 병행해야 함'],
    solution: '좋은 사람들과의 인연을 소중히 하고, 감사함을 표현하세요. 네트워킹 모임에 적극 참여하는 것이 좋습니다.',
  },
  화개살: {
    positive: ['예술, 종교, 철학 분야에서 재능 발휘', '작가, 화가, 음악가로 성공 가능', '깊은 사색과 통찰력 소유'],
    caution: ['외로움을 느낄 수 있음', '현실적인 일에 무관심할 수 있음', '대인관계 소극적일 수 있음'],
    solution:
      '혼자만의 시간을 즐기되, 의도적으로 사회 활동도 병행하세요. 창작 활동을 통해 내면의 에너지를 표현하는 것이 좋습니다.',
  },
  도화살: {
    positive: ['연예, 서비스업, 예술 분야에서 큰 성공', '인간관계에서 호감 얻기 쉬움', '대중과의 소통 능력 탁월'],
    caution: ['이성 문제로 인한 갈등 주의', '표면적인 관계에 치우칠 수 있음'],
    solution: '매력을 긍정적으로 활용하되, 깊이 있는 관계를 만들기 위해 노력하세요. 예술적 재능을 개발하면 좋습니다.',
  },
}

// 섹션 설명 (작가 톤)
const SECTION_DESCRIPTIONS = {
  advancedManse: {
    title: '고급 만세력 분석',
    intro:
      '당신의 사주를 더 깊이 들여다보는 시간입니다. 세운(歲運)은 올해의 운을, 월운(月運)은 이번 달의 흐름을 보여줍니다. 신살, 십이운성, 합충형해, 공망까지 모든 정보가 모여 당신만의 운명 지도를 완성합니다. 각각의 정보가 퍼즐 조각처럼 맞춰지면, 인생의 큰 그림이 보이기 시작합니다.',
  },
  sinsal: {
    title: '신살 - 하늘이 준 특별한 별들',
    intro:
      '신살(神殺)은 당신의 사주에 깃든 특별한 별들입니다. 어떤 별은 행운을, 어떤 별은 시련을 가져오지만, 모두 당신의 운명을 더욱 풍성하게 만드는 소중한 요소입니다. 신살을 잘 이해하고 활용하면 인생의 흐름을 유리하게 이끌 수 있습니다.',
  },
  yongsin: {
    title: '용신론 - 나를 돕는 오행 찾기',
    intro:
      '사주 팔자는 다섯 가지 기운(오행)으로 이루어져 있습니다. 때로는 어떤 기운이 부족하거나 넘치기도 하죠. 용신(用神)은 당신에게 가장 필요한 기운으로, 마치 부족한 영양소를 채워주는 보약과 같습니다. 용신을 잘 활용하면 운이 크게 좋아집니다.',
  },
  gekguk: {
    title: '격국 분석 - 당신 사주의 그릇',
    intro:
      '격국(格局)은 사주 팔자가 만들어내는 전체적인 틀, 즉 그릇입니다. 큰 그릇에는 많은 것을 담을 수 있고, 작은 그릇은 소박하지만 알찹니다. 당신의 그릇을 알면, 어떤 방향으로 나아가야 할지 명확해집니다.',
  },
  gaeunbub: {
    title: '개운법 - 운을 여는 실천 방법',
    intro:
      '아는 것도 중요하지만, 더 중요한 것은 실천입니다. 개운법(開運法)은 당신의 운을 더욱 좋게 만드는 구체적인 방법들입니다. 매일 작은 실천으로 큰 변화를 만들어보세요. 운명은 노력하는 사람의 편입니다.',
  },
  daewoon: {
    title: '대운 - 10년마다 찾아오는 인생의 계절',
    intro:
      '대운(大運)은 10년마다 바뀌는 큰 운의 흐름입니다. 마치 봄, 여름, 가을, 겨울처럼 인생에도 계절이 있습니다. 좋은 대운에는 과감히 도전하고, 어려운 대운에는 인내하며 준비하세요. 계절을 알면 농사를 잘 지을 수 있듯, 대운을 알면 인생을 잘 설계할 수 있습니다.',
  },
  sibiWoonSung: {
    title: '십이운성 - 생명의 12단계',
    intro:
      '십이운성(十二運星)은 생명이 태어나서 성장하고 쇠퇴하는 12가지 단계를 나타냅니다. 지금 당신은 어느 단계에 있나요? 장생처럼 왕성한 시기일 수도, 절처럼 기다림이 필요한 시기일 수도 있습니다. 현재 단계를 알면 어떻게 행동해야 할지 지혜가 생깁니다.',
  },
  gongmang: {
    title: '공망 - 비어있는 자리의 의미',
    intro:
      '공망(空亡)은 육십갑자에서 비어있는 자리입니다. 운이 작용하지 않는 공간으로, 때로는 아무리 노력해도 결실을 얻기 어려운 분야를 나타냅니다. 하지만 공망을 잘 이해하면 헛수고를 피하고 에너지를 효율적으로 사용할 수 있습니다.',
  },
}

// 공망 해결책
const GONGMANG_SOLUTION = {
  understanding:
    "공망은 '비어있다'는 뜻으로, 운이 제대로 작용하지 않는 영역입니다. 하지만 두려워할 필요는 없습니다. 공망을 이해하고 대처하면 오히려 에너지 낭비를 막고 효율적으로 살 수 있습니다.",
  dailyPractices: [
    '공망 시간대에는 중요한 결정 피하기',
    '공망 방향으로는 장거리 여행 자제',
    '공망 색상보다 용신 색상 활용하기',
    '공망을 인정하고 집착하지 않기',
  ],
}

// 천간/지지 정보
const TIANGAN_INFO: Record<string, { korean: string; element: string; yinyang: string; meaning: string }> = {
  甲: { korean: '갑', element: '木', yinyang: '양', meaning: '큰 나무, 우두머리, 시작' },
  乙: { korean: '을', element: '木', yinyang: '음', meaning: '풀, 유연함, 예술' },
  丙: { korean: '병', element: '火', yinyang: '양', meaning: '태양, 밝음, 열정' },
  丁: { korean: '정', element: '火', yinyang: '음', meaning: '촛불, 따뜻함, 섬세함' },
  戊: { korean: '무', element: '土', yinyang: '양', meaning: '산, 중후함, 신뢰' },
  己: { korean: '기', element: '土', yinyang: '음', meaning: '논밭, 수용력, 인내' },
  庚: { korean: '경', element: '金', yinyang: '양', meaning: '바위, 강직함, 결단' },
  辛: { korean: '신', element: '金', yinyang: '음', meaning: '보석, 예민함, 정제' },
  壬: { korean: '임', element: '水', yinyang: '양', meaning: '바다, 지혜, 포용' },
  癸: { korean: '계', element: '水', yinyang: '음', meaning: '이슬, 직관, 침착' },
}

const DIZHI_INFO: Record<string, { korean: string; element: string; animal: string; season: string }> = {
  子: { korean: '자', element: '水', animal: '쥐', season: '한겨울' },
  丑: { korean: '축', element: '土', animal: '소', season: '늦겨울' },
  寅: { korean: '인', element: '木', animal: '호랑이', season: '초봄' },
  卯: { korean: '묘', element: '木', animal: '토끼', season: '봄' },
  辰: { korean: '진', element: '土', animal: '용', season: '늦봄' },
  巳: { korean: '사', element: '火', animal: '뱀', season: '초여름' },
  午: { korean: '오', element: '火', animal: '말', season: '한여름' },
  未: { korean: '미', element: '土', animal: '양', season: '늦여름' },
  申: { korean: '신', element: '金', animal: '원숭이', season: '초가을' },
  酉: { korean: '유', element: '金', animal: '닭', season: '가을' },
  戌: { korean: '술', element: '土', animal: '개', season: '늦가을' },
  亥: { korean: '해', element: '水', animal: '돼지', season: '초겨울' },
}

// 오행 한글 표기
const WUXING_KOREAN: Record<string, string> = {
  木: '목',
  火: '화',
  土: '토',
  金: '금',
  水: '수',
}

interface Member {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string | null
  calendar_type: string
  gender: string
}

interface TermDialogState {
  open: boolean
  term: string
  customContent?: {
    title: string
    description: string
  }
}

interface ManseClientProps {
  members: Member[]
  isSubscribed: boolean
}

export default function ManseClient({ members, isSubscribed }: ManseClientProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>(() => {
    if (members.length > 0) {
      const self = members.find((m: Member) => m.relationship === '본인')
      return self?.id || members[0].id
    }
    return ''
  })
  const [termDialog, setTermDialog] = useState<TermDialogState>({ open: false, term: '' })
  const [sajuInterpretOpen, setSajuInterpretOpen] = useState(false)
  const [wuxingAnalysisOpen, setWuxingAnalysisOpen] = useState(false)
  const [yukchinAnalysisOpen, setYukchinAnalysisOpen] = useState(false)

  const selectedMember = members.find((m) => m.id === selectedMemberId)

  // 사주 데이터 안전하게 가져오기
  let saju: SajuData | null = null
  try {
    if (selectedMember?.birth_date && selectedMember.birth_date.trim()) {
      saju = getSajuData(
        selectedMember.birth_date,
        selectedMember.birth_time || '00:00',
        selectedMember.calendar_type === 'solar'
      )
    }
  } catch (error) {
    console.error('Error in getSajuData:', error)
    saju = null
  }

  // 프리미엄 분석 계산 (에러 방지)
  let gekgukAnalysis = null
  let sinsalList: any[] = []
  let yongsinAnalysis = null
  let yukchinAnalysis = null
  let daeunList: any[] = []
  let gaeunbubRec = null

  try {
    gekgukAnalysis = saju ? analyzeGekguk(saju) : null
  } catch (error) {
    console.error('Error in analyzeGekguk:', error)
  }

  try {
    sinsalList = saju ? calculateSinsal(saju) : []
  } catch (error) {
    console.error('Error in calculateSinsal:', error)
  }

  try {
    yongsinAnalysis = saju ? analyzeYongsin(saju) : null
  } catch (error) {
    console.error('Error in analyzeYongsin:', error)
  }

  try {
    yukchinAnalysis = saju ? analyzeYukchin(saju) : null
  } catch (error) {
    console.error('Error in analyzeYukchin:', error)
  }

  try {
    daeunList =
      saju && selectedMember ? calculateDaeun(selectedMember.birth_date, selectedMember.gender || 'male', saju) : []
  } catch (error) {
    console.error('Error in calculateDaeun:', error)
  }

  try {
    gaeunbubRec = yongsinAnalysis ? getGaeunbubRecommendation(yongsinAnalysis.yongsin) : null
  } catch (error) {
    console.error('Error in getGaeunbubRecommendation:', error)
  }

  // 고급 만세력 분석
  let advancedManse = null
  try {
    if (selectedMember && selectedMember.birth_date) {
      advancedManse = analyzeManseAdvanced(
        selectedMember.birth_date,
        selectedMember.birth_time || '00:00',
        (selectedMember.gender as 'male' | 'female') || 'male'
      )
    }
  } catch (error) {
    console.error('Error in analyzeManseAdvanced:', error)
  }

  // 해화지기 마스터 엔진 데이터 계산
  let engineData: {
    sipseong: SipseongMap | null
    sibjiunseong: SibjiunseongResult | null
    sinsal: SinsalResult[]
    relations: RelationResult | null
    mulsang: (typeof GAN_MULSANG)[string] | null
  } = { sipseong: null, sibjiunseong: null, sinsal: [], relations: null, mulsang: null }

  if (saju) {
    try {
      const pillarsForSipseong = [
        { position: '년주', gan: saju.pillars.year.gan, zhi: saju.pillars.year.zhi },
        { position: '월주', gan: saju.pillars.month.gan, zhi: saju.pillars.month.zhi },
        { position: '일간', gan: saju.pillars.day.gan, zhi: saju.pillars.day.zhi },
        { position: '시주', gan: saju.pillars.time.gan, zhi: saju.pillars.time.zhi },
      ]
      const pillarsForSibj = [
        { name: '년주', zhi: saju.pillars.year.zhi },
        { name: '월주', zhi: saju.pillars.month.zhi },
        { name: '일주', zhi: saju.pillars.day.zhi },
        { name: '시주', zhi: saju.pillars.time.zhi },
      ]
      const pillarsForRel = [saju.pillars.year, saju.pillars.month, saju.pillars.day, saju.pillars.time]
      const dayGanji = saju.pillars.day.gan + saju.pillars.day.zhi

      engineData = {
        sipseong: analyzeSipseong(saju.dayMaster, pillarsForSipseong),
        sibjiunseong: analyzeSibjiunseong(saju.dayMaster, pillarsForSibj),
        sinsal: calculateExtendedSinsal(saju),
        relations: analyzeRelations(pillarsForRel, dayGanji),
        mulsang: GAN_MULSANG[saju.dayMaster] || null,
      }
    } catch (e) {
      console.error('[ManseEngine] Error:', e)
    }
  }

  const openTermDialog = (term: string) => {
    if (TERMINOLOGY[term]) {
      setTermDialog({ open: true, term })
    }
  }

  const openHanjaDialog = (hanja: string, korean: string, info: any, type: 'tiangan' | 'dizhi' | 'wuxing') => {
    let description = ''
    if (type === 'tiangan') {
      description = `오행: ${info.element} (${WUXING_KOREAN[info.element]})
음양: ${info.yinyang}
의미: ${info.meaning}`
    } else if (type === 'dizhi') {
      description = `오행: ${info.element} (${WUXING_KOREAN[info.element]})
동물: ${info.animal}
계절: ${info.season}`
    } else if (type === 'wuxing') {
      const wuxingMeaning: Record<string, string> = {
        木: '봄, 성장, 인자함, 동쪽을 상징합니다. 나무의 기운으로 확장과 발전을 의미합니다.',
        火: '여름, 열정, 예의, 남쪽을 상징합니다. 불의 기운으로 활동과 변화를 의미합니다.',
        土: '환절기, 신뢰, 중앙을 상징합니다. 흙의 기운으로 안정과 조화를 의미합니다.',
        金: '가을, 정의, 서쪽을 상징합니다. 금속의 기운으로 결단과 수확을 의미합니다.',
        水: '겨울, 지혜, 북쪽을 상징합니다. 물의 기운으로 지혜와 유연함을 의미합니다.',
      }
      description = wuxingMeaning[hanja] || ''
    }

    setTermDialog({
      open: true,
      term: korean,
      customContent: {
        title: `${hanja} (${korean})`,
        description,
      },
    })
  }

  const HanjaButton = ({
    hanja,
    korean,
    info,
    type,
  }: {
    hanja: string
    korean: string
    info: any
    type: 'tiangan' | 'dizhi'
  }) => (
    <button onClick={() => openHanjaDialog(hanja, korean, info, type)} className="group cursor-pointer w-full">
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="text-3xl font-black group-hover:scale-110 transition-transform"
          style={{ color: WU_XING_COLORS[info.element] }}
        >
          {hanja}
        </span>
        <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">{korean}</span>
      </div>
    </button>
  )

  const TermButton = ({ term }: { term: string }) => (
    <button
      onClick={() => openTermDialog(term)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] text-xs hover:bg-[#D4AF37]/20 transition-colors"
    >
      {term}
      <Info className="w-3 h-3" />
    </button>
  )

  const PremiumFeature = ({
    title,
    children,
    isSubscribed,
  }: {
    title: string
    children: React.ReactNode
    isSubscribed: boolean
  }) => (
    <Card className="p-8 bg-white/5 border-white/10 relative overflow-hidden">
      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
        <Sparkles className="w-4 h-4" />
        {title}
        {!isSubscribed && (
          <span className="ml-2 px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] text-[10px]">PREMIUM</span>
        )}
      </h3>

      {/* Content */}
      <div className={cn(!isSubscribed && 'blur-sm select-none pointer-events-none')}>{children}</div>

      {/* Premium Overlay */}
      {!isSubscribed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4 p-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center">
              <Crown className="w-8 h-8 text-[#D4AF37]" />
            </div>
            <h4 className="text-lg font-bold text-ink-light">프리미엄 회원 전용</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              {title} 기능은 프리미엄 회원만 이용하실 수 있습니다.
            </p>
            <Link href="/protected/membership">
              <Button className="bg-[#D4AF37] hover:bg-[#F4E4BA] text-background">
                <Crown className="w-4 h-4 mr-2" />
                멤버십 가입하기
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Card>
  )

  // Check if self profile is complete
  const selfMember = members.find((m) => m.relationship === '본인')
  const needsProfileSetup = !selfMember || !selfMember.birth_date

  if (needsProfileSetup) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center mb-6 border border-[#D4AF37]/20">
          <User className="w-10 h-10 text-[#D4AF37]" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
          내 정보를 먼저 등록해주세요
        </h1>
        <p className="text-muted-foreground mb-2 text-base">
          만세력 분석을 받으시려면 먼저 본인의 생년월일 정보가 필요합니다.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          정확한 사주 풀이를 위해 생년월일과 출생 시간을 입력해주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild size="lg" className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA] shadow-lg">
            <Link href="/protected/settings">
              <User className="w-4 h-4 mr-2" />내 정보 입력하기
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
          >
            <Link href="/protected/family">인연 관리로 이동</Link>
          </Button>
        </div>
      </div>
    )
  }

  if (members.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-white/5 flex items-center justify-center mb-6">
          <User className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-2xl font-bold mb-2">등록된 정보가 없습니다</h1>
        <p className="text-muted-foreground mb-6">인연 관리에서 먼저 정보를 등록해주세요.</p>
        <Button asChild className="bg-[#D4AF37] text-black hover:bg-[#F4E4BA]">
          <Link href="/protected/family">인연 등록하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[#D4AF37]/3 rounded-full blur-[200px]" />
      </div>

      <div className="w-full max-w-full mx-auto px-1 md:px-2 py-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20">
            <ScrollText className="w-4 h-4 text-[#D4AF37]" />
            <span className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider">Manse-ryok Pro</span>
          </div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-[#D4AF37] via-[#F4E4BA] to-[#D4AF37] bg-clip-text text-transparent">
              만세력
            </span>
          </h1>
          <p className="text-muted-foreground">사주팔자의 천간·지지·오행을 전문가 수준으로 분석합니다</p>
        </div>

        {/* Member Selector */}
        <div className="flex justify-center">
          <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
            <SelectTrigger className="w-64 bg-white/5 border-white/10">
              <SelectValue placeholder="분석 대상 선택" />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} ({m.relationship})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {saju && selectedMember && (
          <>
            {/* Birth Info */}
            <Card className="p-6 bg-white/5 border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">{selectedMember.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedMember.birth_date} {selectedMember.birth_time || ''} (
                    {selectedMember.calendar_type === 'solar' ? '양력' : '음력'})
                  </p>
                </div>
                <div
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-bold',
                    selectedMember.gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                  )}
                >
                  {selectedMember.gender === 'male' ? '남' : '여'}명
                </div>
              </div>
            </Card>

            {/* Tabs Layout */}
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white/5 border-white/10">
                <TabsTrigger
                  value="basic"
                  className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]"
                >
                  기본 정보
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]"
                >
                  고급 분석
                </TabsTrigger>
                <TabsTrigger
                  value="fortune"
                  className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]"
                >
                  운세 흐름
                </TabsTrigger>
                <TabsTrigger
                  value="practical"
                  className="data-[state=active]:bg-[#D4AF37]/20 data-[state=active]:text-[#D4AF37]"
                >
                  실천 가이드
                </TabsTrigger>
              </TabsList>

              {/* Tab: 기본 정보 */}
              <TabsContent value="basic" className="space-y-10 mt-10">
                {/* Four Pillars - Main Display */}
                <Card className="p-8 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      사주팔자 (四柱八字)
                    </h3>
                    <button
                      onClick={() => setSajuInterpretOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BA] text-black text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-105 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />내 사주 풀이 보기
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { label: '시주', sub: '時柱', data: saju.pillars.time },
                      { label: '일주', sub: '日柱', data: saju.pillars.day },
                      { label: '월주', sub: '月柱', data: saju.pillars.month },
                      { label: '년주', sub: '年柱', data: saju.pillars.year },
                    ].map((pillar, idx) => {
                      const ganInfo = TIANGAN_INFO[pillar.data.gan]
                      const zhiInfo = DIZHI_INFO[pillar.data.zhi]

                      return (
                        <div key={idx} className="text-center">
                          <p className="text-xs text-muted-foreground mb-2">{pillar.label}</p>
                          <p className="text-[10px] text-muted-foreground/50 mb-3">{pillar.sub}</p>

                          {/* 천간 - 클릭 가능 */}
                          <div
                            className="w-full aspect-square rounded-xl flex items-center justify-center mb-2"
                            style={{
                              backgroundColor: `${WU_XING_COLORS[ganInfo?.element || '土']}15`,
                            }}
                          >
                            <HanjaButton
                              hanja={pillar.data.gan}
                              korean={ganInfo?.korean || ''}
                              info={ganInfo}
                              type="tiangan"
                            />
                          </div>

                          {/* 지지 - 클릭 가능 */}
                          <div
                            className="w-full aspect-square rounded-xl flex items-center justify-center"
                            style={{
                              backgroundColor: `${WU_XING_COLORS[zhiInfo?.element || '土']}15`,
                            }}
                          >
                            <HanjaButton
                              hanja={pillar.data.zhi}
                              korean={zhiInfo?.korean || ''}
                              info={zhiInfo}
                              type="dizhi"
                            />
                          </div>

                          {/* Info */}
                          <div className="mt-3 space-y-1">
                            <p className="text-xs text-muted-foreground">
                              {ganInfo?.element}
                              {ganInfo?.yinyang} / {zhiInfo?.animal}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Ganji Full */}
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-center text-lg tracking-widest font-bold">{saju.ganjiList.join(' ')}</p>
                  </div>
                </Card>

                {/* Wuxing Distribution */}
                <Card className="p-8 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      오행 분포 (五行分布)
                    </h3>
                    <button
                      onClick={() => setWuxingAnalysisOpen(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BA] text-black text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-105 transition-all"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      오행 풀이 보기
                    </button>
                  </div>

                  <div className="grid grid-cols-5 gap-4">
                    {Object.entries(saju.elementsDistribution).map(([element, count]: [string, number]) => (
                      <button
                        key={element}
                        onClick={() => openHanjaDialog(element, WUXING_KOREAN[element], { element }, 'wuxing')}
                        className="text-center group cursor-pointer"
                      >
                        <div
                          className="w-full aspect-square rounded-xl flex items-center justify-center text-2xl font-black mb-2 group-hover:scale-105 transition-transform"
                          style={{ backgroundColor: `${WU_XING_COLORS[element]}20` }}
                        >
                          <span style={{ color: WU_XING_COLORS[element] }}>{element}</span>
                        </div>
                        <p className="text-xl font-black">{count}</p>
                        <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                          {WUXING_KOREAN[element]}
                        </p>
                      </button>
                    ))}
                  </div>

                  {/* Balance Bar */}
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
                      {Object.entries(saju.elementsDistribution).map(([element, count]: [string, number]) => {
                        const total = Object.values(saju.elementsDistribution).reduce(
                          (a: number, b: number) => a + b,
                          0
                        )
                        const percent = ((count as number) / (total as number)) * 100
                        if (percent === 0) return null
                        return (
                          <div
                            key={element}
                            style={{
                              width: `${percent}%`,
                              backgroundColor: WU_XING_COLORS[element],
                            }}
                            title={`${element}: ${count}`}
                          />
                        )
                      })}
                    </div>
                  </div>
                </Card>

                {/* 육친 관계도 */}
                <PremiumFeature title="육친 관계도 (六親關係圖)" isSubscribed={isSubscribed}>
                  {yukchinAnalysis && Object.keys(yukchinAnalysis).length > 0 ? (
                    <div className="space-y-6">
                      <button
                        onClick={() => setYukchinAnalysisOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F4E4BA] text-black text-xs font-bold shadow-lg shadow-[#D4AF37]/20 hover:shadow-[#D4AF37]/40 hover:scale-105 transition-all"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        육친 풀이 보기
                      </button>
                      <div className="grid grid-cols-2 gap-3">
                        {Object.entries(yukchinAnalysis).map(([key, data]) => (
                          <div key={key} className="bg-surface/20 p-4 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold">{data.name}</p>
                              <span className="text-xs text-muted-foreground">{data.hanja}</span>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg font-black text-primary">{data.count}</span>
                              <span className="text-xs text-muted-foreground">개</span>
                              <span
                                className={`ml-auto px-2 py-0.5 rounded text-[10px] ${
                                  data.strength === 'strong'
                                    ? 'bg-primary/20 text-primary'
                                    : data.strength === 'moderate'
                                      ? 'bg-blue-500/20 text-blue-400'
                                      : 'bg-muted-foreground/20 text-muted-foreground'
                                }`}
                              >
                                {data.strength === 'strong' ? '강' : data.strength === 'moderate' ? '중' : '약'}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground/70">{data.pillars.join(', ')}</p>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-bold">육친 해석</p>
                        <div className="space-y-2">
                          {Object.entries(yukchinAnalysis)
                            .slice(0, 3)
                            .map(([key, data]) => (
                              <p key={key} className="text-sm text-muted-foreground leading-relaxed">
                                <span className="text-ink-light font-medium">{data.name}:</span> {data.interpretation}
                              </p>
                            ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">육친 데이터를 불러오는 중...</p>
                  )}
                </PremiumFeature>

                {/* 용어 사전 - 기본정보 탭 하단 */}
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-[#D4AF37]" />
                    <h3 className="text-sm font-bold text-[#D4AF37]">사주 용어 사전</h3>
                    <span className="text-[10px] text-muted-foreground/50 ml-1">— 누르면 해석을 볼 수 있어요</span>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground/50 mb-2 font-medium">
                        십신 (十神) — 사주의 인간관계·적성
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'].map((t) => (
                          <TermButton key={t} term={t} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/50 mb-2 font-medium">
                        신살 (神殺) — 타고난 특별한 기운
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '역마살',
                          '도화살',
                          '화개살',
                          '천을귀인',
                          '월덕귀인',
                          '천덕귀인',
                          '문창귀인',
                          '괴강살',
                          '백호대살',
                          '원진살',
                        ].map((t) => (
                          <TermButton key={t} term={t} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground/50 mb-2 font-medium">십이운성 · 핵심용어</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['용신', '희신', '기신', '대운', '세운', '공망', '합', '충', '형', '해'].map((t) => (
                          <TermButton key={t} term={t} />
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              {/* Tab: 고급 분석 */}
              <TabsContent value="advanced" className="space-y-10 mt-10">
                {/* 고급 만세력 분석 */}
                {advancedManse && (
                  <Card className="p-8 bg-white/5 border-white/10">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      {SECTION_DESCRIPTIONS.advancedManse.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                      {SECTION_DESCRIPTIONS.advancedManse.intro}
                    </p>
                    <AdvancedManseDisplay advanced={advancedManse} />
                  </Card>
                )}
              </TabsContent>

              {/* Tab: 운세 흐름 */}
              <TabsContent value="fortune" className="space-y-10 mt-10">
                {/* 대운/세운 */}
                <PremiumFeature title="대운·세운 (大運·歲運)" isSubscribed={isSubscribed}>
                  {daeunList.length > 0 ? (
                    <div className="space-y-6">
                      {/* 현재 대운 */}
                      {(() => {
                        const currentYear = new Date().getFullYear()
                        const currentDaeun =
                          daeunList.find((d) => currentYear >= d.startYear && currentYear <= d.endYear) || daeunList[0]

                        return (
                          <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                              <p className="text-xs text-muted-foreground">현재 대운</p>
                              <span className="px-2 py-1 rounded bg-primary/20 text-primary text-xs">
                                {currentDaeun.startYear}-{currentDaeun.endYear} ({currentDaeun.age})
                              </span>
                            </div>
                            <div className="text-center space-y-2">
                              <div className="flex justify-center gap-3">
                                <span className="text-3xl font-black text-primary">{currentDaeun.gan}</span>
                                <span className="text-3xl font-black text-primary">{currentDaeun.zhi}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {currentDaeun.ganjiKorean} ({currentDaeun.gan}
                                {currentDaeun.zhi})
                              </p>
                            </div>
                          </div>
                        )
                      })()}

                      {/* 연도별 세운 (최근 3년) */}
                      <div className="grid grid-cols-3 gap-2">
                        {[0, 1, 2].map((offset) => {
                          const year = new Date().getFullYear() + offset
                          const yearGanIdx = (year - 4) % 10
                          const yearZhiIdx = (year - 4) % 12
                          const ganList = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
                          const zhiList = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
                          const gan = ganList[yearGanIdx]
                          const zhi = zhiList[yearZhiIdx]

                          return (
                            <div key={year} className="bg-surface/20 p-3 rounded-lg text-center">
                              <p className="text-xs text-muted-foreground mb-1">{year}년</p>
                              <p className="text-sm font-bold">
                                {gan}
                                {zhi}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {offset === 0 ? '현재' : offset === 1 ? '다음' : '후년'}
                              </p>
                            </div>
                          )
                        })}
                      </div>

                      {/* 대운 흐름 */}
                      <div className="space-y-3">
                        <p className="text-sm font-bold">대운 흐름</p>
                        {(() => {
                          const currentYear = new Date().getFullYear()
                          const currentDaeun =
                            daeunList.find((d) => currentYear >= d.startYear && currentYear <= d.endYear) ||
                            daeunList[0]
                          return (
                            <p className="text-sm text-muted-foreground leading-relaxed">{currentDaeun.description}</p>
                          )
                        })()}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">대운 데이터를 불러오는 중...</p>
                  )}
                </PremiumFeature>
              </TabsContent>

              {/* Tab: 실천 가이드 */}
              <TabsContent value="practical" className="space-y-10 mt-10">
                {/* 용신론 - 동적 데이터 */}
                {yongsinAnalysis && (
                  <PremiumFeature title={SECTION_DESCRIPTIONS.yongsin.title} isSubscribed={isSubscribed}>
                    <div className="space-y-6">
                      {/* 섹션 설명 */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {SECTION_DESCRIPTIONS.yongsin.intro}
                      </p>

                      {/* 용신 */}
                      <div className="bg-gradient-to-r from-[#50C878]/10 to-[#50C878]/5 border border-[#50C878]/20 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4" style={{ color: '#50C878' }} />
                            <TermButton term="용신" /> (用神)
                          </p>
                          <span
                            className="px-3 py-1 rounded-full text-sm font-bold"
                            style={{
                              backgroundColor: WU_XING_COLORS[yongsinAnalysis.yongsin] + '20',
                              color: WU_XING_COLORS[yongsinAnalysis.yongsin],
                            }}
                          >
                            {yongsinAnalysis.yongsin} ({WUXING_KOREAN[yongsinAnalysis.yongsin]})
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {ELEMENT_BOOST[yongsinAnalysis.yongsin]?.advice}
                        </p>
                      </div>

                      {/* 희신 */}
                      {yongsinAnalysis.huisin && (
                        <div className="bg-surface/30 border border-[#4A90E2]/20 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold flex items-center gap-2" style={{ color: '#4A90E2' }}>
                              <TermButton term="희신" /> (喜神)
                            </p>
                            <span
                              className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{
                                backgroundColor: WU_XING_COLORS[yongsinAnalysis.huisin] + '20',
                                color: WU_XING_COLORS[yongsinAnalysis.huisin],
                              }}
                            >
                              {yongsinAnalysis.huisin} ({yongsinAnalysis.huisinKorean})
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            용신을 도와주는 오행으로, 용신과 함께 활용하면 효과가 극대화됩니다.
                          </p>
                        </div>
                      )}

                      {/* 기신 */}
                      {yongsinAnalysis.gisin && (
                        <div className="bg-surface/30 border border-[#FFD700]/20 p-4 rounded-xl">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm font-bold flex items-center gap-2" style={{ color: '#FFD700' }}>
                              <TermButton term="기신" /> (忌神)
                            </p>
                            <span
                              className="px-3 py-1 rounded-full text-sm font-bold"
                              style={{
                                backgroundColor: WU_XING_COLORS[yongsinAnalysis.gisin] + '20',
                                color: WU_XING_COLORS[yongsinAnalysis.gisin],
                              }}
                            >
                              {yongsinAnalysis.gisin} ({yongsinAnalysis.gisinKorean})
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            사주의 균형을 해치는 오행으로, 가급적 피하는 것이 좋습니다.
                          </p>
                        </div>
                      )}

                      {/* 용신 활용법 */}
                      {ELEMENT_BOOST[yongsinAnalysis.yongsin] && (
                        <div className="space-y-3">
                          <p className="text-sm font-bold">💡 용신 활용 실천법</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">색상</p>
                              <p className="text-sm font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].color}</p>
                            </div>
                            <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">방향</p>
                              <p className="text-sm font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].direction}</p>
                            </div>
                            <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">시간</p>
                              <p className="text-sm font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].time}</p>
                            </div>
                            <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">계절</p>
                              <p className="text-sm font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].season}</p>
                            </div>
                          </div>

                          <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">추천 활동</p>
                            <ul className="list-disc list-inside space-y-1">
                              {ELEMENT_BOOST[yongsinAnalysis.yongsin].activities.map(
                                (activity: string, idx: number) => (
                                  <li key={idx} className="text-sm">
                                    {activity}
                                  </li>
                                )
                              )}
                            </ul>
                          </div>

                          <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">추천 음식</p>
                            <ul className="list-disc list-inside space-y-1">
                              {ELEMENT_BOOST[yongsinAnalysis.yongsin].foods.map((food: string, idx: number) => (
                                <li key={idx} className="text-sm">
                                  {food}
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="bg-surface/20 border border-primary/10 p-3 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-2">적합한 직업</p>
                            <p className="text-sm">{ELEMENT_BOOST[yongsinAnalysis.yongsin].jobs.join(', ')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </PremiumFeature>
                )}

                {/* 격국 분석 */}
                <PremiumFeature title={SECTION_DESCRIPTIONS.gekguk.title} isSubscribed={isSubscribed}>
                  {gekgukAnalysis ? (
                    <div className="space-y-6">
                      {/* 섹션 설명 */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {SECTION_DESCRIPTIONS.gekguk.intro}
                      </p>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">사주 격국</p>
                          <p className="text-xl font-bold text-primary">{gekgukAnalysis.gekguk}</p>
                          <p className="text-xs text-muted-foreground/70 mt-2">{gekgukAnalysis.hanja}</p>
                        </div>
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">격국 강도</p>
                          <p className="text-xl font-bold">{gekgukAnalysis.strengthLabel}</p>
                          <div className="w-full h-2 bg-surface/50 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${(gekgukAnalysis.strength / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-bold">격국 특징</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{gekgukAnalysis.description}</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {gekgukAnalysis.characteristics.map((char, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{char}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">사주 데이터를 불러오는 중...</p>
                  )}
                </PremiumFeature>

                {/* 개운법 */}
                <PremiumFeature title={SECTION_DESCRIPTIONS.gaeunbub.title} isSubscribed={isSubscribed}>
                  {gaeunbubRec ? (
                    <div className="space-y-6">
                      {/* 섹션 설명 */}
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {SECTION_DESCRIPTIONS.gaeunbub.intro}
                      </p>

                      <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4 rounded-xl">
                        <p className="text-sm font-bold mb-3 flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-primary" />
                          행운의 오행
                        </p>
                        <div className="flex gap-2">
                          <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm">
                            {gaeunbubRec.luckyElement} (
                            {gaeunbubRec.luckyElement === '木'
                              ? '목'
                              : gaeunbubRec.luckyElement === '火'
                                ? '화'
                                : gaeunbubRec.luckyElement === '土'
                                  ? '토'
                                  : gaeunbubRec.luckyElement === '金'
                                    ? '금'
                                    : '수'}
                            )
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Palette className="w-3 h-3" />
                            행운의 색
                          </p>
                          <p className="text-xs font-medium">{gaeunbubRec.colors.join(', ')}</p>
                        </div>
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                            <Compass className="w-3 h-3" />
                            행운의 방위
                          </p>
                          <p className="text-xs font-medium">{gaeunbubRec.directions.join(', ')}</p>
                        </div>
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">행운의 숫자</p>
                          <div className="flex gap-1">
                            {gaeunbubRec.numbers.map((num) => (
                              <span
                                key={num}
                                className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm font-bold"
                              >
                                {num}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-surface/30 border border-primary/20 p-4 rounded-xl">
                          <p className="text-xs text-muted-foreground mb-2">추천 직업</p>
                          <p className="text-xs font-medium">{gaeunbubRec.jobs.slice(0, 3).join(', ')}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-bold">일상 개운법</p>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                          {gaeunbubRec.activities.map((activity, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="text-primary mt-1">✓</span>
                              <span>{activity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">개운법 데이터를 불러오는 중...</p>
                  )}
                </PremiumFeature>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      {/* 사주 종합 해석 Dialog */}
      <Dialog open={sajuInterpretOpen} onOpenChange={setSajuInterpretOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
              사주 종합 해석
            </DialogTitle>
          </DialogHeader>

          {saju && (
            <div className="space-y-4 text-sm">
              {/* 일간 기질 */}
              {engineData.mulsang && (
                <div className="p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                  <p className="text-[#D4AF37] font-bold mb-1.5 text-xs">
                    일간의 기질 — {saju.dayMaster} ({TIANGAN_INFO[saju.dayMaster]?.korean})
                  </p>
                  <p className="text-[#F4E4BA]/90 text-xs mb-1.5 font-medium">{engineData.mulsang.symbol}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{engineData.mulsang.psychology}</p>
                  {engineData.mulsang.modernJobs?.length > 0 && (
                    <p className="text-muted-foreground/60 text-[10px] mt-2">
                      적성 직업: {engineData.mulsang.modernJobs.slice(0, 4).join(' · ')}
                    </p>
                  )}
                </div>
              )}

              {/* 신강/신약 */}
              {engineData.sipseong && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-1.5 text-xs">
                    {engineData.sipseong.strengthAssessment} ({engineData.sipseong.bodyStrengthScore}점) — 지배 십성:{' '}
                    {engineData.sipseong.dominantSipseong}
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{engineData.sipseong.summary}</p>
                </div>
              )}

              {/* 십이운성 에너지 */}
              {engineData.sibjiunseong && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-2 text-xs">
                    십이운성 에너지 — {engineData.sibjiunseong.overallEnergy} (평균{' '}
                    {engineData.sibjiunseong.averageLevel.toFixed(1)}/12)
                  </p>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {engineData.sibjiunseong.items.map((item, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-[#D4AF37]/10 text-[#D4AF37]">
                        {item.pillarName}: {item.sibjiunseong}({item.level})
                      </span>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {engineData.sibjiunseong.waveDescription}
                  </p>
                </div>
              )}

              {/* 관계 역학 */}
              {engineData.relations && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-1.5 text-xs">
                    합·충·형 관계 — {engineData.relations.dominantRelation}
                  </p>
                  <div className="space-y-0.5 mb-2 text-[10px] text-muted-foreground">
                    {engineData.relations.hap.length > 0 && <p>합(合): {engineData.relations.hap.join(', ')}</p>}
                    {engineData.relations.chung.length > 0 && <p>충(沖): {engineData.relations.chung.join(', ')}</p>}
                    {engineData.relations.hyeong.length > 0 && <p>형(刑): {engineData.relations.hyeong.join(', ')}</p>}
                    {engineData.relations.gongmang.length > 0 && (
                      <p>공망(空亡): {engineData.relations.gongmang.join(', ')}</p>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{engineData.relations.summary}</p>
                </div>
              )}

              {/* 신살 스킬트리 */}
              {engineData.sinsal.length > 0 && (
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-3 text-xs">신살 스킬트리</p>
                  <div className="space-y-3">
                    {engineData.sinsal.map((s, i) => (
                      <div key={i}>
                        <p className="text-[#D4AF37] text-xs font-semibold">
                          {s.name} {s.hanja} — {s.category}
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed mt-0.5">{s.poeticDesc}</p>
                        {s.modernSkillTree && (
                          <p className="text-white/40 text-[10px] mt-0.5">현대 스킬: {s.modernSkillTree}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 오행 분포 풀이 Dialog */}
      <Dialog open={wuxingAnalysisOpen} onOpenChange={setWuxingAnalysisOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
              오행 분포 풀이
            </DialogTitle>
          </DialogHeader>
          {saju && (
            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
                <p className="text-[#D4AF37] font-bold mb-2 text-xs">내 사주의 오행 구성</p>
                <div className="flex gap-3 flex-wrap">
                  {Object.entries(saju.elementsDistribution).map(([el, cnt]: [string, number]) => (
                    <div key={el} className="flex items-center gap-1.5">
                      <span className="text-base font-black" style={{ color: WU_XING_COLORS[el] }}>
                        {el}
                      </span>
                      <span className="text-white/70 text-xs">
                        {WUXING_KOREAN[el]} {cnt}개
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              {[
                {
                  el: '木',
                  ko: '목',
                  meaning: '성장·발전·인자함',
                  trait:
                    '나무처럼 위를 향해 뻗어나가는 기운입니다. 창의력과 기획력이 있고, 사람을 이끄는 능력이 있습니다. 봄의 에너지로 새로운 시작을 잘 합니다.',
                  lack: '목이 부족하면 결단력이 약해지고 우유부단해질 수 있습니다. 동쪽을 바라보거나 녹색을 활용하면 좋습니다.',
                },
                {
                  el: '火',
                  ko: '화',
                  meaning: '열정·활동·예의',
                  trait:
                    '불처럼 밝고 강렬한 에너지입니다. 표현력과 카리스마가 있고, 사람들 앞에 나서는 것을 좋아합니다. 여름의 에너지로 활발하고 변화를 즐깁니다.',
                  lack: '화가 부족하면 자신감이 떨어지고 표현이 서툴 수 있습니다. 붉은색을 활용하고 남쪽 방향이 도움이 됩니다.',
                },
                {
                  el: '土',
                  ko: '토',
                  meaning: '안정·신뢰·중심',
                  trait:
                    '대지처럼 묵직하고 안정된 에너지입니다. 신뢰감을 주고 조율 능력이 뛰어납니다. 환절기의 에너지로 중간에서 균형을 잡습니다.',
                  lack: '토가 부족하면 뿌리 없이 흔들릴 수 있습니다. 황토색·노란색 계열이나 산을 찾는 것이 도움이 됩니다.',
                },
                {
                  el: '金',
                  ko: '금',
                  meaning: '결단·정의·수확',
                  trait:
                    '쇠처럼 강하고 날카로운 에너지입니다. 원칙을 중시하고 결단력이 있습니다. 가을의 에너지로 수확하고 정리하는 능력이 있습니다.',
                  lack: '금이 부족하면 우유부단하고 마무리가 약할 수 있습니다. 흰색·금색 계열과 서쪽 방향이 도움이 됩니다.',
                },
                {
                  el: '水',
                  ko: '수',
                  meaning: '지혜·유연·포용',
                  trait:
                    '물처럼 흐르고 채우는 에너지입니다. 지혜롭고 눈치가 빠르며 적응력이 강합니다. 겨울의 에너지로 깊이 생각하고 계획을 세웁니다.',
                  lack: '수가 부족하면 융통성이 없고 고집스러워질 수 있습니다. 검은색·파란색 계열과 북쪽 방향이 도움이 됩니다.',
                },
              ].map(({ el, ko, meaning, trait, lack }) => {
                const cnt = (saju.elementsDistribution as Record<string, number>)[el] ?? 0
                const total = Object.values(saju.elementsDistribution).reduce((a: number, b: number) => a + b, 0)
                const isStrong = cnt >= 3
                const isWeak = cnt === 0
                return (
                  <div
                    key={el}
                    className={`p-4 rounded-xl border ${isStrong ? 'bg-[#D4AF37]/5 border-[#D4AF37]/30' : isWeak ? 'bg-white/3 border-white/5 opacity-60' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-black" style={{ color: WU_XING_COLORS[el] }}>
                        {el}
                      </span>
                      <span className="text-white/80 text-xs font-bold">
                        {ko} — {meaning}
                      </span>
                      <span
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${isStrong ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : isWeak ? 'bg-white/10 text-white/40' : 'bg-white/10 text-white/60'}`}
                      >
                        {cnt}/{total} {isStrong ? '강함' : isWeak ? '없음' : '보통'}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{isWeak ? lack : trait}</p>
                    {isWeak && (
                      <p className="text-[#D4AF37]/70 text-[10px] mt-1.5">💡 {ko}(을)를 보충하면 운이 좋아집니다</p>
                    )}
                    {isStrong && (
                      <p className="text-[#D4AF37]/70 text-[10px] mt-1.5">✨ 이 기운이 당신의 핵심 강점입니다</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* 육친 관계도 풀이 Dialog */}
      <Dialog open={yukchinAnalysisOpen} onOpenChange={setYukchinAnalysisOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
              <Sparkles className="w-5 h-5" />
              육친 관계도 풀이
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20">
              <p className="text-[#D4AF37] text-xs font-bold mb-1">육친이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                사주 8글자에서 일간(나)을 기준으로 나머지 7글자가 나와 어떤 관계인지를 나타냅니다. 부모·형제·배우자·자녀
                등 인생의 인연과 그 강약을 볼 수 있습니다.
              </p>
            </div>
            {yukchinAnalysis &&
              Object.entries(yukchinAnalysis).map(([key, data]) => {
                const strengthLabel =
                  data.strength === 'strong'
                    ? '강함 — 이 인연이 인생에서 크게 작용합니다'
                    : data.strength === 'moderate'
                      ? '보통 — 적당히 영향을 줍니다'
                      : '약함 — 이 인연의 영향이 적습니다'
                const strengthColor =
                  data.strength === 'strong'
                    ? 'text-[#D4AF37]'
                    : data.strength === 'moderate'
                      ? 'text-blue-400'
                      : 'text-white/40'
                return (
                  <div key={key} className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">{data.name}</span>
                        <span className="text-muted-foreground text-xs">{data.hanja}</span>
                      </div>
                      <span className="text-[#D4AF37] font-black text-lg">{data.count}개</span>
                    </div>
                    <p className={`text-[10px] mb-2 ${strengthColor}`}>{strengthLabel}</p>
                    <p className="text-muted-foreground text-xs leading-relaxed">{data.interpretation}</p>
                    {data.pillars?.length > 0 && (
                      <p className="text-white/30 text-[10px] mt-2">위치: {data.pillars.join(', ')}</p>
                    )}
                  </div>
                )
              })}
            {(!yukchinAnalysis || Object.keys(yukchinAnalysis).length === 0) && (
              <p className="text-muted-foreground text-xs text-center py-4">육친 데이터를 불러올 수 없습니다.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Term Dialog */}
      <Dialog open={termDialog.open} onOpenChange={(open) => setTermDialog({ ...termDialog, open })}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
              <BookOpen className="w-5 h-5" />
              {termDialog.customContent?.title || TERMINOLOGY[termDialog.term]?.title}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {termDialog.customContent?.description || TERMINOLOGY[termDialog.term]?.desc}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}
