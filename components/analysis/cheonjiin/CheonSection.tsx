'use client'

import { toRichField } from '@/lib/domain/analysis/rich-field'
import { motion } from 'framer-motion'
import { Crown, Briefcase, Coins, Heart, Activity, Clock, Zap, Shield } from 'lucide-react'

interface LifeTimelineData {
  pastDecade?: string
  currentDecade?: string
  nextDecade?: string
}

interface CheonSectionProps {
  data: {
    title?: string
    content?: string
    geokguk?: string
    yongsin?: string
    strengths?: string[]
    weaknesses?: string[]
    lifeTimeline?: LifeTimelineData
    /** 🔴 문자열일 수도 객체일 수도 있다 — AI 스키마가 진화했다(2026-08-17 장애). */
    career?: unknown
    /** 🔴 문자열일 수도 객체일 수도 있다 — AI 스키마가 진화했다(2026-08-17 장애). */
    wealth?: unknown
    /** 🔴 문자열일 수도 객체일 수도 있다 — AI 스키마가 진화했다(2026-08-17 장애). */
    love?: unknown
    /** 🔴 문자열일 수도 객체일 수도 있다 — AI 스키마가 진화했다(2026-08-17 장애). */
    health?: unknown
  } | null
}

export function CheonSection({ data }: CheonSectionProps) {
  if (!data) return null

  const { title, content } = data
  const strengths = Array.isArray(data.strengths) ? data.strengths.filter(Boolean) : []
  const weaknesses = Array.isArray(data.weaknesses) ? data.weaknesses.filter(Boolean) : []

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="w-full px-0 py-2 mb-2"
    >
      <div className="relative overflow-hidden bg-surface/20 backdrop-blur-sm border-t border-b border-white/5 py-8 md:py-10">
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[100px] pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="px-5 md:px-8 relative z-10">
          {/* Header */}
          <div className="flex flex-col gap-2 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <span className="font-serif text-lg text-primary">天</span>
              </div>
              <h2 className="text-xl font-bold text-ink-light tracking-tight">
                타고난 사주명리 <span className="text-primary/60 text-sm font-normal ml-1">하늘의 기운</span>
              </h2>
            </div>
            <p className="text-sm text-ink-light/70 font-light pl-13">
              사주 팔자에 근거한 당신의 타고난 기질과 운명의 흐름입니다.
            </p>
          </div>

          {/* Core Content */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-serif text-ink-light mb-3 leading-snug">{title || '타고난 기운의 흐름'}</h3>
              <p className="text-sm md:text-base text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
                {content}
              </p>
            </div>

            {/* 격국·용신 */}
            {(data.geokguk || data.yongsin) && (
              <div className="bg-primary/5 rounded-xl p-4 border border-primary/10 space-y-2">
                <div className="flex items-center gap-2 text-primary mb-1">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold">격국 · 용신</span>
                </div>
                {data.geokguk && (
                  <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                    <span className="text-primary/70 font-medium">격국:</span> {data.geokguk}
                  </p>
                )}
                {data.yongsin && (
                  <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep">
                    <span className="text-primary/70 font-medium">용신:</span> {data.yongsin}
                  </p>
                )}
              </div>
            )}

            {/* 강점/약점 */}
            <div className="grid grid-cols-1 gap-4 pt-2">
              {strengths.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Crown className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-bold tracking-wide">강점</span>
                  </div>
                  <div className="space-y-2">
                    {strengths.map((s: string, idx: number) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg bg-primary/10 text-primary/80 text-sm font-light border border-primary/20 leading-relaxed break-keep"
                      >
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {weaknesses.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-primary-dark/70">
                    <Shield className="w-4 h-4" aria-hidden="true" />
                    <span className="text-sm font-bold tracking-wide">보완점</span>
                  </div>
                  <div className="space-y-2">
                    {weaknesses.map((w: string, idx: number) => (
                      <div
                        key={idx}
                        className="px-3 py-2 rounded-lg bg-primary-dark/5 text-primary-dark/80 text-sm font-light border border-primary-dark/10 leading-relaxed break-keep"
                      >
                        {w}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 인생 타임라인 */}
            {data.lifeTimeline && (
              <div className="space-y-3 pt-4">
                <div className="flex items-center gap-2 text-gold-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">인생 타임라인</span>
                </div>
                <div className="space-y-3">
                  {data.lifeTimeline.pastDecade && (
                    <TimelineCard
                      label="과거 10년"
                      color="text-ink-light/50"
                      borderColor="border-white/10"
                      bgColor="bg-white/[0.03]"
                    >
                      {data.lifeTimeline.pastDecade}
                    </TimelineCard>
                  )}
                  {data.lifeTimeline.currentDecade && (
                    <TimelineCard
                      label="현재"
                      color="text-primary"
                      borderColor="border-primary/30"
                      bgColor="bg-primary/5"
                    >
                      {data.lifeTimeline.currentDecade}
                    </TimelineCard>
                  )}
                  {data.lifeTimeline.nextDecade && (
                    <TimelineCard
                      label="미래 10년"
                      color="text-gold-300/80"
                      borderColor="border-gold-300/25"
                      bgColor="bg-gold-500/5"
                    >
                      {data.lifeTimeline.nextDecade}
                    </TimelineCard>
                  )}
                </div>
              </div>
            )}

            {/* 세부 분석: 직업·재물·연애·건강
                🔴 값이 문자열일 수도 **객체**일 수도 있다. 그대로 JSX 에 넣었다가 화면이 통째로
                   죽었다(React #31, 2026-08-17) — 반드시 toRichField 를 거친다. */}
            <div className="space-y-3 pt-4">
              <RichDetail icon={Briefcase} label="직업·사업" color="text-gold-300" value={data.career} />
              <RichDetail icon={Coins} label="재물운" color="text-gold-300" value={data.wealth} />
              <RichDetail icon={Heart} label="연애·결혼" color="text-gold-300" value={data.love} />
              <RichDetail icon={Activity} label="건강" color="text-gold-300" value={data.health} />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TimelineCard({
  label,
  color,
  borderColor,
  bgColor,
  children,
}: {
  label: string
  color: string
  borderColor: string
  bgColor: string
  children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl p-4 border ${borderColor} ${bgColor}`}>
      <span className={`text-xs font-bold ${color} tracking-wide mb-1.5 block`}>{label}</span>
      <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">{children}</p>
    </div>
  )
}

/**
 * 문자열이든 객체든 안전하게 그리는 카드.
 * 🔴 «값을 그대로 children 에 넣는» 옛 방식으로 되돌리지 말 것 — 그게 라이브 장애였다.
 */
function RichDetail({
  icon,
  label,
  color,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  value: unknown
}) {
  const rich = toRichField(value)
  if (!rich) return null

  return (
    <DetailCard icon={icon} label={label} color={color}>
      {rich.text && <span className="whitespace-pre-line">{rich.text}</span>}
      {rich.lists.map((list) => (
        <div key={list.label || list.items[0]} className="mt-2">
          {list.label && <p className="mb-1 text-[11px] text-ink-light/45">{list.label}</p>}
          <ul className="space-y-1">
            {list.items.map((item) => (
              <li key={item} className="flex gap-1.5">
                <span className="text-primary/50">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </DetailCard>
  )
}

function DetailCard({
  icon: Icon,
  label,
  color,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl p-4 border border-white/5 bg-surface/30">
      <div className={`flex items-center gap-2 ${color} mb-2`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm font-bold">{label}</span>
      </div>
      {/* 🔴 `<p>` 가 아니라 `<div>` 다. RichDetail 이 목록(`<ul>`)과 소제목(`<p>`)을 함께 넘기는데
          `<p>` 로 감싸면 브라우저 파서가 여는 `<p>` 를 **조기 종료**시켜 서버 HTML 과 클라이언트
          트리가 어긋난다(하이드레이션 오류). 문단 간격은 whitespace-pre-line 이 그대로 진다. */}
      <div className="text-sm text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">
        {children}
      </div>
    </div>
  )
}
