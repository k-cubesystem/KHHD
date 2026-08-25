'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, Coins, Crown, Loader2, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TargetSelect, toTargetOption } from '@/components/destiny/target-select'
import { IconGunghap } from '@/components/icons/traditional-icons'
import { getManseSummary, type ManseSummary } from '@/app/actions/user/manse-summary'
import { getSajuData, WU_XING_COLORS, type SajuData } from '@/lib/domain/saju/saju'
import { isSolarCalendar } from '@/lib/domain/saju/calendar'
import { DIZHI_INFO, TIANGAN_INFO, WUXING_KOREAN } from '@/lib/constants/saju-terms'
import { logger } from '@/lib/utils/logger'

/** 기둥 표시 순서 — 연·월·일·시(읽는 순서 그대로). */
const PILLAR_ORDER = [
  { key: 'year', label: '년주' },
  { key: 'month', label: '월주' },
  { key: 'day', label: '일주' },
  { key: 'time', label: '시주' },
] as const

const ELEMENT_ORDER = ['木', '火', '土', '金', '水'] as const

/**
 * 「내 명식 바로보기」 — 상단 바의 태극 문양을 누르면 열리는 요약 팝업.
 *
 * CEO 2026-08-25: «태극 문양으로, 팝업으로 사주팔자와 오행 간략한 설명. 사람 선택 드롭다운.
 * 복채·멤버십 등급·캐릭터 간략히. 각 내용은 해당 페이지로 이동».
 *
 * 🔴 명식은 **클라이언트에서 결정론 엔진으로** 계산한다(`getSajuData`) — 만세력 화면과 같은
 *    함수다. 서버에서 또 계산하면 두 벌이 되어 값이 갈린다.
 * 🔴 사람 고르기는 `TargetSelect` 단일 출처를 쓴다. 여기서 색·높이를 덧칠하지 말 것.
 */
export function ManseQuickView() {
  const [open, setOpen] = useState(false)
  const [summary, setSummary] = useState<ManseSummary | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [targetId, setTargetId] = useState<string | null>(null)

  // 팝업을 처음 열 때만 불러온다 — 상단 바는 전 화면에 있으므로 상시 조회하면 낭비다.
  // 🔴 effect 안에서 동기 setState 를 하지 않는다(연쇄 렌더). «불렀는가»는 ref 로 잠그고,
  //    상태는 응답이 온 뒤에만 바꾼다.
  const requested = useRef(false)
  useEffect(() => {
    if (!open || requested.current) return
    requested.current = true
    getManseSummary()
      .then((s) => {
        setSummary(s)
        if (s && s.targets.length > 0) setTargetId((prev) => prev ?? s.targets[0]!.id)
      })
      .catch((e) => logger.error('[manse-quick-view] 요약 조회 실패:', e))
      .finally(() => setLoaded(true))
  }, [open])

  const target = summary?.targets.find((t) => t.id === targetId) ?? null

  const saju = useMemo<SajuData | null>(() => {
    if (!target?.birth_date?.trim()) return null
    try {
      return getSajuData(
        target.birth_date,
        target.birth_time || '12:00',
        isSolarCalendar(target.calendar_type),
        target.is_leap_month ?? false
      )
    } catch (e) {
      logger.error('[manse-quick-view] 명식 계산 실패:', e)
      return null
    }
  }, [target])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="내 명식 바로보기"
        className="flex h-11 w-11 items-center justify-center text-ink-light/70 transition-colors hover:text-primary"
      >
        <IconGunghap className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* 🔴 머리글 고정 + 본문만 스크롤. DialogContent 는 grid 라 flex flex-col 로 바꿔야
            본문이 줄어들며 스크롤이 생긴다(배경화면 시트와 같은 처방, 2026-08-25). */}
        <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden border-gold-500/25 bg-surface p-0 sm:max-w-md">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-3">
            <DialogTitle className="flex items-center gap-1.5 font-serif text-gold-500">
              <IconGunghap className="h-4 w-4 shrink-0" />내 명식 바로보기
            </DialogTitle>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-6">
            {!loaded ? (
              <p className="flex items-center justify-center gap-2 py-8 text-[12px] text-ink-light/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                불러오는 중
              </p>
            ) : !summary ? (
              <p className="py-8 text-center text-[12px] text-ink-light/60">로그인이 필요합니다.</p>
            ) : (
              <div className="flex flex-col gap-4">
                <TargetSelect
                  targets={summary.targets.map(toTargetOption)}
                  value={targetId}
                  onChange={setTargetId}
                  label="누구의 명식을 볼까요"
                  emptyHref="/protected/family"
                  emptyLabel="가족·인연 등록하기"
                />

                <AccountRow summary={summary} />

                {!target?.birth_date ? (
                  <EmptyBirth />
                ) : !saju ? (
                  <p className="rounded-lg border border-white/10 px-3 py-4 text-center text-[12px] text-ink-light/60">
                    명식을 계산할 수 없습니다. 생년월일을 확인해주세요.
                  </p>
                ) : (
                  <>
                    <Pillars saju={saju} />
                    <Elements saju={saju} />
                    <DayMasterNote saju={saju} />
                  </>
                )}

                <Link
                  href="/protected/profile/manse"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-lg border border-gold-500/45 bg-gold-500/10 px-3 py-2.5 font-serif text-[12px] font-bold text-gold-500 transition-colors hover:bg-gold-500/20"
                >
                  만세력에서 자세히 보기
                  <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                </Link>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** 복채·등급·캐릭터 한 줄씩 — 각각 해당 화면으로 간다(CEO «각 내용은 해당 내용으로 이동»). */
function AccountRow({ summary }: { summary: ManseSummary }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <Link
        href="/protected/store?tab=bokchae"
        className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-2 py-2.5 transition-colors hover:border-gold-500/45"
      >
        <Coins className="h-3.5 w-3.5 text-gold-500" />
        <span className="text-[9px] font-light text-ink-light/50">복채</span>
        <span className="font-serif text-[12px] font-bold text-gold-500">{summary.balance}만냥</span>
      </Link>

      <Link
        href="/protected/store?tab=membership"
        className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-2 py-2.5 transition-colors hover:border-gold-500/45"
      >
        <Crown className="h-3.5 w-3.5 text-gold-500" />
        <span className="text-[9px] font-light text-ink-light/50">등급</span>
        <span className="truncate font-serif text-[12px] font-bold text-gold-500">{summary.planName}</span>
      </Link>

      <Link
        href="/protected/shrine"
        className="flex flex-col items-center gap-1 rounded-lg border border-white/10 px-2 py-2.5 transition-colors hover:border-gold-500/45"
      >
        <Sparkles className="h-3.5 w-3.5 text-gold-500" />
        <span className="text-[9px] font-light text-ink-light/50">신위</span>
        <span className="truncate font-serif text-[12px] font-bold text-gold-500">{summary.deityName ?? '모시기'}</span>
      </Link>
    </div>
  )
}

function EmptyBirth() {
  return (
    <Link
      href="/protected/family"
      className="block rounded-lg border border-white/10 px-3 py-4 text-center text-[12px] text-ink-light/60 transition-colors hover:border-gold-500/45"
    >
      생년월일이 없어 명식을 세울 수 없습니다. 등록하러 가기 →
    </Link>
  )
}

/** 사주팔자 — 네 기둥의 천간·지지. 만세력과 같은 어휘로 적는다. */
function Pillars({ saju }: { saju: SajuData }) {
  return (
    <div>
      <p className="mb-1.5 font-serif text-[12px] font-bold text-ink-light/85">사주팔자(四柱八字)</p>
      <div className="grid grid-cols-4 gap-1.5">
        {PILLAR_ORDER.map(({ key, label }) => {
          const pillar = saju.pillars[key]
          return (
            <div key={key} className="rounded-lg border border-white/10 py-2 text-center">
              <p className="text-[9px] font-light text-ink-light/45">{label}</p>
              <Glyph char={pillar.gan} korean={TIANGAN_INFO[pillar.gan]?.korean} element={pillar.ganElement} />
              <Glyph char={pillar.zhi} korean={DIZHI_INFO[pillar.zhi]?.korean} element={pillar.zhiElement} />
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * 여덟 글자 중 한 글자 — 한자 아래 한글 독음을 나란히 적는다(CEO 2026-08-25).
 * 한자를 못 읽어도 「갑·자」로 읽히게 하는 것이 목적이라, 독음은 흐리게 두어 한자를 가리지 않는다.
 * 독음 표는 만세력과 같은 출처(`saju-terms`)를 쓴다 — 두 벌이 되면 표기가 갈린다.
 */
function Glyph({ char, korean, element }: { char: string; korean?: string; element: string }) {
  return (
    <div className="mt-1 leading-none">
      <span className="font-serif text-[19px] font-bold" style={{ color: WU_XING_COLORS[element] ?? undefined }}>
        {char}
      </span>
      {korean ? <span className="ml-1 font-serif text-[11px] text-ink-light/55">{korean}</span> : null}
    </div>
  )
}

/** 오행 분포 — 여덟 글자가 어느 기운으로 쏠렸는지 막대로. */
function Elements({ saju }: { saju: SajuData }) {
  const total = ELEMENT_ORDER.reduce((sum, el) => sum + (saju.elementsDistribution[el] ?? 0), 0) || 1

  return (
    <div>
      <p className="mb-1.5 font-serif text-[12px] font-bold text-ink-light/85">오행(五行) 분포</p>
      <div className="flex flex-col gap-1">
        {ELEMENT_ORDER.map((el) => {
          const count = saju.elementsDistribution[el] ?? 0
          return (
            <div key={el} className="flex items-center gap-2">
              <span className="w-8 shrink-0 font-serif text-[11px] text-ink-light/70">{WUXING_KOREAN[el] ?? el}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(count / total) * 100}%`, background: WU_XING_COLORS[el] }}
                />
              </div>
              <span className="w-4 shrink-0 text-right text-[11px] tabular-nums text-ink-light/60">{count}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 간략 설명 — 일간이 무엇이고 어떤 기운인지 한 줄. 깊은 해석은 만세력이 진다. */
function DayMasterNote({ saju }: { saju: SajuData }) {
  const elementKo = WUXING_KOREAN[saju.dayMasterElement] ?? saju.dayMasterElement
  const dayMasterKo = TIANGAN_INFO[saju.dayMaster]?.korean ?? ''
  const missing = ELEMENT_ORDER.filter((el) => (saju.elementsDistribution[el] ?? 0) === 0)
  const missingKo = missing.map((el) => WUXING_KOREAN[el] ?? el).join('·')

  return (
    <div className="rounded-lg border border-gold-500/20 bg-gold-500/[0.05] px-3 py-2.5">
      <p className="text-[11.5px] font-light leading-relaxed text-ink-light/80" style={{ wordBreak: 'keep-all' }}>
        나를 뜻하는 글자는{' '}
        <span className="font-bold text-gold-500">
          {saju.dayMaster}
          {dayMasterKo ? `(${dayMasterKo})` : ''}
        </span>
        , 곧 <span className="font-bold text-gold-500">{elementKo}</span>의 기운입니다.
        {missing.length > 0 ? (
          <>
            {' 여덟 글자에 '}
            <span className="font-bold text-gold-400">{missingKo}</span>
            {' 기운이 없어, 그 기운을 채우면 균형이 잡힙니다.'}
          </>
        ) : null}
      </p>
    </div>
  )
}
