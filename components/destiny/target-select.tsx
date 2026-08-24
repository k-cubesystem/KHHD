'use client'

import Link from 'next/link'
import { ChevronRight, UserPlus } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { findFamilyAvatar } from '@/lib/domain/family/avatars'
import type { DestinyTarget } from '@/app/actions/user/destiny'

/**
 * 「누구를 볼까요」 — 사람을 고르는 **유일한** 컨트롤.
 *
 * 🔴 2026-08-25 CEO: «가족 선택·사람 선택하는 부분 모두 드롭다운으로. 각각 페이지마다 다른데
 *    드롭다운이 쓰기 편한 것 같아.» 그전까지 같은 «한 사람 고르기»가 화면마다 딴 물건이었다 —
 *    카드 격자(궁합·2026 병오년), 아바타 탭(신당), 칩 줄(종합풀이), 그리고 드롭다운 여섯 개가
 *    저마다 다른 테두리색(primary/20 · gold-500/20 · gold-500/40)과 높이로 서 있었다.
 *
 * 그래서 이 파일이 **모양의 단일 출처**다. 새 화면에서 사람을 고를 일이 생기면 여기를 쓴다.
 * 색·높이를 화면에서 덧칠하지 말 것 — 그게 흩어짐이 시작된 방식이다.
 *
 * 목록 자체는 받아서 그리기만 한다(조회 없음). 화면마다 대상 축이 달라서다:
 * 사주·운세는 `v_destiny_targets`(본인+인연), 만세력은 가족 행, 신당은 본인+가족.
 * 그 차이는 `toTargetOption*` 어댑터가 흡수한다.
 */

export interface TargetOption {
  id: string
  name: string
  /** 관계 한 마디(본인·배우자·자녀…). 없으면 이름만 보인다. */
  relation?: string | null
  /** 프로필 사진 URL. */
  avatarUrl?: string | null
  /** 오행 정령·신위 아바타 id(`family_members.avatar_id`). URL 보다 우선한다. */
  avatarId?: string | null
  /** 이름 밑 보조 한 줄(생년월일 등). 트리거에는 안 나오고 목록에만 나온다. */
  hint?: string | null
}

/** `v_destiny_targets` 행 → 옵션. 사주·운세·궁합·종합풀이가 이걸 쓴다. */
export function toTargetOption(target: DestinyTarget): TargetOption {
  return {
    id: target.id,
    name: target.name,
    relation: target.relation_type,
    avatarUrl: target.avatar_url,
    hint: target.birth_date
      ? `${target.birth_date}${target.birth_time ? ` · ${target.birth_time}` : ''}`
      : '생년월일 미등록',
  }
}

interface TargetSelectProps {
  /** null = 아직 불러오는 중(뼈대). 빈 배열 = 등록된 대상 없음(안내 카드). */
  targets: readonly TargetOption[] | null
  value: string | null
  onChange: (id: string) => void
  /** 위에 붙는 한 줄 라벨. 생략하면 라벨 없이 컨트롤만. */
  label?: string
  placeholder?: string
  /** 「전체 보기」 같은 목록 밖 항목(기록 필터용). */
  allOption?: { id: string; label: string }
  /** 목록이 비었을 때 데려갈 곳. */
  emptyHref?: string
  emptyLabel?: string
  disabled?: boolean
  className?: string
  /** 라벨 줄 오른쪽에 붙는 보조 액션(예: 「인연 추가」). */
  action?: React.ReactNode
}

function TargetAvatar({ option, size = 'sm' }: { option: TargetOption; size?: 'sm' | 'md' }) {
  const five = findFamilyAvatar(option.avatarId)
  const src = five?.src ?? option.avatarUrl ?? undefined
  return (
    <Avatar
      className={`${size === 'md' ? 'h-7 w-7' : 'h-6 w-6'} shrink-0 border border-gold-500/25`}
      style={five ? { backgroundColor: `${five.color}22` } : undefined}
    >
      {src && <AvatarImage src={src} alt="" className="object-cover object-top" />}
      <AvatarFallback className="bg-gold-500/15 font-serif text-[10px] font-bold text-gold-500">
        {option.name.slice(0, 1)}
      </AvatarFallback>
    </Avatar>
  )
}

export function TargetSelect({
  targets,
  value,
  onChange,
  label,
  placeholder = '대상을 선택하세요',
  allOption,
  emptyHref = '/protected/family',
  emptyLabel = '등록된 대상이 없습니다. 가족·인연을 먼저 추가해 주세요',
  disabled,
  className,
  action,
}: TargetSelectProps) {
  const selected = targets?.find((t) => t.id === value) ?? null
  const showAll = allOption && value === allOption.id

  const header = (label || action) && (
    <div className="flex items-center justify-between gap-2">
      {label ? <span className="text-xs font-serif tracking-widest text-gold-500/70">{label}</span> : <span />}
      {action}
    </div>
  )

  // 로딩 — 높이를 그대로 잡아 두어 목록이 도착할 때 화면이 튀지 않는다.
  if (targets === null) {
    return (
      <div className={`space-y-2 ${className ?? ''}`}>
        {header}
        <div className="h-12 w-full animate-pulse rounded-lg border border-white/5 bg-white/[0.03]" aria-hidden />
      </div>
    )
  }

  if (targets.length === 0 && !allOption) {
    return (
      <div className={`space-y-2 ${className ?? ''}`}>
        {header}
        <Link
          href={emptyHref}
          className="flex items-center gap-3 rounded-lg border border-dashed border-gold-500/25 bg-white/[0.02] px-3 py-3 transition-colors hover:border-gold-500/50"
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-white/40">
            <UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />
          </span>
          <span className="flex-1 text-xs font-sans font-light leading-relaxed text-ink-light/55">{emptyLabel}</span>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-ink-light/30" />
        </Link>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className ?? ''}`}>
      {header}
      <Select value={value ?? ''} onValueChange={onChange} disabled={disabled}>
        {/* 🔴 높이·테두리는 여기서만 정한다 — 호출부가 className 으로 덧칠하지 못하게 막아 둔 자리다. */}
        <SelectTrigger className="h-12 w-full rounded-lg border-gold-500/25 bg-surface/30 text-ink-light hover:border-gold-500/45">
          <SelectValue placeholder={placeholder}>
            {showAll ? (
              <span className="text-sm">{allOption.label}</span>
            ) : (
              selected && (
                <span className="flex min-w-0 items-center gap-2.5">
                  <TargetAvatar option={selected} size="md" />
                  <span className="truncate text-sm">{selected.name}</span>
                  {selected.relation && (
                    <span className="shrink-0 text-[11px] text-ink-light/45">({selected.relation})</span>
                  )}
                </span>
              )
            )}
          </SelectValue>
        </SelectTrigger>

        <SelectContent className="border-gold-500/20 bg-surface">
          {allOption && (
            <SelectItem value={allOption.id} className="text-ink-light focus:bg-gold-500/10">
              <span className="text-sm">{allOption.label}</span>
            </SelectItem>
          )}
          {targets.map((target) => (
            <SelectItem key={target.id} value={target.id} className="text-ink-light focus:bg-gold-500/10">
              <span className="flex min-w-0 items-center gap-2.5">
                <TargetAvatar option={target} />
                <span className="flex min-w-0 flex-col text-left leading-tight">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm">{target.name}</span>
                    {target.relation && (
                      <span className="shrink-0 text-[11px] text-ink-light/45">({target.relation})</span>
                    )}
                  </span>
                  {target.hint && <span className="truncate text-[10px] text-ink-light/35">{target.hint}</span>}
                </span>
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
