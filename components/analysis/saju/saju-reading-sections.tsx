'use client'

import * as React from 'react'

/**
 * 사주풀이 **본문 섹션** — 라이브 결과 화면과 기록 상세가 **함께 쓰는 단일 출처**.
 *
 * ## 🔴 왜 뽑아냈나
 * 같은 `result_json` 을 두 화면이 **서로 다른 렌더러**로 그리고 있었다. 라이브
 * (`saju-result-client.tsx`)는 15섹션을 그리는데 기록(`analysis-result-view.tsx`)은 4섹션뿐이라,
 * 2만냥 내고 본 풀이를 기록에서 다시 열면 **3분의 1만** 나왔다. 라이브 확인(2026-08-17):
 * 저장된 SAJU 11건 전부가 `specialEnergy`·`sajuStructure`·`yearlyMonthly`·`gaewoon`·
 * `crossAnalysis`·`currentSituation`·`pastRetrograde` 를 갖고 있는데 기록에선 한 줄도 안 보였다.
 * 크래시가 아니라 **손실**이라 아무도 신고하지 않는다.
 *
 * 🔴 새 섹션은 여기에 넣는다. 화면 파일에 직접 쓰면 다른 한쪽이 즉시 뒤처진다.
 * 🔴 `result_json` 값을 곧바로 JSX 에 넣지 말 것 — 객체가 오면 화면이 죽는다(React #31).
 *    문자열·객체 양쪽이 올 수 있는 칸은 `lib/domain/analysis/rich-field.ts` 를 거친다.
 *
 * ## 구성이 셋으로 나뉜 이유
 * 라이브는 `무료 → <PremiumBlurSection> 유료 </PremiumBlurSection>` 로 감싸고 그 사이에
 * 天/地 접이 섹션을 끼운다. 순서를 그대로 지키려면 잘린 자리마다 컴포넌트가 하나씩 필요하다.
 * 기록은 이미 결제된 풀이라 블러 없이 셋을 이어 붙인다.
 */

import { WU_XING_COLORS } from '@/lib/domain/saju/saju'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SajuReadingData = Record<string, any>

/** 결제 전에도 보이는 자리 — 특별한 기운·과거 역추산·현재 공감. */
export function SajuFreeSections({ data }: { data: SajuReadingData }) {
  return (
    <>
      {/* ⭐ 특별한 사주 기운 */}
      {data.specialEnergy?.title && (
        <section className="mx-4 mb-6 p-5 rounded-2xl bg-gradient-to-br from-gold-500/15 via-gold-500/5 to-transparent border border-gold-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-500/20 rounded-full blur-[60px] pointer-events-none" />
          <div className="relative z-10 space-y-3">
            <p className="text-[10px] text-gold-500/60 tracking-wider">이 사주만의 특별한 기운</p>
            <h3 className="text-lg font-serif font-bold text-gold-500">{data.specialEnergy.title as string}</h3>
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.specialEnergy.description as string}</p>
            {data.specialEnergy.rarity && (
              <span className="inline-block px-2.5 py-1 rounded-full bg-gold-500/10 border border-gold-500/20 text-[11px] text-gold-500">
                {data.specialEnergy.rarity as string}
              </span>
            )}
            {data.specialEnergy.hiddenTalent && (
              <div className="pt-3 border-t border-gold-500/10">
                <p className="text-[10px] text-gold-500/50 mb-1">숨겨진 재능</p>
                <p className="text-sm text-ink-light/70 leading-relaxed">{data.specialEnergy.hiddenTalent as string}</p>
              </div>
            )}
            {data.specialEnergy.destinyMission && (
              <div className="pt-3 border-t border-gold-500/10">
                <p className="text-[10px] text-gold-500/50 mb-1">인생 미션</p>
                <p className="text-sm text-ink-light/70 leading-relaxed">
                  {data.specialEnergy.destinyMission as string}
                </p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 과거 역추산 */}
      <ResultSection title="과거에 이런 일이 있으셨을 거예요" show={!!data.pastRetrograde?.events?.length}>
        {(data.pastRetrograde?.events as Array<{ period?: string; description?: string; basis?: string }>)?.map(
          (event, i) => (
            <div key={i} className="space-y-1">
              <p className="text-sm text-ink-light">
                <span className="text-gold-300 font-medium">{event.period}</span> — {event.description}
              </p>
              <p className="text-[11px] text-ink-light/55 font-light">{event.basis}</p>
            </div>
          )
        )}
        {data.pastRetrograde?.accuracyHook && (
          <p className="mt-3 pt-3 border-t border-gold-500/10 text-[11px] text-gold-300/70 italic">
            {data.pastRetrograde.accuracyHook as string}
          </p>
        )}
      </ResultSection>

      {/* 현재 공감 */}
      <ResultSection title="요즘 이런 상황이시죠?" show={!!data.currentSituation?.description}>
        <p className="text-sm text-ink-light leading-relaxed">{data.currentSituation?.description as string}</p>
        {data.currentSituation?.basis && (
          <p className="text-[11px] text-ink-light/55 font-light mt-2">{data.currentSituation.basis as string}</p>
        )}
        {data.currentSituation?.advice && (
          <p className="text-sm text-gold-300 font-medium mt-3 pt-3 border-t border-gold-500/10">
            {data.currentSituation.advice as string}
          </p>
        )}
      </ResultSection>
    </>
  )
}

/** 결제한 사람의 자리 — 구조·월별·직업·재물·인연·건강·타임라인·개운. */
export function SajuDeepSections({ data }: { data: SajuReadingData }) {
  return (
    <>
      {/* 격국·용신 + 오행 밸런스 */}
      {data.sajuStructure && (
        <ResultSection title="내 사주의 구조예요" show>
          {data.sajuStructure.geokgukName && (
            <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/15 mb-2">
              <p className="text-xs text-gold-500/70 mb-0.5">격국</p>
              <p className="text-sm text-gold-300 font-medium">{data.sajuStructure.geokgukName as string}</p>
            </div>
          )}
          {data.sajuStructure.geokgukExplain && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.sajuStructure.geokgukExplain as string}</p>
          )}
          {data.sajuStructure.yongsinElement && (
            <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/15 mt-2 mb-2">
              <p className="text-xs text-gold-500/70 mb-0.5">용신</p>
              <p className="text-sm text-gold-300 font-medium">{data.sajuStructure.yongsinElement as string}</p>
            </div>
          )}
          {data.sajuStructure.yongsinExplain && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.sajuStructure.yongsinExplain as string}</p>
          )}
          {data.sajuStructure.elementBalance && (
            <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
              <p className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/60 mb-2">
                오행 밸런스 五行
              </p>
              {(
                [
                  { key: 'wood', hanja: '木', label: '목' },
                  { key: 'fire', hanja: '火', label: '화' },
                  { key: 'earth', hanja: '土', label: '토' },
                  { key: 'metal', hanja: '金', label: '금' },
                  { key: 'water', hanja: '水', label: '수' },
                ] as const
              ).map((el) => {
                const bal = (
                  data.sajuStructure.elementBalance as Record<string, { count?: number; status?: string }>
                )?.[el.key]
                if (!bal) return null
                return (
                  <div key={el.key} className="flex items-center gap-2.5">
                    <span
                      className="font-serif text-[13px] w-4 text-center shrink-0"
                      style={{ color: WU_XING_COLORS[el.hanja] }}
                    >
                      {el.hanja}
                    </span>
                    <span className="font-sans text-[11px] text-ink-light/80 w-4 shrink-0">{el.label}</span>
                    <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min((bal.count ?? 0) * 20, 100)}%`,
                          backgroundColor: WU_XING_COLORS[el.hanja],
                          opacity: 0.85,
                        }}
                      />
                    </div>
                    <span
                      className={`text-[10px] w-10 text-right shrink-0 ${bal.status === '부족' ? 'text-error-text/70' : bal.status === '과다' ? 'text-warning/80' : 'text-ink-light/50'}`}
                    >
                      {bal.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </ResultSection>
      )}

      {/* 올해 월별 운세 */}
      {(data.yearlyMonthly as Array<{ month?: string; keyword?: string; content?: string; rating?: string }>)?.length >
        0 && (
        <ResultSection title="올해 월별 운세예요" show>
          <div className="grid grid-cols-2 gap-2">
            {(data.yearlyMonthly as Array<{ month?: string; keyword?: string; content?: string; rating?: string }>).map(
              (m, i) => (
                <div key={i} className="p-3 rounded-lg bg-surface/20 border border-white/5">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-ink-light">{m.month}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${m.rating === '상' ? 'bg-gold-500/15 text-gold-300' : m.rating === '하' ? 'bg-error-light text-error-text' : 'bg-white/5 text-ink-light/55'}`}
                    >
                      {m.rating}
                    </span>
                  </div>
                  <p className="text-[11px] text-gold-500/70 font-medium">{m.keyword}</p>
                  <p className="text-[11px] text-ink-light/50 mt-1 leading-relaxed">{m.content}</p>
                </div>
              )
            )}
          </div>
        </ResultSection>
      )}

      {/* 신살 — 도화살, 역마살 등 */}
      {data.cheon?.sinsal && (
        <ResultSection title="특별한 기운이 있어요" show>
          {(data.cheon.sinsal as Array<{ name?: string; modern?: string }>)?.map((s, i) => (
            <div key={i} className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/10">
              <p className="text-sm text-gold-500 font-medium">{s.name}</p>
              <p className="text-sm text-ink-light/70 leading-relaxed mt-1">{s.modern}</p>
            </div>
          ))}
        </ResultSection>
      )}

      {/* 직업운 */}
      {data.cheon?.career && typeof data.cheon.career === 'object' && (
        <ResultSection title="나한테 맞는 직업이에요" show>
          {data.cheon.career.summary && (
            <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/15 mb-2">
              <p className="text-sm text-gold-300 font-medium">{data.cheon.career.summary as string}</p>
            </div>
          )}
          {data.cheon.career.personality_match && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.career.personality_match as string}</p>
          )}
          {(data.cheon.career.best_jobs as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/55">잘 맞는 직업</p>
              {(data.cheon.career.best_jobs as string[]).map((job: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2">
                  <span className="text-gold-500/70 shrink-0">+</span> {job}
                </p>
              ))}
            </div>
          )}
          {(data.cheon.career.worst_jobs as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/55">안 맞는 직업</p>
              {(data.cheon.career.worst_jobs as string[]).map((job: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2">
                  <span className="text-error/60 shrink-0">-</span> {job}
                </p>
              ))}
            </div>
          )}
          {data.cheon.career.business_aptitude && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/55">사업 적성</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">
                {data.cheon.career.business_aptitude as string}
              </p>
            </div>
          )}
          {data.cheon.career.career_timing && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/55">이직·승진 타이밍</p>
              <p className="text-sm text-ink-light/80">{data.cheon.career.career_timing as string}</p>
            </div>
          )}
          {data.cheon.career.celebrity_comparison && (
            <p className="text-sm text-gold-300/80 mt-3 pt-3 border-t border-gold-500/10 italic">
              {data.cheon.career.celebrity_comparison as string}
            </p>
          )}
        </ResultSection>
      )}

      {/* 재물운 + 투자 성향 통합 */}
      <ResultSection
        title="돈은 이렇게 벌고 굴리면 돼요"
       
        show={!!(data.cheon?.wealth || data.cheon?.investment)}
      >
        {data.cheon?.wealth && typeof data.cheon.wealth === 'string' && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.wealth}</p>
        )}
        {data.cheon?.investment?.style && (
          <div className="p-3 rounded-lg bg-gold-500/10 border border-gold-500/15 mt-2">
            <p className="text-sm text-gold-300 font-medium">{data.cheon.investment.style as string}</p>
          </div>
        )}
        {data.cheon?.investment?.stockStyle && (
          <div className="space-y-1">
            <p className="text-xs text-ink-light/55">주식</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.stockStyle as string}</p>
          </div>
        )}
        {data.cheon?.investment?.cryptoStyle && (
          <div className="space-y-1">
            <p className="text-xs text-ink-light/55">코인</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.investment.cryptoStyle as string}</p>
          </div>
        )}
        {data.cheon?.investment?.riskLevel && (
          <div className="space-y-1">
            <p className="text-xs text-ink-light/55">위험 감수 성향</p>
            <p className="text-sm text-ink-light/80">{data.cheon.investment.riskLevel as string}</p>
          </div>
        )}
        {data.cheon?.investment?.bestTiming && (
          <div className="space-y-1">
            <p className="text-xs text-ink-light/55">투자 타이밍</p>
            <p className="text-sm text-ink-light/80">{data.cheon.investment.bestTiming as string}</p>
          </div>
        )}
        {data.cheon?.investment?.warning && (
          <div className="p-3 rounded-lg bg-error-light border border-error-border mt-2">
            <p className="text-xs text-error-text/70 mb-1">주의</p>
            <p className="text-sm text-ink-light/80">{data.cheon.investment.warning as string}</p>
          </div>
        )}
        {data.cheon?.investment?.recommendation && (
          <p className="text-sm text-gold-300 font-medium mt-3 pt-3 border-t border-gold-500/10">
            {data.cheon.investment.recommendation as string}
          </p>
        )}
      </ResultSection>

      {/* 연애운 + 인간관계 통합 */}
      <ResultSection title="연애와 인간관계는 이래요" show={!!(data.cheon?.love || data.cheon?.people)}>
        {data.cheon?.love && typeof data.cheon.love === 'string' && (
          <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.love}</p>
        )}
        {data.cheon?.people?.good_match && (
          <div className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/10 mt-2">
            <p className="text-xs text-gold-500/70 mb-1">나랑 잘 맞는 사람</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">
              {(data.cheon.people.good_match as Record<string, unknown>).description as string}
            </p>
            {((data.cheon.people.good_match as Record<string, unknown>).examples as string[])?.map(
              (ex: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/60 flex gap-2 mt-1">
                  <span className="text-gold-500/70 shrink-0">+</span> {ex}
                </p>
              )
            )}
          </div>
        )}
        {data.cheon?.people?.bad_match && (
          <div className="p-3 rounded-lg bg-error-light border border-error-border mt-2">
            <p className="text-xs text-error-text/70 mb-1">조심해야 하는 사람</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">
              {(data.cheon.people.bad_match as Record<string, unknown>).description as string}
            </p>
            {((data.cheon.people.bad_match as Record<string, unknown>).examples as string[])?.map(
              (ex: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/60 flex gap-2 mt-1">
                  <span className="text-error/60 shrink-0">!</span> {ex}
                </p>
              )
            )}
          </div>
        )}
        {data.cheon?.people?.noble_person && (
          <div className="space-y-1 mt-2">
            <p className="text-xs text-ink-light/55">나를 도와줄 귀인</p>
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.people.noble_person as string}</p>
          </div>
        )}
        {data.cheon?.people?.relationship_advice && (
          <p className="text-sm text-gold-300/80 mt-3 pt-3 border-t border-gold-500/10">
            {data.cheon.people.relationship_advice as string}
          </p>
        )}
      </ResultSection>

      {/* 건강 */}
      {data.cheon?.health && typeof data.cheon.health === 'object' && (
        <ResultSection title="건강은 이렇게 관리하세요" show>
          {data.cheon.health.overall && (
            <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.overall as string}</p>
          )}
          {(data.cheon.health.weakOrgans as string[])?.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-ink-light/55">주의가 필요한 부위</p>
              {(data.cheon.health.weakOrgans as string[]).map((organ: string, i: number) => (
                <p key={i} className="text-sm text-ink-light/70 flex gap-2">
                  <span className="text-error/60 shrink-0">!</span> {organ}
                </p>
              ))}
            </div>
          )}
          {data.cheon.health.mentalHealth && (
            <div className="space-y-1">
              <p className="text-xs text-ink-light/55">멘탈 관리</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.cheon.health.mentalHealth as string}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 pt-2">
            {data.cheon.health.exerciseAdvice && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gold-500/60 mb-1">추천 운동</p>
                <p className="text-[12px] text-ink-light/70 leading-relaxed">
                  {data.cheon.health.exerciseAdvice as string}
                </p>
              </div>
            )}
            {data.cheon.health.dietAdvice && (
              <div className="p-3 rounded-lg bg-black/20 border border-white/5">
                <p className="text-[10px] text-gold-500/60 mb-1">음식 추천</p>
                <p className="text-[12px] text-ink-light/70 leading-relaxed">
                  {data.cheon.health.dietAdvice as string}
                </p>
              </div>
            )}
          </div>
          {data.cheon.health.warningPeriod && (
            <p className="text-sm text-error-text/80 mt-2 pt-2 border-t border-error-border">
              {data.cheon.health.warningPeriod as string}
            </p>
          )}
        </ResultSection>
      )}

      {/* 운의 흐름 */}
      {/* 인생 타임라인 */}
      {data.cheon?.lifeTimeline && (
        <ResultSection title="인생 타임라인이에요" show>
          <div className="space-y-4">
            {(
              [
                {
                  label: '지난 10년',
                  key: 'pastDecade',
                  dotClass: 'border-white/20',
                  textClass: 'text-ink-light/55',
                },
                {
                  label: '지금',
                  key: 'currentDecade',
                  dotClass: 'border-gold-500 bg-gold-500/30',
                  textClass: 'text-gold-500',
                },
                { label: '앞으로 10년', key: 'nextDecade', dotClass: 'border-gold-300/60', textClass: 'text-gold-300' },
              ] as const
            ).map((item, i) => {
              const val = (data.cheon.lifeTimeline as Record<string, string>)?.[item.key]
              if (!val) return null
              return (
                <div key={item.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full border-2 shrink-0 ${item.dotClass}`} />
                    {i < 2 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                  </div>
                  <div className="pb-2">
                    <p className={`text-xs font-medium ${item.textClass}`}>{item.label}</p>
                    <p className="text-sm text-ink-light/70 leading-relaxed mt-1">{val}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </ResultSection>
      )}

      {/* 개운법 상세 */}
      {data.gaewoon && (
        <ResultSection title="이렇게 하면 운이 좋아져요" show>
          <div className="grid grid-cols-2 gap-2">
            {data.gaewoon.luckyColor && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 색상</p>
                <p className="text-sm text-ink-light font-medium">
                  {(data.gaewoon.luckyColor as Record<string, string>).color}
                </p>
                <p className="text-[11px] text-ink-light/55 mt-0.5">
                  {(data.gaewoon.luckyColor as Record<string, string>).reason}
                </p>
                <p className="text-[10px] text-gold-500/40 mt-1">
                  {(data.gaewoon.luckyColor as Record<string, string>).items}
                </p>
              </div>
            )}
            {data.gaewoon.luckyDirection && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 방위</p>
                <p className="text-sm text-ink-light font-medium">
                  {(data.gaewoon.luckyDirection as Record<string, string>).direction}
                </p>
                <p className="text-[11px] text-ink-light/55 mt-0.5">
                  {(data.gaewoon.luckyDirection as Record<string, string>).reason}
                </p>
                <p className="text-[10px] text-gold-500/40 mt-1">
                  {(data.gaewoon.luckyDirection as Record<string, string>).usage}
                </p>
              </div>
            )}
            {data.gaewoon.luckyFood && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 음식</p>
                <p className="text-sm text-ink-light font-medium">
                  {((data.gaewoon.luckyFood as Record<string, unknown>).foods as string[])?.join(', ')}
                </p>
                <p className="text-[11px] text-ink-light/55 mt-0.5">
                  {(data.gaewoon.luckyFood as Record<string, string>).reason}
                </p>
              </div>
            )}
            {data.gaewoon.luckyNumber && (
              <div className="p-3 rounded-lg bg-surface/20 border border-white/5">
                <p className="text-[10px] text-gold-500/50 mb-1">행운의 숫자</p>
                <p className="text-sm text-ink-light font-medium">
                  {((data.gaewoon.luckyNumber as Record<string, unknown>).numbers as number[])?.join(', ')}
                </p>
                <p className="text-[11px] text-ink-light/55 mt-0.5">
                  {(data.gaewoon.luckyNumber as Record<string, string>).reason}
                </p>
              </div>
            )}
          </div>
          {data.gaewoon.avoidItems && (
            <div className="p-3 rounded-lg bg-error-light border border-error-border mt-2">
              <p className="text-[10px] text-error-text/70 mb-1">피해야 할 것</p>
              <p className="text-sm text-ink-light/70">
                {((data.gaewoon.avoidItems as Record<string, unknown>).items as string[])?.join(', ')}
              </p>
              <p className="text-[11px] text-ink-light/55 mt-0.5">
                {(data.gaewoon.avoidItems as Record<string, string>).reason}
              </p>
            </div>
          )}
          {data.gaewoon.dailyRoutine && (
            <div className="p-3 rounded-lg bg-gold-500/5 border border-gold-500/10 mt-2">
              <p className="text-[10px] text-gold-500/50 mb-1">매일 개운 루틴</p>
              <p className="text-sm text-ink-light/80 leading-relaxed">{data.gaewoon.dailyRoutine as string}</p>
            </div>
          )}
        </ResultSection>
      )}
    </>
  )
}

/**
 * 교차 분석 — 라이브에서는 地 섹션 **뒤에** 온다(순서 보존을 위해 따로 뺐다).
 */
export function SajuCrossAnalysisSection({ data }: { data: SajuReadingData }) {
  return (
    <ResultSection
      title="여러 분석이 같은 결론을 가리키고 있어요"
     
      show={!!data.crossAnalysis?.convergenceInsight}
    >
      {data.crossAnalysis?.sajuAndFace && (
        <p className="text-sm text-ink-light/80 leading-relaxed">{data.crossAnalysis.sajuAndFace as string}</p>
      )}
      {data.crossAnalysis?.sajuAndFengshui && (
        <p className="text-sm text-ink-light/80 leading-relaxed">{data.crossAnalysis.sajuAndFengshui as string}</p>
      )}
      <p className="text-sm text-gold-500/80 font-medium mt-3 pt-3 border-t border-gold-500/10 leading-relaxed">
        {data.crossAnalysis?.convergenceInsight as string}
      </p>
    </ResultSection>
  )
}

// --- 섹션 헬퍼 (두 화면 공용) ---
/**
 * 스크롤 리빌 — 섹션이 뷰포트에 들어올 때 한 번 페이드업.
 * IO 미지원·프리뷰 환경(IO 죽음)·reduced-motion 에서는 즉시 표시(콘텐츠 손실 금지).
 */
function useRevealOnScroll() {
  const ref = React.useRef<HTMLElement | null>(null)
  const [revealed, setRevealed] = React.useState(false)
  React.useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    )
    io.observe(el)
    // 안전장치 — 어떤 이유로든 IO 콜백이 안 오면 1.2초 뒤 그냥 보여준다(고급 연출 A안 전례).
    const timer = window.setTimeout(() => setRevealed(true), 1200)
    return () => {
      io.disconnect()
      window.clearTimeout(timer)
    }
  }, [])
  return { ref, revealed }
}

// 모양 정본은 /story 섹션 헤딩 — 색색 카드 대신 차분한 카드 + 금줄 + 세리프 제목.
// 색은 데이터(오행·등급)에만 쓰고 프레임은 통일한다(오방색 절제 원칙).
function ResultSection({ title, show, children }: { title: string; show: boolean; children: React.ReactNode }) {
  const { ref, revealed } = useRevealOnScroll()
  if (!show) return null
  return (
    <section
      ref={ref}
      className={`hanji-section reveal-soft ${revealed ? 'is-revealed' : ''} mx-4 mb-4 p-4 rounded-2xl border border-white/10 bg-surface/40`}
    >
      <h3 className="mb-3 flex items-center gap-2.5 font-serif text-[15px] font-bold text-ink-light break-keep">
        <span className="h-px w-5 bg-gold-500/60 shrink-0" aria-hidden />
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}
