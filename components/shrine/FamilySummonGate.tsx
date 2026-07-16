'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Deity } from '@/app/actions/shrine/deities'
import { autoSeatGuardian } from '@/app/actions/shrine/deities'
import { GangshinOverlay } from '@/components/shrine/deities/GangshinOverlay'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'

interface Props {
  familyMemberId: string
  memberName: string
  /** 가족 사주의 용신(부족한 기운) 한자 표기 — 강신 카피용 (없으면 일반 카피) */
  yongsinKo: string | null
}

/**
 * 가족 신당 첫 진입 게이트 — 主神이 없으면 그 가족 사주로 수호신을 자동 좌정하고
 * 강신(降神) 의식 연출을 보여준다. 완료 후 refresh 로 좌정된 방을 다시 그린다.
 */
export function FamilySummonGate({ familyMemberId, memberName, yongsinKo }: Props) {
  const router = useRouter()
  const { play } = useShrineAudio()
  const [reveal, setReveal] = useState<Deity | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true
    autoSeatGuardian(familyMemberId)
      .then((r) => {
        if (r.success && r.deity) {
          setReveal(r.deity)
          play('bell')
          window.setTimeout(() => play('bara'), 800)
        } else {
          router.refresh()
        }
      })
      .catch(() => router.refresh())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyMemberId])

  if (!reveal) return null

  const flavorText = yongsinKo
    ? `“${memberName}님의 사주엔 ${yongsinKo} 기운이 필요하니, 내가 곁을 지키리라.”`
    : `“${memberName}님, 이제 내가 그대와 함께하리라.”`

  return (
    <GangshinOverlay
      deity={reveal}
      mode="gangshin"
      flavorText={flavorText}
      onClose={() => {
        setReveal(null)
        router.refresh()
      }}
    />
  )
}
