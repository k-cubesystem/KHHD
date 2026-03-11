'use client'

import { useState, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { User, ArrowRight, BookOpen, Eye, Hand, Compass } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { useRouter } from 'next/navigation'
import { SajuLoadingOverlay } from '@/components/shared/SajuLoadingOverlay'

const ANALYSIS_CARDS = [
  {
    type: 'saju' as const,
    icon: BookOpen,
    title: '사주풀이',
    description: '사주팔자로 보는 타고난 성격과 운의 흐름',
    tags: ['사주 팔자', '오행 균형', '대운 흐름', '월운 분석'],
    needsPhoto: false,
  },
  {
    type: 'face' as const,
    icon: Eye,
    title: '관상',
    description: '얼굴의 골격과 이목구비로 읽는 운명',
    tags: ['얼굴 골격', '이목구비', '재물운', '인연운'],
    needsPhoto: true,
  },
  {
    type: 'palm' as const,
    icon: Hand,
    title: '손금',
    description: '손금의 선과 구(丘)로 보는 인생의 길',
    tags: ['생명선', '두뇌선', '감정선', '운명선'],
    needsPhoto: true,
  },
  {
    type: 'fengshui' as const,
    icon: Compass,
    title: '풍수',
    description: '공간의 기운을 읽어 최적의 환경을 제안',
    tags: ['8방위', '공간 배치', '기운 흐름', '인테리어'],
    needsPhoto: true,
  },
] as const

type AnalysisType = (typeof ANALYSIS_CARDS)[number]['type']

interface AnalysisClientPageProps {
  targets: DestinyTarget[]
  initialTargetId?: string
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId || null)
  const [showSajuLoading, setShowSajuLoading] = useState(false)

  const selectedTarget = targets.find((t) => t.id === selectedId)

  const handleTargetSelect = (id: string) => {
    setSelectedId(id)
  }

  const handleAnalysisSelect = (type: AnalysisType) => {
    if (!selectedId) return

    switch (type) {
      case 'saju':
        setShowSajuLoading(true)
        break
      case 'face':
        router.push(`/protected/studio/face?targetId=${selectedId}`)
        break
      case 'palm':
        router.push(`/protected/studio/palm?targetId=${selectedId}`)
        break
      case 'fengshui':
        router.push(`/protected/studio/fengshui?targetId=${selectedId}`)
        break
    }
  }

  const handleLoadingComplete = useCallback(() => {
    router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=basic`)
  }, [router, selectedId])

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

      <div className="max-w-3xl mx-auto py-6 px-4 pb-20">
        {/* Header */}
        <section className="text-center space-y-2 mb-8">
          <h1 className="text-xl font-serif font-medium text-ink-light tracking-tight">
            청담해화당 사주풀이
          </h1>
          <p className="text-xs text-ink-light/50 font-light break-keep leading-relaxed max-w-sm mx-auto">
            사주명리 기반으로 당신의 타고난 기질과 운의 흐름을 분석합니다.
            <br />
            원하는 분석을 선택해주세요.
          </p>
        </section>

        {/* Target selector */}
        <section className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-1 h-5 bg-primary/40 rounded-full" />
            <h3 className="text-sm font-serif text-ink-light">분석 대상</h3>
          </div>

          {targets.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {targets.map((target) => {
                const isSelected = selectedId === target.id
                return (
                  <button
                    key={target.id}
                    onClick={() => handleTargetSelect(target.id)}
                    className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all duration-200 ${
                      isSelected
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-white/10 bg-surface/20 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs font-serif transition-colors ${
                        isSelected
                          ? 'border-primary/50 text-primary bg-primary/10'
                          : 'border-white/10 text-ink-light/50'
                      }`}
                    >
                      {target.name.slice(0, 1)}
                    </div>
                    <div className="text-left">
                      <p
                        className={`text-xs font-medium transition-colors ${isSelected ? 'text-primary' : 'text-ink-light'}`}
                      >
                        {target.name}
                      </p>
                      <p className="text-[10px] text-ink-light/30">{target.relation_type}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <Card
              onClick={() => router.push('/protected/family')}
              className="bg-surface/10 border-dashed border-primary/20 p-6 text-center cursor-pointer hover:bg-surface/20 transition-colors group"
            >
              <div className="flex flex-col items-center gap-2">
                <User className="w-6 h-6 text-ink-light/20 group-hover:text-primary/60 transition-colors" />
                <p className="text-xs text-ink-light/50 group-hover:text-primary transition-colors">
                  등록된 대상이 없습니다. 가족 관리에서 추가해주세요
                  <ArrowRight className="w-3 h-3 inline ml-1" />
                </p>
              </div>
            </Card>
          )}
        </section>

        {/* Analysis cards grid */}
        <section>
          <div className="grid grid-cols-2 gap-3">
            {ANALYSIS_CARDS.map((card) => {
              const Icon = card.icon
              const disabled = !selectedId
              return (
                <button
                  key={card.type}
                  onClick={() => handleAnalysisSelect(card.type)}
                  disabled={disabled}
                  className={`text-left rounded-lg border p-4 transition-all duration-200 group ${
                    disabled
                      ? 'border-white/5 bg-surface/10 opacity-40 cursor-not-allowed'
                      : 'border-white/10 bg-surface/20 hover:border-gold-500/50 hover:bg-primary/5 cursor-pointer'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center transition-colors ${
                        disabled
                          ? 'border-white/5 bg-surface/10'
                          : 'border-primary/20 bg-primary/5 group-hover:border-primary/40'
                      }`}
                    >
                      <Icon
                        className={`w-5 h-5 transition-colors ${disabled ? 'text-ink-light/20' : 'text-primary/70 group-hover:text-primary'}`}
                        strokeWidth={1.5}
                      />
                    </div>
                    {!disabled && (
                      <ArrowRight className="w-3.5 h-3.5 text-ink-light/20 group-hover:text-primary/60 transition-colors" />
                    )}
                  </div>

                  <h4
                    className={`text-sm font-serif mb-1 transition-colors ${
                      disabled ? 'text-ink-light/30' : 'text-ink-light group-hover:text-primary'
                    }`}
                  >
                    {card.title}
                  </h4>
                  <p className="text-[11px] text-ink-light/40 font-light leading-relaxed break-keep mb-3">
                    {card.description}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[9px] text-ink-light/30 px-1.5 py-0.5 bg-white/[0.03] rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </button>
              )
            })}
          </div>

          {!selectedId && targets.length > 0 && (
            <p className="text-center text-[11px] text-ink-light/30 mt-4 font-light">
              분석 대상을 먼저 선택해주세요
            </p>
          )}

          <p className="text-center text-[10px] text-ink-light/20 font-light mt-6">
            분석에는 약 30초~1분이 소요됩니다
          </p>
        </section>
      </div>
    </>
  )
}
