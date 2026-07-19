'use client'

// 순수 표시용. findFiveAvatar 가 'use client' 모듈(five-avatar-selector)에서 오므로
// 서버 컴포넌트에서 호출하면 클라이언트 레퍼런스라 터진다 — 이 파일이 클라이언트여야 한다.
import Link from 'next/link'
import Image from 'next/image'
import { findFiveAvatar } from '@/components/family/five-avatar-selector'
import { ChevronLeft, Sparkles, ArrowRight, Home } from 'lucide-react'
import { ELEMENTS, EL_KO, EL_LABEL, EL_COLOR } from '@/lib/domain/shrine/energy'
import type { EnergyMapEntry, FamilyEnergyMap as MapData } from '@/lib/domain/shrine/energy-map'

/** 신당 방의 「氣運 균형」 바와 같은 언어를 쓴다 — 두 화면이 같은 것을 말하고 있어야 한다. */
function ElementBars({ entry }: { entry: EnergyMapEntry }) {
  return (
    <div className="flex gap-1">
      {ELEMENTS.map((el) => {
        const low = el === entry.yongsin
        const high = el === entry.strongest
        return (
          <div key={el} className="flex-1 text-center">
            <div
              className="h-[38px] rounded-md relative overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: low
                  ? '1px solid rgba(201,168,76,0.55)'
                  : high
                    ? '1px solid rgba(255,255,255,0.18)'
                    : '1px solid rgba(255,255,255,0.06)',
                boxShadow: low ? '0 0 10px rgba(201,168,76,0.15)' : 'none',
              }}
            >
              <div
                className="absolute inset-x-0 bottom-0 rounded-t-md"
                style={{ height: `${entry.energy[el]}%`, background: EL_COLOR[el] }}
              />
            </div>
            <div className="font-serif text-[11px] mt-0.5 text-ink-primary/75">{EL_KO[el]}</div>
            <div className="text-[9.5px] text-ink-light/40 tabular-nums">{entry.energy[el]}</div>
          </div>
        )
      })}
    </div>
  )
}

function MemberCard({ entry }: { entry: EnergyMapEntry }) {
  const href = entry.targetId === 'self' ? '/protected/shrine' : `/protected/shrine?member=${entry.targetId}`
  // 가족 카드(member-mission-card)와 같은 오행 정령 아바타를 쓴다
  const avatar = findFiveAvatar(entry.avatarId ?? undefined)
  return (
    <div className="rounded-xl border border-gold-500/[0.18] bg-gold-500/[0.03] p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        {avatar ? (
          <Image
            src={avatar.src}
            alt={avatar.label}
            width={32}
            height={32}
            className="w-8 h-8 rounded-full object-cover shrink-0"
            style={{ backgroundColor: `${avatar.color}15`, border: `1px solid ${avatar.color}30` }}
          />
        ) : (
          <span className="w-8 h-8 rounded-full bg-surface border border-gold-500/20 grid place-items-center text-[13px] shrink-0">
            {entry.targetId === 'self' ? '🪷' : '🕯️'}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className="font-serif text-[14px] font-bold text-ink-light truncate">{entry.name}</span>
            <span className="text-[10px] text-ink-light/45 shrink-0">{entry.relation}</span>
          </div>
          <p className="text-[10.5px] text-ink-light/50 truncate">
            {entry.hasShrine ? (
              <>
                {entry.deityName ? `${entry.deityName} 좌정` : '신위 미좌정'} · 신물 {entry.itemCount}
              </>
            ) : (
              '아직 신당이 열리지 않았습니다'
            )}
          </p>
        </div>
        <Link
          href={href}
          aria-label={`${entry.name} 신당 열기`}
          className="shrink-0 p-1.5 rounded-lg border border-gold-500/25 text-gold-400/80 hover:bg-gold-500/10"
        >
          <Home className="w-3.5 h-3.5" />
        </Link>
      </div>

      <ElementBars entry={entry} />

      <p className="text-[10.5px] text-ink-light/55 leading-snug">
        <b className="text-gold-400 font-serif">
          {EL_LABEL[entry.yongsin]}({EL_KO[entry.yongsin]})
        </b>{' '}
        기운이 가장 모자라고,{' '}
        <b className="text-ink-light/75 font-serif">
          {EL_LABEL[entry.strongest]}({EL_KO[entry.strongest]})
        </b>{' '}
        기운이 넉넉합니다.
      </p>
    </div>
  )
}

export function FamilyEnergyMapView({ data }: { data: MapData }) {
  const { entries, average, familyYongsin, complements } = data

  return (
    <div className="min-h-screen w-full max-w-[480px] mx-auto px-3 py-6 pb-28">
      <div className="mb-4">
        <Link
          href="/protected/family"
          className="inline-flex items-center gap-1 text-[12px] text-ink-light/50 hover:text-gold-300 font-serif"
        >
          <ChevronLeft className="w-4 h-4" />
          가족 관리
        </Link>
      </div>

      <header className="text-center space-y-1.5 mb-5">
        <p className="text-[10px] tracking-[0.5em] text-gold-500/50 font-serif">氣運 地圖</p>
        <h1 className="text-2xl font-serif font-bold text-ink-light">우리 가족 기운 지도</h1>
        <p className="text-sm text-ink-light/50 font-sans">
          {entries.length}명의 오행을 나란히 두고 서로 무엇을 메워줄 수 있는지 봅니다
        </p>
      </header>

      {/* 가족 전체 평균 */}
      <section className="rounded-xl border border-gold-500/30 bg-gold-500/[0.06] p-4 mb-5 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary">가족 전체 균형</span>
          <span className="text-[10.5px] px-2 py-[3px] rounded-sm bg-gold-500/[0.12] border border-gold-500/35 text-gold-300">
            함께 채울 기운 <b className="font-serif text-gold-500">{EL_KO[familyYongsin]}</b>
          </span>
        </div>
        <div className="flex gap-1.5">
          {ELEMENTS.map((el) => {
            const low = el === familyYongsin
            return (
              <div key={el} className="flex-1 text-center">
                <div
                  className="h-[46px] rounded-md relative overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: low ? '1px solid rgba(201,168,76,0.55)' : '1px solid rgba(255,255,255,0.06)',
                    boxShadow: low ? '0 0 10px rgba(201,168,76,0.15)' : 'none',
                  }}
                >
                  <div
                    className="absolute inset-x-0 bottom-0 rounded-t-md"
                    style={{ height: `${average[el]}%`, background: EL_COLOR[el] }}
                  />
                </div>
                <div className="font-serif text-[12px] mt-1 text-ink-primary/75">{EL_KO[el]}</div>
                <div className="text-[10px] text-ink-light/40 tabular-nums">{average[el]}</div>
              </div>
            )
          })}
        </div>
        <p className="text-[11px] text-ink-light/55 leading-relaxed">
          가족 전체로는 <b className="text-gold-400 font-serif">{EL_LABEL[familyYongsin]}</b> 기운이 가장 옅습니다. 이
          기운을 담은 신물을 각자의 신당에 모시면 집안의 균형이 고르게 잡힙니다.
        </p>
        <Link
          href="/protected/store?tab=items"
          className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-gold-400"
        >
          {EL_KO[familyYongsin]} 기운 신물 보러가기 <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* 서로 메워주는 관계 */}
      {complements.length > 0 && (
        <section className="rounded-xl border border-seal/30 bg-seal/[0.05] p-4 mb-5 space-y-2">
          <p className="flex items-center gap-1.5 font-serif text-[13px] font-bold text-ink-primary">
            <Sparkles className="w-3.5 h-3.5 text-seal" /> 서로 메워주는 인연
          </p>
          <ul className="space-y-1.5">
            {complements.map((c, i) => (
              <li key={`${c.fromId}-${c.toId}-${i}`} className="text-[11.5px] text-ink-light/70 leading-snug">
                <b className="text-ink-light font-serif">{c.fromName}</b>
                <span className="text-ink-light/40"> 의 </span>
                <b className="font-serif" style={{ color: EL_COLOR[c.element] }}>
                  {EL_LABEL[c.element]}({EL_KO[c.element]})
                </b>
                <span className="text-ink-light/40"> 기운이 </span>
                <b className="text-ink-light font-serif">{c.toName}</b>
                <span className="text-ink-light/40"> 의 모자란 곳을 채워줍니다.</span>
              </li>
            ))}
          </ul>
          <p className="text-[10.5px] text-ink-light/40 leading-snug pt-0.5">
            같이 있는 시간을 늘리거나, 그 기운의 신물을 서로의 신당에 나눠 모시면 좋습니다.
          </p>
        </section>
      )}

      {/* 구성원별 */}
      <section className="space-y-3">
        <p className="font-serif text-[13px] font-bold tracking-[0.1em] text-ink-primary px-1">구성원별 기운</p>
        {entries.map((e) => (
          <MemberCard key={e.targetId} entry={e} />
        ))}
      </section>
    </div>
  )
}
