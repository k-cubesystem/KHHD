import { CalendarClock, Repeat, Split, type LucideIcon } from 'lucide-react'
import { StoryReveal } from './story-reveal'
import { StorySectionHeading } from './story-section-heading'

interface Pain {
  icon: LucideIcon
  label: string
  title: string
  body: string
}

const PAINS: readonly Pain[] = [
  {
    icon: Split,
    label: '갈림길',
    title: '결정을 앞두고 잠이 오지 않습니다',
    body: '이직, 이사, 결혼, 창업. 주변의 조언은 넘치는데 정작 내 상황에 맞는 이야기는 하나도 없습니다.',
  },
  {
    icon: Repeat,
    label: '되풀이',
    title: '왜 늘 같은 벽 앞에 서는 걸까요',
    body: '사람도, 일도, 매번 다른 얼굴로 오지만 결말은 비슷합니다. 반복되는 패턴에는 이유가 있습니다.',
  },
  {
    icon: CalendarClock,
    label: '조급함',
    title: '지금이 밀어붙일 때인지 모르겠습니다',
    body: '같은 선택도 시기에 따라 결과가 갈립니다. 밀 때와 기다릴 때를 구분하지 못하면 힘만 소모됩니다.',
  },
]

/** 02 — 문제 제기. 사용자의 막막함을 언어화한다. */
export function StoryProblem() {
  return (
    <section className="relative w-full px-5 py-16">
      <StoryReveal>
        <StorySectionHeading
          step="01"
          overline="Why now"
          title={
            <>
              운이 나쁜 게 아니라,
              <br />
              <span className="text-gold-300">읽어본 적이 없을 뿐입니다</span>
            </>
          }
          description="대부분의 막막함은 세 가지 얼굴로 찾아옵니다. 하나라도 마음에 걸린다면 계속 읽어보세요."
        />
      </StoryReveal>

      <ul className="mt-8 flex flex-col gap-3 list-none p-0">
        {PAINS.map((pain, i) => (
          <li key={pain.label}>
            <StoryReveal index={i}>
              <article className="hanji-card p-5 flex gap-4">
                <div
                  className="shrink-0 w-10 h-10 rounded-xl bg-seal/20 border border-seal/40 flex items-center justify-center"
                  aria-hidden
                >
                  <pain.icon className="w-5 h-5 text-[#E4A0A0]" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col gap-1.5 min-w-0">
                  <span className="font-sans text-[10px] font-semibold tracking-[0.18em] text-gold-500 uppercase">
                    {pain.label}
                  </span>
                  <h3 className="font-serif text-[16px] leading-snug font-bold text-ink-light break-keep m-0">
                    {pain.title}
                  </h3>
                  <p className="font-sans text-[13px] leading-[1.75] text-ink-light/75 break-keep font-light m-0">
                    {pain.body}
                  </p>
                </div>
              </article>
            </StoryReveal>
          </li>
        ))}
      </ul>

      <StoryReveal index={3}>
        <blockquote className="mt-8 border-l-2 border-gold-500/60 pl-4 py-1">
          <p className="font-serif text-[15px] leading-[1.85] text-ink-light/90 break-keep m-0">
            사주는 &lsquo;무엇이 일어날지&rsquo;를 정해주지 않습니다.
            <br />
            <strong className="font-bold text-primary">내가 어떤 결로 태어났고, 지금 어느 계절에 서 있는지</strong>를
            알려줄 뿐입니다.
          </p>
        </blockquote>
      </StoryReveal>
    </section>
  )
}
