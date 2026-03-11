'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, Save, AlertTriangle, Power } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { FeatureKey, FeatureConfig } from '@/lib/feature-flags'
import { cn } from '@/lib/utils'

const FEATURES: { key: FeatureKey; label: string; desc: string }[] = [
  { key: 'feat_saju_today', label: '오늘의 운세', desc: '매일 08시 갱신되는 일일 운세 기능' },
  { key: 'feat_saju_compat', label: '궁합 분석', desc: '두 사람의 사주를 비교하는 기능' },
  { key: 'feat_face_analysis', label: 'AI 관상 분석', desc: '사진 업로드 및 관상 분석 기능' },
  { key: 'feat_fengshui', label: '풍수 인테리어', desc: '방위 및 인테리어 가이드 기능' },
  { key: 'feat_payment_pg', label: 'PG 결제 (테스트)', desc: '다날/토스 페이먼츠 결제 모듈' },
  { key: 'global_maintenance', label: '⚠️ 전체 시스템 점검', desc: '활성화 시 모든 사용자 접근 차단' },
]

export default function ServiceControlPage() {
  const [configs, setConfigs] = useState<Record<string, FeatureConfig>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in(
            'key',
            FEATURES.map((f) => f.key)
          )

        if (error) throw error

        const loadedConfigs: Record<string, FeatureConfig> = {}
        data?.forEach((row) => {
          loadedConfigs[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value
        })
        setConfigs(loadedConfigs)
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e)
        logger.error('Service Control 설정 로드 실패:', errorMessage)
        toast.error(`설정을 불러오는데 실패했습니다: ${errorMessage}`)
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleToggle = async (key: string, current: boolean) => {
    const newConfig = { ...configs[key], isActive: !current }

    // Optimistic update
    setConfigs((prev) => ({ ...prev, [key]: newConfig }))

    try {
      const { error } = await supabase.from('system_settings').upsert({
        key,
        value: JSON.stringify(newConfig),
        description: FEATURES.find((f) => f.key === key)?.desc,
      })

      if (error) throw error
      toast.success('설정이 변경되었습니다.')
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      logger.error('Service Control 설정 저장 실패:', errorMessage)
      toast.error(`설정 저장 실패: ${errorMessage}`)
      // Rollback
      setConfigs((prev) => ({ ...prev, [key]: { ...newConfig, isActive: current } }))
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gold-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6 md:space-y-8 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h1 className="text-xl md:text-2xl font-serif font-bold text-stone-100">서비스 기능 제어</h1>
        <p className="text-xs md:text-sm text-stone-500">앱을 다시 배포하지 않고, 실시간으로 기능을 켜고 끄세요.</p>
      </div>

      <div className="grid gap-3 md:gap-4">
        {FEATURES.map((feature) => {
          const config = configs[feature.key] || { isActive: false, accessLevel: 'admin' }
          const isMaintenance = feature.key === 'global_maintenance'

          return (
            <Card
              key={feature.key}
              className={cn(
                'relative border overflow-hidden group',
                isMaintenance
                  ? 'border-red-500/30 bg-gradient-to-br from-red-900/20 to-red-950/10'
                  : 'border-stone-700/30 bg-gradient-to-br from-stone-800/30 to-stone-900/20'
              )}
            >
              {/* Noise Overlay */}
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

              <div className="relative flex items-center justify-between p-4 md:p-6 gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {isMaintenance && (
                      <AlertTriangle className="w-3.5 h-3.5 md:w-4 md:h-4 text-red-500 flex-shrink-0" />
                    )}
                    <span
                      className={cn(
                        'font-bold font-serif text-sm md:text-base truncate',
                        isMaintenance ? 'text-red-400' : 'text-stone-100'
                      )}
                    >
                      {feature.label}
                    </span>
                    {config.isActive && !isMaintenance && (
                      <Badge
                        variant="outline"
                        className="text-[9px] md:text-[10px] border-gold-500/30 text-gold-400 bg-gold-500/10"
                      >
                        LIVE
                      </Badge>
                    )}
                    {config.isActive && isMaintenance && (
                      <Badge
                        variant="destructive"
                        className="text-[9px] md:text-[10px] animate-pulse bg-red-500/20 text-red-400 border-red-500/30"
                      >
                        차단 중
                      </Badge>
                    )}
                  </div>
                  <p className="text-[10px] md:text-xs text-stone-500 line-clamp-2">{feature.desc}</p>
                </div>
                <Switch
                  checked={config.isActive}
                  onCheckedChange={() => handleToggle(feature.key, config.isActive)}
                  className="flex-shrink-0"
                />
              </div>

              {/* Shine Effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </Card>
          )
        })}
      </div>

      <div className="p-3 md:p-4 bg-stone-900/50 rounded-lg border border-stone-700/30 text-center">
        <p className="text-[10px] md:text-xs text-stone-500 flex items-center justify-center gap-1.5">
          <Power className="w-3 h-3 text-gold-500" />
          변경 사항은 모든 사용자에게 즉시 반영됩니다.
        </p>
      </div>
    </div>
  )
}
