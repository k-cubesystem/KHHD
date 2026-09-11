'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Edit2, History, MoreHorizontal, Trash2, User } from 'lucide-react'
import type { FamilyMemberWithMissions } from '@/app/actions/user/family-missions'
import { findFiveAvatar } from '@/components/family/five-avatar-selector'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import type { Element } from '@/lib/domain/shrine/types'
import { FAMILY_MISSION_TOTAL, countFamilyMissions } from '@/lib/domain/analysis/family-missions'

/**
 * 인연 목록의 한 줄 — 이름 · 관계 · 옅은/넉넉 칩 · 처방전 (PRD-family-map-v2 §5, 35차).
 * 다섯 풀이 진행(옛 «운대 %» 막대)은 「풀이 기록」 시트로 옮겼다 — 이 줄에는 작은 문만 남는다.
 */

export interface MemberEnergyHint {
  yongsin: Element
  strongest: Element
}

function ElementChip({ el }: { el: Element }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-[1px] font-serif text-[11px] font-bold"
      style={{ borderColor: `${EL_COLOR[el]}77`, background: `${EL_COLOR[el]}1a`, color: EL_COLOR[el] }}
    >
      {EL_KO[el]} <span className="font-sans font-normal text-ink-light/70">{EL_LABEL[el]}</span>
    </span>
  )
}

export function MemberRow({
  member,
  energy,
  onOpenRecord,
  onEdit,
  onDelete,
}: {
  member: FamilyMemberWithMissions
  /** 타고난 기운의 옅은·넉넉 오행(서버가 생년월일로 계산). 없으면 안내 한 줄. */
  energy?: MemberEnergyHint
  onOpenRecord: () => void
  onEdit: (member: FamilyMemberWithMissions) => void
  onDelete: (id: string, name: string) => void
}) {
  const avatar = findFiveAvatar(member.avatar_id)
  const done = countFamilyMissions(member.completed_categories ?? [])

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-gold-500/[0.18] bg-gold-500/[0.03] px-3 py-2.5">
      <button
        type="button"
        onClick={() => onEdit(member)}
        aria-label={`${member.name} 정보 수정`}
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full border"
        style={{
          backgroundColor: avatar ? `${avatar.color}15` : 'rgba(212,175,55,0.1)',
          borderColor: avatar ? `${avatar.color}30` : 'rgba(212,175,55,0.2)',
        }}
      >
        {avatar ? (
          <Image
            src={avatar.src}
            alt={avatar.label}
            width={36}
            height={36}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <User className="h-4 w-4 text-gold-400" />
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="truncate font-serif text-[14px] font-bold text-ink-light">{member.name}</span>
          <span className="shrink-0 text-[10px] text-ink-light/45">{member.relationship}</span>
        </div>
        {energy ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[10.5px] text-ink-light/50">
            옅은 <ElementChip el={energy.yongsin} /> 넉넉한 <ElementChip el={energy.strongest} />
          </p>
        ) : (
          <p className="mt-0.5 text-[10.5px] text-ink-light/40">생년월일을 넣으면 기운이 보입니다</p>
        )}
      </div>

      <Link
        href={`/protected/prescription?target=${member.id}`}
        aria-label={`${member.name} 기운 처방전 열기`}
        className="shrink-0 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] px-2 py-1.5 font-serif text-[11px] text-gold-300 hover:bg-gold-500/[0.12]"
      >
        처방전
      </Link>
      <button
        type="button"
        onClick={onOpenRecord}
        aria-label={`${member.name} 풀이 기록 열기`}
        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5 text-[11px] text-ink-light/60 hover:text-ink-light"
      >
        <History className="h-3 w-3" />
        <span className="tabular-nums">
          {done}/{FAMILY_MISSION_TOTAL}
        </span>
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`${member.name} 더보기`}
            className="h-8 w-8 shrink-0 text-ink-light/30 hover:bg-primary/5 hover:text-primary"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32 border-primary/20 bg-[#1a1510]">
          <DropdownMenuItem
            onClick={() => onEdit(member)}
            className="cursor-pointer text-xs text-ink-light/80 hover:bg-primary/10 hover:text-primary"
          >
            <Edit2 className="mr-2 h-3.5 w-3.5" />
            수정하기
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onDelete(member.id, member.name)}
            className="cursor-pointer text-xs text-error-text/90 hover:bg-error/10 hover:text-error-text"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            삭제하기
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
