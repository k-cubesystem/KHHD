'use client'

import { CheonjiinSummary } from '@/components/analysis/cheonjiin/CheonjiinSummary'
import { CheonSection } from '@/components/analysis/cheonjiin/CheonSection'
import { JiSection } from '@/components/analysis/cheonjiin/JiSection'
import { InSection } from '@/components/analysis/cheonjiin/InSection'
import { CategoryResultBody } from '@/components/analysis/CategoryResultBody'
import {
  CompatibilityResult,
  type CompatibilityResultData,
} from '@/app/protected/analysis/compatibility/compatibility-result'
import type { AnalysisHistory } from '@/app/actions/user/history'
import type { CheonjiinAnalysisResult } from '@/types/cheonjiin'
import type { DestinyTarget } from '@/app/actions/user/destiny'

interface AnalysisResultViewProps {
  record: AnalysisHistory
}

export function AnalysisResultView({ record }: AnalysisResultViewProps) {
  // SAJU — 천지인 전용 렌더 (기존 유지)
  if (record.category === 'SAJU' && typeof record.result_json === 'object') {
    const result = record.result_json as CheonjiinAnalysisResult

    return (
      <div className="space-y-6">
        <div className="border border-primary/20 rounded-xl overflow-hidden bg-black/40">
          <CheonjiinSummary
            data={result}
            target={
              {
                id: record.target_id || '',
                name: record.target_name || '이름 없음',
                birth_date: '1900-01-01',
                birth_time: '00:00',
                gender: 'male',
                calendar_type: 'solar',
              } as unknown as DestinyTarget
            }
          />
        </div>
        <div className="space-y-4">
          <CheonSection data={result?.cheon ?? null} />
          <JiSection data={result?.ji ?? null} />
          <InSection data={result?.in ?? null} />
        </div>
      </div>
    )
  }

  // COMPATIBILITY — 궁합 전용 결과 뷰를 읽기전용으로 재사용.
  // result_json 에 person1/person2 원본이 포함돼 완전 복원 가능(사업궁합은 { name } 최소형).
  if (record.category === 'COMPATIBILITY' && record.result_json && typeof record.result_json === 'object') {
    const json = record.result_json as Record<string, unknown>
    const person1 =
      (json.person1 as DestinyTarget | undefined) ??
      ({ name: record.target_name || '본인' } as unknown as DestinyTarget)
    const person2 = (json.person2 as DestinyTarget | undefined) ?? ({ name: '상대' } as unknown as DestinyTarget)
    return (
      <CompatibilityResult
        person1={person1}
        person2={person2}
        result={record.result_json as unknown as CompatibilityResultData}
        onReset={() => {}}
        readOnly
      />
    )
  }

  // 그 외(FACE/HAND/FENGSHUI/TODAY/WEALTH/NEW_YEAR) — 공용 뷰로 전문 렌더 (raw JSON 덤프 제거)
  return <CategoryResultBody record={record} full />
}
