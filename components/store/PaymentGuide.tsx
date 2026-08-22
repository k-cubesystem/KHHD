'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Coins, Crown, HelpCircle, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GA } from '@/lib/analytics/ga4'
import { logger } from '@/lib/utils/logger'
import { intervalWords, type PaymentGuideModel } from '@/components/store/payment-guide-model'

/**
 * 결제 도우미 — 상점의 «복채 vs 멤버십» 안내.
 *
 * 표시 규칙(방금 걷어낸 자동 팝업의 짜증을 되풀이하지 않는다):
 *  - 첫 1회만 자동으로 열린다(localStorage). 이후엔 «결제 안내» 버튼으로 언제든 다시 연다.
 *  - 자동 열림은 상점 «정문»(탭 파라미터 없는 진입)에서만 — 특정 탭으로 바로 들어온 사람은
 *    이미 살 것을 정하고 온 사람이라 가로막지 않는다.
 *  - 회원에겐 가입 권유 대신 «복채 추가 구매» 안내를 보여준다.
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
                ? `${model.membership?.label} 이용 중입니다. 기능은 이미 열려 있어요 — 복채만 챙기시면 됩니다.`
                : '해화당은 «복채»와 «멤버십» 두 가지로 씁니다. 둘은 경쟁하는 상품이 아니라 층이 다릅니다.'}
            </DialogDescription>
          </DialogHeader>

          {isMember ? <MemberBody model={model} onCta={handleCta} /> : <GuestBody model={model} onCta={handleCta} />}
        </DialogContent>
      </Dialog>
    </>
  )
}

/** 기능별 복채 요금표 — 복채가 «무엇에 쓰이는지»를 한눈에. */
function FeeTable({ model }: { model: PaymentGuideModel }) {
  return (
    <div className="space-y-1.5">
      <ul className="flex flex-wrap gap-1.5">
        {model.paidFeatures.map((f) => (
          <li
            key={f.key}
            className="rounded-full border border-gold-500/20 bg-gold-500/[0.06] px-2.5 py-1 font-sans text-[11px] text-ink-light/75"
          >
            {f.label} <span className="font-semibold tabular-nums text-gold-300">{f.cost}만냥</span>
          </li>
        ))}
      </ul>
      {model.freeFeatures.length > 0 && (
        <p className="font-sans text-[11px] text-ink-light/45">
          {model.freeFeatures.map((f) => f.label).join(' · ')}는 복채 없이 무료입니다.
        </p>
      )}
    </div>
  )
}

function SectionHead({ icon: Icon, title, eyebrow }: { icon: typeof Coins; title: string; eyebrow: string }) {
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
  const { entryPack, entryPlan, chatPass, retentionDays } = model
  const words = intervalWords(entryPlan?.interval ?? 'MONTH')

  const membershipBenefits = [
    '신당 — 신위 모시기·꾸미기 전용 이용',
    entryPlan ? `가족관리 — 인연 ${entryPlan.relationshipLimit}명 등록·궁합` : '가족관리 — 인연 등록·궁합',
    '속풀이 — 신령님과 문답 (멤버십 전용 입장)',
    '웹툰 — 멤버십 전용 회차 열람',
    `기록 보관 — 무료는 최근 ${retentionDays}일까지, 멤버십은 제한 없이`,
    entryPlan ? `복채 — ${words.every}마다 ${entryPlan.bokchaePerPeriod}만냥 지급` : '복채 — 결제 주기마다 지급',
  ]

  return (
    <div className="space-y-3">
      {/* ① 복채 */}
      <section className="space-y-2.5 rounded-2xl border border-gold-500/25 bg-surface/40 p-4">
        <SectionHead icon={Coins} title="복채 — 쓴 만큼" eyebrow="사주만 보실 분" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/70">
          풀이를 볼 때마다 복채가 차감됩니다. 멤버십이 없어도 사주·궁합·관상·손금·풍수는 복채만으로 모두 보실 수 있어요.
        </p>
        <FeeTable model={model} />
        {entryPack && (
          <p className="font-sans text-[12px] text-ink-light/55">
            충전은 «{entryPack.name}» 복채 {entryPack.credits}만냥
            {entryPack.bonusCredits > 0 && ` + 보너스 ${entryPack.bonusCredits}만냥`} ·{' '}
            <span className="font-semibold tabular-nums text-gold-300">{won(entryPack.price)}</span>부터.
          </p>
        )}
        <Link href="/protected/store?tab=bokchae" onClick={() => onCta('bokchae')} className={CTA_PRIMARY}>
          복채 충전하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>

      {/* ② 멤버십 */}
      <section className="space-y-2.5 rounded-2xl border border-gold-500/25 bg-surface/40 p-4">
        <SectionHead icon={Crown} title="멤버십 — 기능이 열립니다" eyebrow="전부 쓰실 분" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/70">
          복채로는 열리지 않는 방이 있습니다. 신당·가족관리·속풀이·웹툰 멤버십 회차는 멤버십 회원만 들어갑니다.
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
        <p className="font-serif text-[14px] font-bold text-gold-300">멤버십을 써도 복채는 따로 삽니다</p>
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/75">
          {entryPlan
            ? `멤버십에 딸려 오는 복채(«${entryPlan.name}» ${entryPlan.bokchaePerPeriod}만냥)는 ${words.every}마다 채워집니다. 그 전에 다 쓰셨다면 복채만 더 충전하시면 돼요 — 멤버십은 그대로 유지됩니다.`
            : '멤버십에 딸려 오는 복채는 결제 주기마다 채워집니다. 그 전에 다 쓰셨다면 복채만 더 충전하시면 돼요 — 멤버십은 그대로 유지됩니다.'}
        </p>
        <p className="font-sans text-[12px] text-ink-light/55">
          멤버십은 <span className="text-gold-300">문을 열고</span>, 복채는{' '}
          <span className="text-gold-300">풀이를 삽니다</span>. 그래서 회원도 풀이마다 복채를 씁니다.
        </p>
      </section>

      {/* 결정 도우미 */}
      <section className="space-y-2 rounded-2xl border border-white/10 bg-surface/30 p-4">
        <p className="font-serif text-[14px] font-bold text-ink-light">나는 어느 쪽?</p>
        <ul className="space-y-1.5 font-sans text-[12.5px] leading-relaxed text-ink-light/70">
          <li>
            사주·궁합·관상만 가끔 본다 → <span className="font-semibold text-gold-300">복채 충전</span>
          </li>
          <li>
            신당을 꾸미고 가족 사주까지 관리한다 → <span className="font-semibold text-gold-300">멤버십</span>
          </li>
          <li>
            속풀이만 하루 써 본다 →{' '}
            <Link
              href="/protected/store?tab=voucher"
              onClick={() => onCta('voucher')}
              className="font-semibold text-gold-300 underline underline-offset-2"
            >
              {chatPass.label} 복채 {chatPass.priceBokchae}만냥
            </Link>
          </li>
        </ul>
      </section>
    </div>
  )
}

function MemberBody({ model, onCta }: { model: PaymentGuideModel; onCta: (target: string) => void }) {
  const plan = model.membership?.plan ?? null
  const words = intervalWords(plan?.interval ?? 'MONTH')
  const { entryPack } = model

  return (
    <div className="space-y-3">
      <section className="space-y-2.5 rounded-2xl border border-gold-500/30 bg-gold-500/[0.06] p-4">
        <SectionHead icon={Coins} title="복채가 떨어졌다면" eyebrow="멤버십은 그대로 유지됩니다" />
        <p className="font-sans text-[13px] leading-relaxed text-ink-light/75">
          {plan
            ? `멤버십에 포함된 복채 ${plan.bokchaePerPeriod}만냥은 ${words.every}마다 채워집니다. 주기 안에 다 쓰셨다면 복채만 따로 충전하시면 됩니다.`
            : '멤버십에 포함된 복채는 결제 주기마다 채워집니다. 주기 안에 다 쓰셨다면 복채만 따로 충전하시면 됩니다.'}
        </p>
        <p className="font-sans text-[12px] text-ink-light/55">
          신당·가족관리·속풀이·웹툰 멤버십 회차는 이미 열려 있습니다. 복채는 풀이를 볼 때 쓰입니다.
        </p>
        <FeeTable model={model} />
        {entryPack && (
          <p className="font-sans text-[12px] text-ink-light/55">
            충전은 «{entryPack.name}» 복채 {entryPack.credits}만냥
            {entryPack.bonusCredits > 0 && ` + 보너스 ${entryPack.bonusCredits}만냥`} ·{' '}
            <span className="font-semibold tabular-nums text-gold-300">{won(entryPack.price)}</span>부터.
          </p>
        )}
      </section>

      <div className="space-y-2">
        <Link href="/protected/store?tab=bokchae" onClick={() => onCta('bokchae')} className={CTA_PRIMARY}>
          복채 충전하기 <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link href="/protected/membership/manage" onClick={() => onCta('manage')} className={CTA_SECONDARY}>
          멤버십 관리
        </Link>
      </div>
    </div>
  )
}
