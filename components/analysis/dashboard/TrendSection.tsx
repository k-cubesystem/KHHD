'use client'

import { Card } from '@/components/ui/card'
import { Wallet, Heart, GraduationCap, Building2, TrendingUp, MessageCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

const TRENDS = [
  {
    id: 'wealth',
    label: '재물운',
    desc: '투자·매매',
    icon: Wallet,
    color: 'text-yellow-400',
    bg: 'bg-yellow-400/10',
  },
  {
    id: 'love',
    label: '애정운',
    desc: '만남·결혼',
    icon: Heart,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
  },
  {
    id: 'career',
    label: '직장운',
    desc: '승진·이직',
    icon: Building2,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
  },
  {
    id: 'exam',
    label: '학업운',
    desc: '합격·자격',
    icon: GraduationCap,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
  },
  {
    id: 'estate',
    label: '부동산',
    desc: '문서·이사',
    icon: TrendingUp,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
  },
]

export function TrendSection() {
  const router = useRouter()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-serif font-light text-[#D4AF37] flex items-center gap-2 before:w-1 before:h-4 before:bg-primary/20 before:block">
          테마별 트렌드
        </h3>
      </div>

      {/* 그리드 형식으로 변경 (3열) */}
      <div className="grid grid-cols-3 gap-3">
        {TRENDS.map((trend) => {
          const Icon = trend.icon
          return (
            <Card
              key={trend.id}
              onClick={() => {
                if (trend.id === 'wealth')
                  router.push('/protected/analysis/theme/wealth') // Standardized to use theme page
                else router.push(`/protected/analysis/theme/${trend.id}`)
              }}
              className="group cursor-pointer card-glass-manse transition-all p-3 flex flex-col items-center justify-center gap-2 text-center h-[110px] rounded-xl active:scale-95 duration-200 hover:border-primary/40"
            >
              <div
                className={`w-9 h-9 rounded-full ${trend.bg} flex items-center justify-center group-hover:scale-110 transition-transform mb-1`}
              >
                <Icon className={`w-4 h-4 ${trend.color}`} strokeWidth={1} />
              </div>
              <div>
                <span className="block text-sm font-light text-white">{trend.label}</span>
                <span className="block text-[10px] text-white/70 font-light mt-0.5">
                  {trend.desc}
                </span>
              </div>
            </Card>
          )
        })}

        {/* AI Chatbot Button (Grid Item) */}
        <Card
          onClick={() => router.push('/protected/ai-shaman')}
          className="group cursor-pointer bg-[#D4AF37]/10 border-[#D4AF37]/30 hover:bg-[#D4AF37]/20 transition-all p-3 flex flex-col items-center justify-center gap-2 text-center h-[110px] rounded-xl active:scale-95 duration-200"
        >
          <div className="w-9 h-9 rounded-full bg-[#D4AF37]/20 flex items-center justify-center group-hover:scale-110 transition-transform mb-1">
            <MessageCircle className="w-4 h-4 text-[#D4AF37]" strokeWidth={1} />
          </div>
          <div>
            <span className="block text-sm font-medium text-[#D4AF37]">고민해결</span>
            <span className="block text-[10px] text-[#D4AF37]/70 font-light mt-0.5">AI 상담소</span>
          </div>
        </Card>
      </div>
    </div>
  )
}
