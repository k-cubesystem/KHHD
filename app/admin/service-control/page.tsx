'use client'

import { useState, useEffect , useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Power } from 'lucide-react'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { setServiceSwitch } from './actions'
// 🔴 서버 의존이 없는 정본에서 가져온다 — `lib/feature-flags` 는 supabase/server 를 물고 있어
//    클라이언트 컴포넌트가 부르면 `next build` 가 죽는다(tsc·dev 는 통과한다).
import { FEATURE_KEYS, type FeatureKey, type FeatureConfig } from '@/lib/domain/feature-flags/keys'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { AdminCard } from '@/components/admin/ui/admin-card'

/**
 * 스위치 이름표.
 *
 * 🔴 `Record<FeatureKey, ...>` 이므로 `FEATURE_KEYS` 에 키가 늘면 **컴파일이 막힌다**.
 *    예전에는 이 화면이 키 목록을 따로 적어 뒀다 — 목록이 갈리면 새 스위치가 조용히
 *    화면에서 빠지고, 사람은 «없는 기능»으로 오해한다.
 */
const FEATURE_LABEL: Record<FeatureKey, { label: string; desc: string }> = {
  feat_saju_today: { label: '오늘의 운세', desc: '매일 08시 갱신되는 일일 운세 기능' },
  feat_saju_compat: { label: '궁합 분석', desc: '두 사람의 사주를 비교하는 기능' },
  feat_face_analysis: { label: 'AI 관상 분석', desc: '사진 업로드 및 관상 분석 기능' },
  feat_fengshui: { label: '풍수 인테리어', desc: '방위 및 인테리어 가이드 기능' },
  feat_payment_pg: { label: 'PG 결제', desc: '토스페이먼츠 결제 모듈' },
  global_maintenance: { label: '전체 시스템 점검', desc: '켜면 모든 사용자의 접근이 막힌다' },
}

export default function ServiceControlPage() {
  const [configs, setConfigs] = useState<Record<string, FeatureConfig>>({})
  const [loading, setLoading] = useState(true)

  // 매 렌더 새로 만들면 로드 이펙트가 매번 다시 돈다 — 한 번만 만들어 의존성으로 쓴다.
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const loadSettings = async () => {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('key, value')
          .in('key', [...FEATURE_KEYS])

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
  }, [supabase])

  const handleToggle = async (key: FeatureKey, current: boolean) => {
    const newConfig = { ...configs[key], isActive: !current }

    setConfigs((prev) => ({ ...prev, [key]: newConfig }))

    try {
      // 🔴 브라우저에서 DB 로 직접 쓰지 않는다. 서버 액션이 권한을 확인하고 감사에 남긴다
      //    (이 화면에 «전체 시스템 점검» — 전 사용자 차단 스위치가 있다).
      const result = await setServiceSwitch(key, !current, FEATURE_LABEL[key].desc)

      if (!result.success) throw new Error(result.error ?? '설정 저장 실패')
      toast.success('설정이 변경되었습니다.')
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e)
      logger.error('Service Control 설정 저장 실패:', errorMessage)
      toast.error(`설정 저장 실패: ${errorMessage}`)
      setConfigs((prev) => ({ ...prev, [key]: { ...newConfig, isActive: current } }))
    }
  }

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    )
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="서비스 기능 제어"
        description="다시 배포하지 않고 기능을 켜고 끈다. 변경은 즉시 모든 사용자에게 반영되고 감사 로그에 남는다."
        icon={<Power className="h-5 w-5 text-gold-500" aria-hidden />}
      />

      <div className="grid gap-2.5">
        {FEATURE_KEYS.map((key) => {
          const config = configs[key] || { isActive: false, accessLevel: 'admin' }
          const isMaintenance = key === 'global_maintenance'
          const { label, desc } = FEATURE_LABEL[key]

          return (
            <AdminCard
              key={key}
              tone={isMaintenance ? 'danger' : 'default'}
              title={
                <span className="flex items-center gap-1.5">
                  {isMaintenance && <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-seal" aria-hidden />}
                  {label}
                  {config.isActive && (
                    <Badge
                      variant="outline"
                      className={
                        isMaintenance
                          ? 'border-seal/40 bg-seal/15 text-[9px] text-seal'
                          : 'border-gold-500/30 bg-gold-500/10 text-[9px] text-gold-400'
                      }
                    >
                      {isMaintenance ? '차단 중' : 'LIVE'}
                    </Badge>
                  )}
                </span>
              }
              subtitle={desc}
              action={<Switch checked={config.isActive} onCheckedChange={() => handleToggle(key, config.isActive)} />}
            />
          )
        })}
      </div>
    </div>
  )
}
