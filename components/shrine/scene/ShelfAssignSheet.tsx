'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, X } from 'lucide-react'
import { getFamilyMembers } from '@/app/actions/user/family'
import { assignShelfMember } from '@/app/actions/shrine/shelf'
import { familyGuardianElement } from '@/lib/domain/shrine/shelf'
import { ELEMENT_AVATAR_COLOR, findFamilyAvatar } from '@/lib/domain/family/avatars'
import { EL_KO } from '@/lib/domain/shrine/energy'

/**
 * 시렁 가족 배정 시트 — "이 시렁은 누구의 자리인가".
 *
 * ⚠️ 지정한 가족의 **정령 오행**을 여기서 바로 말해 준다("水 기운 신물을 얹어 주세요") —
 *    지정만 하고 무엇을 얹어야 하는지 말하지 않으면, 축복은 우연히만 켜지는 기능이 된다.
 */

interface MemberRow {
  id: string
  name: string
  relationship: string | null
  avatarId: string | null
}

function toMemberRow(v: unknown): MemberRow | null {
  if (typeof v !== 'object' || v === null) return null
  const r = v as Record<string, unknown>
  if (typeof r.id !== 'string' || typeof r.name !== 'string') return null
  return {
    id: r.id,
    name: r.name,
    relationship: typeof r.relationship === 'string' ? r.relationship : null,
    avatarId: typeof r.avatar_id === 'string' && r.avatar_id ? r.avatar_id : null,
  }
}

export interface AssignedTag {
  memberId: string | null
  name: string | null
  avatarId: string | null
}

export function ShelfAssignSheet({
  placementId,
  currentMemberId,
  onClose,
  onAssigned,
}: {
  placementId: string
  currentMemberId: string | null
  onClose: () => void
  onAssigned: (tag: AssignedTag) => void
}) {
  const [members, setMembers] = useState<MemberRow[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const rows = await getFamilyMembers()
      if (!alive) return
      const list = (Array.isArray(rows) ? rows : []).map(toMemberRow).filter((m): m is MemberRow => m !== null)
      setMembers(list)
    })()
    return () => {
      alive = false
    }
  }, [])

  const assign = async (member: MemberRow | null) => {
    setBusyId(member?.id ?? 'none')
    const res = await assignShelfMember(placementId, member?.id ?? null)
    setBusyId(null)
    if (!res.success) {
      toast.error('지정하지 못했습니다')
      return
    }
    if (member) {
      const guardian = familyGuardianElement(member.avatarId)
      toast.success(
        guardian
          ? `${member.name}의 시렁이 되었습니다 — ${EL_KO[guardian]} 기운 신물을 얹어 주세요`
          : `${member.name}의 시렁이 되었습니다`
      )
      onAssigned({ memberId: member.id, name: member.name, avatarId: member.avatarId })
    } else {
      toast.success('빈 시렁으로 되돌렸습니다')
      onAssigned({ memberId: null, name: null, avatarId: null })
    }
  }

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-label="시렁 가족 지정">
      <button type="button" aria-label="닫기" onClick={onClose} className="absolute inset-0 bg-black/55" />
      <div className="devotion-sheet absolute inset-x-0 bottom-0 mx-auto w-full max-w-[480px] rounded-t-2xl border border-b-0 border-gold-500/25 bg-[#14100b] p-4 pb-6">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-serif text-[15px] font-bold text-ink-primary">누구의 시렁으로 할까요</p>
          <button type="button" aria-label="닫기" onClick={onClose} className="p-1 text-ink-primary/50">
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 font-sans text-[11.5px] leading-relaxed text-ink-primary/50">
          지정한 가족의 정령 기운에 맞는 신물을 시렁 가까이 얹으면, 시렁이 그 사람을 위해 깨어납니다.
        </p>

        {members === null ? (
          <p className="flex items-center gap-2 py-4 font-sans text-[12px] text-ink-primary/50">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> 가족을 불러오는 중…
          </p>
        ) : members.length === 0 ? (
          <p className="py-4 font-sans text-[12px] text-ink-primary/50">
            등록된 가족이 없습니다 — 프로필의 가족 관리에서 먼저 모셔 오세요.
          </p>
        ) : (
          <div className="space-y-1.5">
            {members.map((m) => {
              const guardian = familyGuardianElement(m.avatarId)
              const avatar = findFamilyAvatar(m.avatarId)
              const active = currentMemberId === m.id
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={busyId !== null}
                  onClick={() => void assign(m)}
                  className={`flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left ${
                    active ? 'border-gold-500/50 bg-gold-500/[0.1]' : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full font-serif text-[11px] font-bold text-black/70"
                    style={{ background: guardian ? ELEMENT_AVATAR_COLOR[guardian] : 'rgba(255,255,255,0.25)' }}
                  >
                    {guardian ? EL_KO[guardian] : m.name.slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-sans text-[13px] font-bold text-ink-primary">
                      {m.name}
                      {m.relationship && (
                        <span className="ml-1.5 font-normal text-ink-primary/40">{m.relationship}</span>
                      )}
                    </span>
                    <span className="block font-sans text-[10.5px] text-ink-primary/45">
                      {avatar ? avatar.label : '정령 미설정 — 무엇을 얹어도 이 사람 것이 됩니다'}
                    </span>
                  </span>
                  {busyId === m.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-gold-300" />
                  ) : (
                    active && <span className="font-sans text-[10px] font-bold text-gold-300">지정됨</span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {currentMemberId !== null && (
          <button
            type="button"
            disabled={busyId !== null}
            onClick={() => void assign(null)}
            className="mt-3 w-full rounded-xl border border-white/15 px-3 py-2 font-sans text-[12px] text-ink-primary/60"
          >
            {busyId === 'none' ? <Loader2 className="mx-auto h-3.5 w-3.5 animate-spin" /> : '지정 해제 — 빈 시렁으로'}
          </button>
        )}
      </div>
    </div>
  )
}
