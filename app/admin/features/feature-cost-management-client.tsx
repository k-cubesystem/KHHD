'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { updateFeatureCost } from './actions'
import { toast } from 'sonner'
import { Loader2, Save, Ticket } from 'lucide-react'

interface FeatureCost {
  key: string
  label: string
  cost: number
  is_active: boolean
  description: string | null
}

export default function FeatureCostManagement({
  initialFeatures,
}: {
  initialFeatures: FeatureCost[]
}) {
  const [features, setFeatures] = useState(initialFeatures)
  const [loading, setLoading] = useState<string | null>(null)

  const handleUpdate = async (key: string) => {
    setLoading(key)
    try {
      const feature = features.find((f) => f.key === key)
      if (!feature) return
      await updateFeatureCost(key, feature.cost, feature.is_active)
      toast.success('복채 소모량이 업데이트되었습니다.')
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : '업데이트 실패'
      toast.error(msg)
    } finally {
      setLoading(null)
    }
  }

  const updateCost = (key: string, cost: number) => {
    setFeatures(features.map((f) => (f.key === key ? { ...f, cost } : f)))
  }

  const toggleActive = (key: string) => {
    setFeatures(features.map((f) => (f.key === key ? { ...f, is_active: !f.is_active } : f)))
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-serif font-bold text-stone-100">기능별 복채 비용</h1>
        <p className="text-xs text-stone-500">
          각 AI 분석 기능의 복채 소모량과 활성 여부를 관리합니다.
        </p>
      </div>

      <div className="grid gap-2.5">
        {features.map((feature) => (
          <Card
            key={feature.key}
            className="relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 hover:border-gold-500/20 transition-all overflow-hidden group"
          >
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-0.5">
                  <h3 className="font-bold text-sm text-stone-100 font-serif">{feature.label}</h3>
                  {!feature.is_active && (
                    <Badge className="text-[9px] bg-stone-700/30 text-stone-500 border-stone-600/30 border">
                      비활성
                    </Badge>
                  )}
                  {feature.is_active && (
                    <Badge className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 border">
                      LIVE
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-stone-500 truncate">{feature.description}</p>
                <p className="text-[9px] text-stone-700 font-mono mt-0.5">{feature.key}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Cost Input */}
                <div className="flex items-center gap-1">
                  <div className="relative">
                    <Ticket className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gold-500" />
                    <Input
                      type="number"
                      min="0"
                      value={feature.cost}
                      onChange={(e) => updateCost(feature.key, parseInt(e.target.value) || 0)}
                      className="w-16 h-7 pl-6 text-xs text-center bg-stone-900/50 border-stone-700/50 text-stone-200 font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-stone-500">만냥</span>
                </div>

                {/* Active Toggle */}
                <Switch
                  checked={feature.is_active}
                  onCheckedChange={() => toggleActive(feature.key)}
                  className="scale-75"
                />

                {/* Save Button */}
                <Button
                  onClick={() => handleUpdate(feature.key)}
                  disabled={loading === feature.key}
                  className="h-7 px-2.5 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/10"
                >
                  {loading === feature.key ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Save className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
