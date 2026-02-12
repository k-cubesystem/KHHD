'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function PeriodSection() {
  const router = useRouter()

  return (
    <Card className="group relative overflow-hidden card-glass-manse transition-all duration-300 h-full min-h-[160px] flex flex-col justify-between p-5">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Calendar className="w-4 h-4 text-emerald-400" strokeWidth={1} />
          </div>
          <h3 className="text-lg font-serif font-light text-[#D4AF37]">운세 캘린더</h3>
        </div>
        <p className="text-xs text-white/70 font-light leading-relaxed line-clamp-2">
          오늘/주간/월간 흐름 미리보기
        </p>
      </div>

      <div className="relative z-10 pt-2 grid grid-cols-3 gap-1">
        <Button
          onClick={() => router.push('/protected/analysis/fortune')}
          variant="outline"
          className="h-8 border-white/20 text-white hover:bg-white/10 text-[10px] px-0 bg-transparent font-light"
        >
          오늘
        </Button>
        <Button
          onClick={() => router.push('/protected/analysis/fortune')}
          variant="outline"
          className="h-8 border-white/20 text-white hover:bg-white/10 text-[10px] px-0 bg-transparent font-light"
        >
          주간
        </Button>
        <Button
          onClick={() => router.push('/protected/analysis/fortune')}
          variant="outline"
          className="h-8 border-white/20 text-white hover:bg-white/10 text-[10px] px-0 bg-transparent font-light"
        >
          월간
        </Button>
      </div>
    </Card>
  )
}
