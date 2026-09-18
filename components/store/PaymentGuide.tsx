'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Crown, HelpCircle, Check, Ticket } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GA } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'
import { MEMBER_WEEKLY_QUESTIONS } from '@/lib/domain/chat/entitlements'
import { formatPassUnits } from '@/lib/domain/entitlement/pass'
import { shrineLine, tierFeatureSummaryLine } from '@/lib/domain/payment/membership-benefits'
import { intervalWords, type GuidePack, type PaymentGuideModel } from '@/components/store/payment-guide-model'

/**
 * 결제 도우미 — 상점의 «이용권 vs 멤버십» 안내.
 *
 * 표시 규칙(방금 걷어낸 자동 팝업의 짜증을 되풀이하지 않는다):
 *  - 첫 1회만 자동으로 열린다(localStorage). 이후엔 «결제 안내» 버튼으로 언제든 다시 연다.
 *  - 자동 열림은 상점 «정문»(탭 파라미터 없는 진입)에서만 — 특정 탭으로 바로 들어온 사람은
 *    이미 살 것을 정하고 온 사람이라 가로막지 않는다.
 *  - 회원에겐 가입 권유 대신 «이용권 추가 구매» 안내를 보여준다.
 *
 * 문구의 숫자는 전부 model(단일 출처)에서 온다 — payment-guide-model.ts 주석 참조.
 */
const SEEN_KEY = 'hhd:payment-guide-seen'

/**
 * 자동 열림 지연(ms). 0 이면 상점이 그려지기도 전에 모달이 덮어 «내가 어디 있는지»를 못 본다.
 * 한 박자 뒤에 올라와야 상점을 배경으로 인식한 상태에서 안내를 읽는다.
 * (지연 중 이탈하면 타이머가 정리되고 «봤음» 표시도 남기지 않는다)
 */
const AUTO_OPEN_DELAY_MS = 250

interface PaymentGuideProps {
  model: PaymentGuideModel
  /** 이 진입에서 «첫 1회 자동 열림»을 시도할지. 상점 정문 진입에서만 true. */
  autoOpenEligible: boolean
}

function readSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch (err) {
    logger.warn('[PaymentGuide] localStorage 읽기 실패 — 자동 열림 생략', err)
    return true
  }
}

function writeSeen(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch (err) {
    logger.warn('[PaymentGuide] localStorage 쓰기 실패', err)
  }
}

const won = (v: number) => `${v.toLocaleString()}원`

export function PaymentGuide({ model, autoOpenEligible }: PaymentGuideProps) {
  const [open, setOpen] = useState(false)
  const isMember = model.membership !== null

  useEffect(() => {
    if (!autoOpenEligible || readSeen()) return
    const timer = window.setTimeout(() => {
      writeSeen()
      setOpen(true)
      GA.paymentGuideOpen('auto')
    }, AUTO_OPEN_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [autoOpenEligible])

  const handleOpenChange = useCallback((next: boolean) => {
    setOpen(next)
    if (!next) {
      writeSeen()
      GA.paymentGuideClose()
    }
  }, [])

  const openManually = useCallback(() => {
    setOpen(true)
    GA.paymentGuideOpen('manual')
  }, [])

  const handleCta = useCallback((target: string) => {
    writeSeen()
    GA.paymentGuideCta(target)
    setOpen(false)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={openManually}
        className="inline-flex items-center gap-1 rounded-full border border-gold-500/30 bg-gold-500/[0.07] px-2.5 py-1 font-serif text-[11px] text-gold-300/90 transition-colors hover:border-gold-500/50 hover:text-gold-300"
      >
        <HelpCircle className="h-3 w-3" strokeWidth={1.6} />
        결제 안내
      </button>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[86vh] max-w-md overflow-y-auto border-gold-500/30 p-5">
          <DialogHeader className="space-y-1.5">
            <DialogTitle className="text-center font-serif text-xl text-gold-300">결제 도우미</DialogTitle>
            <DialogDescription className="text-center font-sans text-[13px] leading-relaxed text-ink-light/60">
              {isMember
                ? `${model.membership?.label} 이용 중입니다. 등급에 맞는 기능은 이미 열려 있어요 — 이번 달 몫을 다 쓰시면 이용권만 더 사시면 됩니다.`
                : '해화당은 «이용권»과 «멤버십» 두 가지로 씁니다. 둘은 경쟁하는 상품이 아니라 층이 다릅니다.'}
            </DialogDescription>
          </DialogHeader>

          {isMember ? <MemberBody model={model} onCta={handleCta} /> : <GuestBody model={model} onCta={handleCta} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** 기능별 이용권 장 수 — 이용권이 «무엇에 쓰이는지»를 한눈에. */
function FeeTable({ model }: { model: PaymentGuideModel }) {
  return (
    <div className="space-y-1.5">
      <ul className="flex flex-wrap gap-1.5">
        {model.paidFeatures.map((f) => (
          <li
            key={f.key}
            className="rounded-full border border-gold-500/20 bg-gold-500/[0.06] px-2.5 py-1 font-sans text-[11px] text-ink-light/75"
          >
            {f.label} <span className="font-semibold tabular-nums text-gold-300">{f.cost}장</span>
            {f.minTierLabel && <span className="text-ink-light/45"> · {f.minTierLabel} 멤버십부터</span>}
          </li>
        ))}
      </ul>
      {model.freeFeatures.length > 0 && (
        <p className="font-sans text-[11px] text-ink-light/45">
          {model.freeFeatures.map((f) => f.label).join(' · ')}는 이용권 없이 무료입니다.
        </p>
      )}
    </div>
  )
}

/** 가장 싼 이용권 팩 한 줄 — «팩 이름» N원부터 · 결제일로부터 N일. 숫자는 전부 모델(DB)에서 온다. */
function EntryPackLine({ pack }: { pack: GuidePack }) {
  return (
    <p className="font-sans text-[12px] text-ink-light/55">
      «{pack.name}»{pack.name === formatPassUnits(pack.passes) ? '' : ` ${formatPassUnits(pack.passes)}`} ·{' '}
      <span className="font-semibold tabular-nums text-gold-300">{won(pack.price)}</span>부터 · 결제일로부터{' '}
      {pack.validDays}일 동안 쓸 수 있어요.
    </p>
  )
}

function SectionHead({ icon: Icon, title, eyebrow }: { icon: typeof Ticket; title: string; eyebrow: string }) {
  return (
    <header className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gold-500/25 bg-gold-500/[0.12]">
        <Icon className="h-4 w-4 text-gold-400" strokeWidth={1.5} />
      </span>
      <div className="min-w-0">
        <p className="font-serif text-[15px] font-bold leading-tight text-ink-light">{title}</p>
        <p className="font-sans text-[11px] text-gold-500/70">{eyebrow}</p>
      </div>
    </header>
  )
}

const CTA_PRIMARY =
  'tap-glow-gold flex w-full items-center justify-center gap-1.5 rounded-xl border border-gold-500/45 bg-gold-500/15 py-2.5 font-serif text-[13px] font-bold text-gold-300 transition-opacity hover:opacity-85'
const CTA_SECONDARY =
  'flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-surface/50 py-2.5 font-serif text-[13px] text-ink-light/75 transition-colors hover:border-white/20'

function GuestBody({ model, onCta }: { model: PaymentGuideModel; onCta: (target: string) => void }) {
  const { entryPack, entryPlan, retentionDays } = model
  const words = intervalWords(entryPlan?.interval ?? 'MONTH')

  // 🔴 이용권 몫은 결제 주기가 아니라 구독 시작일 앵커 «한 달»마다 열린다 — 주기 단어(words.every)로 적지 않는다.
  const membershipBenefits = [
    entryPlan
      ? `이용권 — 매달 ${entryPlan.monthlyPasses}장 (다음 달로 넘어가지 않아요)`
      : '이용권 — 매달 등급별 장 수 (다음 달로 넘어가지 않아요)',
    shrineLine(),
    // 🔴 «각»을 빼면 합산 한도로 읽힌다(membership-benefits relationshipLine 과 같은 문구).
    entryPlan ? `가족관리 — 가족·지인 각 ${entryPlan.relationshipLimit}명 등록·궁합` : '가족관리 — 가족·지인 등록·궁합',
    `속풀이 — 신령님께 주 ${MEMBER_WEEKLY_QUESTIONS}문`,
    '웹툰 — 멤버십 전용 회차 열람',
    `기록 보관 — 무료는 최근 ${retentionDays}일까지, 멤버십은 기간 제한 없이`,
    tierFeatureSummaryLine(),
  ]

  return (
    <div className="space-y-3">
      {/* ① 이용권 */}
      <section className="space-y-2.5 rounded-2xl border border-gold-500/25 bg-surface/40 p-4">
        <SectionHead icon={Ticket} title="이용권 — 필요할 때 한 장씩" eyebrow="가끔 보실 분" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/70">
          풀이를 볼 때마다 이용권을 씁니다. 멤버십이 없어도 사주·궁합·관상·손금·풍수는 이용권으로 보실 수 있어요.
        </p>
        <FeeTable model={model} />
        {entryPack && <EntryPackLine pack={entryPack} />}
        <Link href="/protected/store?tab=pass" onClick={() => onCta('pass')} className={CTA_PRIMARY}>
          이용권 구매하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ② 멤버십 */}
      <section className="space-y-2.5 rounded-2xl border border-gold-500/25 bg-surface/40 p-4">
        <SectionHead icon={Crown} title="멤버십 — 매달 이용권과 기능" eyebrow="자주 보실 분" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/70">
          매달 정해진 장 수의 이용권을 쓰실 수 있고, 신당·가족관리·속풀이·웹툰 멤버십 회차가 열립니다.
        </p>
        <ul className="space-y-1.5">
          {membershipBenefits.map((b) => (
            <li key={b} className="flex items-start gap-2 font-sans text-[12.5px] leading-relaxed text-ink-light/75">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold-400" strokeWidth={2} />
              <span>{b}</span>
            </li>
          ))}
        </ul>
        {entryPlan && (
          <p className="font-sans text-[12px] text-ink-light/55">
            «{entryPlan.name}» {words.price}{' '}
            <span className="font-semibold tabular-nums text-gold-300">{won(entryPlan.price)}</span>부터.
          </p>
        )}
        <Link href="/protected/store?tab=membership" onClick={() => onCta('membership')} className={CTA_PRIMARY}>
          멤버십 보기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ③ 두 상품을 잇는 문장 — 이게 핵심이다 */}
      <section className="space-y-2 rounded-2xl border border-gold-500/40 bg-gold-500/[0.07] p-4">
        <p className="font-serif text-[14px] font-bold text-gold-300">이번 달 몫을 다 쓰면 이용권만 더 사면 됩니다</p>
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/75">
          {entryPlan
            ? `멤버십 이용권(«${entryPlan.name}» 매달 ${entryPlan.monthlyPasses}장)은 다음 달로 넘어가지 않아요. 그 전에 다 쓰셨다면 이용권만 따로 구매하시면 됩니다 — 멤버십은 그대로 유지됩니다.`
            : '멤버십 이용권은 다음 달로 넘어가지 않아요. 그 전에 다 쓰셨다면 이용권만 따로 구매하시면 됩니다 — 멤버십은 그대로 유지됩니다.'}
        </p>
        <p className="font-sans text-[12px] text-ink-light/55">
          멤버십은 <span className="text-gold-300">기능의 문과 이번 달 몫</span>이고, 따로 산 이용권은{' '}
          <span className="text-gold-300">더 보고 싶을 때 쓰는 몫</span>입니다. 둘은 따로 보관돼요.
        </p>
      </section>

      {/* 결정 도우미 */}
      <section className="space-y-2 rounded-2xl border border-white/10 bg-surface/30 p-4">
        <p className="font-serif text-[14px] font-bold text-ink-light">나는 어느 쪽?</p>
        <ul className="space-y-1.5 font-sans text-[12.5px] leading-relaxed text-ink-light/70">
          <li>
            사주·궁합·관상만 가끔 본다 → <span className="font-semibold text-gold-300">이용권 구매</span>
          </li>
          <li>
            신당을 꾸미고 가족 사주까지 관리한다 → <span className="font-semibold text-gold-300">멤버십</span>
          </li>
        </ul>
      </section>
    </div>
  )
}

function MemberBody({ model, onCta }: { model: PaymentGuideModel; onCta: (target: string) => void }) {
  const plan = model.membership?.plan ?? null
  const { entryPack } = model

  return (
    <div className="space-y-3">
      <section className="space-y-2.5 rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
        <SectionHead icon={Ticket} title="이번 달 이용권을 다 쓰셨다면" eyebrow="멤버십은 그대로 유지됩니다" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/75">
          {plan
            ? `멤버십 이용권 ${plan.monthlyPasses}장은 구독 시작일을 기준으로 한 달마다 새로 열리고, 남은 장은 다음 달로 넘어가지 않아요. 그 전에 다 쓰셨다면 이용권만 따로 구매하시면 됩니다.`
            : '멤버십 이용권은 구독 시작일을 기준으로 한 달마다 새로 열리고, 남은 장은 다음 달로 넘어가지 않아요. 그 전에 다 쓰셨다면 이용권만 따로 구매하시면 됩니다.'}
        </p>
        <p className="font-sans text-[12px] text-ink-light/55">
          신당·가족관리·속풀이·웹툰 멤버십 회차는 이미 열려 있습니다. 이용권은 풀이를 볼 때 쓰입니다.
        </p>
        <FeeTable model={model} />
        {entryPack && <EntryPackLine pack={entryPack} />}
      </section>

      <div className="space-y-2">
        <Link href="/protected/store?tab=pass" onClick={() => onCta('pass')} className={CTA_PRIMARY}>
          이용권 구매하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link href="/protected/membership/manage" onClick={() => onCta('manage')} className={CTA_SECONDARY}>
          멤버십 관리
        </Link>
      </div>
    </div>
  )
}
