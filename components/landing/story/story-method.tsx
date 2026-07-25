import { StoryReveal } from './story-reveal'
import { StorySectionHeading } from './story-section-heading'

const COLUMNS = ['철학관 방문', '가벼운 운세 앱', '청담해화당'] as const

interface CompareRow {
  axis: string
  cells: readonly [string, string, string]
}

const ROWS: readonly CompareRow[] = [
  { axis: '해석 근거', cells: ['상담사 개인 경륜', '생일·별자리 단순 매칭', '만세력 명식 + 명리 엔진'] },
  { axis: '결과 형태', cells: ['구두 상담', '짧은 카드 문구', '항목별 장문 리포트'] },
  { axis: '다시 보기', cells: ['각자 메모', '앱마다 다름', '계정에 저장 · 재열람'] },
  { axis: '다루는 축', cells: ['상담사에 따라', '대개 한 가지', '사주 · 궁합 · 관상 · 손금 · 풍수'] },
  { axis: '이용 시점', cells: ['영업시간 · 예약', '상시', '상시'] },
]

interface Step {
  no: string
  hanja: string
  title: string
  body: string
}

const STEPS: readonly Step[] = [
  {
    no: '1',
    hanja: '入',
    title: '생년월일시를 입력합니다',
    body: '양력·음력과 태어난 시각까지. 시각을 모르면 모름으로 두고도 진행할 수 있습니다.',
  },
  {
    no: '2',
    hanja: '命',
    title: '명식(命式)을 세웁니다',
    body: '만세력을 기준으로 사주팔자를 세우고 일주·오행 분포·대운의 흐름을 계산합니다. 여기까지는 해석이 아니라 계산입니다.',
  },
  {
    no: '3',
    hanja: '解',
    title: 'AI가 교차로 읽습니다',
    body: '천(天)·지(地)·인(人) 세 축으로 해석하고, 관상·손금·풍수를 함께 본 경우 결과를 서로 대조합니다.',
  },
  {
    no: '4',
    hanja: '記',
    title: '리포트로 남습니다',
    body: '읽고 끝나지 않습니다. 계정에 저장되어 몇 달 뒤에도 그때의 해석을 다시 펼쳐볼 수 있습니다.',
  },
]

/** 03 — 해화당의 방식. 3단 비교 + 천지인 SVG + 4단계 프로세스. */
export function StoryMethod() {
  return (
    <section className="relative w-full px-5 py-16 traditional-grid-bg">
      <StoryReveal>
        <StorySectionHeading
          step="02"
          overline="Our method"
          title={
            <>
              전통 명리학의 계산 위에,
              <br />
              <span className="text-gold-300">AI의 교차 해석을 얹습니다</span>
            </>
          }
          description="점을 치는 게 아닙니다. 만세력으로 명식을 세우는 것은 정해진 계산이고, 그 위에서 해석을 촘촘하게 만드는 일에 AI를 씁니다."
        />
      </StoryReveal>

      {/* 천지인 삼재 다이어그램 (인라인 SVG) */}
      <StoryReveal index={1}>
        <figure className="mt-9 mb-2 flex flex-col items-center gap-3 m-0">
          <svg
            viewBox="0 0 260 210"
            className="w-full max-w-[248px] h-auto"
            role="img"
            aria-label="천지인 삼재 구조도: 하늘의 때, 땅의 자리, 사람의 기질 세 축이 가운데 명식에서 만난다"
          >
            <defs>
              <radialGradient id="story-core" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#C9A84C" stopOpacity="0.42" />
                <stop offset="100%" stopColor="#C9A84C" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* 외곽 삼각 */}
            <polygon points="130,22 236,182 24,182" fill="none" stroke="#C9A84C" strokeOpacity="0.32" strokeWidth="1" />
            {/* 내접 원 */}
            <circle cx="130" cy="129" r="56" fill="none" stroke="#C9A84C" strokeOpacity="0.18" strokeWidth="1" />
            {/* 중심 글로우 */}
            <circle cx="130" cy="129" r="52" fill="url(#story-core)" />

            {/* 꼭짓점 → 중심 연결선 */}
            <g stroke="#C9A84C" strokeOpacity="0.24" strokeWidth="1" strokeDasharray="3 4">
              <line x1="130" y1="22" x2="130" y2="129" />
              <line x1="236" y1="182" x2="130" y2="129" />
              <line x1="24" y1="182" x2="130" y2="129" />
            </g>

            {/* 天 */}
            <circle cx="130" cy="22" r="17" fill="#0A0A08" stroke="#C9A84C" strokeOpacity="0.6" strokeWidth="1" />
            <text x="130" y="28" textAnchor="middle" fill="#F4E4BA" fontSize="15" fontWeight="700">
              天
            </text>
            <text x="130" y="53" textAnchor="middle" fill="#E8E4DC" fontSize="10.5">
              하늘 · 때
            </text>

            {/* 地 */}
            <circle cx="236" cy="182" r="17" fill="#0A0A08" stroke="#2D5F8A" strokeOpacity="0.75" strokeWidth="1" />
            <text x="236" y="188" textAnchor="middle" fill="#9EC5E8" fontSize="15" fontWeight="700">
              地
            </text>
            <text x="222" y="208" textAnchor="middle" fill="#E8E4DC" fontSize="10.5">
              땅 · 자리
            </text>

            {/* 人 */}
            <circle cx="24" cy="182" r="17" fill="#0A0A08" stroke="#9E2B2B" strokeOpacity="0.85" strokeWidth="1" />
            <text x="24" y="188" textAnchor="middle" fill="#E4A0A0" fontSize="15" fontWeight="700">
              人
            </text>
            <text x="40" y="208" textAnchor="middle" fill="#E8E4DC" fontSize="10.5">
              사람 · 기질
            </text>

            {/* 중심 라벨 */}
            <text x="130" y="126" textAnchor="middle" fill="#F4E4BA" fontSize="17" fontWeight="700">
              命式
            </text>
            <text x="130" y="145" textAnchor="middle" fill="#E8E4DC" fontSize="10.5">
              나의 명식
            </text>
          </svg>
          <figcaption className="font-sans text-[12px] leading-relaxed text-ink-light/70 text-center break-keep max-w-[19rem]">
            같은 사주라도 어느 때에, 어느 자리에서, 어떤 기질로 쓰느냐에 따라 결과가 갈립니다. 해화당은 세 축을 따로
            보지 않습니다.
          </figcaption>
        </figure>
      </StoryReveal>

      {/* 3단 비교 */}
      <StoryReveal index={2}>
        <div className="mt-10">
          <h3 className="font-serif text-[16px] font-bold text-ink-light mb-3 m-0">무엇이 다른가</h3>
          <div className="hanji-card overflow-hidden">
            <table className="w-full border-collapse font-sans">
              <caption className="sr-only">철학관 방문, 가벼운 운세 앱, 청담해화당의 방식 비교</caption>
              <thead>
                <tr>
                  <th scope="col" className="sr-only">
                    비교 항목
                  </th>
                  {COLUMNS.map((col, i) => (
                    <th
                      key={col}
                      scope="col"
                      className={`px-1.5 py-2.5 text-[10px] font-semibold leading-tight break-keep align-bottom ${
                        i === 2 ? 'text-gold-300 bg-gold-500/10' : 'text-ink-light/70'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.axis} className="border-t border-white/10">
                    <th
                      scope="row"
                      className="px-2 py-2.5 text-left text-[10px] font-semibold text-ink-light/80 whitespace-nowrap align-middle"
                    >
                      {row.axis}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={row.axis + i}
                        className={`px-1.5 py-2.5 text-[10.5px] leading-[1.5] text-center break-keep align-middle ${
                          i === 2 ? 'text-gold-300 font-semibold bg-gold-500/10' : 'text-ink-light/70 font-light'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2.5 font-sans text-[11px] leading-relaxed text-ink-light/65 break-keep m-0">
            ※ 왼쪽 두 열은 일반적인 경우를 정리한 것으로, 개별 업체와 앱에 따라 다를 수 있습니다.
          </p>
        </div>
      </StoryReveal>

      {/* 프로세스 스테퍼 */}
      <div className="mt-11">
        <StoryReveal index={3}>
          <h3 className="font-serif text-[16px] font-bold text-ink-light mb-4 m-0">읽어드리는 순서</h3>
        </StoryReveal>

        <ol className="relative list-none p-0 m-0 flex flex-col gap-5">
          {/* 세로 연결선 */}
          <span
            className="absolute left-[19px] top-3 bottom-3 w-px bg-gradient-to-b from-gold-500/50 via-gold-500/25 to-transparent"
            aria-hidden
          />
          {STEPS.map((step, i) => (
            <li key={step.no} className="relative">
              <StoryReveal index={i} className="flex gap-4">
                <div className="relative z-10 shrink-0 w-10 h-10 rounded-full bg-surface border border-gold-500/40 flex items-center justify-center shadow-gold-glow">
                  <span className="font-serif text-[15px] font-bold text-gold-300" aria-hidden>
                    {step.hanja}
                  </span>
                </div>
                <div className="flex flex-col gap-1 pt-0.5 min-w-0">
                  <span className="font-sans text-[10px] font-bold tracking-[0.16em] text-gold-500">
                    STEP {step.no}
                  </span>
                  <h4 className="font-serif text-[15px] leading-snug font-bold text-ink-light break-keep m-0">
                    {step.title}
                  </h4>
                  <p className="font-sans text-[13px] leading-[1.75] text-ink-light/75 break-keep font-light m-0">
                    {step.body}
                  </p>
                </div>
              </StoryReveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
