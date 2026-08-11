import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { rateLimitByIp } from '@/lib/utils/rate-limit'
import { getInvitePreview } from '@/lib/domain/family/invite-repository'
import { formatInviteRemaining, isInviteToken } from '@/lib/domain/family/invite'
import { FamilyInviteAcceptClient } from './accept-client'

/**
 * 가족 초대 수락 — 공개 라우트.
 *
 * 토큰만 있으면 미로그인 방문자도 이 화면을 본다. 그래서 노출 폭은 「누가·어느 자리로 불렀는가」까지다.
 * 실제 연결은 로그인한 뒤 서버 액션에서만 선다 — 이 페이지는 아무것도 쓰지 않는다.
 *
 * ⚠️ 상위 세그먼트에 `app/invite/[code]`(궁합 초대장)가 있지만, 정적 세그먼트 `family` 가
 *    동적 세그먼트보다 우선하므로 경로가 겹치지 않는다.
 */
export const metadata: Metadata = {
  title: '가족 초대',
  description: '가족 초대 링크를 확인하고 수락합니다.',
  robots: { index: false, follow: false },
}

/** 토큰 추측 시도를 태우는 경로다 — IP 당 시간당 60회면 정상 이용에는 걸리지 않는다. */
const PREVIEW_RATE_LIMIT = { interval: 60 * 60 * 1000, uniqueTokenPerInterval: 60 }

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] w-full bg-charcoal-deep flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-[420px] space-y-6">
        <header className="text-center">
          <h1 className="font-serif text-xl tracking-[0.35em] text-gold-400">청담해화당</h1>
          <div className="mt-3 flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-gold-500/40" />
            <span className="text-[11px] tracking-widest text-gold-500/60">家族</span>
            <span className="h-px w-8 bg-gold-500/40" />
          </div>
        </header>
        {children}
      </div>
    </div>
  )
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-surface/30 px-5 py-8 text-center">
      <p className="font-serif text-[15px] text-ink-light">{title}</p>
      <p className="mt-2 text-xs font-light leading-relaxed text-ink-light/50">{body}</p>
    </div>
  )
}

export default async function FamilyInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!isInviteToken(token)) {
    return (
      <Shell>
        <Notice title="올바르지 않은 초대 링크입니다" body="링크가 잘렸을 수 있습니다. 초대한 분께 다시 받아주세요." />
      </Shell>
    )
  }

  const headerList = await headers()
  const ip = headerList.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const limiter = await rateLimitByIp(ip, 'family-invite-preview', PREVIEW_RATE_LIMIT)
  if (!limiter.success) {
    return (
      <Shell>
        <Notice title="요청이 너무 잦습니다" body="잠시 후 다시 열어주세요." />
      </Shell>
    )
  }

  const preview = await getInvitePreview(token)
  if (!preview) {
    return (
      <Shell>
        <Notice
          title="찾을 수 없는 초대입니다"
          body="이미 정리되었거나 잘못된 링크입니다. 초대한 분께 다시 받아주세요."
        />
      </Shell>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <Shell>
      <FamilyInviteAcceptClient
        token={token}
        inviterName={preview.inviterName}
        memberName={preview.memberName}
        relationship={preview.relationship}
        status={preview.status}
        remainingLabel={formatInviteRemaining(preview.expiresAt)}
        isLoggedIn={!!user}
        isSelf={!!user && user.id === preview.inviterId}
      />
    </Shell>
  )
}
