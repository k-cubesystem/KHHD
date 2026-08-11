'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { acceptFamilyInviteLink } from '@/app/actions/family-invite'
import { inviteRejectionMessage, type InviteViewStatus } from '@/lib/domain/family/invite'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * ⚠️ `invite.ts` 는 node:crypto 를 잡으므로 여기서는 **타입과 문구 함수만** 가져온다
 *    (`inviteRejectionMessage` 는 순수 맵 조회 — 번들에 crypto 가 딸려오지 않도록 값 참조는 이 하나뿐).
 *    남은 시간 문자열은 서버가 빚어 내려준다.
 */
interface FamilyInviteAcceptClientProps {
  token: string
  inviterName: string
  memberName: string
  relationship: string
  status: InviteViewStatus
  remainingLabel: string
  isLoggedIn: boolean
  isSelf: boolean
}

const CLOSED_MESSAGE: Record<string, string> = {
  accepted: '이미 사용된 초대입니다. 초대한 분께 새 링크를 받아주세요.',
  revoked: '초대한 분이 취소한 링크입니다.',
  expired: '초대 유효기간(72시간)이 지났습니다. 새 링크를 받아주세요.',
}

export function FamilyInviteAcceptClient({
  token,
  inviterName,
  memberName,
  relationship,
  status,
  remainingLabel,
  isLoggedIn,
  isSelf,
}: FamilyInviteAcceptClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [accepted, setAccepted] = useState(false)

  const nextPath = `/invite/family/${token}`
  const loginHref = `/auth/login?next=${encodeURIComponent(nextPath)}`
  const signUpHref = `/auth/sign-up?next=${encodeURIComponent(nextPath)}`

  const handleAccept = () => {
    startTransition(async () => {
      const result = await acceptFamilyInviteLink(token)

      if (!result.ok) {
        toast.error(inviteRejectionMessage(result.reason))
        return
      }

      // GA4 는 클라이언트에서만 발화한다 — 서버 액션 안의 trackEvent 는 아무 데도 닿지 않는다.
      trackEvent({ action: 'invite_accepted', category: 'family', label: relationship })
      setAccepted(true)
      toast.success(`${result.data.memberName}님의 가족으로 연결되었습니다.`)
      router.replace('/protected/family')
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gold-500/30 bg-gold-500/[0.06] px-5 py-7 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-gold-500/40 bg-gold-500/15">
          <Users className="h-6 w-6 text-gold-400" strokeWidth={1.5} />
        </span>
        <p className="mt-4 text-xs font-light text-ink-light/50">가족 초대</p>
        <p className="mt-1 font-serif text-[17px] leading-relaxed text-ink-light">
          <span className="text-gold-300">{inviterName}</span>님이
          <br />
          <span className="text-gold-300">{memberName}</span>({relationship}) 자리로 초대했습니다
        </p>
        {status === 'pending' && <p className="mt-3 text-[11px] tabular-nums text-ink-light/40">{remainingLabel}</p>}
      </section>

      {status !== 'pending' ? (
        <div className="rounded-xl border border-white/10 bg-surface/30 px-5 py-6 text-center">
          <p className="text-xs font-light leading-relaxed text-ink-light/60">
            {CLOSED_MESSAGE[status] ?? '사용할 수 없는 초대입니다.'}
          </p>
        </div>
      ) : isSelf ? (
        <div className="rounded-xl border border-white/10 bg-surface/30 px-5 py-6 text-center">
          <p className="text-xs font-light leading-relaxed text-ink-light/60">
            자신이 만든 초대입니다. 이 링크를 연결할 분께 전달해주세요.
          </p>
        </div>
      ) : !isLoggedIn ? (
        <div className="space-y-3">
          <p className="px-1 text-center text-xs font-light leading-relaxed text-ink-light/50">
            로그인하면 이 화면으로 돌아와 초대를 수락합니다.
          </p>
          <Button asChild className="h-11 w-full bg-gold-500 text-sm font-medium text-black hover:bg-gold-500/85">
            <Link href={loginHref}>로그인하고 수락하기</Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full border-white/15 text-sm font-light text-ink-light hover:border-gold-500/40"
          >
            <Link href={signUpHref}>회원가입하고 수락하기</Link>
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleAccept}
          disabled={isPending || accepted}
          className="h-11 w-full bg-gold-500 text-sm font-medium text-black hover:bg-gold-500/85"
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              연결하는 중...
            </span>
          ) : accepted ? (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4" />
              연결되었습니다
            </span>
          ) : (
            '초대 수락하기'
          )}
        </Button>
      )}

      <p className="text-center text-[11px] font-light leading-relaxed text-ink-light/30">
        수락하면 이 가족의 신당과 미션을 볼 수 있습니다.
        <br />
        가족 정보를 고치거나 지우는 권한은 넘어가지 않습니다.
      </p>
    </div>
  )
}
