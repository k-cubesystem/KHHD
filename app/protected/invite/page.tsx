'use client'

import { useState, useEffect } from 'react'
import {
  Heart,
  Share2,
  Copy,
  Check,
  Sparkles,
  MessageCircle,
  Link2,
  Users,
  QrCode,
  Loader2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { generateInviteLink } from '@/app/actions/user/invite'
import { createClient } from '@/lib/supabase/client'

export default function InviteCreatePage() {
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
    }
  }

  const handleGenerateLink = async () => {
    if (!userId) {
      setError('로그인이 필요합니다.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await generateInviteLink(userId)

      if (result.success && result.link) {
        setInviteLink(result.link)
      } else {
        setError(result.error || '초대 링크 생성에 실패했습니다.')
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (inviteLink) {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShareKakao = () => {
    if (inviteLink && typeof window !== 'undefined' && (window as any).Kakao) {
      const Kakao = (window as any).Kakao
      if (!Kakao.isInitialized()) {
        // Initialize if not already
        // Kakao.init('YOUR_KAKAO_JS_KEY');
      }
      Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '우리 궁합 확인해볼래요? 💕',
          description: '해화당에서 나와 당신의 궁합을 확인해보세요!',
          imageUrl: 'https://haehwadang.com/og-image.png',
          link: {
            mobileWebUrl: inviteLink,
            webUrl: inviteLink,
          },
        },
        buttons: [
          {
            title: '궁합 확인하기',
            link: {
              mobileWebUrl: inviteLink,
              webUrl: inviteLink,
            },
          },
        ],
      })
    } else {
      // Fallback: just copy
      handleCopy()
    }
  }

  const handleShareNative = async () => {
    if (inviteLink && navigator.share) {
      try {
        await navigator.share({
          title: '우리 궁합 확인해볼래요? 💕',
          text: '해화당에서 나와 당신의 궁합을 확인해보세요!',
          url: inviteLink,
        })
      } catch (err) {
        // User cancelled or error
      }
    } else {
      handleCopy()
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30">
          <Heart className="w-4 h-4 text-pink-400" />
          <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
            Viral Invite
          </span>
        </div>
        <h1 className="text-4xl font-black">
          <span className="bg-gradient-to-r from-pink-400 via-[#D4AF37] to-pink-400 bg-clip-text text-transparent">
            궁합 초대하기
          </span>
        </h1>
        <p className="text-muted-foreground">
          소중한 사람에게 초대 링크를 보내고, 함께 궁합을 확인해보세요
        </p>
      </div>

      {/* Generate Link Card */}
      {!inviteLink ? (
        <Card className="p-8 bg-gradient-to-br from-pink-500/10 to-[#D4AF37]/10 border-pink-500/20">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center">
              <Users className="w-10 h-10 text-pink-400" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">초대 링크 생성</h2>
              <p className="text-muted-foreground text-sm">
                내 사주 정보를 기반으로 초대 링크를 생성합니다.
                <br />
                상대방이 링크를 열면 즉시 궁합을 확인할 수 있어요!
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <Button
              onClick={handleGenerateLink}
              disabled={loading}
              className="bg-gradient-to-r from-pink-500 to-[#D4AF37] text-black font-bold px-8 hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4 mr-2" />
                  초대 링크 만들기
                </>
              )}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Link Display */}
          <Card className="p-6 bg-white/5 border-white/10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span className="font-bold">초대 링크가 생성되었습니다!</span>
              </div>
              <div className="flex gap-2">
                <Input
                  value={inviteLink}
                  readOnly
                  className="bg-black/30 border-white/10 text-sm"
                />
                <Button
                  onClick={handleCopy}
                  variant="outline"
                  className={`border-white/10 ${copied ? 'bg-green-500/20 text-green-400' : ''}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </Card>

          {/* Share Options */}
          <Card className="p-6 bg-white/5 border-white/10">
            <h3 className="font-bold mb-4">공유하기</h3>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleShareKakao}
                className="bg-[#FEE500] text-[#3C1E1E] hover:bg-[#FDD800] font-bold"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                카카오톡
              </Button>
              <Button
                onClick={handleShareNative}
                variant="outline"
                className="border-white/10 hover:bg-white/5"
              >
                <Share2 className="w-4 h-4 mr-2" />
                다른 앱으로
              </Button>
            </div>
          </Card>

          {/* How It Works */}
          <Card className="p-6 bg-[#D4AF37]/5 border-[#D4AF37]/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              이렇게 진행됩니다
            </h3>
            <ol className="space-y-3">
              {[
                '초대 링크를 소중한 사람에게 공유하세요',
                '상대방이 링크를 열고 생년월일을 입력합니다',
                '바로 두 사람의 궁합 점수가 공개됩니다!',
                '상대방이 회원가입하면 더 자세한 분석을 볼 수 있어요',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-muted-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          {/* Generate New Link */}
          <div className="text-center">
            <Button
              onClick={() => {
                setInviteLink(null)
                setError(null)
              }}
              variant="outline"
              className="border-white/10 hover:bg-white/5"
            >
              새 링크 만들기
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
