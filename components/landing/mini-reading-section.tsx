'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { getSajuData, WU_XING_NAMES, WU_XING_COLORS } from '@/lib/domain/saju/saju'
import { GA } from '@/lib/analytics/ga4'

const ANIMALS: Record<string, string> = {
  子: '쥐',
  丑: '소',
  寅: '호랑이',
  卯: '토끼',
  辰: '용',
  巳: '뱀',
  午: '말',
  未: '양',
  申: '원숭이',
  酉: '닭',
  戌: '개',
  亥: '돼지',
}

const ANIMAL_EMOJI: Record<string, string> = {
  子: '🐀',
  丑: '🐂',
  寅: '🐅',
  卯: '🐇',
  辰: '🐉',
  巳: '🐍',
  午: '🐴',
  未: '🐏',
  申: '🐒',
  酉: '🐓',
  戌: '🐕',
  亥: '🐖',
}

const DAY_MASTER_TRAITS: Record<string, string> = {
  甲: '큰 나무처럼 곧고 당당한 리더십의 소유자',
  乙: '풀과 꽃처럼 유연하고 적응력이 뛰어난 사람',
  丙: '태양처럼 밝고 열정적인 에너지의 소유자',
  丁: '촛불처럼 따뜻하고 섬세한 감성의 사람',
  戊: '산처럼 듬직하고 신뢰감을 주는 사람',
  己: '옥토처럼 포용력 있고 실속 있는 사람',
  庚: '강철처럼 의지가 강하고 결단력 있는 사람',
  辛: '보석처럼 예리하고 완벽을 추구하는 사람',
  壬: '바다처럼 지혜롭고 포용력이 큰 사람',
  癸: '빗물처럼 직관적이고 창의적인 사람',
}

interface MiniReadingResult {
  animal: string
  animalEmoji: string
  element: string
  elementColor: string
  dayMaster: string
  trait: string
}

export function MiniReadingSection() {
  const t = useTranslations('landing')
  const router = useRouter()
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [result, setResult] = useState<MiniReadingResult | null>(null)

  const handleReading = useCallback(() => {
    const y = parseInt(year)
    const m = parseInt(month)
    const d = parseInt(day)

    if (!y || !m || !d || y < 1920 || y > 2025 || m < 1 || m > 12 || d < 1 || d > 31) return

    try {
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
      const saju = getSajuData(dateStr, '12:00', true)

      const yearZhi = saju.pillars.year.zhi
      const animal = ANIMALS[yearZhi] || '알 수 없음'
      const animalEmoji = ANIMAL_EMOJI[yearZhi] || ''
      const element = WU_XING_NAMES[saju.dayMasterElement] || saju.dayMasterElement
      const elementColor = WU_XING_COLORS[saju.dayMasterElement] || '#D4AF37'
      const dayMaster = saju.dayMaster
      const trait = DAY_MASTER_TRAITS[dayMaster] || '고유한 기운을 가진 사람'

      setResult({ animal, animalEmoji, element, elementColor, dayMaster, trait })
      GA.miniReading()
    } catch {
      setResult(null)
    }
  }, [year, month, day])

  return (
    <section className="w-full px-4 py-8">
      <div className="max-w-[420px] mx-auto space-y-4">
        <div className="text-center space-y-1">
          <p className="text-gold-500/60 text-xs font-sans tracking-widest uppercase">Quick Fortune</p>
          <h2 className="text-lg font-serif text-ink-light">{t('miniReading')}</h2>
        </div>

        {/* Input */}
        <div className="flex gap-2 items-center justify-center">
          <input
            type="number"
            placeholder={t('year')}
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-20 px-3 py-2.5 bg-white/5 border border-gold-500/20 rounded-lg text-center text-sm text-ink-light placeholder:text-ink-light/30 focus:border-gold-500/50 focus:outline-none font-sans"
            min={1920}
            max={2025}
          />
          <input
            type="number"
            placeholder={t('month')}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="w-16 px-3 py-2.5 bg-white/5 border border-gold-500/20 rounded-lg text-center text-sm text-ink-light placeholder:text-ink-light/30 focus:border-gold-500/50 focus:outline-none font-sans"
            min={1}
            max={12}
          />
          <input
            type="number"
            placeholder={t('day')}
            value={day}
            onChange={(e) => setDay(e.target.value)}
            className="w-16 px-3 py-2.5 bg-white/5 border border-gold-500/20 rounded-lg text-center text-sm text-ink-light placeholder:text-ink-light/30 focus:border-gold-500/50 focus:outline-none font-sans"
            min={1}
            max={31}
          />
          <Button
            onClick={handleReading}
            disabled={!year || !month || !day}
            size="sm"
            className="bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 border border-gold-500/30 font-sans"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="rounded-xl border border-gold-500/20 bg-gradient-to-br from-gold-500/5 to-transparent p-4 space-y-3"
            >
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <span className="text-2xl">{result.animalEmoji}</span>
                  <p className="text-xs text-ink-light/60 font-sans mt-1">{result.animal}띠</p>
                </div>
                <div className="w-px h-8 bg-gold-500/20" />
                <div className="text-center">
                  <div
                    className="w-8 h-8 rounded-full mx-auto flex items-center justify-center text-xs font-serif text-ink-light"
                    style={{
                      backgroundColor: result.elementColor + '30',
                      borderColor: result.elementColor,
                      borderWidth: 1,
                    }}
                  >
                    {result.dayMaster}
                  </div>
                  <p className="text-xs text-ink-light/60 font-sans mt-1">{result.element}</p>
                </div>
              </div>

              <p className="text-sm text-ink-light/80 text-center font-sans leading-relaxed">{result.trait}</p>

              <Button
                onClick={() => router.push('/auth/sign-up')}
                className="w-full bg-gold-500/20 hover:bg-gold-500/30 text-gold-500 border border-gold-500/30 gap-2 font-sans"
                size="sm"
              >
                {t('miniReadingResult')}
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
