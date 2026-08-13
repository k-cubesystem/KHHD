import { getDestinyTargets } from '@/app/actions/user/destiny'
import { WealthAnalysisContent } from './wealth-analysis-content'

/**
 * 재물운 심층 분석 진입점.
 * destiny target id 는 다형(본인=profiles.id, 가족=family_members.id)이라
 * 단일 출처인 v_destiny_targets(getDestinyTargets)로만 대상을 해석한다.
 * targetId 쿼리가 없거나 내 대상이 아니면 본인으로 떨어진다 — 막다른 길을 만들지 않는다.
 */
export default async function WealthAnalysisPage({ searchParams }: { searchParams: Promise<{ targetId?: string }> }) {
  const { targetId } = await searchParams
  const targets = await getDestinyTargets()

  const requested = targetId ? targets.find((t) => t.id === targetId) : undefined
  const initialTarget = requested ?? targets.find((t) => t.target_type === 'self') ?? targets[0] ?? null

  return <WealthAnalysisContent initialTargetId={initialTarget?.id ?? null} targets={targets} />
}
