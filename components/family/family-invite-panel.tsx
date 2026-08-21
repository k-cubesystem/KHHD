'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Link2, Copy, Check, X, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { createFamilyInviteLink, revokeFamilyInviteLink, type FamilyInviteSummary } from '@/app/actions/family-invite'
import { formatInviteRemaining, inviteRejectionMessage } from '@/lib/domain/family/invite'
import { GA } from '@/lib/analytics/ga4'

export interface InvitableMember {
  id: string
  name: string
  relationship: string
}

interface FamilyInvitePanelProps {
  members: InvitableMember[]
  invites: FamilyInviteSummary[]
  /** 이미 실계정이 붙은 자리 — 초대 버튼을 내린다. */
  linkedMemberIds: string[]
}

interface RevealedLink {
  memberId: string
  url: string
}

/**
 * 가족 초대 링크 패널.
 *
 * 링크 원문은 **만든 직후 딱 한 번만** 화면에 뜬다(서버가 해시만 보관한다). 그래서 목록에는
 * 상태와 남은 시간만 있고, 잃어버렸으면 재발급 — 그 순간 구토큰은 죽는다.
 */
export function FamilyInvitePanel({ members, invites, linkedMemberIds }: FamilyInvitePanelProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [revealed, setRevealed] = useState<RevealedLink | null>(null)
  const [copied, setCopied] = useState(false)
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null)

  const linked = new Set(linkedMemberIds)
  const inviteByMember = new Map(invites.map((invite) => [invite.memberId, invite]))

  if (members.length === 0) return null

  const handleCreate = (member: InvitableMember) => {
    setBusyMemberId(member.id)
    startTransition(async () => {
      const result = await createFamilyInviteLink(member.id)
      setBusyMemberId(null)

      if (!result.ok) {
        toast.error(inviteRejectionMessage(result.reason))
        return
      }

      GA.inviteCreated(member.relationship)
      setRevealed({ memberId: member.id, url: result.data.url })
      setCopied(false)
      router.refresh()
    })
  }

  const handleRevoke = (invite: FamilyInviteSummary) => {
    setBusyMemberId(invite.memberId)
    startTransition(async () => {
      const result = await revokeFamilyInviteLink(invite.id)
      setBusyMemberId(null)

      if (!result.ok) {
        toast.error(inviteRejectionMessage(result.reason))
        return
      }

      if (revealed?.memberId === invite.memberId) setRevealed(null)
      toast.success('초대를 취소했습니다.')
      router.refresh()
    })
  }

  const handleCopy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('초대 링크를 복사했습니다.')
    } catch {
      toast.error('복사에 실패했습니다. 링크를 길게 눌러 직접 복사해주세요.')
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-surface/20 p-4">
      <header className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border border-gold-500/35 bg-gold-500/10">
          <Link2 className="h-3.5 w-3.5 text-gold-400" strokeWidth={1.8} />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-[14px] font-medium text-ink-light">가족 초대</h2>
          <p className="mt-0.5 text-[11px] font-light leading-relaxed text-ink-light/45">
            링크를 보내 가족의 계정을 이 자리에 잇습니다. 링크는 72시간·1회용입니다.
          </p>
        </div>
      </header>

      <ul className="mt-4 space-y-2">
        {members.map((member) => {
          const invite = inviteByMember.get(member.id)
          const isLinked = linked.has(member.id)
          const busy = isPending && busyMemberId === member.id
          const showLink = revealed?.memberId === member.id

          return (
            <li key={member.id} className="rounded-lg border border-white/[0.07] bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-ink-light">{member.name}</span>
                  <span className="block text-[11px] font-light text-ink-light/40">
                    {isLinked
                      ? '계정 연결됨'
                      : invite && invite.status === 'pending'
                        ? `초대 보냄 · ${formatInviteRemaining(invite.expiresAt)}`
                        : member.relationship}
                  </span>
                </span>

                {isLinked ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                    <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                    연결
                  </span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => handleCreate(member)}
                      className="h-7 rounded-md border-gold-500/35 px-2 text-[11px] font-light text-gold-200 hover:border-gold-500/60 hover:bg-gold-500/10"
                    >
                      {busy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : invite && invite.status === 'pending' ? (
                        '링크 재발급'
                      ) : (
                        '초대 링크'
                      )}
                    </Button>
                    {invite && invite.status === 'pending' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={busy}
                        aria-label={`${member.name} 초대 취소`}
                        onClick={() => handleRevoke(invite)}
                        className="h-7 w-7 text-ink-light/40 hover:text-ink-light"
                      >
                        <X className="h-3.5 w-3.5" strokeWidth={1.8} />
                      </Button>
                    )}
                  </span>
                )}
              </div>

              {showLink && revealed && (
                <div className="mt-2.5 rounded-lg border border-gold-500/30 bg-gold-500/[0.07] p-2.5">
                  <p className="text-[10px] leading-relaxed text-gold-200/70">
                    이 링크는 지금 한 번만 보입니다. 창을 닫으면 다시 볼 수 없습니다.
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <code className="min-w-0 flex-1 truncate rounded bg-black/40 px-2 py-1.5 text-[10px] text-ink-light/70">
                      {revealed.url}
                    </code>
                    <Button
                      size="sm"
                      onClick={() => handleCopy(revealed.url)}
                      className="h-7 shrink-0 rounded-md bg-gold-500 px-2 text-[11px] text-black hover:bg-gold-500/85"
                    >
                      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span className="ml-1">{copied ? '복사됨' : '복사'}</span>
                    </Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
