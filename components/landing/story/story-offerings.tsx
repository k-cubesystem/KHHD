import {
  Archive,
  CalendarDays,
  Compass,
  Fingerprint,
  Flame,
  HeartHandshake,
  Layers,
  MessagesSquare,
  ScanFace,
  Sparkles,
  Sun,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { formatFeatureCost, type FeatureCostKey } from '@/lib/domain/payment/feature-costs'
import { StoryReveal } from './story-reveal'
import { StorySectionHeading } from './story-section-heading'

interface AnalysisItem {
  costKey: FeatureCostKey
  icon: LucideIcon
  label: string
  eng: string
  desc: string
}

/** 정밀 분석 — 가격은 feature-costs 단일 소스에서 가져온다(표시 = 실차감). */
const ANALYSES: readonly AnalysisItem[] = [
  {
    costKey: 'saju',
    icon: Sparkles,
    label: '사주 상세풀이',
    eng: 'Cheonjiin',
    desc: '일주·격국·오행과 대운의 흐름을 항목별 장문으로',
  },
  {
    costKey: 'compatibility',
    icon: HeartHandshake,
    label: '궁합',
    eng: 'Compatibility',
    desc: '연인·가족·동료까지. 두 명식을 맞대어 결을 봅니다',
  },
  {
    costKey: 'face',
    icon: ScanFace,
    label: '관상',
    eng: 'Physiognomy',
    desc: '얼굴 사진 한 장으로 기질과 시기의 징조를',
  },
  {
    costKey: 'palm',
    icon: Fingerprint,
    label: '손금',
    eng: 'Palmistry',
    desc: '손바닥에 남은 선으로 재능과 흐름을 읽습니다',
  },
  {
    costKey: 'fengshui',
    icon: Compass,
    label: '공간풍수',
    eng: 'Feng Shui',
    desc: '머무는 공간 사진으로 배치와 기운의 방향을',
  },
  {
    costKey: 'samhap',
    icon: Layers,
    label: '종합사주풀이',
    eng: 'Samhap',
    desc: '사주·관상·손금·풍수를 하나로 합쳐 합치점을 밝힙니다',
  },
]

interface FreeItem {
  icon: LucideIcon
  label: string
  desc: string
}

const FREE_ITEMS: readonly FreeItem[] = [
  { icon: Sun, label: '오늘의 운세', desc: '매일 아침, 오늘 하루의 결을 짧게' },
  { icon: CalendarDays, label: '2026 신년운세', desc: '한 해 전체의 흐름을 미리' },
]

interface CompanionItem {
  icon: LucideIcon
  label: string
  desc: string
  badge?: string
}

const COMPANIONS: readonly CompanionItem[] = [
  {
    icon: CalendarDays,
    label: '주간 · 월간 운세',
    desc: '하루 단위를 넘어 이번 주, 이번 달의 흐름까지 이어서 봅니다.',
  },
  {
    icon: Flame,
    label: '나만의 신당 · 기원(祈願)',
    desc: '신위를 모시고 소원을 올립니다. 하루 한 번의 기도가 쌓여 기원 단(壇)이 오르고, 단에 따라 테마와 신물이 열립니다.',
  },
  {
    icon: MessagesSquare,
    label: '해화지기 고민 상담',
    desc: '명리학에 뿌리를 둔 AI 상담사와 대화합니다.',
    badge: '멤버십 · 1일 이용권',
  },
  {
    icon: Users,
    label: '가족 등록',
    desc: '가족 각각의 사주와 신당, 서로의 궁합과 미션을 한곳에서 관리합니다.',
    badge: '멤버십 전용',
  },
  {
    icon: Archive,
    label: '운세 기록 보관',
    desc: '본 분석은 계정에 저장됩니다. 시간이 지난 뒤 그때의 해석을 다시 펼쳐볼 수 있습니다.',
  },
]

/** 04 — 무엇을 받게 되는가. 실제 제공 기능만 기재한다. */
export function StoryOfferings() {
  return (
    <section className="relative w-full px-5 py-16">
      <StoryReveal>
        <StorySectionHeading
          step="03"
          overline="What you get"
          title={
            <>
              한 번 보고 마는 운세가 아니라
              <br />
              <span className="text-gold-300">계속 펼쳐보는 기록</span>
            </>
          }
          description="필요한 것만 골라 복채로 결제합니다. 매달 묶어서 내라고 강요하지 않습니다."
        />
      </StoryReveal>

      {/* 정밀 분석 */}
      <StoryReveal index={1}>
        <h3 className="mt-9 mb-3 font-serif text-[16px] font-bold text-ink-light m-0">정밀 분석</h3>
      </StoryReveal>

      <ul className="grid grid-cols-2 gap-2.5 list-none p-0 m-0">
        {ANALYSES.map((item, i) => (
          <li key={item.costKey}>
            <StoryReveal index={i % 2} className="h-full">
              <article className="h-full hanji-card p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="w-8 h-8 rounded-lg bg-gold-500/[0.12] border border-gold-500/25 flex items-center justify-center shrink-0"
                    aria-hidden
                  >
                    <item.icon className="w-4 h-4 text-gold-300" strokeWidth={1.5} />
                  </span>
                  <span className="font-sans text-[9.5px] font-bold text-gold-300 bg-gold-500/[0.12] border border-gold-500/25 rounded-full px-2 py-0.5 whitespace-nowrap">
                    {formatFeatureCost(item.costKey)}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="font-serif text-[14px] font-bold text-ink-light leading-snug m-0">{item.label}</h4>
                  <span className="font-sans text-[9px] uppercase tracking-[0.14em] text-ink-light/70">{item.eng}</span>
                </div>
                <p className="font-sans text-[11.5px] leading-[1.65] text-ink-light/75 break-keep font-light m-0">
                  {item.desc}
                </p>
              </article>
            </StoryReveal>
          </li>
        ))}
      </ul>

      {/* 무료 */}
      <StoryReveal index={1}>
        <h3 className="mt-9 mb-3 font-serif text-[16px] font-bold text-ink-light m-0">
          가입만 해도 <span className="text-gold-300">무료</span>
        </h3>
        <ul className="grid grid-cols-2 gap-2.5 list-none p-0 m-0">
          {FREE_ITEMS.map((item) => (
            <li
              key={item.label}
              className="rounded-xl border border-gold-500/25 bg-gold-500/[0.07] p-3.5 flex flex-col gap-1.5"
            >
              <span className="flex items-center gap-2">
                <item.icon className="w-4 h-4 text-gold-300 shrink-0" strokeWidth={1.5} aria-hidden />
                <span className="font-serif text-[14px] font-bold text-ink-light">{item.label}</span>
              </span>
              <span className="font-sans text-[11.5px] leading-[1.65] text-ink-light/75 break-keep font-light">
                {item.desc}
              </span>
            </li>
          ))}
        </ul>
      </StoryReveal>

      {/* 매일 이어지는 것 */}
      <StoryReveal index={1}>
        <h3 className="mt-9 mb-3 font-serif text-[16px] font-bold text-ink-light m-0">매일 이어지는 것들</h3>
      </StoryReveal>

      <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
        {COMPANIONS.map((item, i) => (
          <li key={item.label}>
            <StoryReveal index={i % 3}>
              <article className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex gap-3.5">
                <span
                  className="shrink-0 w-9 h-9 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center"
                  aria-hidden
                >
                  <item.icon className="w-4 h-4 text-gold-300" strokeWidth={1.5} />
                </span>
                <div className="flex flex-col gap-1 min-w-0">
                  <span className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-serif text-[14.5px] font-bold text-ink-light m-0">{item.label}</h4>
                    {item.badge ? (
                      <span className="font-sans text-[9.5px] font-semibold text-[#E4A0A0] bg-seal/25 border border-seal/50 rounded-full px-2 py-px whitespace-nowrap">
                        {item.badge}
                      </span>
                    ) : null}
                  </span>
                  <p className="font-sans text-[12.5px] leading-[1.7] text-ink-light/75 break-keep font-light m-0">
                    {item.desc}
                  </p>
                </div>
              </article>
            </StoryReveal>
          </li>
        ))}
      </ul>

      <StoryReveal index={1}>
        <p className="mt-5 font-sans text-[11px] leading-relaxed text-ink-light/65 break-keep m-0">
          ※ 복채는 서비스 내 결제에 쓰이는 포인트입니다. 표시 금액은 실제 차감액과 같습니다.
        </p>
      </StoryReveal>
    </section>
  )
}
