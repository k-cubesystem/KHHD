'use client'

import { motion } from 'framer-motion'
import { Crown, Star, Briefcase, Coins, Heart, Activity, Clock, Zap, Shield } from 'lucide-react'

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
    career?: string
    wealth?: string
    love?: string
    health?: string
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
            <p className="text-sm text-ink-light/50 font-light pl-13">
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
                <div className="flex items-center gap-2 text-blue-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm font-bold">인생 타임라인</span>
                </div>
                <div className="space-y-3">
                  {data.lifeTimeline.pastDecade && (
                    <TimelineCard
                      label="과거 10년"
                      color="text-blue-300/70"
                      borderColor="border-blue-300/20"
                      bgColor="bg-blue-300/5"
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
                      color="text-emerald-300/70"
                      borderColor="border-emerald-300/20"
                      bgColor="bg-emerald-300/5"
                    >
                      {data.lifeTimeline.nextDecade}
                    </TimelineCard>
                  )}
                </div>
              </div>
            )}

            {/* 세부 분석: 직업·재물·연애·건강 */}
            <div className="space-y-3 pt-4">
              {data.career && (
                <DetailCard icon={Briefcase} label="직업·사업" color="text-amber-300">
                  {data.career}
                </DetailCard>
              )}
              {data.wealth && (
                <DetailCard icon={Coins} label="재물운" color="text-yellow-300">
                  {data.wealth}
                </DetailCard>
              )}
              {data.love && (
                <DetailCard icon={Heart} label="연애·결혼" color="text-rose-300">
                  {data.love}
                </DetailCard>
              )}
              {data.health && (
                <DetailCard icon={Activity} label="건강" color="text-emerald-300">
                  {data.health}
                </DetailCard>
              )}
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
      <p className="text-sm text-ink-light/80 font-light leading-relaxed break-keep whitespace-pre-line">{children}</p>
    </div>
  )
}
