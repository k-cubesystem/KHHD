'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function RelationshipSection() {
  const router = useRouter()

  return (
    <Card className="group relative overflow-hidden card-glass-manse transition-all duration-300 h-full min-h-[160px] flex flex-col justify-between p-5">
      {/* Hover Decor */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 bg-gold-500/10 rounded-lg flex items-center justify-center">
            <Users className="w-4 h-4 text-gold-500" strokeWidth={1} />
          </div>
          <h3 className="text-lg font-serif font-light text-gold-500">궁합</h3>
        </div>
        <p className="text-xs text-white/70 font-light leading-relaxed line-clamp-2">
          두 사람의 오행과 기운을 분석하여 관계의 해법을 제안합니다.
        </p>
      </div>

      <div className="relative z-10 pt-2 grid grid-cols-2 gap-2">
        <Button
          onClick={() => router.push('/protected/analysis/compatibility')}
          variant="outline"
          className="h-8 border-gold-500/30 text-gold-500 hover:bg-gold-500/10 bg-transparent text-xs font-light w-full"
        >
          인연 궁합
        </Button>
        <Button
          onClick={() => router.push('/protected/analysis/celebrity-compatibility')}
          variant="outline"
          className="h-8 border-emerald-400/30 text-emerald-300 hover:bg-emerald-400/10 bg-transparent text-xs font-light w-full"
        >
          💼 사업 궁합
        </Button>
      </div>
    </Card>
  )
}
