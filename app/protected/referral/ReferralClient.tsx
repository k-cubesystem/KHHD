'use client'

import { useState } from 'react'
import { Copy, Share2, Check, Gift, Users, Coins } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface RecentReferral {
  date: string
  bonus: number
}

interface ReferralClientProps {
  referralCode: string
  referralLink: string
  totalReferrals: number
  totalEarned: number
  recentReferrals: RecentReferral[]
}

export default function ReferralClient({
  referralCode,
  referralLink,
  totalReferrals,
  totalEarned,
  recentReferrals,
}: ReferralClientProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      toast.success('링크가 복사되었습니다!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for browsers that don't support clipboard API
      const el = document.createElement('textarea')
      el.value = referralLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      toast.success('링크가 복사되었습니다!')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(referralCode)
      toast.success(`코드 ${referralCode} 복사 완료!`)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: '해화당 친구 초대',
      text: `해화당에서 사주·운세를 함께 봐요! 제 추천 코드로 가입하면 5만냥을 드려요 🎁`,
      url: referralLink,
    }

    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch (e) {
        // 사용자가 취소한 경우
        if ((e as Error).name !== 'AbortError') {
          await handleCopyLink()
        }
      }
    } else {
      await handleCopyLink()
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  return (
    <div className="space-y-5">
      {/* 통계 카드 */}
      <section className="grid grid-cols-3 gap-3">
        <Card className="bg-surface/30 border-primary/20 p-4 text-center">
          <Users className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-primary">{totalReferrals}</p>
          <p className="text-xs text-ink-light/50 mt-0.5">초대한 친구</p>
        </Card>

        <Card className="bg-surface/30 border-primary/20 p-4 text-center">
          <Coins className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-primary">{totalEarned}</p>
          <p className="text-xs text-ink-light/50 mt-0.5">획득 만냥</p>
        </Card>

        <Card className="bg-surface/30 border-primary/20 p-4 text-center">
          <Gift className="w-5 h-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold text-primary">5</p>
          <p className="text-xs text-ink-light/50 mt-0.5">건당 만냥</p>
        </Card>
      </section>

      {/* 추천 코드 + 링크 카드 */}
      <Card className="bg-primary/5 border-primary/30 p-5">
        {/* 코드 표시 */}
        <div className="mb-5">
          <p className="text-xs text-ink-light/50 mb-2">내 추천 코드</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface/50 border border-primary/30 rounded-lg px-4 py-3 text-center">
              <span className="text-2xl font-mono font-bold tracking-[0.3em] text-primary">{referralCode}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyCode}
              className="border-primary/40 text-primary hover:bg-primary/10 shrink-0 px-3 py-3 h-auto"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 링크 표시 */}
        <div className="mb-5">
          <p className="text-xs text-ink-light/50 mb-2">초대 링크</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-surface/50 border border-primary/20 rounded-lg px-3 py-2.5 overflow-hidden">
              <p className="text-xs text-ink-light/70 truncate">{referralLink}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="border-primary/40 text-primary hover:bg-primary/10 shrink-0 px-3 py-2.5 h-auto"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* 공유 버튼 */}
        <Button
          onClick={handleShare}
          className="w-full bg-primary hover:bg-primary/90 text-ink-900 font-bold flex items-center gap-2 h-12"
        >
          <Share2 className="w-5 h-5" />
          친구에게 공유하기
        </Button>
      </Card>

      {/* 안내 */}
      <Card className="bg-surface/20 border-primary/10 p-4">
        <h3 className="text-sm font-bold text-primary mb-3">추천 혜택 안내</h3>
        <ol className="space-y-2 text-sm text-ink-light/70">
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">1.</span>위 링크나 코드를 친구에게 공유하세요
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">2.</span>
            친구가 링크로 가입하면 <span className="text-primary font-bold">5만냥</span> 즉시 지급
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">3.</span>
            나도 <span className="text-primary font-bold">5만냥</span> 보상 지급 (친구 가입 완료 시)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-bold shrink-0">4.</span>
            초대 인원 제한 없음 — 무제한 누적 가능
          </li>
        </ol>
      </Card>

      {/* 최근 추천 내역 */}
      {recentReferrals.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-ink-light/70 mb-3">최근 추천 내역</h3>
          <div className="space-y-2">
            {recentReferrals.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between bg-surface/20 border border-primary/10 rounded-lg px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-ink-light">새 친구 가입</p>
                    <p className="text-xs text-ink-light/40">{formatDate(r.date)}</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-primary">+{r.bonus}만냥</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
