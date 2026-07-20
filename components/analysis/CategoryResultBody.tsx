'use client'

import type { AnalysisHistory } from '@/app/actions/user/history'
import { BookOpen, Sun, Home, User, TrendingUp, Sparkles, Heart } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

/**
 * 카테고리별 분석 결과 본문 렌더러 (공유 화면 · 히스토리 상세 공용).
 * result_json 을 파싱해 카테고리에 맞는 섹션으로 렌더한다 — raw JSON 덤프를 대체한다.
 *
 * @param full true 면 클램프를 풀어 전문을 노출(히스토리 상세). false 면 티저(공유 화면).
 */
export function CategoryResultBody({ record, full = false }: { record: AnalysisHistory; full?: boolean }) {
  const json = record.result_json
  const clamp = (c: string) => (full ? '' : c)

  if (!json || typeof json !== 'object') {
    return record.summary ? (
      <p className="text-base text-ink-light/85 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
    ) : null
  }

  const Section = ({
    icon: Icon,
    title,
    children,
  }: {
    icon?: React.ElementType
    title: string
    children: React.ReactNode
  }) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4 text-primary/70" />}
        <h4 className="text-xs font-bold text-primary/70 uppercase tracking-widest">{title}</h4>
      </div>
      <div className="pl-0">{children}</div>
    </div>
  )

  const Divider = () => <div className="border-t border-primary/10" />

  const markdownClass = `text-sm text-ink-light/85 leading-relaxed space-y-2 [&_strong]:font-semibold [&_strong]:text-ink-light [&_h1]:text-base [&_h1]:font-bold [&_h1]:text-ink-light [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-ink-light [&_h3]:text-sm [&_h3]:font-bold [&_h3]:text-primary [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_p]:mb-2`

  // SAJU — cheon/ji/in 구조 OR 표준 구조
  if (record.category === 'SAJU') {
    const hasCheonjiin = json.cheon || json.ji || json.in
    if (hasCheonjiin) {
      const cheon = json.cheon || {}
      const ji = json.ji || {}
      const inData = json.in || {}
      return (
        <div className="space-y-4">
          {json.summary && (
            <>
              <Section icon={BookOpen} title="핵심 요약">
                <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
              </Section>
              <Divider />
            </>
          )}
          {cheon.title && (
            <Section icon={Sun} title="천(天) · 선천운">
              <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-4')}`}>
                {cheon.description || cheon.content || ''}
              </p>
            </Section>
          )}
          {ji.title && (
            <>
              <Divider />
              <Section icon={Home} title="지(地) · 현실운">
                <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-4')}`}>
                  {ji.description || ji.content || ''}
                </p>
              </Section>
            </>
          )}
          {inData.title && (
            <>
              <Divider />
              <Section icon={User} title="인(人) · 대인운">
                <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-4')}`}>
                  {inData.description || inData.content || ''}
                </p>
              </Section>
            </>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {json.summary && (
          <Section icon={BookOpen} title="핵심 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
          </Section>
        )}
        {json.coreCharacter && (
          <>
            <Divider />
            <Section icon={User} title="타고난 성격">
              <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-4')}`}>
                {json.coreCharacter}
              </p>
            </Section>
          </>
        )}
        {json.advice && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="개운 조언">
              <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-4')}`}>{json.advice}</p>
            </Section>
          </>
        )}
        {json.detailedAnalysis && (
          <>
            <Divider />
            <Section icon={BookOpen} title="상세 분석">
              <p className={`text-sm text-ink-light/75 leading-relaxed whitespace-pre-wrap ${clamp('line-clamp-6')}`}>
                {json.detailedAnalysis}
              </p>
            </Section>
          </>
        )}
      </div>
    )
  }

  // FACE
  if (record.category === 'FACE') {
    return (
      <div className="space-y-4">
        {(json.summary || json.overallAssessment || json.firstImpression) && (
          <Section icon={BookOpen} title="관상 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">
              {json.summary || json.firstImpression || json.overallAssessment}
            </p>
          </Section>
        )}
        {json.currentAnalysis && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="현재 운기">
              <p className={`text-sm text-ink-light/80 leading-relaxed whitespace-pre-wrap ${clamp('line-clamp-5')}`}>
                {json.currentAnalysis}
              </p>
            </Section>
          </>
        )}
        {json.recommendations?.length > 0 && (
          <>
            <Divider />
            <Section icon={Sparkles} title="개운 추천">
              <ul className="space-y-1.5">
                {(json.recommendations as string[]).slice(0, full ? undefined : 3).map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-ink-light/80">
                    <span className="text-primary mt-0.5">·</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </>
        )}
      </div>
    )
  }

  // COMPATIBILITY (공유 화면 티저용 — 히스토리 상세는 CompatibilityResult 를 직접 재사용한다)
  if (record.category === 'COMPATIBILITY') {
    return (
      <div className="space-y-4">
        {json.summary && (
          <Section icon={Heart} title="궁합 요약">
            <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary}</p>
          </Section>
        )}
        {json.overallAssessment && (
          <>
            <Divider />
            <Section icon={BookOpen} title="종합 평가">
              <p className={`text-sm text-ink-light/80 leading-relaxed ${clamp('line-clamp-5')}`}>
                {json.overallAssessment}
              </p>
            </Section>
          </>
        )}
        {json.advice && (
          <>
            <Divider />
            <Section icon={TrendingUp} title="관계 조언">
              <p className={`text-sm text-ink-light/80 leading-relaxed whitespace-pre-line ${clamp('line-clamp-4')}`}>
                {json.advice}
              </p>
            </Section>
          </>
        )}
      </div>
    )
  }

  // TODAY / WEALTH / NEW_YEAR / HAND / FENGSHUI — 범용 렌더
  return (
    <div className="space-y-4">
      {/* TODAY 등: { content: 마크다운 } 형태를 마크다운으로 렌더 */}
      {typeof json.content === 'string' && json.content && (
        <Section icon={BookOpen} title="분석 내용">
          <div className={`${markdownClass} ${clamp('line-clamp-[16]')}`}>
            <ReactMarkdown>{json.content}</ReactMarkdown>
          </div>
        </Section>
      )}
      {(json.summary || (!json.content && record.summary)) && (
        <Section icon={BookOpen} title="요약">
          <p className="text-sm text-ink-light/85 leading-relaxed">{json.summary || record.summary}</p>
        </Section>
      )}
      {json.advice && (
        <>
          <Divider />
          <Section icon={TrendingUp} title="조언">
            <p className={`text-sm text-ink-light/80 leading-relaxed whitespace-pre-line ${clamp('line-clamp-5')}`}>
              {json.advice}
            </p>
          </Section>
        </>
      )}
      {json.detailedAnalysis && (
        <>
          <Divider />
          <Section icon={BookOpen} title="상세 내용">
            <p className={`text-sm text-ink-light/75 leading-relaxed whitespace-pre-wrap ${clamp('line-clamp-6')}`}>
              {json.detailedAnalysis}
            </p>
          </Section>
        </>
      )}
      {/* 아무것도 매칭 안 되면 summary fallback */}
      {!json.content && !json.summary && !json.advice && !json.detailedAnalysis && record.summary && (
        <p className="text-sm text-ink-light/85 leading-relaxed whitespace-pre-wrap">{record.summary}</p>
      )}
    </div>
  )
}
