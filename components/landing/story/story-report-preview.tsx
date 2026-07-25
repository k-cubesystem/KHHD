import { Lock } from 'lucide-react'
import { StoryReveal } from './story-reveal'
import { StorySectionHeading } from './story-section-heading'

/** 명식 4주 — 예시 데이터(실제 분석 결과가 아님). 전통 표기 순서인 시·일·월·년. */
const PILLARS = [
  { label: '시주', gan: '壬', ji: '戌', self: false },
  { label: '일주', gan: '戊', ji: '午', self: true },
  { label: '월주', gan: '丙', ji: '寅', self: false },
  { label: '년주', gan: '甲', ji: '子', self: false },
] as const

/** 오행 분포 — 예시 값. 오방색 기준 색상. */
const ELEMENTS = [
  { name: '목', hanja: '木', value: 22, color: '#4E9A6B' },
  { name: '화', hanja: '火', value: 31, color: '#C83232' },
  { name: '토', hanja: '土', value: 18, color: '#C9A84C' },
  { name: '금', hanja: '金', value: 12, color: '#D8D2C4' },
  { name: '수', hanja: '水', value: 17, color: '#2D5F8A' },
] as const

const CHAPTERS = [
  '타고난 기질과 그릇',
  '재물이 들어오는 결',
  '인연과 관계의 온도',
  '대운 · 세운의 흐름',
  '조심해야 할 시기',
  '개운을 위한 처방',
] as const

/** 05 — 리포트 미리보기. 모든 수치·문장은 예시이며 실제 분석 결과가 아니다. */
export function StoryReportPreview() {
  return (
    <section className="relative w-full px-5 py-16">
      <StoryReveal>
        <StorySectionHeading
          step="04"
          overline="Inside the report"
          title={
            <>
              한 줄짜리 운세와는
              <br />
              <span className="text-gold-300">밀도가 다릅니다</span>
            </>
          }
          description="아래는 리포트가 어떤 구성으로 오는지 보여주는 예시 화면입니다. 숫자와 문장은 실제 분석 결과가 아닙니다."
        />
      </StoryReveal>

      <StoryReveal index={1}>
        <div className="mt-8 rounded-2xl border border-gold-500/25 bg-surface overflow-hidden shadow-gold-glow">
          <div className="dancheong-border-top" />

          {/* 리포트 헤더 */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-white/10">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="font-sans text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold-500">
                Cheonjiin Report
              </span>
              <span className="font-serif text-[15px] font-bold text-ink-light">사주 상세풀이</span>
            </div>
            <span className="bok-badge shrink-0">예시 화면</span>
          </div>

          {/* 명식 4주 */}
          <div className="px-4 py-4 border-b border-white/10">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-2.5 m-0">
              명식 命式
            </h3>
            <div className="grid grid-cols-4 gap-1.5" aria-hidden>
              {PILLARS.map((p) => (
                <div
                  key={p.label}
                  className={`rounded-lg border py-2 flex flex-col items-center gap-1 ${
                    p.self ? 'border-gold-500/50 bg-gold-500/[0.12]' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <span className="font-sans text-[9px] text-ink-light/70">{p.label}</span>
                  <span
                    className={`font-serif text-[19px] leading-none ${p.self ? 'text-gold-300' : 'text-ink-light'}`}
                  >
                    {p.gan}
                  </span>
                  <span
                    className={`font-serif text-[19px] leading-none ${p.self ? 'text-gold-300' : 'text-ink-light'}`}
                  >
                    {p.ji}
                  </span>
                </div>
              ))}
            </div>
            <p className="sr-only">예시 명식: 시주 임술, 일주 무오, 월주 병인, 년주 갑자.</p>
          </div>

          {/* 오행 분포 */}
          <div className="px-4 py-4 border-b border-white/10">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-3 m-0">
              오행 분포 五行
            </h3>
            <ul className="flex flex-col gap-2 list-none p-0 m-0">
              {ELEMENTS.map((el) => (
                <li key={el.name} className="flex items-center gap-2.5">
                  <span className="font-serif text-[13px] w-4 text-center shrink-0" style={{ color: el.color }}>
                    {el.hanja}
                  </span>
                  <span className="font-sans text-[11px] text-ink-light/80 w-4 shrink-0">{el.name}</span>
                  <span className="flex-1 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${el.value}%`, backgroundColor: el.color, opacity: 0.85 }}
                    />
                  </span>
                  <span className="font-sans text-[11px] tabular-nums text-ink-light/80 w-8 text-right shrink-0">
                    {el.value}%
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 font-sans text-[11px] leading-relaxed text-ink-light/70 break-keep m-0">
              화(火)가 강하고 금(金)이 약한 예시 구성입니다. 실제로는 본인의 명식에 맞춰 계산됩니다.
            </p>
          </div>

          {/* 목차 */}
          <div className="px-4 py-4 border-b border-white/10">
            <h3 className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-ink-light/70 mb-2.5 m-0">
              리포트 목차
            </h3>
            <ol className="grid grid-cols-2 gap-x-3 gap-y-1.5 list-none p-0 m-0">
              {CHAPTERS.map((c, i) => (
                <li key={c} className="flex items-baseline gap-1.5">
                  <span className="font-sans text-[9.5px] font-bold tabular-nums text-gold-500 shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="font-sans text-[11.5px] leading-snug text-ink-light/85 break-keep">{c}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* 본문 — 앞부분만 노출, 이후 블러 */}
          <div className="px-4 py-4">
            <h3 className="font-serif text-[14px] font-bold text-ink-light mb-2 m-0">01. 타고난 기질과 그릇</h3>
            <p className="font-sans text-[12.5px] leading-[1.85] text-ink-light/85 break-keep font-light m-0">
              일간이 무토(戊土)라 겉으로는 느긋해 보여도 속에 중심이 단단한 편이에요. 한번 정하면 잘 안 흔들리는데,
              그래서 결정까지 오래 걸리는 대신 결정한 뒤에는 끝을 봅니다.
            </p>

            <div className="relative mt-3">
              <div className="blur-[5px] select-none pointer-events-none" aria-hidden>
                <p className="font-sans text-[12.5px] leading-[1.85] text-ink-light/85 break-keep font-light m-0">
                  다만 화(火)가 강하게 몰려 있어서 한 번 붙으면 과하게 태우는 구석이 있어요. 스물아홉에서 서른셋 사이에
                  일과 사람 양쪽에서 크게 한 번 정리가 있었을 텐데, 그게 손해였다기보다 그릇을 넓히는 과정이었습니다.
                </p>
                <p className="mt-2 font-sans text-[12.5px] leading-[1.85] text-ink-light/85 break-keep font-light m-0">
                  금(金)이 약한 자리라 마무리와 매듭이 늘 숙제로 남아요. 시작을 잘하는 사람이 끝을 못 맺으면 평판이
                  깎이는데, 이 부분은 사람으로 메꾸는 게 가장 빠릅니다.
                </p>
                <p className="mt-2 font-sans text-[12.5px] leading-[1.85] text-ink-light/85 break-keep font-light m-0">
                  올해 하반기 대운이 바뀌면서 흐름이 한 번 크게 틀어져요. 밀어붙일 시기와 접어둘 시기를 나눠서
                  보겠습니다.
                </p>
              </div>

              {/* 하단 페이드 + 잠금 */}
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-surface via-surface/85 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1.5 pb-1">
                <span
                  className="w-8 h-8 rounded-full bg-gold-500/15 border border-gold-500/35 flex items-center justify-center"
                  aria-hidden
                >
                  <Lock className="w-3.5 h-3.5 text-gold-300" strokeWidth={1.5} />
                </span>
                <span className="font-sans text-[11.5px] font-semibold text-gold-300">
                  이어지는 내용은 내 명식으로 열립니다
                </span>
              </div>
            </div>
          </div>
        </div>
      </StoryReveal>

      <StoryReveal index={2}>
        <p className="mt-4 font-sans text-[11px] leading-relaxed text-ink-light/65 break-keep m-0">
          ※ 위 명식·수치·문장은 화면 구성을 보여주기 위한 예시이며 특정인의 분석 결과가 아닙니다. 실제 리포트는 입력한
          생년월일시를 기준으로 새로 계산됩니다.
        </p>
      </StoryReveal>
    </section>
  )
}
