'use client'

/**
 * 오방기 전용 페이지의 클라이언트 껍데기 — 사운드 인스턴스 하나를 만들어 의식에 넘긴다.
 * 룸이 아니라 페이지가 AudioContext 주인이 됐다는 것 말고는 의식이 달라진 것이 없다.
 */

import { ObangkiRitual } from '@/components/shrine/scene/ObangkiSheet'
import { useShrineAudio } from '@/components/shrine/scene/useShrineAudio'
import type { ObangkiStatus } from '@/app/actions/shrine/rituals'

export function ObangkiClient({ status }: { status: ObangkiStatus }) {
  const { play } = useShrineAudio()
  return <ObangkiRitual status={status} play={play} />
}
