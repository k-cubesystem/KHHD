'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Users } from 'lucide-react'
import { findFiveAvatar } from '@/components/family/five-avatar-selector'

export interface ShrineTargetTab {
  /** null = 본인 신당 */
  id: string | null
  name: string
  /** 가족: 오행 정령 avatar_id / 본인: 프로필 이미지 URL */
  avatarId?: string | null
  avatarUrl?: string | null
}

interface Props {
  tabs: ShrineTargetTab[]
  activeId: string | null
}

function TabAvatar({ tab, active }: { tab: ShrineTargetTab; active: boolean }) {
  const five = findFiveAvatar(tab.avatarId)
  const src = five?.src ?? tab.avatarUrl ?? null
  return (
    <span
      className={`w-9 h-9 rounded-full overflow-hidden grid place-items-center border transition-transform ${
        active ? 'border-gold-500 scale-105' : 'border-white/15'
      }`}
      style={{ backgroundColor: five ? `${five.color}18` : 'rgba(255,255,255,0.05)' }}
    >
      {src ? (
        <Image src={src} alt="" width={36} height={36} className="w-full h-full object-cover object-top" />
      ) : (
        <span className="font-serif text-[15px] text-gold-300">{tab.name.slice(0, 1)}</span>
      )}
    </span>
  )
}

/** 신당 대상 탭 — 본인 | 가족들 | 가족관리. 고민상담 "점사 대상"과 동일한 대상 축. */
export function ShrineTargetTabs({ tabs, activeId }: Props) {
  return (
    <div className="flex gap-2 px-1 pb-3 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((t) => {
        const active = t.id === activeId
        return (
          <Link
            key={t.id ?? 'self'}
            href={t.id ? `/protected/shrine?member=${t.id}` : '/protected/shrine'}
            aria-current={active ? 'page' : undefined}
            className={`flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors ${
              active ? 'bg-gold-500/[0.12] border-gold-500/50' : 'bg-surface/40 border-white/10'
            }`}
          >
            <TabAvatar tab={t} active={active} />
            <span
              className={`text-[10px] font-sans whitespace-nowrap max-w-[64px] truncate ${
                active ? 'text-gold-300 font-bold' : 'text-ink-light/55'
              }`}
            >
              {t.id ? t.name : '나'}
            </span>
          </Link>
        )
      })}
      {/*
        가족관리 — 하단 내비에서 이 자리로 옮겨 왔다(CEO 2026-08-01, 그 칸은 웹툰이 잇는다).
        ⚠️ 이제 **가족관리로 가는 유일한 문**이다. 종전의 「＋ 새 가족」은 더하기로만 읽혀
           등록·수정·삭제가 있는 페이지의 입구로는 좁았다 — 이름과 아이콘을 관리로 바꿨다.
           탭 줄 자체도 가족이 0명이어도 그리도록 바꿨다(0명이면 문이 사라져 갇힌다).
      */}
      <Link
        href="/protected/family"
        aria-label="가족관리 페이지로 이동"
        className="flex-shrink-0 flex flex-col items-center gap-1 px-2.5 py-1.5 rounded-xl border border-white/10 bg-surface/40 text-ink-light/55"
      >
        <span className="w-9 h-9 rounded-full grid place-items-center border border-white/15 bg-white/[0.04]">
          <Users className="h-4 w-4 text-gold-300/80" />
        </span>
        <span className="text-[10px] font-sans whitespace-nowrap">가족관리</span>
      </Link>
    </div>
  )
}
