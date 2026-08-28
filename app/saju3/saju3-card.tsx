import { ELEMENT_COLOR, type Saju3Result, type TypeInfo } from '@/lib/domain/saju/saju3'

/**
 * 3초 사주 결과 카드 — 결과 화면(/saju3)과 유형별 공유 랜딩(/saju3/[type])이 같은 모양을 쓴다.
 * 오행 막대 색만 데이터 색(인라인) — 나머지는 토큰.
 */

export function TypeHeadline({ type }: { type: TypeInfo }) {
  return (
    <header className="text-center">
      <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">내 사주 한 줄</p>
      <h2 className="mt-2.5 break-keep font-serif text-[26px] leading-tight text-gold-300">「{type.title}」</h2>
      <p className="mt-3 break-keep font-sans text-[13.5px] leading-relaxed text-ink-light/80">{type.tagline}</p>
    </header>
  )
}

export function ElementBars({ bars }: { bars: Saju3Result['bars'] }) {
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <div className="mt-6 grid grid-cols-5 gap-2">
      {bars.map((b) => (
        <div key={b.element} className="flex flex-col items-center gap-1.5">
          <div className="flex h-16 w-full items-end justify-center rounded-md border border-ink-light/10 bg-ink-light/[0.04] p-1">
            <div
              className="w-full rounded-sm"
              style={{
                height: `${Math.max(6, (b.count / max) * 100)}%`,
                backgroundColor: b.count === 0 ? 'transparent' : ELEMENT_COLOR[b.element],
                opacity: b.count === 0 ? 0.25 : 0.85,
                border: b.count === 0 ? '1px dashed currentColor' : undefined,
              }}
            />
          </div>
          <span className="font-sans text-[12px] text-ink-light/80">{b.ko}</span>
          <span className="font-sans text-[12.5px] tabular-nums text-gold-300">{b.count}</span>
        </div>
      ))}
    </div>
  )
}

const LINE_LABELS = [
  ['money', '돈'],
  ['love', '인연'],
  ['timing', '때'],
] as const

export function ThreeLines({ lines }: { lines: Saju3Result['lines'] }) {
  return (
    <dl className="mt-6 space-y-3.5">
      {LINE_LABELS.map(([key, label]) => (
        <div key={key} className="flex gap-3">
          <dt className="mt-[3px] shrink-0 rounded-[3px] border border-gold-500/30 px-2 py-0.5 font-sans text-[11.5px] text-gold-300">
            {label}
          </dt>
          <dd className="break-keep font-sans text-[14px] leading-[1.75] text-ink-light/90">{lines[key]}</dd>
        </div>
      ))}
    </dl>
  )
}

export function Saju3Card({ result }: { result: Saju3Result }) {
  return (
    <section className="hanji-card rounded-xl border border-gold-500/25 p-6">
      <TypeHeadline type={result.type} />
      <ElementBars bars={result.bars} />
      <p className="mt-3 text-center font-sans text-[12px] text-ink-light/60">
        {result.most.ko}이(가) 제일 많아
        {result.missing.length > 0 ? ` · ${result.missing.map((m) => m.ko).join('·')}은(는) 비어 있고` : ''}
      </p>
      <ThreeLines lines={result.lines} />
      <p className="mt-5 font-sans text-[11px] leading-relaxed text-ink-light/55">
        만세력으로 세운 여덟 글자를 읽은 거야. 지금 방향을 보는 나침반이지, 정해진 답은 아니고.
      </p>
    </section>
  )
}
