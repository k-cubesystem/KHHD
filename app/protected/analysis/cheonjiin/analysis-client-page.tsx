'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { User, ArrowRight, Sparkles } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { useRouter } from 'next/navigation'

interface AnalysisClientPageProps {
  targets: DestinyTarget[]
  initialTargetId?: string
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
  const router = useRouter()
  const [selectedId, setSelectedId] = useState<string | null>(initialTargetId || null)

  const handleAnalysis = () => {
    if (!selectedId) return
    router.push(`/protected/analysis/cheonjiin/result?targetId=${selectedId}&type=basic`)
  }

  const selectedTarget = targets.find((t) => t.id === selectedId)

  return (
    <div className="max-w-3xl mx-auto py-6 px-4 pb-20">
      {/* Header */}
      <section className="text-center space-y-2 mb-8">
        <h1 className="text-xl font-serif font-medium text-ink-light tracking-tight">
          청담해화당 통합분석
        </h1>
        <p className="text-xs text-ink-light/50 font-light break-keep leading-relaxed max-w-sm mx-auto">
          30년 경력의 명리학 비법을 AI에 담았습니다.
          <br />
          분석 대상을 선택하고 사주풀이를 시작하세요.
        </p>
      </section>

      {/* 분석 대상 선택 (리스트박스) */}
      <section className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-1 h-5 bg-gold-500/40 rounded-full" />
          <h3 className="text-sm font-serif text-ink-light">분석 대상 선택</h3>
        </div>

        {targets.length > 0 ? (
          <Select value={selectedId || undefined} onValueChange={(val) => setSelectedId(val)}>
            <SelectTrigger className="w-full h-12 bg-surface/20 border-white/10 rounded-xl text-ink-light">
              <SelectValue placeholder="분석할 대상을 선택하세요">
                {selectedTarget && (
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-xs font-serif font-bold text-gold-500">
                      {selectedTarget.name.slice(0, 1)}
                    </div>
                    <span className="text-sm">{selectedTarget.name}</span>
                    <span className="text-[11px] text-ink-light/40">({selectedTarget.relation_type})</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {targets.map((target) => (
                <SelectItem key={target.id} value={target.id}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] font-serif text-ink-light/60">
                      {target.name.slice(0, 1)}
                    </div>
                    <span>{target.name}</span>
                    <span className="text-ink-light/40 text-xs">({target.relation_type})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Card
            onClick={() => router.push('/protected/family')}
            className="bg-surface/10 border-dashed border-gold-500/20 p-6 text-center cursor-pointer hover:bg-surface/20 transition-colors group"
          >
            <div className="flex flex-col items-center gap-2">
              <User className="w-6 h-6 text-ink-light/20 group-hover:text-gold-500/60 transition-colors" />
              <p className="text-xs text-ink-light/50 group-hover:text-gold-500 transition-colors">
                등록된 대상이 없습니다. 가족 관리에서 추가해주세요
                <ArrowRight className="w-3 h-3 inline ml-1" />
              </p>
            </div>
          </Card>
        )}
      </section>

      {/* 사주분석 CTA 카드 */}
      <section>
        <button
          onClick={handleAnalysis}
          disabled={!selectedId}
          className={`w-full text-left rounded-2xl border p-5 transition-all duration-300 relative overflow-hidden group ${
            selectedId
              ? 'border-gold-500/30 bg-gradient-to-br from-gold-500/10 via-transparent to-gold-500/5 cursor-pointer hover:border-gold-500/50 active:scale-[0.98]'
              : 'border-white/5 bg-surface/10 opacity-40 cursor-not-allowed'
          }`}
        >
          {selectedId && (
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/10 rounded-full blur-[60px] pointer-events-none" />
          )}

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  selectedId ? 'bg-gold-500/15 border border-gold-500/30' : 'bg-white/5 border border-white/5'
                }`}
              >
                <Sparkles
                  className={`w-5 h-5 transition-colors ${selectedId ? 'text-gold-500' : 'text-ink-light/20'}`}
                  strokeWidth={1.5}
                />
              </div>
              <div className="flex-1">
                <h3 className={`text-base font-serif font-medium ${selectedId ? 'text-ink-light' : 'text-ink-light/30'}`}>
                  사주풀이 시작하기
                </h3>
                <p className={`text-[11px] font-light mt-0.5 ${selectedId ? 'text-ink-light/50' : 'text-ink-light/20'}`}>
                  과거를 맞추고, 현재를 짚고, 미래를 처방합니다
                </p>
              </div>
              {selectedId && (
                <ArrowRight className="w-5 h-5 text-gold-500/50 group-hover:text-gold-500 group-hover:translate-x-0.5 transition-all" />
              )}
            </div>

            <div
              className={`rounded-lg px-4 py-3 ${
                selectedId ? 'bg-black/20 border border-gold-500/10' : 'bg-white/[0.02]'
              }`}
            >
              <p className={`text-[11px] leading-relaxed font-light ${selectedId ? 'text-gold-500/70' : 'text-ink-light/15'}`}>
                청담해화당만의 분석 비법 — 사주 원국, 대운, 격국, 용신을 교차 분석하여
                과거 사건을 역추산하고, 현재 상황을 짚어낸 뒤, 구체적 시기와 행동을 처방합니다.
              </p>
            </div>
          </div>
        </button>

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
  )
}
