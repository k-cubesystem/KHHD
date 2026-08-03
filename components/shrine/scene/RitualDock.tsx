'use client'

/**
 * 의식 독(儀式 dock) — 방 아래 의식 3종을 카드 하나로 (AUDIT-20260731-design P1-1).
 *
 * 종전에는 같은 급의 의식이 방 위(백일 게이지) 1 + 방 아래(액막이·오방기) 2로 갈라져 있었고,
 * 세 스트립이 픽셀 단위까지 같은 해부학이라 "설정 화면 행"으로 읽혔다. 여기서는
 *  · 방이 헤더 바로 아래로 올라오고(백일 슬롯 삭제), 의식 3종이 한 카드에 선다
 *  · 행 높이 44px — 종전 32px는 터치 타깃 기준 미달이었다
 *  · 한자 첨자(厄/旗/禱)는 행에서 걷어 헤더 「儀 式」 하나로 승격 — 행마다 반복하면 노이즈다
 *  · 아이콘 플레이트는 원형 20px → **도장 반경 3px** 26px (DESIGN.md 도장 문법)
 *
 * ⚠️ 배선 보존 — 액막이 행은 기존 AekmakStrip 을 **그대로 품는다**. 겉 클래스만 행 문법으로
 *    바꿨을 뿐 `data-aekmak-open`·시트 로직은 무변경이고, 창방 「액막이」 팻말이 여는 문도
 *    여전히 그 버튼 하나다(룸의 aekmakSlotRef 가 이 안을 질의한다 — plaque.test.ts 계약).
 *
 * ⚠️ null 가드 — 현황이 null 인 행은 그리지 않는다(잔여 회수를 지어내 보이는 것이 최악이다).
 *    셋 다 null 이면 독 자체를 그리지 않는다.
 */

import Link from 'next/link'
import type { MouseEvent, RefObject } from 'react'
import { Flag, Flame, Coins } from 'lucide-react'
import type { AekmakStatus, BaekilStatus, ChuljeonStatus, ObangkiStatus } from '@/app/actions/shrine/rituals'
import type { SoundKey } from '@/lib/domain/shrine/types'
import { useRitualTransition, type RitualNavigate } from '@/hooks/use-ritual-transition'
import { AekmakStrip } from './AekmakSheet'

/**
 * 의식으로 나가는 문에 전환 연출을 입힌다.
 *
 * ⚠️ `<Link>` 를 버튼으로 바꾸지 않는다 — 프리페치·가운데클릭·「새 탭으로 열기」가 전부 링크의
 *    것이다. 우리가 가로채는 것은 **평범한 왼쪽 클릭 하나뿐**이고, 나머지는 브라우저에 돌려준다.
 */
function ritualLinkHandler(go: RitualNavigate, href: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (go(href, e)) e.preventDefault()
  }
}

/** 행 공통 골격 — 44px 터치 타깃. 세 행이 같은 뼈대를 써야 "한 카드"로 읽힌다. */
const ROW_CLASS = 'flex items-center gap-2.5 px-4 min-h-[44px]'
/** 아이콘 플레이트 공통 — 도장 반경 3px (원형 폐기, DESIGN.md "buttons 3px" 문법의 축소판) */
const PLATE_CLASS = 'grid h-[26px] w-[26px] flex-shrink-0 place-items-center rounded-[3px] border'
/** 의식 이름 — 13px serif 볼드 (종전 11px에서 승급) */
const NAME_CLASS = 'whitespace-nowrap font-serif text-body-sm font-bold text-ink-primary'
/** 우측 상태 — 11px sans (종전 9.5px/45 → WCAG 라벨 기준 /55 충족) */
const STATE_CLASS = 'flex items-center gap-1.5 whitespace-nowrap font-sans text-[11px] tabular-nums'
/** 상태점 — 의식이 지금 살아 있음을 알리는 5px 점. 소진·휴면이면 그리지 않는다. */
const DOT_CLASS = 'inline-block h-[5px] w-[5px] rounded-full'

interface Props {
  /** null 이면 해당 행을 그리지 않는다(비로그인·조회 실패 시 잔여 오표시 금지) */
  aekmak: AekmakStatus | null
  obangki: ObangkiStatus | null
  /** 척전(엽전 세 닢) — 갈림길 도구. 오방기와 전혀 다른 의식이라 행도 따로 선다 */
  chuljeon: ChuljeonStatus | null
  baekil: BaekilStatus | null
  /** 액막이 불씨 밝기·문구 — AekmakStrip 에 그대로 전달 */
  litCandles: number
  /** 신당 사운드 — 룸의 인스턴스를 빌려 쓴다 */
  play: (key: SoundKey) => void
  /**
   * 룸이 창방 「액막이」 팻말에서 시트를 대신 열 때 쓰는 자리표.
   * 이 div 안에 `data-aekmak-open` 버튼(AekmakStrip)이 산다 — 배선은 룸 소유 그대로다.
   */
  aekmakSlotRef: RefObject<HTMLDivElement | null>
}

export function RitualDock({ aekmak, obangki, chuljeon, baekil, litCandles, play, aekmakSlotRef }: Props) {
  if (!aekmak && !obangki && !chuljeon && !baekil) return null

  return (
    <section className="hanji-card mt-3 overflow-hidden rounded-xl border border-gold-500/[0.18]">
      <header className="flex items-baseline gap-2 px-4 pt-2.5 pb-2">
        <span className="font-serif text-body-sm font-bold tracking-[0.14em] text-gold-200">오늘의 의식</span>
        <span className="font-serif text-overline text-gold-500/60">儀 式</span>
      </header>
      {/* 신당 계열 최초의 단청 리듬 — DESIGN.md "Section rhythm: dancheong-divider" */}
      <div aria-hidden className="dancheong-divider" />

      <div className="divide-y divide-white/[0.04]">
        {aekmak && (
          <div ref={aekmakSlotRef}>
            <AekmakStrip status={aekmak} litCandles={litCandles} play={play} />
          </div>
        )}
        {obangki && <ObangkiRow status={obangki} />}
        {chuljeon && <ChuljeonRow status={chuljeon} />}
        {baekil && <BaekilRow status={baekil} />}
      </div>
    </section>
  )
}

/** 오방기 행 — 전용 페이지로 나가는 문. 잔여 판정은 서버 값(remainingFree)만 쓴다. */
function ObangkiRow({ status }: { status: ObangkiStatus }) {
  const freeLeft = status.remainingFree
  const go = useRitualTransition()
  return (
    <Link
      href="/protected/shrine/obangki"
      onClick={ritualLinkHandler(go, '/protected/shrine/obangki')}
      className={ROW_CLASS}
    >
      <span className={`${PLATE_CLASS} border-obangsaek-blue/40 bg-obangsaek-blue/[0.16]`}>
        <Flag className="h-3.5 w-3.5 text-[#9FBEDD]" />
      </span>
      <span className={NAME_CLASS}>오방기</span>
      <span className="flex-1 truncate text-left font-sans text-[11px] text-ink-primary/55">
        깃발을 뽑아 방위를 봅니다
      </span>
      {freeLeft > 0 ? (
        <span className={`${STATE_CLASS} text-ink-primary/55`}>
          <span aria-hidden className={`${DOT_CLASS} bg-obangsaek-blue`} />
          무료 {freeLeft}회 남음
        </span>
      ) : (
        // 무료 소진 — 값을 미리 밝힌다(눌러 들어가서야 액수를 아는 문을 만들지 않는다)
        <span className={`${STATE_CLASS} text-ink-primary/40`}>복채 {status.cost}만냥</span>
      )}
    </Link>
  )
}

/**
 * 척전 행 — 갈림길을 정하는 도구로 나가는 문.
 *
 * ⚠️ 오방기 바로 아래에 서지만 **다른 의식**이다. 오방기는 한 가지 일에 신이 답하는 자리(문복),
 *    척전은 사람이 고르지 못한 갈림길을 하늘에 맡기는 자리다. 그래서 상태 표기도 다르다 —
 *    복채가 없으므로 "무료 N회"가 아니라 그냥 "N회 남음"이다(값이 있는 척하지 않는다).
 */
function ChuljeonRow({ status }: { status: ChuljeonStatus }) {
  const left = status.remaining
  const go = useRitualTransition()
  return (
    <Link
      href="/protected/shrine/chuljeon"
      onClick={ritualLinkHandler(go, '/protected/shrine/chuljeon')}
      className={ROW_CLASS}
    >
      <span className={`${PLATE_CLASS} border-gold-500/40 bg-gold-500/[0.14]`}>
        <Coins className="h-3.5 w-3.5 text-gold-200" />
      </span>
      <span className={NAME_CLASS}>엽전 세 닢</span>
      <span className="flex-1 truncate text-left font-sans text-[11px] text-ink-primary/55">
        갈림길 앞에서 던져 정합니다
      </span>
      {left > 0 ? (
        <span className={`${STATE_CLASS} text-ink-primary/55`}>
          <span aria-hidden className={`${DOT_CLASS} bg-gold-500`} />
          {left}회 남음
        </span>
      ) : (
        <span className={`${STATE_CLASS} text-ink-primary/40`}>내일 다시</span>
      )}
    </Link>
  )
}

/**
 * 백일기도 행 — 구 BaekilStrip(방 위 슬롯)을 독의 행으로 흡수했다.
 *
 * ⚠️ 진행도를 여기서 다시 계산하지 않는다 — percent·earnedDays·targetDays·phase 는 전부
 *    서버(getBaekilStatus → lib/domain/ritual/baekil.ts)가 판정한 값이다(구 스트립과 같은 규율).
 * ⚠️ 미서약(phase='none')이면 0% 막대 대신 「시작하기」 — 빈 막대는 "서약 없음"과
 *    "오늘 0일째"를 구분하지 못한다. 서약 자체는 전용 페이지가 맡는다(이 행은 문일 뿐).
 * 휴면(dormant)은 실패가 아니다 — 막대는 남기고 불씨·상태점만 사그라뜨려 알린다.
 */
function BaekilRow({ status }: { status: BaekilStatus }) {
  const { progress } = status
  const started = progress.phase !== 'none'
  const burning = progress.phase === 'active' || progress.phase === 'ready'
  const go = useRitualTransition()

  return (
    <Link
      href="/protected/shrine/baekil"
      onClick={ritualLinkHandler(go, '/protected/shrine/baekil')}
      aria-label={started ? '백일기도 진행 보기' : '백일기도 시작하기'}
      className={ROW_CLASS}
    >
      <span
        className={`${PLATE_CLASS} ${burning ? 'border-gold-500/40 bg-gold-500/[0.14]' : 'border-white/10 bg-white/[0.04]'}`}
      >
        <Flame
          className={`h-3.5 w-3.5 ${burning ? 'text-gold-200' : 'text-[#5C564C]'}`}
          fill={burning ? '#C9A84C' : 'none'}
        />
      </span>
      <span className={NAME_CLASS}>백일기도</span>
      {/* 설명 대신 게이지가 말한다 — 우측 상태로 몬다(행 문법 유지를 위한 스페이서) */}
      <span className="flex-1" />
      {started ? (
        <span className={`${STATE_CLASS} ${burning ? 'text-ink-primary/55' : 'text-ink-primary/40'}`}>
          {burning && <span aria-hidden className={`${DOT_CLASS} bg-gold-500`} />}
          <span className="h-1 w-[72px] overflow-hidden rounded-full bg-ink-primary/15">
            <span className="block h-full rounded-full bg-gold-500" style={{ width: `${progress.percent}%` }} />
          </span>
          {progress.earnedDays}/{progress.targetDays}일
          {progress.ready && (
            <span className="grid h-[15px] flex-shrink-0 place-items-center rounded-full bg-seal px-1.5 text-[9px] font-bold text-[#f2dcdc]">
              갈무리
            </span>
          )}
        </span>
      ) : (
        // 시작하기는 행위 유도라 상태색(/55)이 아니라 금색을 입힌다 — 죽은 글자로 보이면 문이 닫힌다
        <span className="whitespace-nowrap font-sans text-[11px] text-gold-300">시작하기</span>
      )}
    </Link>
  )
}
