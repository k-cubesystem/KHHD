'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { findFamilyAvatar } from '@/lib/domain/family/avatars'
import { trackEvent } from '@/lib/analytics/ga4'
import {
  hallLayout,
  hallSeatLine,
  hallDaysSince,
  HALL_ALL_PRAYED_LINE,
  HALL_EMPTY_LINE,
  type HallSeat,
} from '@/lib/domain/shrine/family-hall-layout'
import type { FamilyHallData, FamilyHallMember } from '@/app/actions/shrine/family-hall'

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

/** 방석 대비 오브·등불 비율 — 방석 폭(=좌석 폭)을 1로 본 상대값. */
const ORB_W = 0.74
const LANTERN_W = 0.3

/** 말풍선이 박스 밖으로 삐져나가지 않게 가두는 좌우 여백(%). */
const BUBBLE_X_MIN = 16
const BUBBLE_X_MAX = 84

/** 말풍선 자동 소멸(ms) — 읽고 사라질 만큼만. */
const BUBBLE_MS = 4200

/** 좌석 등장 간격(ms) — 왼쪽부터 차례로 앉는다. */
const SEAT_STAGGER_MS = 70

interface Props {
  data: FamilyHallData
  /** 부모 박스에 얹을 클래스(크기·여백은 부모 책임). */
  className?: string
}

/** 좌석 키 — 본인 좌석은 memberId 가 null 이다. */
function seatKey(m: FamilyHallMember): string {
  return m.memberId ?? 'self'
}

function SeatFigure({
  member,
  seat,
  index,
  sizePct,
  active,
  onTap,
}: {
  member: FamilyHallMember
  seat: HallSeat
  index: number
  sizePct: number
  active: boolean
  onTap: (key: string) => void
}) {
  const avatar = findFamilyAvatar(member.avatarId)
  const lit = member.prayedToday
  const width = sizePct * seat.scale

  return (
    <button
      type="button"
      onClick={() => onTap(seatKey(member))}
      aria-label={`${member.name} 자리 — ${lit ? '오늘 다녀감' : '아직 오지 않음'}`}
      aria-pressed={active}
      className="fh-seat absolute"
      style={{
        left: `${seat.x}%`,
        top: `${seat.y}%`,
        width: `${width}%`,
        aspectRatio: '2.6 / 1',
        transform: 'translate(-50%, -50%)',
        zIndex: seat.z,
        ['--fh-delay' as string]: `${index * SEAT_STAGGER_MS}ms`,
      }}
    >
      {/* 방석 — 점등이면 골드 기, 소등이면 먹빛 */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-[50%] border"
        style={{
          background: lit
            ? 'radial-gradient(60% 70% at 50% 40%, rgba(201,168,76,0.30) 0%, rgba(158,43,43,0.22) 70%)'
            : 'radial-gradient(60% 70% at 50% 40%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.18) 70%)',
          borderColor: lit ? 'rgba(201,168,76,0.45)' : 'rgba(255,255,255,0.10)',
        }}
      />

      {/* 착석 아바타 — 오늘 다녀간 자리에만 앉는다 */}
      {lit && (
        <span
          aria-hidden
          className="fh-orb absolute overflow-hidden rounded-full border"
          style={{
            left: '50%',
            bottom: '46%',
            width: `${ORB_W * 100}%`,
            aspectRatio: '1 / 1',
            transform: 'translateX(-50%)',
            borderColor: 'rgba(201,168,76,0.55)',
            backgroundColor: avatar ? `${avatar.color}22` : 'rgba(201,168,76,0.10)',
            boxShadow: '0 0 10px rgba(201,168,76,0.35)',
          }}
        >
          {avatar ? (
            <Image src={avatar.src} alt="" fill sizes="72px" className="object-cover object-top" />
          ) : (
            <span className="grid h-full w-full place-items-center font-serif text-[11px] text-gold-300">
              {member.name.slice(0, 1)}
            </span>
          )}
        </span>
      )}

      {/* 등불 — 점등(골드 글로우) / 소등(테두리만) */}
      <span
        aria-hidden
        className={`absolute rounded-full border ${lit ? 'fh-flicker' : ''}`}
        style={{
          right: '-4%',
          bottom: '34%',
          width: `${LANTERN_W * 100}%`,
          aspectRatio: '1 / 1.25',
          borderRadius: '42%',
          borderColor: lit ? 'rgba(201,168,76,0.7)' : 'rgba(255,255,255,0.14)',
          background: lit
            ? 'radial-gradient(circle at 50% 45%, rgba(244,228,186,0.95) 0%, rgba(201,168,76,0.55) 55%, rgba(201,168,76,0) 100%)'
            : 'rgba(255,255,255,0.03)',
          boxShadow: lit ? '0 0 12px rgba(201,168,76,0.55)' : 'none',
        }}
      />

      {/* 이름표 — 본인 자리는 골드로 구분(주인 자리) */}
      <span
        className="absolute left-1/2 top-full block max-w-[130%] -translate-x-1/2 truncate pt-[3px] text-center font-sans text-[9px] leading-none"
        style={{ color: member.memberId === null ? '#F4E4BA' : lit ? '#E8E4DC' : 'rgba(232,228,220,0.45)' }}
      >
        {member.memberId === null ? '나' : member.name}
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

export function FamilyHall({ data, className }: Props) {
  const { isFamilyTier, members, allPrayedToday } = data
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const timer = useRef<number | null>(null)

  const layout = useMemo(() => hallLayout(members.length), [members.length])
  const seated = useMemo(() => members.slice(0, layout.seats.length), [members, layout.seats.length])

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
          onTap={onTap}
        />
      ))}

      {/* 말풍선 — 탭한 자리 위 */}
      {openMember && openSeat && (
        <div
          role="status"
          className="fh-bubble pointer-events-none absolute z-[120] max-w-[74%] rounded-[10px] border border-gold-500/30 px-2.5 py-1.5 text-center"
          style={{
            left: `${Math.min(BUBBLE_X_MAX, Math.max(BUBBLE_X_MIN, openSeat.x))}%`,
            top: `${openSeat.y}%`,
            transform: 'translate(-50%, calc(-100% - 22px))',
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

      {/* 하단 캡션 — 만개 / 빈 방 / 더 앉지 못한 인원 */}
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

      {/* GamefeelStyles 와 같은 이유로 global 이다 — 키프레임을 형제 컴포넌트(SeatFigure)가 써야 해서
          scoped 로 두면 선택자가 닿지 않는다. 이름은 전부 `fh-` 접두로 충돌을 막는다. */}
      <style jsx global>{`
        .fh-seat {
          animation: fhSeatIn 0.42s ease-out both;
          animation-delay: var(--fh-delay, 0ms);
        }
        @keyframes fhSeatIn {
          from {
            opacity: 0;
            transform: translate(-50%, -44%);
          }
          to {
            opacity: 1;
            transform: translate(-50%, -50%);
          }
        }

        /* 등불 흔들림 — 밝기만 흔든다(레이아웃·색상 애니 금지) */
        .fh-flicker {
          animation: fhFlicker 3.4s ease-in-out infinite;
        }
        @keyframes fhFlicker {
          0%,
          100% {
            opacity: 0.7;
          }
          50% {
            opacity: 1;
          }
        }

        /* 만개 골드 링 — 등불 둘레가 천천히 벌어졌다 오므라든다 */
        .fh-bloom {
          animation: fhBloom 3.2s ease-in-out infinite;
        }
        @keyframes fhBloom {
          0%,
          100% {
            opacity: 0.28;
            transform: translate(-50%, -50%) scale(0.94);
          }
          50% {
            opacity: 0.72;
            transform: translate(-50%, -50%) scale(1.06);
          }
        }

        .fh-bubble {
          animation: fhBubbleIn 0.18s ease-out;
        }
        @keyframes fhBubbleIn {
          from {
            opacity: 0;
            transform: translate(-50%, calc(-100% - 14px));
          }
          to {
            opacity: 1;
            transform: translate(-50%, calc(-100% - 22px));
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .fh-seat,
          .fh-flicker,
          .fh-bloom,
          .fh-bubble {
            animation: none;
          }
        }
      `}</style>
    </div>
  )
}
