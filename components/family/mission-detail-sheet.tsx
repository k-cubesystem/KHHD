'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { MISSION_CATEGORIES } from '@/lib/constants'
import { ArrowRight, Layers } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import {
  FAMILY_MISSION_CATEGORIES,
  FAMILY_MISSION_TOTAL,
  countFamilyMissions,
} from '@/lib/domain/analysis/family-missions'
import { buildJourney } from '@/lib/domain/analysis/journey'
import { GA } from '@/lib/analytics/ga4'
import { cn } from '@/lib/utils'

interface Props {
  isOpen: boolean
  onClose: () => void
  member: FamilyMemberWithMissions | null
}

// 가족 미션 5종만(사주·관상·손금·풍수·궁합) — 전역 MISSION_CATEGORIES 를 필터해 재사용(전역 상수는 축소하지 않음)
const FAMILY_MISSIONS = MISSION_CATEGORIES.filter((m) =>
  (FAMILY_MISSION_CATEGORIES as readonly string[]).includes(m.value)
)

/** 가족 미션 이동 경로 — 궁합만 targetId, 나머지 스튜디오·사주 페이지는 target 파라미터를 읽는다(각 페이지 실측). */
function missionHref(value: string, path: string, memberId: string): string {
  const param = value === 'COMPATIBILITY' ? 'targetId' : 'target'
  return `${path}?${param}=${memberId}`
}

export function MissionDetailSheet({ isOpen, onClose, member }: Props) {
  const router = useRouter()

  if (!member) return null

  const completed = member.completed_categories ?? []
  const completedCount = countFamilyMissions(completed)
  const journey = buildJourney(completed, member.id)

  const go = (href: string) => {
    router.push(href)
    onClose()
  }

  // 가족 종합 CTA — 개인 4상 완료면 종합사주풀이, 아니면 다음 단계(여정 로직 재사용)
  const comprehensive = journey.coreComplete
    ? {
        label: journey.allComplete ? '종합사주풀이 다시 보기' : '종합사주풀이 보기',
        href: `/protected/studio/samhap?target=${member.id}`,
        stage: 'SAMHAP',
      }
    : {
        label: `다음: ${journey.next?.label ?? '사주'} 보기`,
        href: journey.next?.href ?? `/protected/analysis/cheonjiin?target=${member.id}`,
        stage: journey.next?.id ?? 'SAJU',
      }

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="bottom"
        className="bg-charcoal-deep border-t border-gold-500/20 w-full max-w-[480px] mx-auto rounded-t-3xl pb-safe px-6 h-auto"
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 mt-4" />

        <SheetHeader className="text-left mb-6 space-y-4">
          <div>
            <SheetTitle className="text-xl font-serif font-bold text-white leading-snug">
              운명의 빈틈을 메우는 <br />
              <span className="text-gold-500">다섯 가지 지혜</span>
            </SheetTitle>
            <p className="text-xs text-white/50 font-light mt-1">
              부족한 운을 메우면 <strong className="text-white/80 font-medium">소중한 사람을 지키는 힘</strong>이
              됩니다.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-medium">
              <span className="text-primary">운세 완성도</span>
              <span className="text-white/60">
                <span className="text-primary">{completedCount}</span> / {FAMILY_MISSION_TOTAL}
              </span>
            </div>
            <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${(completedCount / FAMILY_MISSION_TOTAL) * 100}%` }}
              />
            </div>
          </div>
        </SheetHeader>

        <div className="pb-8">
          <div className="grid grid-cols-5 gap-2">
            {FAMILY_MISSIONS.map((mission) => {
              const isCompleted = completed.includes(mission.value)
              const Icon = mission.icon

              return (
                <Button
                  key={mission.value}
                  onClick={() => go(missionHref(mission.value, mission.path, member.id))}
                  variant="ghost"
                  className={cn(
                    'h-auto aspect-[3/4] flex-col items-center justify-center p-0 rounded-2xl gap-2 transition-all duration-500 relative overflow-hidden group',
                    isCompleted
                      ? 'bg-primary/10 border border-primary/40 shadow-[0_0_20px_rgba(212,175,55,0.15)] hover:bg-primary/20'
                      : 'bg-white/5 border border-white/5 hover:bg-white/10 opacity-70 hover:opacity-100'
                  )}
                >
                  {isCompleted && (
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-50" />
                  )}

                  <div
                    className={cn(
                      'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 relative z-10',
                      isCompleted
                        ? 'bg-primary text-black shadow-lg shadow-primary/30 scale-110'
                        : 'bg-white/5 text-white/30 group-hover:bg-white/10 group-hover:text-white/60'
                    )}
                  >
                    <Icon className="w-4 h-4" strokeWidth={isCompleted ? 2 : 1.5} />
                  </div>

                  <span
                    className={cn(
                      'text-[10px] font-medium relative z-10 transition-colors duration-300',
                      isCompleted ? 'text-primary font-bold' : 'text-white/65 group-hover:text-white/70'
                    )}
                  >
                    {mission.label}
                  </span>

                  {!isCompleted && <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-white/10" />}
                </Button>
              )
            })}
          </div>

          {/* 가족 종합사주풀이 CTA — 개인 4상 완료 시 종합, 아니면 다음 단계 */}
          <button
            onClick={() => {
              GA.journeyStep(comprehensive.stage)
              go(comprehensive.href)
            }}
            className={cn(
              'w-full mt-5 h-12 rounded-xl flex items-center justify-center gap-2 font-serif font-bold text-sm transition-colors border',
              journey.coreComplete
                ? 'bg-gold-500/15 border-gold-500/50 text-gold-500 hover:bg-gold-500/25'
                : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
            )}
          >
            {journey.coreComplete && <Layers className="w-4 h-4" strokeWidth={1.5} />}
            {comprehensive.label}
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-center text-[10px] text-white/55 mt-4 font-light">
            * 개인 4상(사주·관상·손금·풍수)을 모두 모으면 종합사주풀이가 열립니다.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
