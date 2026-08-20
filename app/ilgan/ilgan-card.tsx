import { ELEMENT_COLOR, ELEMENT_HANJA, type IlganInfo } from '@/lib/domain/saju/ilgan'
import { SaveCardButton } from './save-card-button'

/**
 * 일간 카드 — 결과 화면(/ilgan)과 공유 랜딩(/ilgan/[stem])이 같은 모양을 쓴다.
 * 글리프 색만 오행 데이터 색(인라인) — 나머지는 토큰.
 */
export function IlganCard({ info, dayPillar }: { info: IlganInfo; dayPillar?: string }) {
  const color = ELEMENT_COLOR[info.element]
  return (
    <section className="hanji-card rounded-xl border border-gold-500/25 p-6 text-center">
      <p className="font-sans text-[11px] tracking-[0.18em] text-gold-500/80">내 일간(日干)</p>
      <div className="mt-3 flex items-end justify-center gap-3">
        <span
          className="font-serif text-[88px] leading-none"
          style={{ color, textShadow: '0 0 32px rgba(0,0,0,0.45)' }}
          aria-label={info.name}
        >
          {info.han}
        </span>
      </div>
      <h2 className="mt-3 font-serif text-2xl text-ink-primary">
        {info.name}
        <span className="ml-1.5 text-[15px] text-ink-light/60">{info.hanja}</span>
      </h2>
      <p className="mt-1 font-sans text-[12.5px] text-ink-light/65">
        {info.polarity}의 {info.elementKo}({ELEMENT_HANJA[info.element]}){dayPillar ? <> · 일주 {dayPillar}</> : null}
      </p>
      <p className="mt-4 break-keep font-serif text-[17px] leading-snug text-gold-300">「{info.image}」</p>

      <ul className="mt-5 space-y-2.5 text-left font-sans text-[14px] leading-[1.75] text-ink-light/85">
        {info.lines.map((l, i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gold-500/70" />
            <span className="break-keep">{l}</span>
          </li>
        ))}
      </ul>

      <p className="mt-5 font-sans text-[11px] leading-relaxed text-ink-light/55">
        명리에서 일간을 읽는 전통적 상(象)입니다. 사람을 단정하지 않으며, 팔자 여덟 글자 중 한 글자일 뿐입니다.
      </p>

      <SaveCardButton slug={info.slug} />
    </section>
  )
}
