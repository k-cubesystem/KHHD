'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Solar, Lunar } from 'lunar-javascript'
import { Badge } from '@/components/ui/badge'
import { Sun, Moon, Sparkles, TrendingUp, Heart, Wallet, Briefcase } from 'lucide-react'

interface FortuneDetailModalProps {
  isOpen: boolean
  onClose: () => void
  date: Date
}

export function FortuneDetailModal({ isOpen, onClose, date }: FortuneDetailModalProps) {
  // @ts-expect-error -- Solar library lacks TypeScript types
  const solar = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate())
  const lunar = solar.getLunar()
  const ganji =
    lunar.getYearInGanji() + '년 ' + lunar.getMonthInGanji() + '월 ' + lunar.getDayInGanji() + '일'

  // Mock Data for Detail
  const luckScore = ((date.getDate() * 7 + date.getMonth() * 3) % 30) + 70 // 70-100 range
  const keywords = ['이동수', '귀인', '금전운']

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#121212] border-white/10 text-ink-light max-w-sm rounded-2xl">
        <DialogHeader className="space-y-4">
          <div className="text-center space-y-1">
            <DialogTitle className="text-xl font-serif text-primary">
              {format(date, 'M월 d일 EEEE', { locale: ko })}
            </DialogTitle>
            <p className="text-xs text-ink-light/50 font-light">
              음력 {lunar.getMonth()}월 {lunar.getDay()}일 · {ganji}
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-primary/20 flex items-center justify-center relative">
              <div
                className="absolute inset-0 rounded-full border-t-4 border-primary animate-spin-slow"
                style={{ clipPath: 'inset(0 0 50% 0)' }}
              ></div>
              <div className="text-center">
                <span className="text-3xl font-bold text-primary">{luckScore}</span>
                <span className="text-xs text-ink-light/60 block">점</span>
              </div>
            </div>
            <p className="mt-3 text-sm font-light text-center px-4 leading-relaxed text-ink-light/80">
              &quot;오늘은 작은 노력으로 큰 결실을 맺을 수 있는 날입니다.&quot;
            </p>
          </div>

          {/* Keyword Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 rounded-full bg-yellow-500/10 text-yellow-500">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-ink-light/40">재물운</p>
                <p className="text-sm font-medium">상승세</p>
              </div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
              <div className="p-2 rounded-full bg-pink-500/10 text-pink-500">
                <Heart className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs text-ink-light/40">애정운</p>
                <p className="text-sm font-medium">보통</p>
              </div>
            </div>
          </div>

          {/* Advice */}
          <div className="bg-primary/5 border border-primary/10 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-primary mb-1">오늘의 조언</h4>
                <p className="text-xs text-ink-light/70 leading-relaxed font-light">
                  남쪽에서 귀인이 찾아올 수 있으니 대인관계를 원만히 하세요. 무리한 투자는 피하는
                  것이 좋습니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
