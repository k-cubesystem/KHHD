'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import {
  Heart,
  Sparkles,
  Loader2,
  Users,
  Calendar,
  TrendingUp,
  Star,
  Briefcase,
  UserPlus,
  ChevronRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { getInviterByCode, analyzeCompatibility } from '@/app/actions/user/invite'
import Link from 'next/link'

interface InviterData {
  inviterId: string
  inviterName: string
  inviterBirthDate: string
  inviterGender: string
}

interface CompatibilityData {
  overallScore: number
  loveScore: number
  workScore: number
  friendScore: number
  summary: string
  strengths: string[]
  challenges: string[]
  advice: string
}

export default function InvitePage() {
  const params = useParams()
  const code = params.code as string

  const [inviter, setInviter] = useState<InviterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'loading' | 'input' | 'result'>('loading')

  // Guest input
  const [guestName, setGuestName] = useState('')
  const [guestBirthDate, setGuestBirthDate] = useState('')
  const [guestGender, setGuestGender] = useState<'male' | 'female'>('male')

  // Result
  const [compatibility, setCompatibility] = useState<CompatibilityData | null>(null)

  useEffect(() => {
    loadInviter()
  }, [code])

  const loadInviter = async () => {
    setLoading(true)
    const result = await getInviterByCode(code)

    if (result.success && result.inviter) {
      setInviter(result.inviter)
      setStep('input')
    } else {
      setError(result.error || '유효하지 않은 초대 링크입니다.')
    }
    setLoading(false)
  }

  const handleAnalyze = async () => {
    if (!inviter || !guestName || !guestBirthDate) {
      setError('모든 정보를 입력해주세요.')
      return
    }

    setAnalyzing(true)
    setError(null)

    try {
      const result = await analyzeCompatibility(
        {
          name: inviter.inviterName,
          birthDate: inviter.inviterBirthDate,
          gender: inviter.inviterGender,
        },
        {
          name: guestName,
          birthDate: guestBirthDate,
          gender: guestGender,
        }
      )

      if (result.success) {
        setCompatibility(result as CompatibilityData)
        setStep('result')
      } else {
        setError(result.error || '궁합 분석 중 오류가 발생했습니다.')
      }
    } catch (err) {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-[#D4AF37]'
    if (score >= 40) return 'text-yellow-400'
    return 'text-orange-400'
  }

  const getScoreEmoji = (score: number) => {
    if (score >= 90) return '💕'
    if (score >= 80) return '❤️'
    if (score >= 70) return '💛'
    if (score >= 60) return '💙'
    return '🤝'
  }

  // Loading State
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4">
          {loading ? (
            <>
              <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mx-auto" />
              <p className="text-muted-foreground">초대 정보를 불러오는 중...</p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <Heart className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-red-400">{error}</p>
              <Link href="/">
                <Button variant="outline" className="border-white/10">
                  홈으로 돌아가기
                </Button>
              </Link>
            </>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] py-8 px-4">
      <div className="max-w-lg mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-pink-500/20 border border-pink-500/30">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-xs font-bold text-pink-300 uppercase tracking-wider">
              Destiny Match
            </span>
          </div>
          <h1 className="text-3xl font-black">
            <span className="bg-gradient-to-r from-pink-400 via-[#D4AF37] to-pink-400 bg-clip-text text-transparent">
              궁합 초대장
            </span>
          </h1>
        </div>

        {/* Step: Input */}
        {step === 'input' && inviter && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Inviter Card */}
            <Card className="p-6 bg-gradient-to-br from-pink-500/10 to-[#D4AF37]/10 border-pink-500/20">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-500/20 flex items-center justify-center">
                  <Users className="w-8 h-8 text-pink-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">초대한 사람</p>
                  <p className="text-xl font-bold">{inviter.inviterName}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {inviter.inviterName}님이 당신과의 궁합을 알고 싶어합니다!
                </p>
              </div>
            </Card>

            {/* Guest Input Form */}
            <Card className="p-6 bg-white/5 border-white/10">
              <h3 className="font-bold text-lg mb-4">내 정보 입력</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">이름</Label>
                  <Input
                    id="name"
                    placeholder="홍길동"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="bg-black/30 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birthDate">생년월일</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={guestBirthDate}
                    onChange={(e) => setGuestBirthDate(e.target.value)}
                    className="bg-black/30 border-white/10"
                  />
                </div>

                <div className="space-y-2">
                  <Label>성별</Label>
                  <RadioGroup
                    value={guestGender}
                    onValueChange={(v) => setGuestGender(v as 'male' | 'female')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="male" id="male" />
                      <Label htmlFor="male" className="cursor-pointer">
                        남성
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="female" id="female" />
                      <Label htmlFor="female" className="cursor-pointer">
                        여성
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </Card>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !guestName || !guestBirthDate}
              className="w-full bg-gradient-to-r from-pink-500 to-[#D4AF37] text-black font-bold py-6 hover:opacity-90"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  궁합 분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  궁합 확인하기
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && compatibility && inviter && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Overall Score */}
            <Card className="p-8 bg-gradient-to-br from-pink-500/20 via-[#D4AF37]/10 to-pink-500/20 border-pink-500/20 text-center">
              <div className="text-6xl mb-2">{getScoreEmoji(compatibility.overallScore)}</div>
              <div className={`text-7xl font-black ${getScoreColor(compatibility.overallScore)}`}>
                {compatibility.overallScore}
              </div>
              <p className="text-lg font-bold mt-2">
                {inviter.inviterName} ❤️ {guestName}
              </p>
              <p className="text-muted-foreground text-sm mt-2">{compatibility.summary}</p>
            </Card>

            {/* Category Scores */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: '연애궁합',
                  score: compatibility.loveScore,
                  icon: Heart,
                  color: 'text-pink-400',
                },
                {
                  label: '일궁합',
                  score: compatibility.workScore,
                  icon: Briefcase,
                  color: 'text-blue-400',
                },
                {
                  label: '친구궁합',
                  score: compatibility.friendScore,
                  icon: Users,
                  color: 'text-green-400',
                },
              ].map((item) => (
                <Card key={item.label} className="p-4 bg-white/5 border-white/10 text-center">
                  <item.icon className={`w-5 h-5 ${item.color} mx-auto mb-1`} />
                  <div className={`text-2xl font-black ${getScoreColor(item.score)}`}>
                    {item.score}
                  </div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                </Card>
              ))}
            </div>

            {/* Strengths & Challenges */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4 bg-green-500/5 border-green-500/20">
                <h4 className="font-bold text-sm mb-2 text-green-400">💪 강점</h4>
                <ul className="space-y-1">
                  {compatibility.strengths?.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {s}
                    </li>
                  ))}
                </ul>
              </Card>
              <Card className="p-4 bg-orange-500/5 border-orange-500/20">
                <h4 className="font-bold text-sm mb-2 text-orange-400">⚠️ 주의점</h4>
                <ul className="space-y-1">
                  {compatibility.challenges?.map((c, i) => (
                    <li key={i} className="text-xs text-muted-foreground">
                      • {c}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Advice */}
            <Card className="p-4 bg-[#D4AF37]/5 border-[#D4AF37]/20">
              <div className="flex gap-3">
                <Star className="w-5 h-5 text-[#D4AF37] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm mb-1 text-[#D4AF37]">조언</h4>
                  <p className="text-xs text-muted-foreground">{compatibility.advice}</p>
                </div>
              </div>
            </Card>

            {/* CTA */}
            <Card className="p-6 bg-gradient-to-r from-[#D4AF37]/20 to-pink-500/20 border-[#D4AF37]/30">
              <div className="text-center space-y-4">
                <h3 className="font-bold">더 자세한 분석이 궁금하신가요?</h3>
                <p className="text-sm text-muted-foreground">
                  회원가입하면 상세한 사주 분석, 연간 운세, AI 관상 분석 등
                  <br />
                  다양한 프리미엄 서비스를 이용하실 수 있습니다.
                </p>
                <Link href="/auth/sign-up">
                  <Button className="bg-[#D4AF37] text-black font-bold hover:bg-[#F4E4BA]">
                    <UserPlus className="w-4 h-4 mr-2" />
                    무료 회원가입
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Disclaimer */}
            <p className="text-xs text-muted-foreground text-center">
              * 본 서비스는 재미와 참고용으로만 제공됩니다.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
