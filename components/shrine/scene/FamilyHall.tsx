'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { trackEvent } from '@/lib/analytics/ga4'
import { clampPct } from '@/lib/domain/shrine/zones'
import {
  applyHallSeats,
  hallAvatar,
  hallLayout,
  hallSeatKey,
  hallSeatLine,
  hallSeatScale,
  hallSeatZ,
  hallDaysSince,
  EMPTY_HALL_SEATS,
  HALL_ALL_PRAYED_LINE,
  HALL_EMPTY_LINE,
  HALL_SEAT_MIN_PX,
  HALL_SEAT_ZONE,
  type HallSeat,
  type HallSeatMap,
} from '@/lib/domain/shrine/family-hall-layout'
import { saveFamilyHallSeats, type FamilyHallData, type FamilyHallMember } from '@/app/actions/shrine/family-hall'

/**
 * 가족 사랑방 (PRD-shrine-gamefeel-v1 §안3 / ARCH §2 FamilyHall).
 *
 * **자기완결 컴포넌트** — 부모가 주는 박스를 100% 채우고, 안쪽 좌표는 전부 % 절대배치라
 * 두루마리 후원 구역이든 단독 화면이든 그대로 mount 된다. 부모 크기를 가정하지 않는다.
 *
 * 연출 규율(ARCH §5): transform/opacity 만 애니메이션한다. 캔버스·파티클을 새로 만들지 않는다
 * (EffectsCanvas 폭주 흰화면 전례). prefers-reduced-motion 이면 전 연출이 통째로 꺼진다.
 *
 * 착석 아바타는 **신규 에셋 없이** 기존 아바타 카탈로그(lib/domain/family/avatars.ts)를
 * 방석 위 원형 오브로 연출한다. 착석 전용 스프라이트는 시범 검수 후 교체 지점만 열어 둔다.
 */

/**
 * 좌석 상자 대비 각 부품 비율 — 상자 **폭**을 1로 본 상대값.
 * 상자는 오브(원)와 방석이 함께 들어가도록 세로로 길다(폭 1 : 높이 SEAT_ASPECT_H).
 */
const ORB_W = 0.72
const LANTERN_W = 0.32
const SEAT_ASPECT_H = 1.32

/** 방석이 차지하는 상자 하단 띠(상자 높이 %). 방석 자체의 가로세로비는 대략 2.5:1 이 된다. */
const CUSHION_H_PCT = 30

/**
 * 상자 기준점 — layout 이 주는 (x,y)는 **방석 중심**이라는 계약이라, 상자를 그만큼 끌어올려야
 * 좌석 기하(반원·원근)가 그대로 성립한다. 방석 중심은 상자 위에서 100 - CUSHION_H_PCT/2 = 85% 지점.
 * 등장 애니메이션(fhSeatIn)도 이 값을 `--fh-anchor` 로 받아 쓴다 — 두 곳이 어긋나면 좌석이 튄다.
 */
const SEAT_ANCHOR_Y = '-85%'

/**
 * 말풍선을 오브 위로 띄우는 몫 — 좌석 상자 **폭** 기준. 오브 꼭대기는 방석 중심에서
 * 상자 폭의 0.74배까지 올라가므로 그보다 크게 잡아야 얼굴을 가리지 않는다.
 * (마진의 % 는 CSS 규칙상 세로 축에서도 컨테이너 **폭** 기준이라 좌석 폭 계산과 축이 맞는다.)
 */
const BUBBLE_LIFT_RATIO = 0.86

/** 말풍선 자동 소멸(ms) — 읽고 사라질 만큼만. */
const BUBBLE_MS = 4200

/** 좌석 등장 간격(ms) — 왼쪽부터 차례로 앉는다. */
const SEAT_STAGGER_MS = 70

/** 드래그로 인정하는 최소 이동(px). 이 아래는 탭이다 — 좌석을 툭 건드릴 때마다 저장이 나가지 않게 한다. */
const DRAG_START_PX = 4

/** 좌석 상자 폭 CSS — 좁은 후원 박스에서도 손가락에 잡히도록 px 하한을 건다. */
function seatWidthCss(pct: number): string {
  return `max(${pct}%, ${HALL_SEAT_MIN_PX}px)`
}

interface Props {
  data: FamilyHallData
  /** 부모 박스에 얹을 클래스(크기·여백은 부모 책임). */
  className?: string
  /**
   * 꾸미기(편집) 모드. true 면 좌석을 끌어 옮길 수 있고 탭 말풍선은 잠긴다 —
   * 보기 모드의 상호작용(탭 → 말풍선)은 종전과 완전히 같다.
   */
  editing?: boolean
}

/** 좌석 키 — 본인 좌석은 memberId 가 null 이다(→ 'self'). 서버 저장 키와 같은 함수를 쓴다. */
function seatKey(m: FamilyHallMember): string {
  return hallSeatKey(m.memberId)
}

function SeatFigure({
  member,
  seat,
  index,
  sizePct,
  active,
  editing,
  onTap,
  onMove,
}: {
  member: FamilyHallMember
  seat: HallSeat
  index: number
  sizePct: number
  active: boolean
  editing: boolean
  onTap: (key: string) => void
  onMove: (key: string, x: number, y: number) => void
}) {
  const self = member.memberId === null
  const label = self ? '나' : member.name
  // 아바타는 **항상** 실체가 나온다 — 미설정(본인 좌석은 언제나 NULL)·레거시 키·오타 전부
  // 이니셜 오브로 떨어진다. 여기서 null 이 나오면 좌석이 이름표만 남는다(실기기 증상의 뿌리).
  const avatar = hallAvatar(member.avatarId, label)
  const lit = member.prayedToday

  const ref = useRef<HTMLButtonElement>(null)
  const dragging = useRef(false)
  const moved = useRef(false)
  const posRef = useRef({ x: seat.x, y: seat.y })

  /**
   * 좌석 드래그 — 아이템 배치(ShrineRoomClient 의 Sprite)와 **같은 규약**이다:
   * pointer capture → 부모 박스 rect 로 % 환산 → 존 클램프 → 드래그 종료에만 커밋.
   * 이동 중에는 인라인 스타일만 만지고 리렌더를 내지 않는다(좌석 8개 리렌더 = 프레임 낙하).
   */
  const onPointerDown = useCallback(
    (e: RPointerEvent<HTMLButtonElement>) => {
      if (!editing) return
      e.preventDefault()
      // 두루마리 카메라와의 3자 조정(ARCH §4) — 좌석에서 시작한 드래그가 룸 팬으로 새면 안 된다.
      // 룸의 팬 핸들러는 버블 단계라 여기서 끊으면 도달하지 않는다(Sprite 와 동일).
      e.stopPropagation()
      const el = ref.current
      // 사랑방 박스가 부모다 — 좌표계가 뷰포트와 1:1 이라 rect 환산이 그대로 성립한다
      const box = el?.parentElement
      if (!el || !box) return
      dragging.current = true
      moved.current = false
      el.setPointerCapture(e.pointerId)
      el.style.zIndex = '140'
      const rect = box.getBoundingClientRect()
      const from = { x: e.clientX, y: e.clientY }

      const move = (ev: PointerEvent) => {
        if (!dragging.current) return
        // 손떨림·pointerdown 직후의 0px 이동은 이동으로 치지 않는다 — 탭 한 번에 저장이 나가면 안 된다
        if (!moved.current && Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < DRAG_START_PX) return
        moved.current = true
        const x = clampPct(((ev.clientX - rect.left) / rect.width) * 100, HALL_SEAT_ZONE.x)
        const y = clampPct(((ev.clientY - rect.top) / rect.height) * 100, HALL_SEAT_ZONE.y)
        posRef.current = { x, y }
        el.style.left = `${x}%`
        el.style.top = `${y}%`
        // 앞(아래)으로 내려올수록 커지고 앞에 선다 — 자동 배치의 원근과 같은 축(hallSeatDepth)
        el.style.width = seatWidthCss(sizePct * hallSeatScale(y))
      }
      const up = () => {
        if (!dragging.current) return
        dragging.current = false
        el.removeEventListener('pointermove', move)
        el.removeEventListener('pointerup', up)
        el.removeEventListener('pointercancel', up)
        // 드래그용 임시 z 를 React 가 아는 값으로 되돌린다 — 안 되돌리면 다음 렌더에서 140 이 남는다
        el.style.zIndex = String(moved.current ? hallSeatZ(posRef.current.y) : seat.z)
        if (moved.current) onMove(seatKey(member), posRef.current.x, posRef.current.y)
      }
      el.addEventListener('pointermove', move)
      el.addEventListener('pointerup', up)
      el.addEventListener('pointercancel', up)
    },
    [editing, member, seat.z, sizePct, onMove]
  )

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      // 꾸미기 중에는 말풍선을 열지 않는다 — 드래그 끝의 click 이 말풍선으로 새면 자리를 옮길 때마다 대사가 뜬다
      onClick={() => {
        if (!editing) onTap(seatKey(member))
      }}
      aria-label={
        editing ? `${label} 자리 — 끌어서 옮기기` : `${label} 자리 — ${lit ? '오늘 다녀감' : '아직 오지 않음'}`
      }
      aria-pressed={active}
      className="fh-seat absolute"
      style={{
        left: `${seat.x}%`,
        top: `${seat.y}%`,
        width: seatWidthCss(sizePct * seat.scale),
        aspectRatio: `1 / ${SEAT_ASPECT_H}`,
        transform: `translate(-50%, ${SEAT_ANCHOR_Y})`,
        zIndex: seat.z,
        // 편집 중에는 브라우저 스크롤 제스처에 좌석 드래그를 뺏기지 않는다(룸과 같은 규약)
        touchAction: editing ? 'none' : undefined,
        cursor: editing ? 'grab' : undefined,
        ['--fh-delay' as string]: `${index * SEAT_STAGGER_MS}ms`,
        ['--fh-anchor' as string]: SEAT_ANCHOR_Y,
      }}
    >
      {/* 방석 — 상자 바닥 띠. 소등도 보이도록 먹빛 대신 단청 적갈 + 골드 테두리로 대비를 올린다
          (이전 rgba(255,255,255,0.05)/0.10 은 후원 흙바닥 위에서 사실상 보이지 않았다) */}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 rounded-[50%] border"
        style={{
          height: `${CUSHION_H_PCT}%`,
          background: lit
            ? 'radial-gradient(62% 74% at 50% 38%, rgba(201,168,76,0.42) 0%, rgba(158,43,43,0.42) 72%)'
            : 'radial-gradient(62% 74% at 50% 38%, rgba(158,43,43,0.32) 0%, rgba(38,26,18,0.62) 72%)',
          borderColor: lit ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.38)',
          boxShadow: lit ? '0 0 12px rgba(201,168,76,0.35)' : '0 1px 6px rgba(0,0,0,0.5)',
        }}
      />

      {/* 착석 오브 — 좌석마다 **항상** 앉는다. 오늘 왔는가는 크기가 아니라 밝기·채도로 말한다
          (소등 좌석을 비워 두면 "가족이 여기 있다"는 사실 자체가 화면에서 사라진다) */}
      <span
        aria-hidden
        className="fh-orb absolute overflow-hidden rounded-full"
        style={{
          left: '50%',
          bottom: `${CUSHION_H_PCT * 0.55}%`,
          width: `${ORB_W * 100}%`,
          aspectRatio: '1 / 1',
          transform: 'translateX(-50%)',
          border: `1.5px solid ${lit ? 'rgba(201,168,76,0.9)' : 'rgba(201,168,76,0.5)'}`,
          backgroundColor: `${avatar.color}33`,
          boxShadow: lit ? '0 0 14px rgba(201,168,76,0.5)' : '0 1px 6px rgba(0,0,0,0.5)',
          opacity: lit ? 1 : 0.8,
          filter: lit ? undefined : 'saturate(0.55)',
        }}
      >
        {avatar.src ? (
          <Image src={avatar.src} alt="" fill sizes="96px" className="object-cover object-top" />
        ) : (
          <span className="grid h-full w-full place-items-center font-serif text-[17px] leading-none text-gold-200">
            {avatar.initial}
          </span>
        )}
      </span>

      {/* 등불 — 점등(골드 글로우) / 소등(꺼진 등이 그 자리에 있다는 것까지만) */}
      <span
        aria-hidden
        className={`absolute border ${lit ? 'fh-flicker' : ''}`}
        style={{
          right: '-6%',
          bottom: `${CUSHION_H_PCT * 0.6}%`,
          width: `${LANTERN_W * 100}%`,
          aspectRatio: '1 / 1.25',
          borderRadius: '42%',
          borderColor: lit ? 'rgba(201,168,76,0.85)' : 'rgba(201,168,76,0.4)',
          background: lit
            ? 'radial-gradient(circle at 50% 45%, rgba(244,228,186,0.95) 0%, rgba(201,168,76,0.55) 55%, rgba(201,168,76,0) 100%)'
            : 'radial-gradient(circle at 50% 45%, rgba(232,213,160,0.20) 0%, rgba(201,168,76,0.07) 60%, rgba(201,168,76,0) 100%)',
          boxShadow: lit ? '0 0 14px rgba(201,168,76,0.6)' : 'none',
        }}
      />

      {/* 이름표 — 오브 아래 **보조**. 본인 자리는 골드로 구분(주인 자리) */}
      <span
        className="absolute left-1/2 top-full block max-w-[150%] -translate-x-1/2 truncate pt-[3px] text-center font-sans text-[9.5px] leading-none"
        style={{ color: self ? '#F4E4BA' : lit ? '#E8E4DC' : 'rgba(232,228,220,0.62)' }}
      >
        {label}
      </span>
    </button>
  )
}

/** SINGLE(비 FAMILY) 업셀 씬 — 닫힌 문. 데이터는 애초에 내려오지 않는다(ARCH §7). */
function LockedHall() {
  return (
    <div className="relative grid h-full w-full place-items-center px-4 text-center">
      {/* 닫힌 두 짝 문 */}
      <div aria-hidden className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: '46%' }}>
        <div
          className="relative w-full rounded-t-[10px] border"
          style={{
            aspectRatio: '1 / 1.25',
            borderColor: 'rgba(201,168,76,0.28)',
            background: 'linear-gradient(180deg, rgba(22,20,15,0.92) 0%, rgba(10,10,8,0.92) 100%)',
          }}
        >
          <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-gold-500/25" />
          <span className="absolute left-[30%] top-1/2 h-[9%] w-[9%] -translate-y-1/2 rounded-full border border-gold-500/40" />
          <span className="absolute right-[30%] top-1/2 h-[9%] w-[9%] -translate-y-1/2 rounded-full border border-gold-500/40" />
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-2.5">
        <p className="font-serif text-[10px] tracking-[0.4em] text-gold-500/55">舍 廊 房</p>
        <p className="max-w-[240px] font-serif text-[13px] leading-relaxed text-ink-primary/85">
          가족과 함께 기도하면
          <br />
          사랑방이 열립니다
        </p>
        <p className="max-w-[250px] font-sans text-[10.5px] leading-relaxed text-ink-primary/50">
          가족마다 방석과 등불이 놓이고, 오늘 누가 다녀갔는지 한눈에 보입니다.
        </p>
        <Link
          href="/protected/store?tab=membership"
          onClick={() => trackEvent({ action: 'family_hall_upsell_click', category: 'shrine', label: 'locked_door' })}
          className="mt-1 rounded-[3px] border border-seal/60 bg-seal/20 px-4 py-1.5 font-serif text-[12px] font-bold text-[#f2dcdc] shadow-dojang"
        >
          가족 멤버십 보기
        </Link>
      </div>
    </div>
  )
}

export function FamilyHall({ data, className, editing = false }: Props) {
  const { isFamilyTier, members, allPrayedToday } = data
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  /**
   * 좌석 재배치 — 서버(data.seats)가 정본이고 드래그 결과만 이 상태가 앞서 들고 있는다.
   * 서버가 새 배치를 내려주면 **렌더 중** 즉시 그 값으로 되돌린다(룸의 hall/hallSource 와 같은 패턴).
   * 합동 기도 낙관 점등(litSelfSeat)은 seats 참조를 보존하므로 방금 옮긴 자리가 되돌아가지 않는다.
   */
  const [seats, setSeats] = useState<HallSeatMap>(data.seats)
  const [seatsSource, setSeatsSource] = useState<HallSeatMap>(data.seats)
  if (seatsSource !== data.seats) {
    setSeatsSource(data.seats)
    setSeats(data.seats)
  }

  const base = useMemo(() => hallLayout(members.length), [members.length])
  const seated = useMemo(() => members.slice(0, base.seats.length), [members, base.seats.length])
  const seatKeys = useMemo(() => seated.map(seatKey), [seated])
  // 저장한 자리만 덮어쓴다 — 이력이 없는 좌석은 자동 반원 좌표 그대로다(기존 화면 회귀 0)
  const layout = useMemo(() => applyHallSeats(base, seatKeys, seats), [base, seatKeys, seats])
  const customized = useMemo(
    () => seatKeys.some((k) => Object.prototype.hasOwnProperty.call(seats, k)),
    [seatKeys, seats]
  )

  /**
   * 좌표 저장 — 드래그 1회 = 저장 1회(보기 모드 점화의 setPlacementLit 과 같은 즉시 저장).
   * 룸의 「완료」 저장(saveShrineLayout)은 신물 배치 전용이라 좌석이 끼어들 자리가 없다.
   * 실패하면 서버 값으로 되돌리지 않고 토스트만 띄운다 — 다음 진입에 서버 정본이 다시 내려온다.
   */
  const persist = useCallback((next: HallSeatMap) => {
    void saveFamilyHallSeats(next).then((res) => {
      if (!res.success) toast.error('자리 저장에 실패했어요')
    })
  }, [])

  // 상태 갱신 함수 안에서 저장하지 않는다 — StrictMode 가 updater 를 두 번 돌려 저장이 두 번 나간다
  const onSeatMove = useCallback(
    (key: string, x: number, y: number) => {
      const next: HallSeatMap = { ...seats, [key]: { x, y } }
      setSeats(next)
      persist(next)
      trackEvent({ action: 'family_hall_seat_move', category: 'shrine' })
    },
    [seats, persist]
  )

  const onResetSeats = useCallback(() => {
    setSeats(EMPTY_HALL_SEATS)
    persist(EMPTY_HALL_SEATS)
    trackEvent({ action: 'family_hall_seat_reset', category: 'shrine' })
  }, [persist])

  // 노출 계측 — 마운트 1회. 잠김/부분/만개를 나눠 FAMILY 퍼널을 본다(PRD §6 DoD).
  useEffect(() => {
    trackEvent({
      action: 'family_hall_view',
      category: 'shrine',
      label: !isFamilyTier ? 'locked' : allPrayedToday ? 'all_prayed' : 'partial',
      value: isFamilyTier ? members.length : 0,
    })
  }, [isFamilyTier, allPrayedToday, members.length])

  useEffect(() => {
    return () => {
      if (timer.current !== null) window.clearTimeout(timer.current)
    }
  }, [])

  const onTap = useCallback((key: string) => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    // 시각은 탭한 뒤에만 읽는다 — SSR 시점에 읽으면 하이드레이션이 어긋난다.
    setNow(Date.now())
    setOpenKey((prev) => {
      if (prev === key) return null
      timer.current = window.setTimeout(() => setOpenKey(null), BUBBLE_MS)
      return key
    })
  }, [])

  if (!isFamilyTier) {
    return (
      <div className={`relative h-full w-full ${className ?? ''}`}>
        <LockedHall />
      </div>
    )
  }

  const openIndex = seated.findIndex((m) => seatKey(m) === openKey)
  const openMember = openIndex >= 0 ? seated[openIndex] : null
  const openSeat = openIndex >= 0 ? layout.seats[openIndex] : null
  const daysSince = openMember && now !== null ? hallDaysSince(openMember.lastWishAt, now) : null

  return (
    <div className={`relative h-full w-full select-none ${className ?? ''}`}>
      {/* 중앙 공동 등불 */}
      <div
        aria-hidden
        className="absolute -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${layout.lantern.x}%`, top: `${layout.lantern.y}%`, width: '15%' }}
      >
        <div
          className={allPrayedToday ? 'fh-flicker' : ''}
          style={{
            width: '100%',
            aspectRatio: '1 / 1.3',
            borderRadius: '42%',
            border: `1px solid ${allPrayedToday ? 'rgba(201,168,76,0.75)' : 'rgba(201,168,76,0.35)'}`,
            background: allPrayedToday
              ? 'radial-gradient(circle at 50% 45%, rgba(244,228,186,0.98) 0%, rgba(201,168,76,0.6) 55%, rgba(201,168,76,0) 100%)'
              : 'radial-gradient(circle at 50% 45%, rgba(232,213,160,0.55) 0%, rgba(201,168,76,0.22) 60%, rgba(201,168,76,0) 100%)',
            boxShadow: allPrayedToday ? '0 0 22px rgba(201,168,76,0.55)' : '0 0 10px rgba(201,168,76,0.2)',
          }}
        />
      </div>

      {/* 만개 — 등불 글로우 맥동 + 골드 링 (파티클 금지, transform/opacity 만) */}
      {allPrayedToday && (
        <span
          aria-hidden
          className="fh-bloom pointer-events-none absolute rounded-full border border-gold-500/45"
          style={{
            left: `${layout.lantern.x}%`,
            top: `${layout.lantern.y}%`,
            width: '58%',
            aspectRatio: '1 / 0.62',
            transform: 'translate(-50%, -50%)',
          }}
        />
      )}

      {/* 방석 반원 */}
      {seated.map((m, i) => (
        <SeatFigure
          key={seatKey(m)}
          member={m}
          seat={layout.seats[i]}
          index={i}
          sizePct={layout.seatSizePct}
          active={openKey === seatKey(m)}
          editing={editing}
          onTap={onTap}
          onMove={onSeatMove}
        />
      ))}

      {/* 말풍선 — 탭한 자리 위 (꾸미기 중에는 열리지 않는다) */}
      {!editing && openMember && openSeat && (
        <div
          role="status"
          className="fh-bubble pointer-events-none absolute z-[120] max-w-[74%] rounded-[10px] border border-gold-500/30 px-2.5 py-1.5 text-center"
          style={{
            // 좌석 좌표를 그대로 따른다 — 종전에는 띠(박스) 안쪽 16~84 로 가뒀는데, 좌석이 띠 밖
            // 방 전 구역으로 나갈 수 있게 되면서 그 클램프가 말풍선만 띠에 홀로 남기는 원인이 됐다.
            left: `${openSeat.x}%`,
            top: `${openSeat.y}%`,
            // 좌석 (x,y)는 방석 중심이라, 그 위에 앉은 오브만큼 더 띄워야 얼굴을 가리지 않는다
            marginTop: `calc(${seatWidthCss(layout.seatSizePct * openSeat.scale)} * -${BUBBLE_LIFT_RATIO})`,
            transform: 'translate(-50%, calc(-100% - 8px))',
            background: 'rgba(22,20,15,0.94)',
          }}
        >
          <p className="font-serif text-[11px] leading-snug text-ink-primary/90">
            {hallSeatLine(openMember.memberId === null ? '나' : openMember.name, openMember.prayedToday, openIndex)}
          </p>
          {!openMember.prayedToday && daysSince !== null && (
            <p className="mt-0.5 font-sans text-[9px] text-ink-primary/45">
              {daysSince === 0 ? '오늘 들른 적 있어요' : `마지막 기도 ${daysSince}일 전`}
            </p>
          )}
        </div>
      )}

      {/* 하단 캡션 — 꾸미기 안내 / 만개 / 빈 방 / 더 앉지 못한 인원.
          꾸미기 중에는 캡션 자리를 조작 안내로 바꾼다(사랑방에 남는 유일한 여백이라 새 HUD 를 만들지 않는다). */}
      {editing && seated.length > 0 ? (
        <div className="absolute bottom-[2%] left-1/2 z-[130] flex w-full -translate-x-1/2 flex-col items-center gap-1 px-3">
          <span className="text-center font-sans text-[10px] leading-snug text-gold-300/80">
            식구를 끌어 자리를 옮겨 보세요
          </span>
          {customized && (
            <button
              type="button"
              onClick={onResetSeats}
              // 팬 제스처가 이 버튼의 탭을 삼키지 않게 — 좌석 드래그와 같은 규약
              onPointerDown={(e) => e.stopPropagation()}
              className="rounded-full border border-gold-500/45 px-2.5 py-1 font-sans text-[10px] leading-none text-gold-200"
              style={{ background: 'rgba(22,20,15,0.86)' }}
            >
              자동 배치로 되돌리기
            </button>
          )}
        </div>
      ) : (
        <p className="absolute bottom-[2%] left-1/2 w-full -translate-x-1/2 px-3 text-center font-sans text-[10px] leading-snug text-ink-primary/55">
          {seated.length === 0 ? (
            <span>{HALL_EMPTY_LINE}</span>
          ) : allPrayedToday ? (
            <span className="text-gold-300">{HALL_ALL_PRAYED_LINE}</span>
          ) : (
            <span>
              오늘 {seated.filter((m) => m.prayedToday).length}/{seated.length} 자리에 불이 켜졌어요
              {layout.overflow > 0 && ` · 외 ${layout.overflow}명`}
            </span>
          )}
        </p>
      )}
    </div>
  )
}
