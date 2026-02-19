'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Card } from '@/components/ui/card'
import { BookOpen, User, Compass, Hand, Sparkles, ArrowRight } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { useRouter } from 'next/navigation'
import { SajuLoadingOverlay } from '@/components/shared/SajuLoadingOverlay'

// ── 감성 명리 문구 20선 (하위호환용 — 실제 렌더는 SajuLoadingOverlay 사용) ──
const SAJU_MESSAGES = [
  {
    headline: '재물의 문이 열리는 시기입니다',
    sub: '오행의 흐름이 당신의 재성(財星)을 향해 기울고 있습니다.',
  },
  {
    headline: '지금 이 순간이 대운의 변곡점',
    sub: '하늘이 당신에게 새로운 국면을 준비하고 있습니다.',
  },
  {
    headline: '기다리던 복이 드디어 들어옵니다',
    sub: '씨앗을 뿌린 시간은 결코 사라지지 않습니다.',
  },
  {
    headline: '당신의 명(命)에는 숨겨진 보석이 있습니다',
    sub: '아직 꺼내지 못한 재능과 운이 잠들어 있습니다.',
  },
  {
    headline: '흐름을 알면 두려움이 사라집니다',
    sub: '명리학은 운명을 거스르는 학문이 아닌, 흐름을 읽는 지혜입니다.',
  },
  {
    headline: '지금 당신 곁에 귀인이 있습니다',
    sub: '관성(官星)의 기운이 든든한 후원자를 불러들이고 있습니다.',
  },
  {
    headline: '막혔던 길이 뚫리는 계절입니다',
    sub: '토(土)의 기운이 정화되며 새로운 시작을 알립니다.',
  },
  {
    headline: '당신의 운명은 아직 쓰여지지 않았습니다',
    sub: '사주는 지도입니다. 걷는 사람은 바로 당신입니다.',
  },
  {
    headline: '재물운이 터지는 시기를 읽어드립니다',
    sub: '식상(食傷)과 재성(財星)의 조화가 풍요를 예고합니다.',
  },
  {
    headline: '올해 반드시 한 번 기회가 옵니다',
    sub: '용신(用神)의 기운이 충만한 시절이 가까워지고 있습니다.',
  },
  {
    headline: '사랑과 인연, 그 시기가 보입니다',
    sub: '도화살(桃花殺)의 빛이 당신의 명식 위에서 반짝입니다.',
  },
  {
    headline: '고난은 당신을 단련시키는 과정이었습니다',
    sub: '역경을 넘긴 사람에게 하늘은 반드시 보상을 내립니다.',
  },
  { headline: '건강의 기운을 살펴드립니다', sub: '오행의 균형이 몸과 마음의 조화를 말해줍니다.' },
  {
    headline: '이제 멈출 때가 아니라 더 나아갈 때입니다',
    sub: '목(木)의 상승 기운이 당신의 등을 밀고 있습니다.',
  },
  {
    headline: '당신이 선택한 길이 맞는 방향입니다',
    sub: '명식이 현재의 선택을 지지하고 있습니다.',
  },
  {
    headline: '묵은 업이 풀리는 해입니다',
    sub: '오랫동안 쌓인 것들이 비로소 해소될 시간이 찾아왔습니다.',
  },
  {
    headline: '복(福)은 준비된 자에게 찾아옵니다',
    sub: '지금 이 순간 사주를 살피는 것 자체가 준비입니다.',
  },
  {
    headline: '당신 주변의 에너지가 바뀌고 있습니다',
    sub: '삼합(三合)의 기운이 모여 새로운 국면을 만들어냅니다.',
  },
  {
    headline: '10년 대운의 씨앗이 지금 심어집니다',
    sub: '오늘의 작은 결단이 앞으로 10년을 결정합니다.',
  },
  {
    headline: '당신만의 운명 지도가 펼쳐집니다',
    sub: '천간(天干)과 지지(地支)가 오직 당신만을 위해 배열되어 있습니다.',
  },
]

// ── 해화당 사주풀이 로딩 화면 ──
function SajuLoadingScreen({
  targetName,
  onComplete,
}: {
  targetName: string
  onComplete: () => void
}) {
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * SAJU_MESSAGES.length))
  const [visible, setVisible] = useState(true)
  const [progress, setProgress] = useState(0)

  // 메시지 순환
  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false)
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % SAJU_MESSAGES.length)
        setVisible(true)
      }, 400)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  // 진행바 + 자동 완료
  useEffect(() => {
    const start = Date.now()
    const duration = 5500
    const frame = () => {
      const elapsed = Date.now() - start
      const p = Math.min(elapsed / duration, 1)
      setProgress(p)
      if (p < 1) requestAnimationFrame(frame)
      else onComplete()
    }
    requestAnimationFrame(frame)
  }, [onComplete])

  const msg = SAJU_MESSAGES[msgIndex]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[var(--z-modal)] bg-[#080604] flex flex-col items-center justify-center px-6"
    >
      {/* 배경 파티클 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/30"
            style={{ left: `${10 + i * 7}%`, bottom: '-4px' }}
            animate={{ y: [0, -(300 + i * 40)], opacity: [0, 0.6, 0] }}
            transition={{
              duration: 4 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
              ease: 'easeOut',
            }}
          />
        ))}
      </div>

      {/* 로딩 비주얼 */}
      <div className="relative mb-10">
        {/* 외부 회전 링 */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="w-28 h-28 rounded-full border border-dashed border-primary/20"
        />
        {/* 내부 반대 회전 링 */}
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 5, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-3 rounded-full border border-primary/30"
        />
        {/* 코어 글로우 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            className="w-14 h-14 rounded-full bg-primary/10 border border-primary/50 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            <span className="font-serif text-2xl text-primary">天</span>
          </motion.div>
        </div>
      </div>

      {/* 대상 이름 */}
      <p className="text-xs text-ink-light/30 tracking-[0.3em] uppercase mb-2 font-light">
        {targetName} 님의 사주를 읽는 중
      </p>

      {/* 감성 문구 */}
      <div className="min-h-[72px] flex flex-col items-center justify-center text-center mb-10 px-4">
        <AnimatePresence mode="wait">
          {visible && (
            <motion.div
              key={msgIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-lg font-serif text-primary/90 leading-snug mb-1.5 break-keep">
                {msg.headline}
              </p>
              <p className="text-xs text-ink-light/40 font-light leading-relaxed break-keep max-w-[280px]">
                {msg.sub}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 진행바 */}
      <div className="w-48 h-px bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-gradient-to-r from-primary/40 via-primary to-primary/40 rounded-full"
          style={{ width: `${progress * 100}%` }}
          transition={{ ease: 'linear' }}
        />
      </div>
      <p className="text-[10px] text-ink-light/20 mt-3 tracking-widest font-light">
        {Math.round(progress * 100)}%
      </p>
    </motion.div>
  )
}

interface AnalysisClientPageProps {
  targets: DestinyTarget[]
  initialTargetId?: string
}

function TriadVisual() {
  return (
    <div className="relative w-64 h-64 mx-auto my-6">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-primary/5 blur-[50px] rounded-full animate-pulse" />

      {/* Rotating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute inset-0 border border-dashed border-primary/20 rounded-full"
      />

      {/* Triangle Concept */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full h-full"
        >
          {/* Top: Heaven */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">天</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">사주</span>
              <span className="text-[9px] text-ink-light/50 block">타고난 운명</span>
            </div>
          </div>

          {/* Bottom Left: Earth */}
          <div className="absolute bottom-8 left-6 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">地</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">풍수</span>
              <span className="text-[9px] text-ink-light/50 block">공간의 기운</span>
            </div>
          </div>

          {/* Bottom Right: Human */}
          <div className="absolute bottom-8 right-6 flex flex-col items-center gap-1">
            <div className="w-10 h-10 rounded-full bg-[#1a0505] border border-primary/40 flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.2)]">
              <span className="font-serif text-primary text-base">人</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-ink-light font-bold block">관상</span>
              <span className="text-[9px] text-ink-light/50 block">삶의 의지</span>
            </div>
          </div>

          {/* Connecting Lines */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: -1 }}
          >
            <motion.path
              d="M128 60 L60 180 L196 180 Z"
              fill="none"
              stroke="url(#grad1)"
              strokeWidth="0.5"
              strokeDasharray="4,4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, delay: 0.5 }}
            />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" style={{ stopColor: 'rgba(212,175,55,0.1)', stopOpacity: 1 }} />
                <stop offset="50%" style={{ stopColor: 'rgba(212,175,55,0.5)', stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: 'rgba(212,175,55,0.1)', stopOpacity: 1 }} />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Core */}
          <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-primary/10 rounded-full blur-xl animate-pulse" />
        </motion.div>
      </div>
    </div>
  )
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId || null)
  const [showAnalysisTypeSelection, setShowAnalysisTypeSelection] = useState(false)
  const [showSajuLoading, setShowSajuLoading] = useState(false)

  const handleTargetSelect = (id: string) => {
    setSelectedId(id)
    setShowAnalysisTypeSelection(true)
  }

  const handleAnalysisTypeSelect = (type: 'basic' | 'comprehensive') => {
    if (!selectedId) return

    if (type === 'basic') {
      // 해화당사주풀이: 감성 로딩 화면 후 이동
      setShowSajuLoading(true)
    } else {
      // 천지인종합사주풀이: 바로 이동
      router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=comprehensive`)
    }
  }

  const handleLoadingComplete = useCallback(() => {
    router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=basic`)
  }, [router, selectedId])

  const selectedTarget = targets.find((t) => t.id === selectedId)

  return (
    <>
      <AnimatePresence>
        {showSajuLoading && (
          <SajuLoadingOverlay
            targetName={selectedTarget?.name ?? ''}
            duration={11000}
            onComplete={handleLoadingComplete}
          />
        )}
      </AnimatePresence>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="max-w-3xl mx-auto py-6 px-4 pb-20 overflow-x-hidden"
      >
        {/* 1. Header Area with Visual */}
        <motion.section variants={fadeInUp} className="text-center space-y-4 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-0.5 bg-primary/10 border border-primary/20 rounded-full mb-2">
            <Sparkles className="w-3 h-3 text-primary" strokeWidth={1} />
            <span className="text-[9px] font-medium text-primary tracking-[0.2em] uppercase">
              The Masterpiece
            </span>
          </div>

          <h1 className="text-xl md:text-3xl font-serif font-medium text-ink-light tracking-tight">
            천지인(天地人) 통합 운명 분석
          </h1>

          <p className="text-xs text-ink-light/60 font-light max-w-sm mx-auto leading-normal break-keep">
            하늘의 시기(天), 땅의 기운(地), 사람의 흔적(人).
            <br />세 가지 차원을 통해 당신의 운명을 비춥니다.
          </p>

          <TriadVisual />
        </motion.section>

        {/* 2. Three Pillars Explanation (Consolidated Card) */}
        <motion.section variants={fadeInUp} className="mb-10 text-center md:text-left">
          <Card className="bg-surface/30 border border-white/5 p-4 rounded-xl">
            <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">
              {[
                { icon: BookOpen, title: '천(天): 사주', desc: '하늘의 섭리와 설계도' },
                { icon: Compass, title: '지(地): 풍수', desc: '공간과 환경의 에너지' },
                { icon: Hand, title: '인(人): 관상', desc: '삶의 궤적과 의지' },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex-1 flex items-center md:flex-col md:items-center md:text-center gap-4 p-3 hover:bg-surface/50 transition-colors"
                >
                  <div className="w-8 h-8 flex-shrink-0 bg-[#1a0505] border border-primary/20 rounded-full flex items-center justify-center">
                    <item.icon className="w-3.5 h-3.5 text-primary opacity-70" strokeWidth={1} />
                  </div>
                  <div className="flex flex-col md:gap-1 text-left md:text-center">
                    <h3 className="text-sm font-serif text-ink-light font-medium">{item.title}</h3>
                    <p className="text-xs text-ink-light/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.section>

        {/* 3. Target Selection OR Analysis Type Selection */}
        {!showAnalysisTypeSelection ? (
          <motion.section variants={fadeInUp} className="space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-primary/40 rounded-full" />
              <h3 className="text-lg font-serif text-ink-light">누구의 운명을 보시겠습니까?</h3>
            </div>

            {targets.length > 0 ? (
              <div className="flex flex-col gap-3">
                {targets.map((target) => (
                  <motion.div
                    key={target.id}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Card
                      onClick={() => handleTargetSelect(target.id)}
                      className="bg-surface/20 border-white/10 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group px-4 py-3 flex items-center justify-between min-h-[72px]"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center text-base font-serif text-primary/80 group-hover:text-primary transition-colors flex-shrink-0">
                          {target.name.slice(0, 1)}
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-sm font-serif text-ink-light group-hover:text-primary transition-colors font-medium">
                            {target.name}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-ink-light/40 font-light">
                            <span>{target.relation_type}</span>
                            <span className="w-0.5 h-0.5 bg-white/20 rounded-full" />
                            <span>{target.birth_date}</span>
                          </div>
                        </div>
                      </div>
                      <div className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all ml-4 flex-shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 text-ink-light/30 group-hover:text-[#0A0A0A] transition-colors" />
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            ) : (
              <Card
                onClick={() => router.push('/protected/family')}
                className="bg-surface/10 border-dashed border-primary/20 p-8 text-center cursor-pointer hover:bg-surface/20 transition-colors group"
              >
                <div className="flex flex-col items-center gap-3">
                  <User className="w-8 h-8 text-ink-light/20 group-hover:text-primary/60 transition-colors" />
                  <div className="space-y-1">
                    <p className="text-sm text-ink-light/60 font-medium group-hover:text-primary transition-colors">
                      등록된 분석 대상이 없습니다
                    </p>
                    <p className="text-xs text-ink-light/40 group-hover:text-primary/70 transition-colors">
                      가족 관리에서 대상을 추가해주세요{' '}
                      <ArrowRight className="w-3 h-3 inline ml-1" />
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </motion.section>
        ) : (
          <motion.section variants={fadeInUp} className="space-y-8">
            {/* 선택된 대상 + 뒤로가기 */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAnalysisTypeSelection(false)}
                className="flex items-center gap-1.5 text-xs text-ink-light/40 hover:text-primary transition-colors group"
              >
                <ArrowRight className="w-3 h-3 rotate-180 group-hover:-translate-x-0.5 transition-transform" />
                뒤로
              </button>
              <div className="flex-1 h-px bg-white/5" />
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center text-sm font-serif text-primary">
                  {selectedTarget?.name.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-serif text-ink-light leading-none">
                    {selectedTarget?.name}
                  </p>
                  <p className="text-[10px] text-ink-light/30 mt-0.5">
                    {selectedTarget?.birth_date}
                  </p>
                </div>
              </div>
            </div>

            {/* 섹션 헤더 */}
            <div className="text-center space-y-2">
              <p className="text-[10px] tracking-[0.3em] text-primary/60 uppercase font-medium">
                Select Your Path
              </p>
              <h3 className="text-2xl font-serif text-ink-light tracking-tight">
                어떤 방식으로
                <br />
                <span className="text-primary">운명을 풀어드릴까요?</span>
              </h3>
              <p className="text-xs text-ink-light/40 font-light">
                두 가지 분석 방식 중 하나를 선택하세요
              </p>
            </div>

            {/* ── 두 운명의 문 ── */}
            <div className="space-y-4">
              {/* 문 1: 해화당 사주풀이 */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleAnalysisTypeSelect('basic')}
                className="cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1410] to-[#0f0d0a] hover:border-primary/30 transition-all duration-300 p-6">
                  {/* 배경 무늬 */}
                  <div className="absolute inset-0 opacity-[0.03] bg-[url('/texture/hanji_pattern.png')] bg-repeat pointer-events-none" />
                  <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-primary/5 to-transparent pointer-events-none" />

                  <div className="relative flex items-center gap-5">
                    {/* 왼쪽: 배지 + 아이콘 */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-[9px] px-1.5 py-0.5 rounded border border-white/10 text-ink-light/30 font-medium tracking-wide">
                        기본
                      </span>
                      <div className="flex-shrink-0 w-16 h-16 rounded-xl bg-[#110a06] border border-primary/20 flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.08)] group-hover:border-primary/40 group-hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] transition-all duration-300">
                        <span className="font-serif text-3xl text-primary/80 group-hover:text-primary transition-colors leading-none">
                          天
                        </span>
                      </div>
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-base font-serif text-ink-light group-hover:text-primary transition-colors">
                          해화당 사주풀이
                        </h4>
                      </div>
                      <p className="text-xs text-ink-light/50 font-light leading-relaxed break-keep mb-3">
                        태어난 사주 만세력을 바탕으로
                        <br />
                        타고난 운명·성격·대운의 흐름을 풀이합니다
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-primary/50">
                        {['사주 팔자', '오행 균형', '대운 흐름', '월운 분석'].map((t) => (
                          <span key={t} className="flex items-center gap-1">
                            <span className="w-1 h-1 rounded-full bg-primary/40 inline-block" />
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 화살표 */}
                    <div className="flex-shrink-0 w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:bg-primary group-hover:border-primary transition-all duration-300">
                      <ArrowRight className="w-3.5 h-3.5 text-ink-light/30 group-hover:text-[#0A0A0A] transition-colors" />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 구분선 */}
              <div className="flex items-center gap-3 px-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-[10px] text-ink-light/20 tracking-[0.2em] font-serif">
                  또는
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

              {/* 문 2: 천지인 종합 사주풀이 */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                onClick={() => handleAnalysisTypeSelect('comprehensive')}
                className="cursor-pointer group"
              >
                <div className="relative overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-br from-[#1c1508] via-[#120f07] to-[#0a0906] hover:border-primary/50 transition-all duration-300 p-6 shadow-[0_4px_30px_rgba(212,175,55,0.08)] hover:shadow-[0_8px_40px_rgba(212,175,55,0.18)]">
                  {/* 배경 글로우 */}
                  <div className="absolute inset-0 opacity-[0.04] bg-[url('/texture/hanji_pattern.png')] bg-repeat pointer-events-none" />
                  <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-primary/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-primary/20 transition-all duration-500" />
                  <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/5 rounded-full blur-[30px] pointer-events-none" />

                  <div className="relative flex items-center gap-5">
                    {/* 왼쪽: 배지 + 아이콘 */}
                    <div className="flex flex-col items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-gradient-to-r from-primary to-primary/80 text-[#0A0A0A] text-[9px] font-bold rounded-full tracking-wider shadow-md">
                        ✦ PREMIUM
                      </span>
                      <div className="flex-shrink-0 relative w-16 h-16">
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 border border-primary/40 flex items-center justify-center shadow-[0_0_25px_rgba(212,175,55,0.2)] group-hover:shadow-[0_0_40px_rgba(212,175,55,0.35)] group-hover:border-primary/60 transition-all duration-300">
                          <div className="flex flex-col items-center leading-none">
                            <div className="flex gap-0.5">
                              <span className="font-serif text-[11px] text-primary leading-tight">
                                天
                              </span>
                              <span className="font-serif text-[11px] text-primary/70 leading-tight">
                                地
                              </span>
                            </div>
                            <span className="font-serif text-[11px] text-primary/50 leading-tight mt-0.5">
                              人
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 내용 */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="text-base font-serif text-primary">천지인 종합 사주풀이</h4>
                      </div>
                      <p className="text-xs text-ink-light/60 font-light leading-relaxed break-keep mb-3">
                        사주에 풍수·관상·손금까지 더해
                        <br />
                        입체적이고 완전한 운명을 풀이합니다
                      </p>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[10px] text-primary/60">
                        {[
                          ['天', '사주 만세력'],
                          ['地', '풍수 (주소)'],
                          ['人', '관상 (얼굴)'],
                          ['人', '손금 (손 모양)'],
                        ].map(([char, label]) => (
                          <span key={label} className="flex items-center gap-1.5">
                            <span className="font-serif text-[9px] text-primary/50 w-3 text-center">
                              {char}
                            </span>
                            <span className="text-ink-light/50">{label}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 하단 CTA 바 */}
                  <div className="relative mt-5 pt-4 border-t border-primary/10 flex items-center justify-between">
                    <span className="text-[10px] text-primary/50 font-light">
                      가장 정확한 운명 분석을 원하신다면
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-primary font-medium group-hover:gap-2.5 transition-all">
                      지금 시작
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* 안내 문구 */}
            <p className="text-center text-[10px] text-ink-light/20 font-light pt-2">
              분석에는 약 30초~1분이 소요됩니다
            </p>
          </motion.section>
        )}
      </motion.div>
    </>
  )
}
