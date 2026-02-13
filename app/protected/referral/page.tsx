import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Gift, Share2, Copy } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: '친구 초대 | 해화당',
  description: '친구를 초대하고 함께 부적을 받아가세요!',
}

export default async function ReferralPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const referralCode = user.id.substring(0, 8).toUpperCase()
  const referralLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/signup?ref=${referralCode}`

  return (
    <div className="min-h-screen bg-background text-ink-light pb-20">
      <header className="px-3 pt-12 pb-6">
        <Link
          href="/protected"
          className="inline-flex items-center gap-2 text-ink-light/60 hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">돌아가기</span>
        </Link>

        <div className="flex items-center gap-2 mb-3">
          <Users className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-serif font-bold text-ink-light">친구 초대</h1>
        </div>
        <p className="text-sm text-ink-light/60">친구와 함께 부적 500장씩 받아가세요!</p>
      </header>

      <section className="px-3 mb-6 grid grid-cols-2 gap-3">
        <Card className="bg-surface/30 border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-primary" />
            <span className="text-xs text-ink-light/60">초대한 친구</span>
          </div>
          <p className="text-2xl font-bold text-primary">0명</p>
        </Card>

        <Card className="bg-surface/30 border-primary/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Gift className="w-4 h-4 text-primary" />
            <span className="text-xs text-ink-light/60">획득 부적</span>
          </div>
          <p className="text-2xl font-bold text-primary">0장</p>
        </Card>
      </section>

      <section className="px-3 mb-6">
        <Card className="bg-primary/10 border-primary/30 p-6">
          <p className="text-sm text-ink-light/60 mb-3">내 초대 코드</p>
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 bg-surface border border-primary/30 rounded px-3 py-2 text-sm text-ink-light"
            />
            <Button
              onClick={() => {
                navigator.clipboard.writeText(referralLink)
              }}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-ink-900"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <Button className="w-full bg-primary hover:bg-primary/90 text-ink-900 font-bold flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            친구 초대하기
          </Button>
        </Card>
      </section>

      <section className="px-3 mt-8">
        <h2 className="text-lg font-serif font-bold text-ink-light mb-4">초대 방법</h2>
        <ol className="space-y-3 text-sm text-ink-light/80">
          <li>1. 위 초대 링크를 친구에게 공유하세요</li>
          <li>2. 친구가 링크를 통해 가입하면 자동 인증됩니다</li>
          <li>3. 친구가 첫 운세를 체험하면 부적 500장씩 지급!</li>
          <li>4. 최대 20명까지 초대 가능 (총 10,000장)</li>
        </ol>
      </section>
    </div>
  )
}
