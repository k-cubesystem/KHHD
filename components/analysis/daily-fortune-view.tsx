'use client'

import { useState, useEffect, useMemo } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Loader2, Sparkles, RefreshCw, Users, ArrowRight } from 'lucide-react'
import { generateDailyFortune } from '@/app/actions/fortune/daily'
import { getFamilyMembers } from '@/app/actions/user/family'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ShareSaveButtons } from '@/components/studio/share-save-buttons'
import { createClient } from '@/lib/supabase/client'
import { PillarsStrip } from '@/components/analysis/PillarsStrip'
import { ServiceDisclaimer } from '@/components/shared/ServiceDisclaimer'
import { getSajuData } from '@/lib/domain/saju/saju'
import { deriveDailyLucky } from '@/lib/domain/fortune/daily-lucky'
import { GA, trackEvent } from '@/lib/analytics/ga4'
import { getRitualWindow } from '@/lib/domain/ritual/lunar-window'
import { isRitualEntryEnabled } from '@/app/actions/ritual/loop'

interface DailyFortuneViewProps {
  userId: string
  userName: string
  initialMemberId?: string
}

interface ProfileOption {
  id: string
  name: string
  type: 'USER' | 'FAMILY'
}

export function DailyFortuneView({ userId, userName, initialMemberId }: DailyFortuneViewProps) {
  const [fortune, setFortune] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [profiles, setProfiles] = useState<ProfileOption[]>([{ id: userId, name: userName, type: 'USER' }])
  const [selectedProfileId, setSelectedProfileId] = useState<string>(initialMemberId ?? userId)
  const [missingInfo, setMissingInfo] = useState(false)
  const [pendingLoad, setPendingLoad] = useState(false)
  const [birthInfo, setBirthInfo] = useState<{
    birth_date: string | null
    birth_time: string | null
    calendar_type: string | null
    is_leap_month: boolean | null
  } | null>(null)

  useEffect(() => {
    loadProfiles().then((loaded) => loadFortune(false, loaded))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 선택 프로필의 생년월일 — 명식 스트립(PillarsStrip)용
  useEffect(() => {
    const sel = profiles.find((p) => p.id === selectedProfileId)
    if (!sel) return
    const supabase = createClient()
    const table = sel.type === 'USER' ? 'profiles' : 'family_members'
    void (async () => {
      const { data } = await supabase
        .from(table)
        .select('birth_date, birth_time, calendar_type, is_leap_month')
        .eq('id', sel.id)
        .single()
      setBirthInfo(data ?? null)
    })()
  }, [selectedProfileId, profiles])

  // 프로필 변경 시 자동 로드 제거 → 버튼 클릭 대기 상태로만 전환
  function handleProfileChange(id: string) {
    setSelectedProfileId(id)
    setFortune(null)
    setPendingLoad(true)
  }

  const loadProfiles = async (): Promise<ProfileOption[]> => {
    try {
      // 서버 액션이 엣지 경로에서 느슨한 타입을 돌려준다 — 화면이 실제로 쓰는 두 필드로 좁혀 받는다.
      const family: Array<{ id: string; name: string }> = await getFamilyMembers()
      const familyOptions = family.map((f) => ({
        id: f.id,
        name: f.name,
        type: 'FAMILY' as const,
      }))
      const all = [{ id: userId, name: userName, type: 'USER' as const }, ...familyOptions]
      setProfiles(all)
      return all
    } catch (e) {
      logger.error('Failed to load family:', e)
      return profiles
    }
  }

  const loadFortune = async (force: boolean = false, profileList?: ProfileOption[]) => {
    setLoading(true)
    setMissingInfo(false)
    setFortune(null)

    try {
      const list = profileList ?? profiles
      const selected = list.find((p) => p.id === selectedProfileId) || list[0]
      const result = await generateDailyFortune(userId, selected.id, selected.type, undefined, force)

      if (result.success && result.content) {
        setFortune(result.content)
        // daily_fortune_view 는 종전에 허브 카드가 마운트될 때 찍혔다(=읽지 않아도 집계).
        // 운세가 실제로 화면에 뜨는 이 자리로 옮겨, 지표가 이름대로 «조회»를 세게 한다.
        GA.dailyFortuneView()
      } else {
        if (result.error && (result.error.includes('생년월일') || result.error.includes('가족의 생년월일'))) {
          setMissingInfo(true)
        } else {
          toast.error(result.error || '운세를 불러오지 못했습니다.')
        }
      }
    } catch (e) {
      logger.error(e)
      toast.error('오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId)

  // 오늘의 운세 구조 요소(별점·행운 카드) — 결정적 파생(F-7, AI 계약 불변)
  const lucky = useMemo(() => {
    if (!birthInfo?.birth_date) return null
    try {
      const now = new Date()
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      const person = getSajuData(
        birthInfo.birth_date,
        birthInfo.birth_time || '12:00',
        birthInfo.calendar_type !== 'lunar',
        birthInfo.is_leap_month ?? false
      )
      const todaySaju = getSajuData(todayStr, '12:00', true)
      return deriveDailyLucky(todayStr, person.dayMasterElement, todaySaju.dayMasterElement)
    } catch {
      return null
    }
  }, [birthInfo])

  return (
    <Card
      id="daily-fortune-capture"
      className="p-6 md:p-8 bg-surface/30 backdrop-blur-sm border-primary/20 relative overflow-hidden shadow-lg"
    >
      {/* Background Pattern */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10 space-y-6">
        <RitualDayNotice />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-ink-light flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              오늘의 운명
            </h2>
            <p className="text-sm text-ink-light/60 mt-1">
              {new Date().toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedProfileId} onValueChange={handleProfileChange}>
              <SelectTrigger className="w-[140px] bg-surface/50 border-primary/20 text-ink-light">
                <Users className="w-4 h-4 mr-2 text-ink-light/60" />
                <SelectValue placeholder="대상 선택" />
              </SelectTrigger>
              <SelectContent className="bg-surface border-primary/20 text-ink-light">
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id} className="focus:bg-primary/20 focus:text-ink-light">
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadFortune(true)}
              className="text-ink-light/60 hover:text-ink-light hover:bg-white/10"
              title="새로고침(다시 생성)"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 명식 4주 스트립 — 오늘의 운세 근거(원국) */}
        {birthInfo?.birth_date && (
          <PillarsStrip
            birthDate={birthInfo.birth_date}
            birthTime={birthInfo.birth_time}
            isSolar={birthInfo.calendar_type !== 'lunar'}
            isLeapMonth={birthInfo.is_leap_month ?? false}
            birthTimeUnknown={!birthInfo.birth_time}
          />
        )}

        {/* 프로필 변경 후 버튼 대기 상태 */}
        {pendingLoad && !loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-primary/20 rounded-xl bg-surface/30">
            <Sparkles className="w-10 h-10 text-primary/60" />
            <p className="text-ink-light/70 font-serif text-sm">{selectedProfile?.name}님의 운세를 확인하시겠습니까?</p>
            <Button
              onClick={() => {
                setPendingLoad(false)
                loadFortune()
              }}
              className="bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 gap-2"
            >
              <Sparkles className="w-4 h-4" />
              운세 보기
            </Button>
          </div>
        ) : loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-primary/20 rounded-xl bg-surface/30">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-ink-light/60 font-serif animate-pulse">
              {selectedProfile?.name}님의 기운을 읽고 있습니다...
            </p>
          </div>
        ) : missingInfo ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4 min-h-[200px] border border-primary/20 rounded-xl bg-surface/30">
            <Sparkles className="w-12 h-12 text-ink-light/40" />
            <div className="text-center space-y-2">
              <p className="text-ink-light font-serif text-lg">사주 정보를 찾을 수 없습니다</p>
              <p className="text-ink-light/60 text-sm">정확한 운세 분석을 위해 생년월일시 정보가 필요합니다.</p>
            </div>
            <Button asChild className="bg-primary-dark text-white hover:bg-primary-dark/90">
              <Link href="/protected/family">
                정보 등록하러 가기 <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 총운 별점 + 행운 카드 3칩 — 결정적 파생(F-7) */}
            {lucky && (
              <div className="rounded-xl border border-primary/10 bg-surface/40 p-4 space-y-3">
                <div className="flex items-center justify-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span
                      key={n}
                      className={n <= lucky.stars ? 'text-gold-500' : 'text-white/15'}
                      style={{ fontSize: '1.35rem', lineHeight: 1 }}
                    >
                      ★
                    </span>
                  ))}
                  <span className="ml-2 text-xs text-ink-light/50 font-sans">오늘의 총운</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center rounded-lg bg-black/20 border border-white/5 py-2.5">
                    <p className="text-[10px] text-ink-light/40">행운의 색</p>
                    <div className="flex items-center justify-center gap-1.5 mt-1">
                      <span
                        className="w-3 h-3 rounded-full border border-white/20"
                        style={{ background: lucky.color.hex }}
                      />
                      <span className="text-xs text-ink-light font-medium">{lucky.color.name}</span>
                    </div>
                  </div>
                  <div className="text-center rounded-lg bg-black/20 border border-white/5 py-2.5">
                    <p className="text-[10px] text-ink-light/40">행운의 숫자</p>
                    <p className="text-base font-serif font-bold text-gold-500 mt-0.5 tabular-nums">{lucky.number}</p>
                  </div>
                  <div className="text-center rounded-lg bg-black/20 border border-white/5 py-2.5">
                    <p className="text-[10px] text-ink-light/40">행운의 시간</p>
                    <p className="text-[11px] text-ink-light font-medium mt-1">{lucky.timeRange}</p>
                  </div>
                </div>
              </div>
            )}

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface/40 p-6 rounded-xl border border-primary/10 leading-relaxed text-ink-light/90 font-serif text-lg whitespace-pre-wrap shadow-inner"
            >
              {fortune}
            </motion.div>
          </div>
        )}

        {fortune && (
          <ShareSaveButtons
            resultContainerId="daily-fortune-capture"
            analysisTitle="오늘의 운세"
            memberName={selectedProfile?.name}
          />
        )}

        {fortune && <ServiceDisclaimer className="mt-2" />}
      </div>
    </Card>
  )
}

/**
 * 초하루 안내 1줄 (설계 T4 — 진입 동선 2접점). 창 밖에서는 렌더하지 않는다.
 *
 * ⚠️ 킬스위치(`ritual_enabled`)도 함께 본다 — 꺼져 있으면 `/protected/ritual` 이 redirect 로
 *    튕기므로, 확인 없이 그리면 눌러도 되돌아오는 죽은 버튼이 된다. 판정은 서버 한 곳에만.
 */
function RitualDayNotice() {
  const [inWindow, setInWindow] = useState(false)
  useEffect(() => {
    let alive = true
    void isRitualEntryEnabled().then((enabled) => {
      if (!alive || !enabled) return
      try {
        setInWindow(getRitualWindow().inWindow)
      } catch {
        setInWindow(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])
  if (!inWindow) return null
  return (
    <Link
      href="/protected/ritual"
      onClick={() => trackEvent({ action: 'ritual_notice_tap', category: 'ritual', label: 'daily_fortune' })}
      className="block rounded-[3px] border border-seal/40 px-3 py-2 text-sm text-ink-light"
    >
      🏮 오늘은 초하루 — 식구들 문안 올리러 가기 →
    </Link>
  )
}
