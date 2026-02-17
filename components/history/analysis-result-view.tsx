'use client'

import { CheonjiinSummary } from '@/components/analysis/cheonjiin/CheonjiinSummary'
import { CheonSection } from '@/components/analysis/cheonjiin/CheonSection'
import { JiSection } from '@/components/analysis/cheonjiin/JiSection'
import { InSection } from '@/components/analysis/cheonjiin/InSection'
import type { AnalysisHistory } from '@/app/actions/analysis-history'

interface AnalysisResultViewProps {
  record: AnalysisHistory
}

export function AnalysisResultView({ record }: AnalysisResultViewProps) {
  // SAJU Category & Valid JSON
  if (record.category === 'SAJU' && typeof record.result_json === 'object') {
    const result = record.result_json as any

    return (
      <div className="space-y-6">
        <div className="border border-primary/20 rounded-xl overflow-hidden bg-black/40">
          <CheonjiinSummary
            data={result}
            target={
              {
                id: record.target_id || '',
                name: record.target_name || '이름 없음',
                birth_date: '1900-01-01', // Dummy for display
                birth_time: '00:00', // Dummy
                gender: 'male', // Dummy
                calendar_type: 'solar', // Dummy
              } as any
            }
          />
        </div>
        <div className="space-y-4">
          <CheonSection data={result?.cheon} />
          <JiSection data={result?.ji} />
          <InSection data={result?.in} />
        </div>
      </div>
    )
  }

  // Default Rendering (Summary + JSON Code View)
  return (
    <div className="space-y-6">
      {/* Summary */}
      {record.summary && (
        <div className="space-y-2">
          <h4 className="text-sm font-bold text-primary uppercase tracking-wide">요약</h4>
          <p className="text-base text-ink-light/90 leading-relaxed whitespace-pre-wrap">
            {record.summary}
          </p>
        </div>
      )}

      {/* Result JSON (Code View) */}
      <div className="space-y-2">
        <h4 className="text-sm font-bold text-primary uppercase tracking-wide">분석 결과 원본</h4>
        <div className="bg-background/50 border border-primary/10 rounded-lg p-4 overflow-x-auto">
          <pre className="text-sm text-ink-light/80 font-sans leading-relaxed">
            {typeof record.result_json === 'string'
              ? record.result_json
              : JSON.stringify(record.result_json, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
}
