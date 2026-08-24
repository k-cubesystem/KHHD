'use client'

import { useState, useMemo, useEffect } from 'react'
import { logger } from '@/lib/utils/logger'
import { GA, trackEvent } from '@/lib/analytics/ga4'
import { getSajuData, WU_XING_COLORS, SajuData } from '@/lib/domain/saju/saju'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'
import {
  analyzeGekguk,
  analyzeYongsin,
  analyzeYukchin,
  calculateDaeun,
  getGaeunbubRecommendation,
  type DaeunPeriod,
} from '@/lib/domain/saju/saju-analysis'
import {
  analyzeSipseong,
  GAN_MULSANG,
  analyzeSibjiunseong,
  analyzeRelations,
  calculateExtendedSinsal,
  analyzeWarnings,
  analyzeAllJijanggan,
  type SipseongMap,
  type SibjiunseongResult,
  type RelationResult,
  type SinsalResult,
  type WarningsResult,
  type JijangganAnalysis,
} from '@/lib/saju-engine'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TargetSelect } from '@/components/destiny/target-select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ScrollText,
  User,
  Info,
  Sparkles,
  BookOpen,
  Crown,
  Palette,
  Compass,
  ShieldAlert,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Skull,
  Activity,
  FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { GOLD_500 } from '@/lib/config/design-tokens'
import { TERMINOLOGY, TIANGAN_INFO, DIZHI_INFO, WUXING_KOREAN } from '@/lib/constants/saju-terms'
import { ELEMENT_BOOST } from '@/lib/constants/element-boost'

// 섹션 설명 (작가 톤)
const SECTION_DESCRIPTIONS = {
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
}

interface Member {
  id: string
  name: string
  relationship: string
  birth_date: string
  birth_time: string | null
  calendar_type: string
  gender: string
  is_leap_month?: boolean | null
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
    useEffect(() => {
      trackEvent({ action: 'screen_view', category: 'engagement', label: 'manse' })
    }, [])
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
  const [daeunExplainOpen, setDaeunExplainOpen] = useState(false)
  const [yongsinExplainOpen, setYongsinExplainOpen] = useState(false)
  const [gekgukExplainOpen, setGekgukExplainOpen] = useState(false)
  const [gaeunbubExplainOpen, setGaeunbubExplainOpen] = useState(false)
  const selectedMember = members.find((m) => m.id === selectedMemberId)

  // 13개 사주 엔진을 한 번에 계산 — 다이얼로그 토글·리렌더마다 전체 재계산하던 것을 메모이즈.
  // ⚠️ 전부 순수 결정론 엔진이라 메모이즈해도 계산값은 완전히 동일하다(값 회귀 없음).
  const { saju, gekgukAnalysis, yongsinAnalysis, yukchinAnalysis, daeunList, gaeunbubRec, jijanggan, engineData } =
    useMemo(() => {
      // 사주 데이터 안전하게 가져오기
      let saju: SajuData | null = null
      try {
        if (selectedMember?.birth_date && selectedMember.birth_date.trim()) {
          saju = getSajuData(
            selectedMember.birth_date,
            selectedMember.birth_time || '12:00',
            isSolarCalendar(selectedMember.calendar_type),
            selectedMember.is_leap_month ?? false
          )
        }
      } catch (error) {
        logger.error('Error in getSajuData:', error)
        saju = null
      }

      // 프리미엄 분석 계산 (에러 방지)
      let gekgukAnalysis = null
      let yongsinAnalysis = null
      let yukchinAnalysis = null
      let daeunList: DaeunPeriod[] = []
      let gaeunbubRec = null

      try {
        gekgukAnalysis = saju ? analyzeGekguk(saju) : null
      } catch (error) {
        logger.error('Error in analyzeGekguk:', error)
      }

      try {
        yongsinAnalysis = saju ? analyzeYongsin(saju) : null
      } catch (error) {
        logger.error('Error in analyzeYongsin:', error)
      }

      try {
        yukchinAnalysis = saju ? analyzeYukchin(saju) : null
      } catch (error) {
        logger.error('Error in analyzeYukchin:', error)
      }

      try {
        daeunList =
          saju && selectedMember
            ? calculateDaeun(
                selectedMember.birth_date,
                selectedMember.gender || 'male',
                saju,
                selectedMember.birth_time || '12:00',
                isSolarCalendar(selectedMember.calendar_type)
              )
            : []
      } catch (error) {
        logger.error('Error in calculateDaeun:', error)
      }

      try {
        gaeunbubRec = yongsinAnalysis ? getGaeunbubRecommendation(yongsinAnalysis.yongsin) : null
      } catch (error) {
        logger.error('Error in getGaeunbubRecommendation:', error)
      }

      // 지장간(藏干) — 지지 속에 숨은 천간의 기운
      let jijanggan: JijangganAnalysis | null = null
      try {
        if (saju) {
          jijanggan = analyzeAllJijanggan([
            { position: '년주', zhi: saju.pillars.year.zhi },
            { position: '월주', zhi: saju.pillars.month.zhi },
            { position: '일주', zhi: saju.pillars.day.zhi },
            { position: '시주', zhi: saju.pillars.time.zhi },
          ])
        }
      } catch (error) {
        logger.error('Error in analyzeAllJijanggan:', error)
      }

      // 해화지기 마스터 엔진 데이터 계산
      let engineData: {
        sipseong: SipseongMap | null
        sibjiunseong: SibjiunseongResult | null
        sinsal: SinsalResult[]
        relations: RelationResult | null
        mulsang: (typeof GAN_MULSANG)[string] | null
        warnings: WarningsResult | null
      } = { sipseong: null, sibjiunseong: null, sinsal: [], relations: null, mulsang: null, warnings: null }

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
          const sipseongResult = analyzeSipseong(saju.dayMaster, pillarsForSipseong)

          engineData = {
            sipseong: sipseongResult,
            sibjiunseong: analyzeSibjiunseong(saju.dayMaster, pillarsForSibj),
            sinsal: calculateExtendedSinsal(saju),
            relations: analyzeRelations(pillarsForRel, dayGanji),
            mulsang: GAN_MULSANG[saju.dayMaster] || null,
            warnings: analyzeWarnings(saju, yongsinAnalysis, sipseongResult),
          }
        } catch (e) {
          logger.error('[ManseEngine] Error:', e)
        }
      }

      return {
        saju,
        gekgukAnalysis,
        yongsinAnalysis,
        yukchinAnalysis,
        daeunList,
        gaeunbubRec,
        jijanggan,
        engineData,
      }
    }, [selectedMember])

  const openTermDialog = (term: string) => {
    if (TERMINOLOGY[term]) {
      setTermDialog({ open: true, term })
    }
  }

  interface HanjaInfo {
    element: string
    yinyang?: string
    meaning?: string
    animal?: string
    season?: string
  }

  const openHanjaDialog = (hanja: string, korean: string, info: HanjaInfo, type: 'tiangan' | 'dizhi' | 'wuxing') => {
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
    info: HanjaInfo
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
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gold-500/10 text-gold-500 text-xs hover:bg-gold-500/20 transition-colors"
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
          <span className="ml-2 px-2 py-0.5 rounded-full bg-gold-500/20 text-gold-500 text-[10px]">유료</span>
        )}
      </h3>

      {/* Content */}
      <div className={cn(!isSubscribed && 'blur-sm select-none pointer-events-none')}>{children}</div>

      {/* Premium Overlay */}
      {!isSubscribed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="text-center space-y-4 p-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center">
              <Crown className="w-8 h-8 text-gold-500" />
            </div>
            <h4 className="text-lg font-bold text-ink-light">프리미엄 회원 전용</h4>
            <p className="text-sm text-muted-foreground max-w-xs">
              {title} 기능은 프리미엄 회원만 이용하실 수 있습니다.
            </p>
            <Link href="/protected/membership">
              <Button className="bg-gold-500 hover:bg-gold-300 text-background">
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
        <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-gold-500/20 to-gold-500/5 flex items-center justify-center mb-6 border border-gold-500/20">
          <User className="w-10 h-10 text-gold-500" />
        </div>
        <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 bg-clip-text text-transparent">
          내 정보를 먼저 등록해주세요
        </h1>
        <p className="text-muted-foreground mb-2 text-base">
          만세력 분석을 받으시려면 먼저 본인의 생년월일 정보가 필요합니다.
        </p>
        <p className="text-sm text-muted-foreground/70 mb-8">
          정확한 사주 풀이를 위해 생년월일과 출생 시간을 입력해주세요.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button asChild size="lg" className="bg-gold-500 text-black hover:bg-gold-300 shadow-lg">
            <Link href="/protected/settings">
              <User className="w-4 h-4 mr-2" />내 정보 입력하기
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-gold-500/30 text-gold-500 hover:bg-gold-500/10">
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
        <Button asChild className="bg-gold-500 text-black hover:bg-gold-300">
          <Link href="/protected/family">인연 등록하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      {/* Subtle Background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gold-500/[0.03] rounded-full blur-[200px]" />
      </div>

      <div className="w-full max-w-full mx-auto px-1 md:px-2 py-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gold-500/10 border border-gold-500/20">
            <ScrollText className="w-4 h-4 text-gold-500" />
            <span className="text-xs font-bold text-gold-500 tracking-wider">만세력 · 전문</span>
          </div>
          <h1 className="text-4xl font-black">
            <span className="bg-gradient-to-r from-gold-500 via-gold-300 to-gold-500 bg-clip-text text-transparent">
              만세력
            </span>
          </h1>
          <p className="text-muted-foreground">사주팔자의 천간·지지·오행을 전문가 수준으로 분석합니다</p>
        </div>

        {/* 분석 대상 선택 — 모양은 `TargetSelect` 하나가 정한다(2026-08-25 드롭다운 통일). */}
        <div className="w-full max-w-xs mx-auto">
          <TargetSelect
            label="분석 대상 선택"
            targets={members.map((m) => ({
              id: m.id,
              name: m.name,
              relation: m.relationship,
              // 구 드롭다운의 남/여 배지를 여기로 옮겼다 — 정보를 잃지 않으면서 줄을 하나로 줄인다.
              hint: `${m.gender === 'male' ? '남' : '여'} · ${m.birth_date}${m.birth_time ? ` · ${m.birth_time}` : ''}`,
            }))}
            value={selectedMemberId}
            onChange={setSelectedMemberId}
            placeholder="분석할 대상을 선택하세요"
          />
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
                    {isSolarCalendar(selectedMember.calendar_type) ? '양력' : '음력'})
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
            {/* 탭 계측은 GA 파사드 단일 경로(GA.manseTab) — 양 세션이 각자 넣은 이벤트명을 병합에서 통일 */}
            <Tabs defaultValue="mysaju" className="w-full" onValueChange={(v) => GA.manseTab(v)}>
              <TabsList className="dancheong-border-top grid w-full grid-cols-3 bg-white/[0.08] border border-white/20 rounded-2xl mb-8 p-2 relative z-10 gap-1.5 h-auto shadow-lg">
                <TabsTrigger
                  value="mysaju"
                  className="group relative data-[state=active]:!bg-gold-500/25 data-[state=active]:!text-gold-500 data-[state=active]:shadow-[0_0_8px_rgba(212,175,55,0.15)] data-[state=active]:border-gold-500/40 flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                >
                  <ScrollText className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold">나의사주</span>
                </TabsTrigger>
                <TabsTrigger
                  value="fortune"
                  className="group relative data-[state=active]:!bg-purple-500/25 data-[state=active]:!text-purple-400 data-[state=active]:shadow-[0_0_8px_rgba(168,85,247,0.15)] data-[state=active]:border-purple-500/40 flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                >
                  <TrendingUp className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold">운세흐름</span>
                </TabsTrigger>
                <TabsTrigger
                  value="report"
                  className="group relative data-[state=active]:!bg-emerald-500/25 data-[state=active]:!text-emerald-400 data-[state=active]:shadow-[0_0_8px_rgba(16,185,129,0.15)] data-[state=active]:border-emerald-500/40 flex items-center justify-center gap-1.5 px-2 py-3 rounded-xl border border-white/15 text-white/60 hover:text-white/80 hover:bg-white/10 transition-all duration-200"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="text-xs font-semibold">분석리포트</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab: 나의사주 */}
              <TabsContent value="mysaju" className="space-y-10 mt-10">
                {/* Four Pillars - Main Display */}
                <Card className="p-8 bg-white/5 border-white/10">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      사주팔자 (四柱八字)
                    </h3>
                    <div className="flex items-center gap-4">
                      {saju.ganjiList.map((ganji, idx) => (
                        <div key={idx} className="flex flex-col items-center justify-center">
                          <span className="text-lg font-black text-ink-light mb-0.5">{ganji}</span>
                          <span className="text-lg font-bold text-gold-500">
                            {TIANGAN_INFO[ganji[0]]?.korean || ''}
                            {DIZHI_INFO[ganji[1]]?.korean || ''}
                          </span>
                        </div>
                      ))}
                    </div>
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

                  {/* 8글자 개별 풀이 */}
                  <div className="mt-6 pt-5 border-t border-white/5 space-y-3">
                    <p className="text-xs text-muted-foreground/60 font-medium">✦ 사주 8글자 개별 풀이</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        {
                          label: '년간',
                          char: saju.pillars.year.gan,
                          pos: '년주 천간',
                          meaning: '조상·초년운·사회적 기운',
                        },
                        {
                          label: '년지',
                          char: saju.pillars.year.zhi,
                          pos: '년주 지지',
                          meaning: '뿌리·가문·타고난 환경',
                        },
                        {
                          label: '월간',
                          char: saju.pillars.month.gan,
                          pos: '월주 천간',
                          meaning: '부모·청년운·직업 기운',
                        },
                        {
                          label: '월지',
                          char: saju.pillars.month.zhi,
                          pos: '월주 지지',
                          meaning: '월령·핵심 기운·사회운',
                        },
                        {
                          label: '일간',
                          char: saju.pillars.day.gan,
                          pos: '일주 천간 (나)',
                          meaning: '나 자신·자아·배우자 인연',
                        },
                        {
                          label: '일지',
                          char: saju.pillars.day.zhi,
                          pos: '일주 지지',
                          meaning: '배우자궁·중년운·내면',
                        },
                        {
                          label: '시간',
                          char: saju.pillars.time.gan,
                          pos: '시주 천간',
                          meaning: '자녀·말년운·노력의 결실',
                        },
                        {
                          label: '시지',
                          char: saju.pillars.time.zhi,
                          pos: '시주 지지',
                          meaning: '노년·자녀궁·미래 에너지',
                        },
                      ].map(({ label, char, pos, meaning }) => {
                        const ganInfo = TIANGAN_INFO[char]
                        const zhiInfo = DIZHI_INFO[char]
                        const info = ganInfo || zhiInfo
                        return (
                          <div key={label} className="bg-white/5 border border-white/10 p-3 rounded-xl">
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-[10px] text-muted-foreground/50">{label}</span>
                              <span
                                className="text-lg font-black"
                                style={{ color: info?.element ? WU_XING_COLORS[info.element] : GOLD_500 }}
                              >
                                {char}
                              </span>
                            </div>
                            <p className="text-[10px] text-gold-500/70 mb-0.5">{pos}</p>
                            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{meaning}</p>
                            {info?.element && (
                              <p className="text-[10px] text-white/30 mt-1">
                                {WUXING_KOREAN[info.element]}({info.element}) ·{' '}
                                {ganInfo ? ganInfo.yinyang : zhiInfo?.animal}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 풀이 버튼 */}
                  <div className="mt-8 flex justify-center border-t border-white/5 pt-6">
                    <button
                      onClick={() => setSajuInterpretOpen(true)}
                      className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                    >
                      <Sparkles className="w-3.5 h-3.5" />✦ 내 사주 종합 풀이 보기
                    </button>
                  </div>
                </Card>

                {/* Wuxing Distribution */}
                <Card className="p-8 bg-white/5 border-white/10">
                  <div className="flex items-center mb-6">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                      오행 분포 (五行分布)
                    </h3>
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
                  <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
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
                    <button
                      onClick={() => setWuxingAnalysisOpen(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                    >
                      <Sparkles className="w-3.5 h-3.5" />✦ 내 오행 풀이 보기
                    </button>
                  </div>
                </Card>

                {/* 육친 관계도 */}
                <Card className="p-8 bg-white/5 border-white/10">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    육친 관계도 (六親關係圖)
                  </h3>
                  {yukchinAnalysis && Object.keys(yukchinAnalysis).length > 0 ? (
                    <div className="space-y-6">
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
                      <div className="mt-5 pt-4 border-t border-gold-500/10">
                        <button
                          onClick={() => setYukchinAnalysisOpen(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                        >
                          <Sparkles className="w-3.5 h-3.5" />✦ 내 육친 풀이 보기
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">육친 데이터를 불러오는 중...</p>
                  )}
                </Card>

                {/* 신살 — 새 엔진 실제 데이터 */}
                {engineData.sinsal.length > 0 && (
                  <Card className="p-8 bg-white/5 border-white/10">
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      신살 (神殺) — 내 사주에 깃든 특별한 별
                    </h3>
                    <p className="text-xs text-muted-foreground/70 leading-relaxed mb-6">
                      {SECTION_DESCRIPTIONS.sinsal.intro}
                    </p>
                    <div className="space-y-4">
                      {engineData.sinsal.map((s, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-xl bg-white/5 border border-white/10 hover:border-gold-500/30 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-gold-500 font-black text-sm">{s.name}</span>
                              <span className="text-muted-foreground/50 text-xs">{s.hanja}</span>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-500 shrink-0">
                              {s.category}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs leading-relaxed mb-2">{s.poeticDesc}</p>
                          {s.modernSkillTree && (
                            <p className="text-[10px] text-white/30">현대 재능: {s.modernSkillTree}</p>
                          )}
                          {s.modernJobs && s.modernJobs.length > 0 && (
                            <p className="text-[10px] text-white/30 mt-0.5">
                              적합 직업: {s.modernJobs.slice(0, 3).join(' · ')}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

                {/* 용어 사전 - 기본정보 탭 하단 */}
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-4 h-4 text-gold-500" />
                    <h3 className="text-sm font-bold text-gold-500">사주 용어 사전</h3>
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
                <div className="mt-6 text-center">
                  <Link
                    href="/protected/studio"
                    className="text-xs text-gold-500/60 hover:text-gold-500 underline underline-offset-2 transition-colors"
                  >
                    관상 · 손금 · 풍수 분석 →
                  </Link>
                </div>
              </TabsContent>

              {/* Tab: 분석리포트 (장점+단점 통합) */}
              <TabsContent value="report">
                <PremiumFeature title="분석 리포트" isSubscribed={isSubscribed}>
                  <div className="hanji-card space-y-10 mt-4">
                    {/* 신강신약 & 십성 분포 — 새 엔진 */}
                    {engineData.sipseong && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          신강신약 & 십성 분포
                        </h3>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed mb-6">
                          일간(나)의 힘이 강한지 약한지(신강·신약), 그리고 사주에 어떤 십성(十星 — 관계·적성의 기운)이
                          많은지를 봅니다.
                        </p>
                        <div className="space-y-5">
                          {/* 신강/신약 요약 */}
                          <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-gold-500 font-bold text-sm">
                                {engineData.sipseong.strengthAssessment}
                              </p>
                              <span className="text-xs px-3 py-1 rounded-full bg-gold-500/15 text-gold-500">
                                {engineData.sipseong.bodyStrengthScore}점
                              </span>
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                              {engineData.sipseong.summary}
                            </p>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-muted-foreground/60">지배 십성</span>
                              <span className="text-white/80 font-bold">{engineData.sipseong.dominantSipseong}</span>
                            </div>
                          </div>
                          {/* 십성별 현대적 해석 */}
                          {engineData.sipseong.distribution && (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground/60 font-medium">
                                내 사주에 담긴 십성 — 현대적 해석
                              </p>
                              {Object.entries(engineData.sipseong.distribution)
                                .filter(([, v]) => (v as number) > 0)
                                .sort(([, a], [, b]) => (b as number) - (a as number))
                                .map(([name, count]) => {
                                  const sipseongDesc: Record<string, string> = {
                                    비견: '독립심과 자기주장이 강합니다. 경쟁과 협업 모두 잘합니다.',
                                    겁재: '추진력과 승부욕이 넘칩니다. 재물 기복을 주의하세요.',
                                    식신: '표현력과 창의력이 풍부합니다. 예술·요식·엔터테인먼트에 재능이 있습니다.',
                                    상관: '재능이 출중하고 언변이 날카롭습니다. 기존 틀을 깨는 혁신가 기질입니다.',
                                    편재: '사교적이고 돈을 다루는 감각이 있습니다. 투자·영업·무역에 적합합니다.',
                                    정재: '성실하고 꾸준합니다. 재물을 안전하게 모으는 재주가 있습니다.',
                                    편관: '추진력과 리더십이 있습니다. 군·경·법·스포츠에서 강합니다.',
                                    정관: '명예와 책임감을 중시합니다. 공직·관리직·전문직에 어울립니다.',
                                    편인: '직관과 예술 감각이 뛰어납니다. 종교·철학·특수 기술 분야에 재능이 있습니다.',
                                    정인: '학문과 배움을 사랑합니다. 교육·연구·자격증 취득에 유리합니다.',
                                  }
                                  return (
                                    <div
                                      key={name}
                                      className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
                                    >
                                      <div className="shrink-0 text-center w-10">
                                        <span className="text-sm font-black text-gold-500">{name}</span>
                                        <p className="text-[10px] text-muted-foreground/40">{count as number}개</p>
                                      </div>
                                      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
                                        {sipseongDesc[name] || ''}
                                      </p>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </div>
                        <div className="mt-5 pt-4 border-t border-gold-500/10">
                          <button
                            onClick={() => setSajuInterpretOpen(true)}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                          >
                            <Sparkles className="w-3.5 h-3.5" />✦ 사주 종합 풀이 보기
                          </button>
                        </div>
                      </Card>
                    )}

                    {/* 지장간(藏干) — 지지 속에 숨은 천간의 기운 (신규) */}
                    {jijanggan && jijanggan.entries.length > 0 && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          지장간 (藏干) — 지지 속에 숨은 기운
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                          각 지지(地支) 안에는 천간(天干)의 기운이 숨어 있습니다. 여기(餘氣)·중기(中氣)·본기(本氣)
                          순으로 담기며, 본기가 그 지지의 주인입니다. 겉으로 드러난 팔자 아래 흐르는 &lsquo;숨은
                          뿌리&rsquo;예요.
                        </p>
                        <div className="space-y-3">
                          {jijanggan.entries.map((e) => (
                            <div key={e.position} className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <div className="flex items-center gap-2 mb-3">
                                <span className="text-gold-500 font-black text-sm">{e.position}</span>
                                <span className="text-muted-foreground/50 text-xs">
                                  {e.zhi} ({DIZHI_INFO[e.zhi]?.korean ?? ''})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {(
                                  [
                                    { gan: e.jijanggan.yeogi, days: e.jijanggan.yeogiDays, label: '여기' },
                                    { gan: e.jijanggan.junggi, days: e.jijanggan.junggiDays, label: '중기' },
                                    { gan: e.jijanggan.bongi, days: e.jijanggan.bongiDays, label: '본기' },
                                  ] as const
                                )
                                  .filter((h) => h.gan)
                                  .map((h) => {
                                    const info = h.gan ? TIANGAN_INFO[h.gan] : undefined
                                    const el = info?.element ?? ''
                                    return (
                                      <div
                                        key={h.label}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/20 border border-white/5"
                                      >
                                        <span className="text-[10px] text-muted-foreground/50">{h.label}</span>
                                        <span
                                          className="font-bold text-sm"
                                          style={{ color: WU_XING_COLORS[el] ?? GOLD_500 }}
                                        >
                                          {h.gan}
                                        </span>
                                        <span className="text-[11px] text-white/60">
                                          {info?.korean}·{WUXING_KOREAN[el] ?? el}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/40">{h.days}일</span>
                                      </div>
                                    )
                                  })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card>
                    )}
                  </div>
                </PremiumFeature>
              </TabsContent>

              {/* Tab: 운세 흐름 */}
              <TabsContent value="fortune">
                <PremiumFeature title="운세 흐름 분석" isSubscribed={isSubscribed}>
                  <div className="hanji-card space-y-10 mt-4">
                    {/* 대운/세운 */}
                    <Card className="p-8 bg-white/5 border-white/10">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        대운·세운 (大運·歲運)
                      </h3>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed mb-6">
                        {SECTION_DESCRIPTIONS.daewoon.intro}
                      </p>
                      {daeunList.length > 0 ? (
                        <div className="space-y-6">
                          {/* 현재 대운 */}
                          {(() => {
                            const currentYear = new Date().getFullYear()
                            const currentDaeun =
                              daeunList.find((d) => currentYear >= d.startYear && currentYear <= d.endYear) ||
                              daeunList[0]

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
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {currentDaeun.description}
                                </p>
                              )
                            })()}
                          </div>
                          <div className="mt-5 pt-4 border-t border-gold-500/10">
                            <button
                              onClick={() => setDaeunExplainOpen(true)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                            >
                              <Sparkles className="w-3.5 h-3.5" />✦ 내 인생 흐름 풀이 보기
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">대운 데이터를 불러오는 중...</p>
                      )}
                    </Card>

                    {/* 십이운성 — 내 사주의 생명력 흐름 (새 엔진) */}
                    {engineData.sibjiunseong && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          십이운성 — 내 사주의 생명력 흐름
                        </h3>
                        <p className="text-xs text-muted-foreground/70 leading-relaxed mb-5">
                          {SECTION_DESCRIPTIONS.sibiWoonSung.intro}
                        </p>
                        <div className="space-y-5">
                          {/* 전체 에너지 요약 */}
                          <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-gold-500 font-bold text-sm">{engineData.sibjiunseong.overallEnergy}</p>
                              <span className="text-xs text-muted-foreground/60 bg-white/5 px-2 py-0.5 rounded-full">
                                평균 {engineData.sibjiunseong.averageLevel.toFixed(1)} / 12단계
                              </span>
                            </div>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {engineData.sibjiunseong.waveDescription}
                            </p>
                          </div>

                          {/* 기둥별 십이운성 카드 */}
                          <div className="grid grid-cols-4 gap-3">
                            {engineData.sibjiunseong.items.map((item, i) => {
                              const isHigh = item.level >= 9
                              const isLow = item.level <= 3
                              return (
                                <div
                                  key={i}
                                  className={`p-3 rounded-xl border text-center ${
                                    isHigh
                                      ? 'bg-gold-500/10 border-gold-500/30'
                                      : isLow
                                        ? 'bg-white/[0.03] border-white/5 opacity-70'
                                        : 'bg-white/5 border-white/10'
                                  }`}
                                >
                                  <p className="text-[10px] text-muted-foreground/50 mb-1">{item.pillarName}</p>
                                  <p className={`text-sm font-black ${isHigh ? 'text-gold-500' : 'text-white/80'}`}>
                                    {item.sibjiunseong}
                                  </p>
                                  <div className="w-full h-1.5 bg-white/5 rounded-full mt-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${isHigh ? 'bg-gradient-to-r from-gold-500 to-gold-300' : 'bg-white/30'}`}
                                      style={{ width: `${(item.level / 12) * 100}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-muted-foreground/40 mt-1">{item.level}/12</p>
                                </div>
                              )
                            })}
                          </div>

                          {/* 십이운성별 의미 설명 */}
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground/60 font-medium">각 기둥의 의미</p>
                            {engineData.sibjiunseong.items.map((item, i) => (
                              <div
                                key={i}
                                className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/5"
                              >
                                <div className="shrink-0 text-center w-14">
                                  <span className="text-xs font-bold text-gold-500">{item.sibjiunseong}</span>
                                  <p className="text-[10px] text-muted-foreground/40">{item.pillarName}</p>
                                </div>
                                <div className="flex-1">
                                  <p className="text-xs text-muted-foreground leading-relaxed">{item.meaning}</p>
                                  {item.actionGuide && (
                                    <p className="text-[10px] text-gold-500/60 mt-1">→ {item.actionGuide}</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 합충형 — 운세 흐름에 영향 (새 엔진) */}
                    {engineData.relations && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          합·충·형 — 내 사주 에너지의 충돌과 조화
                        </h3>
                        <div className="space-y-4">
                          <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                            <p className="text-gold-500 font-bold text-sm mb-2">
                              {engineData.relations.dominantRelation}
                            </p>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {engineData.relations.summary}
                            </p>
                          </div>

                          <div className="space-y-3">
                            {engineData.relations.hap.length > 0 && (
                              <div className="p-4 rounded-xl bg-green-900/15 border border-green-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-green-400 font-bold text-xs">합(合) — 서로 당기는 기운</span>
                                </div>
                                <p className="text-green-300/80 text-xs mb-2">
                                  {engineData.relations.hap.join('  ·  ')}
                                </p>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  합이 있으면 인연이 이어지고 일이 뭉쳐지는 힘이 있습니다. 팀워크, 협업, 인간관계에서
                                  에너지가 활성화됩니다.
                                </p>
                              </div>
                            )}
                            {engineData.relations.chung.length > 0 && (
                              <div className="p-4 rounded-xl bg-red-900/15 border border-red-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-red-400 font-bold text-xs">충(沖) — 부딪히는 기운</span>
                                </div>
                                <p className="text-red-300/80 text-xs mb-2">
                                  {engineData.relations.chung.join('  ·  ')}
                                </p>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  충이 있으면 변화와 이동이 잦습니다. 충돌 에너지를 잘 쓰면 강한 추진력이 되고, 잘못
                                  쓰면 갈등·사고로 이어집니다.
                                </p>
                              </div>
                            )}
                            {engineData.relations.hyeong.length > 0 && (
                              <div className="p-4 rounded-xl bg-orange-900/15 border border-orange-500/20">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-orange-400 font-bold text-xs">형(刑) — 마찰·긴장</span>
                                </div>
                                <p className="text-orange-300/80 text-xs mb-2">
                                  {engineData.relations.hyeong.join('  ·  ')}
                                </p>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  형은 내면의 긴장감과 자기 절제를 요구합니다. 법·규율·의료 분야에서 능력이 발휘되는
                                  경우가 많습니다.
                                </p>
                              </div>
                            )}
                            {engineData.relations.gongmang.length > 0 && (
                              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-white/50 font-bold text-xs">
                                    공망(空亡) — 빈자리, 열린 가능성
                                  </span>
                                </div>
                                <p className="text-white/40 text-xs mb-2">
                                  {engineData.relations.gongmang.join('  ·  ')}
                                </p>
                                <p className="text-muted-foreground text-xs leading-relaxed">
                                  공망은 그 기운이 &ldquo;없어진&rdquo; 것이 아니라 &ldquo;잠시 비워진&rdquo;
                                  상태입니다. 오히려 욕심을 내려놓을 때 예상 밖의 행운이 옵니다.
                                </p>
                              </div>
                            )}
                            {engineData.relations.hap.length === 0 &&
                              engineData.relations.chung.length === 0 &&
                              engineData.relations.hyeong.length === 0 && (
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                  <p className="text-muted-foreground text-xs text-center">
                                    뚜렷한 합충형이 없는 안정된 구조입니다. 균형 잡힌 에너지가 특징입니다.
                                  </p>
                                </div>
                              )}
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 개운법 (구 실천 가이드 내용) */}
                    {/* 용신론 - 동적 데이터 */}
                    {yongsinAnalysis && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          {SECTION_DESCRIPTIONS.yongsin.title}
                        </h3>
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
                                  <p className="text-sm font-medium">
                                    {ELEMENT_BOOST[yongsinAnalysis.yongsin].direction}
                                  </p>
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
                          <div className="mt-5 pt-4 border-t border-gold-500/10">
                            <button
                              onClick={() => setYongsinExplainOpen(true)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                            >
                              <Sparkles className="w-3.5 h-3.5" />✦ 내 행운 키워드 풀이 보기
                            </button>
                          </div>
                        </div>
                      </Card>
                    )}

                    {/* 격국 분석 */}
                    <Card className="p-8 bg-white/5 border-white/10">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {SECTION_DESCRIPTIONS.gekguk.title}
                      </h3>
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
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              {gekgukAnalysis.description}
                            </p>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                              {gekgukAnalysis.characteristics.map((char, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <span className="text-primary mt-1">•</span>
                                  <span>{char}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="mt-5 pt-4 border-t border-gold-500/10">
                            <button
                              onClick={() => setGekgukExplainOpen(true)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                            >
                              <Sparkles className="w-3.5 h-3.5" />✦ 내 사주 그릇 풀이 보기
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">사주 데이터를 불러오는 중...</p>
                      )}
                    </Card>

                    {/* 개운법 */}
                    <Card className="p-8 bg-white/5 border-white/10">
                      <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {SECTION_DESCRIPTIONS.gaeunbub.title}
                      </h3>
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
                          {/* 색·방위·직업 용신 활용정보는 「용신론」이 정본 — 개운법은 '행동'만 남긴다(중복 정리) */}
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
                          <div className="mt-5 pt-4 border-t border-gold-500/10">
                            <button
                              onClick={() => setGaeunbubExplainOpen(true)}
                              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-[#C9A227] via-gold-300 to-[#C9A227] text-[#1a0e00] text-xs font-bold tracking-wide shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:shadow-[0_0_20px_rgba(212,175,55,0.45)] hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 border border-gold-500/40"
                            >
                              <Sparkles className="w-3.5 h-3.5" />✦ 오늘부터 실천하기
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">개운법 데이터를 불러오는 중...</p>
                      )}
                    </Card>

                    {/* 일간 물상론 — 내 기질과 타고난 재능 (새 엔진) */}
                    {engineData.mulsang && saju && (
                      <Card className="p-8 bg-white/5 border-white/10">
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-6 flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          일간 물상론 — 내가 타고난 기질과 재능
                        </h3>
                        <div className="space-y-5">
                          {/* 일간 심볼 */}
                          <div className="p-5 rounded-xl bg-gold-500/5 border border-gold-500/20 text-center">
                            <p className="text-4xl font-black text-gold-500 mb-1">{saju.dayMaster}</p>
                            <p className="text-gold-300 font-bold text-sm mb-3">{engineData.mulsang.symbol}</p>
                            <p className="text-muted-foreground text-xs leading-relaxed italic">
                              &ldquo;{engineData.mulsang.poeticDesc}&rdquo;
                            </p>
                          </div>

                          {/* 심리 특성 */}
                          <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <p className="text-white/80 font-bold text-xs mb-2">내면의 심리 특성</p>
                            <p className="text-muted-foreground text-xs leading-relaxed">
                              {engineData.mulsang.psychology}
                            </p>
                          </div>

                          {/* 현대 직업 적성 */}
                          {engineData.mulsang.modernJobs && engineData.mulsang.modernJobs.length > 0 && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                              <p className="text-white/80 font-bold text-xs mb-3">타고난 직업 적성</p>
                              <div className="flex flex-wrap gap-2">
                                {engineData.mulsang.modernJobs.map((job: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-gold-500 text-xs"
                                  >
                                    {job}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 신강/신약에 따른 실천 조언 */}
                          {engineData.sipseong && (
                            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                              <p className="text-gold-500 font-bold text-xs mb-2">
                                💡 {engineData.sipseong.strengthAssessment} 기질의 실천 조언
                              </p>
                              <p className="text-muted-foreground text-xs leading-relaxed">
                                {engineData.sipseong.strengthAssessment.includes('신강') ||
                                engineData.sipseong.strengthAssessment.includes('강')
                                  ? `일간의 기운이 강합니다. 주도적으로 나서는 것이 맞지만, 때론 타인의 의견을 경청하고 조율하는 연습이 필요합니다. ${engineData.mulsang.symbol}의 에너지를 과하지 않게, 바깥으로 향하게 하세요.`
                                  : `일간의 기운이 약합니다. 자신의 페이스를 지키면서 꾸준히 나아가는 것이 중요합니다. ${engineData.mulsang.symbol}의 섬세한 감각을 믿고, 서두르지 않는 것이 최고의 전략입니다.`}
                              </p>
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* 신살 정본은 「나의 사주」 탭 1곳에만 노출 — 운세흐름 재노출 제거(중복 정리) */}

                    {/* dancheong-divider */}
                    <div className="dancheong-divider my-10" />

                    {engineData.warnings ? (
                      <>
                        {/* 통합 위험 지수 */}
                        <Card className="p-6 bg-rose-950/20 border-rose-500/30">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              통합 위험 지수
                            </h3>
                            <span
                              className={cn(
                                'px-3 py-1 rounded-full text-xs font-bold',
                                engineData.warnings.riskLevel === 'low' && 'bg-emerald-500/20 text-emerald-400',
                                engineData.warnings.riskLevel === 'medium' && 'bg-yellow-500/20 text-yellow-400',
                                engineData.warnings.riskLevel === 'high' && 'bg-orange-500/20 text-orange-400',
                                engineData.warnings.riskLevel === 'critical' && 'bg-rose-500/20 text-rose-400'
                              )}
                            >
                              {engineData.warnings.riskLabel}
                            </span>
                          </div>
                          <div className="relative h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                            <div
                              className={cn(
                                'h-full rounded-full transition-all duration-700',
                                engineData.warnings.riskScore < 25 && 'bg-emerald-500',
                                engineData.warnings.riskScore >= 25 &&
                                  engineData.warnings.riskScore < 50 &&
                                  'bg-yellow-500',
                                engineData.warnings.riskScore >= 50 &&
                                  engineData.warnings.riskScore < 75 &&
                                  'bg-orange-500',
                                engineData.warnings.riskScore >= 75 && 'bg-rose-500'
                              )}
                              style={{ width: `${engineData.warnings.riskScore}%` }}
                            />
                          </div>
                          <p className="text-right text-xs text-muted-foreground">
                            {engineData.warnings.riskScore} / 100
                          </p>

                          {/* 즉각 행동 지침 */}
                          {engineData.warnings.urgentActions.length > 0 && (
                            <div className="mt-5 space-y-2">
                              <p className="text-xs font-bold text-rose-300 mb-3 flex items-center gap-1">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                즉각 행동 지침
                              </p>
                              {engineData.warnings.urgentActions.map((action, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/30 border border-rose-500/20"
                                >
                                  <span className="text-rose-400 font-bold text-xs shrink-0 mt-0.5">{i + 1}.</span>
                                  <p className="text-xs text-rose-200 leading-relaxed">{action}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </Card>

                        {/* 일간 핵심 약점 */}
                        {engineData.warnings.dayMasterWeakness.flaws.length > 0 && (
                          <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-rose-400" />
                              {saju?.dayMaster}일간 — 타고난 핵심 약점
                            </h3>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                {engineData.warnings.dayMasterWeakness.flaws.map((flaw, i) => (
                                  <div
                                    key={i}
                                    className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/20 border border-rose-500/15"
                                  >
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                                    <p className="text-xs text-white/80 leading-relaxed">{flaw}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="grid grid-cols-1 gap-3 mt-4">
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="text-[10px] text-muted-foreground mb-1">사각지대</p>
                                  {engineData.warnings.dayMasterWeakness.blindSpots.map((b, i) => (
                                    <p key={i} className="text-xs text-white/70">
                                      • {b}
                                    </p>
                                  ))}
                                </div>
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="text-[10px] text-muted-foreground mb-1">대인관계 약점</p>
                                  <p className="text-xs text-white/70">
                                    {engineData.warnings.dayMasterWeakness.relationshipIssue}
                                  </p>
                                </div>
                                <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                  <p className="text-[10px] text-muted-foreground mb-1">건강 취약 부위</p>
                                  <p className="text-xs text-white/70">
                                    {engineData.warnings.dayMasterWeakness.healthRisks.join(', ')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* 기구신 회피 파라미터 */}
                        {engineData.warnings.gigusin && (
                          <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                              <Skull className="w-4 h-4 text-orange-400" />
                              기구신(忌仇神) — 피해야 할 에너지
                            </h3>
                            <div className="mb-4 p-3 rounded-lg bg-orange-950/20 border border-orange-500/20">
                              <p className="text-xs text-orange-300 leading-relaxed">
                                {engineData.warnings.gigusin.description}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                                  <Palette className="w-3 h-3" /> 회피 색상
                                </p>
                                <div className="flex gap-1 flex-wrap">
                                  {engineData.warnings.gigusin.avoidColorHexes.slice(0, 4).map((hex, i) => (
                                    <div
                                      key={i}
                                      className="w-6 h-6 rounded-full border border-white/20"
                                      style={{ backgroundColor: hex }}
                                      title={hex}
                                    />
                                  ))}
                                </div>
                                <p className="text-[10px] text-white/50 mt-1">
                                  {engineData.warnings.gigusin.avoidColors.join(', ')}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                                  <Compass className="w-3 h-3" /> 회피 방위
                                </p>
                                <p className="text-xs font-bold text-orange-300">
                                  {engineData.warnings.gigusin.avoidDirections.join(', ')}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-[10px] text-muted-foreground mb-2">회피 숫자</p>
                                <div className="flex gap-1 flex-wrap">
                                  {engineData.warnings.gigusin.avoidNumbers.map((n) => (
                                    <span
                                      key={n}
                                      className="w-7 h-7 rounded-full bg-orange-500/20 text-orange-300 flex items-center justify-center text-xs font-bold"
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                                <p className="text-[10px] text-muted-foreground mb-2">주의 관계</p>
                                {engineData.warnings.gigusin.avoidRelationships.map((r, i) => (
                                  <p key={i} className="text-[10px] text-white/60">
                                    • {r}
                                  </p>
                                ))}
                              </div>
                            </div>
                          </Card>
                        )}

                        {/* 공망 / 삼재 나란히 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* 공망 */}
                          <Card className="p-5 bg-white/5 border-white/10">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />
                              공망(空亡)
                            </h4>
                            <div className="flex gap-3 mb-3">
                              {[engineData.warnings.gongmang.zhi1Kor, engineData.warnings.gongmang.zhi2Kor].map(
                                (z, i) => (
                                  <span
                                    key={i}
                                    className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs font-bold"
                                  >
                                    {z}
                                  </span>
                                )
                              )}
                            </div>
                            {engineData.warnings.gongmang.affectedPillars.length > 0 ? (
                              <div className="mb-2">
                                <div className="flex gap-1 flex-wrap mb-2">
                                  {engineData.warnings.gongmang.affectedPillars.map((p, i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        'px-2 py-0.5 rounded text-[10px] font-bold',
                                        engineData.warnings!.gongmang.hasSevere
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : 'bg-yellow-500/20 text-yellow-300'
                                      )}
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : null}
                            <p className="text-[10px] text-muted-foreground leading-relaxed">
                              {engineData.warnings.gongmang.warning || engineData.warnings.gongmang.description}
                            </p>
                          </Card>

                          {/* 삼재 */}
                          <Card
                            className={cn(
                              'p-5 border',
                              engineData.warnings.samjae.isActive
                                ? 'bg-rose-950/20 border-rose-500/30'
                                : 'bg-white/5 border-white/10'
                            )}
                          >
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                              <ShieldAlert
                                className={cn(
                                  'w-3.5 h-3.5',
                                  engineData.warnings.samjae.isActive ? 'text-rose-400' : 'text-muted-foreground'
                                )}
                              />
                              삼재(三災)
                            </h4>
                            {engineData.warnings.samjae.isActive ? (
                              <>
                                <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-3">
                                  {engineData.warnings.samjae.phase}
                                </span>
                                <div className="flex gap-1 mb-3">
                                  {engineData.warnings.samjae.samjaeYears.map((y, i) => (
                                    <span
                                      key={i}
                                      className={cn(
                                        'px-2 py-1 rounded text-[10px] font-bold border',
                                        y === engineData.warnings!.samjae.currentYear
                                          ? 'bg-rose-500/30 border-rose-500/50 text-rose-200'
                                          : 'bg-white/5 border-white/10 text-white/50'
                                      )}
                                    >
                                      {y}년
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-rose-200 leading-relaxed">
                                  {engineData.warnings.samjae.warning}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-xs text-emerald-400 font-bold mb-2">미발동</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {engineData.warnings.samjae.description}
                                </p>
                              </>
                            )}
                          </Card>
                        </div>

                        {/* 원진살 / 백호대살 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card
                            className={cn(
                              'p-5 border',
                              engineData.warnings.wonjinsal.found
                                ? 'bg-purple-950/20 border-purple-500/30'
                                : 'bg-white/5 border-white/10'
                            )}
                          >
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                              원진살(怨嗔殺)
                            </h4>
                            {engineData.warnings.wonjinsal.found ? (
                              <>
                                <div className="flex gap-2 flex-wrap mb-3">
                                  {engineData.warnings.wonjinsal.pairs.map((p, i) => (
                                    <span
                                      key={i}
                                      className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold"
                                    >
                                      {p}
                                    </span>
                                  ))}
                                </div>
                                <p className="text-[10px] text-purple-200 leading-relaxed">
                                  {engineData.warnings.wonjinsal.warning}
                                </p>
                              </>
                            ) : (
                              <p className="text-xs text-emerald-400">원진살 없음</p>
                            )}
                          </Card>

                          <Card
                            className={cn(
                              'p-5 border',
                              engineData.warnings.baekhosal.found
                                ? 'bg-red-950/20 border-red-500/30'
                                : 'bg-white/5 border-white/10'
                            )}
                          >
                            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                              백호대살(白虎大殺)
                            </h4>
                            {engineData.warnings.baekhosal.found ? (
                              <>
                                <span className="inline-block px-3 py-1 rounded-full bg-red-500/20 text-red-300 text-xs font-bold mb-3">
                                  {engineData.warnings.baekhosal.dayPillar} 일주
                                </span>
                                <ul className="space-y-1">
                                  {engineData.warnings.baekhosal.cautions.map((c, i) => (
                                    <li key={i} className="text-[10px] text-red-200 flex items-start gap-1">
                                      <span className="text-red-400 shrink-0">•</span>
                                      {c}
                                    </li>
                                  ))}
                                </ul>
                              </>
                            ) : (
                              <p className="text-xs text-emerald-400">백호대살 없음</p>
                            )}
                          </Card>
                        </div>

                        {/* 십성 과다 단점 */}
                        {engineData.warnings.sipseongExcess.hasExcess && (
                          <Card className="p-6 bg-white/5 border-white/10">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-5 flex items-center gap-2">
                              <TrendingDown className="w-4 h-4 text-orange-400" />
                              십성 과다 — 심리적 약점
                            </h3>
                            <div className="space-y-3">
                              {engineData.warnings.sipseongExcess.list.map((item, i) => (
                                <div key={i} className="p-4 rounded-xl bg-orange-950/20 border border-orange-500/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 text-xs font-bold">
                                      {item.sipseong} ×{item.count}
                                    </span>
                                  </div>
                                  <p className="text-xs text-white/80 mb-2 leading-relaxed">{item.weakness}</p>
                                  <p className="text-[10px] text-emerald-400">완화: {item.mitigation}</p>
                                </div>
                              ))}
                            </div>
                          </Card>
                        )}
                      </>
                    ) : (
                      <Card className="p-8 bg-white/5 border-white/10 text-center">
                        <p className="text-muted-foreground text-sm">경계 분석 데이터를 불러오는 중...</p>
                      </Card>
                    )}
                  </div>
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
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />
              사주 종합 해석
            </DialogTitle>
          </DialogHeader>

          {saju && (
            <div className="space-y-4 text-sm">
              {/* 일간 기질 */}
              {engineData.mulsang && (
                <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                  <p className="text-gold-500 font-bold mb-1.5 text-xs">
                    일간의 기질 — {saju.dayMaster} ({TIANGAN_INFO[saju.dayMaster]?.korean})
                  </p>
                  <p className="text-gold-300/90 text-xs mb-1.5 font-medium">{engineData.mulsang.symbol}</p>
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
                      <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-gold-500/10 text-gold-500">
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
                        <p className="text-gold-500 text-xs font-semibold">
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
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />
              오행 분포 풀이
            </DialogTitle>
          </DialogHeader>
          {saju && (
            <div className="space-y-4 text-sm">
              <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                <p className="text-gold-500 font-bold mb-2 text-xs">내 사주의 오행 구성</p>
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
                    className={`p-4 rounded-xl border ${isStrong ? 'bg-gold-500/5 border-gold-500/30' : isWeak ? 'bg-white/[0.03] border-white/5 opacity-60' : 'bg-white/5 border-white/10'}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl font-black" style={{ color: WU_XING_COLORS[el] }}>
                        {el}
                      </span>
                      <span className="text-white/80 text-xs font-bold">
                        {ko} — {meaning}
                      </span>
                      <span
                        className={`ml-auto text-[10px] px-2 py-0.5 rounded-full ${isStrong ? 'bg-gold-500/20 text-gold-500' : isWeak ? 'bg-white/10 text-white/40' : 'bg-white/10 text-white/60'}`}
                      >
                        {cnt}/{total} {isStrong ? '강함' : isWeak ? '없음' : '보통'}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{isWeak ? lack : trait}</p>
                    {isWeak && (
                      <p className="text-gold-500/70 text-[10px] mt-1.5">💡 {ko}(을)를 보충하면 운이 좋아집니다</p>
                    )}
                    {isStrong && (
                      <p className="text-gold-500/70 text-[10px] mt-1.5">✨ 이 기운이 당신의 핵심 강점입니다</p>
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
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />
              육친 관계도 풀이
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="p-3 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 text-xs font-bold mb-1">육친이란?</p>
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
                    ? 'text-gold-500'
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
                      <span className="text-gold-500 font-black text-lg">{data.count}개</span>
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

      {/* 고급 만세력 풀이 Dialog */}
      {/* 대운·세운 풀이 Dialog */}
      <Dialog open={daeunExplainOpen} onOpenChange={setDaeunExplainOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />내 인생 흐름 풀이
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 font-bold mb-2 text-xs">대운이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                대운(大運)은 10년마다 바뀌는 인생의 큰 계절입니다. 봄이 오면 씨를 뿌리고, 여름엔 키우고, 가을엔 거두고,
                겨울엔 쉬듯이 — 사람의 인생에도 10년 단위로 큰 흐름이 있습니다. 지금 어떤 계절인지 알면, 언제 도전하고
                언제 기다려야 하는지 알 수 있어요.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
              <p className="text-white/80 font-bold mb-1.5 text-xs">세운이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                세운(歲運)은 올해(1년)의 분위기입니다. 대운이 큰 바다의 조류라면, 세운은 오늘의 파도입니다. 같은 대운
                안에서도 해마다 조금씩 다른 흐름이 있습니다. 올해 간지(干支)가 내 사주와 맞으면 술술 풀리고, 충돌하면
                조금 더 신경 써야 합니다.
              </p>
            </div>
            {daeunList.length > 0 &&
              (() => {
                const currentYear = new Date().getFullYear()
                const cur =
                  daeunList.find((d) => currentYear >= d.startYear && currentYear <= d.endYear) || daeunList[0]
                return (
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-white/80 font-bold mb-2 text-xs">현재 대운 — 지금 당신의 인생 계절</p>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-black text-gold-500">
                        {cur.gan}
                        {cur.zhi}
                      </span>
                      <div>
                        <p className="text-white/70 text-xs">{cur.ganjiKorean}</p>
                        <p className="text-muted-foreground text-[10px]">
                          {cur.startYear}년 ~ {cur.endYear}년 ({cur.age})
                        </p>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-xs leading-relaxed">{cur.description}</p>
                  </div>
                )
              })()}
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 text-xs font-bold mb-2">💡 이렇게 활용하세요</p>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li>• 좋은 대운: 크게 도전하고 투자하기 좋은 시기</li>
                <li>• 어려운 대운: 안전하게 지키고 실력 쌓는 시기</li>
                <li>• 좋은 세운: 새로운 시작, 계획 실행에 유리</li>
                <li>• 어려운 세운: 건강과 관계에 신경 쓰고 신중하게</li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 용신 풀이 Dialog */}
      <Dialog open={yongsinExplainOpen} onOpenChange={setYongsinExplainOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />내 행운 키워드 풀이
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 font-bold mb-2 text-xs">용신이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                용신(用神)은 내 사주에서 부족하거나 꼭 필요한 기운입니다. 마치 몸에 부족한 영양소처럼 — 이걸 채워주면
                건강해지듯, 용신을 가까이하면 운이 좋아집니다. 색깔·방향·음식·직업 등 일상에서 쉽게 보충할 수 있어요.
              </p>
            </div>
            {yongsinAnalysis && (
              <>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-2 text-xs">
                    내 용신: {yongsinAnalysis.yongsin} ({WUXING_KOREAN[yongsinAnalysis.yongsin]})
                  </p>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">
                    {WUXING_KOREAN[yongsinAnalysis.yongsin] === '목' &&
                      '나무의 기운입니다. 성장·발전·창의력의 에너지를 가까이하세요.'}
                    {WUXING_KOREAN[yongsinAnalysis.yongsin] === '화' &&
                      '불의 기운입니다. 열정·활기·표현력의 에너지를 가까이하세요.'}
                    {WUXING_KOREAN[yongsinAnalysis.yongsin] === '토' &&
                      '흙의 기운입니다. 안정·신뢰·중심의 에너지를 가까이하세요.'}
                    {WUXING_KOREAN[yongsinAnalysis.yongsin] === '금' &&
                      '쇠의 기운입니다. 결단·정의·수확의 에너지를 가까이하세요.'}
                    {WUXING_KOREAN[yongsinAnalysis.yongsin] === '수' &&
                      '물의 기운입니다. 지혜·유연·포용의 에너지를 가까이하세요.'}
                  </p>
                  {ELEMENT_BOOST[yongsinAnalysis.yongsin] && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-muted-foreground/60 mb-0.5">오늘 입을 색</p>
                        <p className="text-white/80 font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].color}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-muted-foreground/60 mb-0.5">앉을 방향</p>
                        <p className="text-white/80 font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].direction}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-muted-foreground/60 mb-0.5">활동 좋은 시간</p>
                        <p className="text-white/80 font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].time}</p>
                      </div>
                      <div className="bg-white/5 p-2 rounded-lg">
                        <p className="text-muted-foreground/60 mb-0.5">힘 나는 계절</p>
                        <p className="text-white/80 font-medium">{ELEMENT_BOOST[yongsinAnalysis.yongsin].season}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                  <p className="text-gold-500 text-xs font-bold mb-2">💡 오늘 당장 할 수 있는 것</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {ELEMENT_BOOST[yongsinAnalysis.yongsin]?.activities?.slice(0, 3).map((a: string, i: number) => (
                      <li key={i}>✓ {a}</li>
                    ))}
                    {ELEMENT_BOOST[yongsinAnalysis.yongsin]?.foods?.slice(0, 2).map((f: string, i: number) => (
                      <li key={`f${i}`}>🍽 {f} 먹기</li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 격국 풀이 Dialog */}
      <Dialog open={gekgukExplainOpen} onOpenChange={setGekgukExplainOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />내 사주 그릇 풀이
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 font-bold mb-2 text-xs">격국이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                격국(格局)은 내 사주의 타입 또는 그릇입니다. MBTI처럼 &ldquo;이 사람은 어떤 유형이다&rdquo;를 알려주는
                것인데, 사주 방식으로 판단합니다. 격국에 따라 잘 맞는 직업·환경·삶의 방식이 다릅니다.
              </p>
            </div>
            {gekgukAnalysis && (
              <>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-2 text-xs">내 격국: {gekgukAnalysis.gekguk}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mb-3">{gekgukAnalysis.description}</p>
                  <div className="space-y-1.5">
                    {gekgukAnalysis.characteristics?.map((char: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-gold-500 mt-0.5 shrink-0">✦</span>
                        <span className="text-muted-foreground">{char}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                  <p className="text-gold-500 text-xs font-bold mb-2">💡 이 격국의 인생 조언</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {`${gekgukAnalysis.gekguk}의 특성을 살려 자신에게 맞는 환경에서 능력을 발휘하세요. 격국의 특성에 맞는 환경에 있을 때 가장 빛납니다.`}
                  </p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 개운법 풀이 Dialog */}
      <Dialog open={gaeunbubExplainOpen} onOpenChange={setGaeunbubExplainOpen}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-500">
              <Sparkles className="w-5 h-5" />
              오늘부터 실천하는 개운법
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
              <p className="text-gold-500 font-bold mb-2 text-xs">개운법이란?</p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                개운법(開運法)은 말 그대로 &ldquo;운을 여는 방법&rdquo;입니다. 사주에서 부족한 기운을 일상에서 채워 운의
                흐름을 좋게 만드는 실천법입니다. 거창한 게 아니에요 — 오늘 입는 옷 색깔, 앉는 방향, 먹는 음식도 모두
                개운법이 됩니다.
              </p>
            </div>
            {gaeunbubRec && (
              <>
                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                  <p className="text-white/80 font-bold mb-3 text-xs">지금 당장 실천할 수 있는 것들</p>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">👗</span>
                      <div>
                        <p className="text-white/70 text-xs font-medium">오늘 입을 색</p>
                        <p className="text-muted-foreground text-xs">{gaeunbubRec.colors.join(', ')} 계열을 입으세요</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">🧭</span>
                      <div>
                        <p className="text-white/70 text-xs font-medium">앉을 방향</p>
                        <p className="text-muted-foreground text-xs">
                          {gaeunbubRec.directions.join(', ')} 방향을 바라보고 일하면 집중력이 올라갑니다
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="text-lg shrink-0">🔢</span>
                      <div>
                        <p className="text-white/70 text-xs font-medium">행운의 숫자</p>
                        <p className="text-muted-foreground text-xs">
                          {gaeunbubRec.numbers.join(', ')} — 중요한 날짜나 번호를 고를 때 참고하세요
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
                  <p className="text-gold-500 text-xs font-bold mb-2">✦ 이번 주 실천 미션</p>
                  <ul className="space-y-1.5 text-xs text-muted-foreground">
                    {gaeunbubRec.activities.slice(0, 4).map((act: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-gold-500 shrink-0">□</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Term Dialog */}
      <Dialog open={termDialog.open} onOpenChange={(open) => setTermDialog({ ...termDialog, open })}>
        <DialogContent className="bg-[#0f0f0f] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gold-500">
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
