'use client'

import { motion } from 'framer-motion'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import { Card, CardContent } from '@/components/ui/card'
import { BookOpen, User, Compass, Hand, Sparkles, ArrowRight } from 'lucide-react'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { BrandQuote } from '@/components/ui/BrandQuote'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'

interface AnalysisClientPageProps {
  targets: DestinyTarget[]
  initialTargetId?: string
}

export function AnalysisClientPage({ targets, initialTargetId }: AnalysisClientPageProps) {
  const router = useRouter()

  const handleSelectTarget = (targetId: string) => {
    // 천지인 분석 시작 - 추후 분석 페이지로 이동
    router.push(`/protected/analysis/cheonjiin/result?targetId=${targetId}`)
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8 w-full max-w-2xl mx-auto py-12 px-3 pb-32 font-sans"
    >
      {/* Header */}
      <motion.section variants={fadeInUp} className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 backdrop-blur-sm mb-2 rounded-full">
            <BookOpen className="w-4 h-4 text-primary" strokeWidth={1} />
            <span className="text-[10px] font-light text-primary tracking-[0.2em] font-sans uppercase">
              Cheonjiin Analysis
            </span>
          </div>
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight text-ink-light leading-tight">
            천지인사주풀이
          </h1>
          <BrandQuote variant="hero" className="max-w-xl mx-auto">
            하늘이 정한 운명, 땅이 품은 기운, 사람에게 새겨진 표식.
            <br />
            천지인 삼재(三才)가 하나로 모여 당신의 진정한 운명을 밝힙니다.
          </BrandQuote>
        </div>
      </motion.section>

      {/* Description */}
      <motion.section
        variants={fadeInUp}
        className="bg-surface/20 border border-primary/20 rounded-xl p-6"
      >
        <p className="text-sm text-ink-light/70 leading-relaxed font-light text-center">
          운명은 하나의 관점만으로는 온전히 볼 수 없습니다. 천지인사주풀이는 하늘의 시간(사주), 땅의
          공간(풍수), 사람의 표식(관상·손금)을 함께 살펴 입체적으로 운명을 해석하는 해화당만의 종합
          풀이법입니다. 태어난 순간 하늘이 새긴 운명의 설계도를 읽고, 당신이 서 있는 공간의 기운을
          느끼며, 얼굴과 손에 드러난 삶의 이야기를 듣습니다.
        </p>
      </motion.section>

      {/* 천·지·인 설명 카드 - 통합 카드 (Unified Card) */}
      <motion.section variants={fadeInUp}>
        <Card className="bg-surface/20 border-primary/20 hover:bg-primary/5 transition-all">
          <CardContent className="p-0 divide-y divide-white/5">
            {/* 천(天) - 사주 */}
            <div className="p-5 flex items-start gap-4 text-left hover:bg-primary/5 transition-colors">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                <BookOpen className="w-6 h-6 text-primary" strokeWidth={1} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-light text-primary">천(天)</h3>
                  <Badge variant="outline" className="text-[10px] font-light border-primary/30 h-5">
                    사주
                  </Badge>
                </div>
                <p className="text-xs font-light text-ink-light/60 leading-relaxed break-keep">
                  태어난 시간에 담긴 하늘의 섭리, 당신 운명의 근원적 설계도를 읽습니다.
                </p>
              </div>
            </div>

            {/* 지(地) - 풍수 */}
            <div className="p-5 flex items-start gap-4 text-left hover:bg-primary/5 transition-colors">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                <Compass className="w-6 h-6 text-primary" strokeWidth={1} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-light text-primary">지(地)</h3>
                  <Badge variant="outline" className="text-[10px] font-light border-primary/30 h-5">
                    풍수
                  </Badge>
                </div>
                <p className="text-xs font-light text-ink-light/60 leading-relaxed break-keep">
                  당신을 둘러싼 공간과 환경의 기운, 땅이 전하는 에너지의 흐름을 살핍니다.
                </p>
              </div>
            </div>

            {/* 인(人) - 관상·손금 */}
            <div className="p-5 flex items-start gap-4 text-left hover:bg-primary/5 transition-colors">
              <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mt-1">
                <Hand className="w-6 h-6 text-primary" strokeWidth={1} />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-serif font-light text-primary">인(人)</h3>
                  <Badge variant="outline" className="text-[10px] font-light border-primary/30 h-5">
                    관상·손금
                  </Badge>
                </div>
                <p className="text-xs font-light text-ink-light/60 leading-relaxed break-keep">
                  얼굴과 손에 새겨진 삶의 궤적, 시간이 당신에게 남긴 운명의 표식을 봅니다.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* 가족 리스트 섹션 */}
      <motion.section variants={fadeInUp} className="space-y-6 mt-8">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1} />
            <h2 className="text-2xl font-serif font-light text-ink-light">
              분석할 인연을 선택하세요
            </h2>
            <Sparkles className="w-5 h-5 text-primary" strokeWidth={1} />
          </div>
          <p className="text-sm text-ink-light/60 font-light">
            등록된 가족 구성원의 천지인사주를 종합 분석합니다
          </p>
        </div>

        {targets.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {targets.map((target, idx) => (
              <motion.div
                key={target.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card
                  className="bg-surface/20 border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all cursor-pointer group"
                  onClick={() => handleSelectTarget(target.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                          <User className="w-7 h-7 text-primary" strokeWidth={1} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-lg font-serif font-light text-ink-light">
                            {target.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs text-ink-light/50 font-light">
                            <span>{target.relation_type || '가족'}</span>
                            <span className="w-1 h-1 rounded-full bg-ink-light/30" />
                            <span>{target.birth_date}</span>
                            {target.birth_time && (
                              <>
                                <span className="w-1 h-1 rounded-full bg-ink-light/30" />
                                <span>{target.birth_time}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <ArrowRight
                        className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={1}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <Card className="bg-surface/10 border-dashed border-primary/20">
            <CardContent className="p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-8 h-8 text-primary/40" strokeWidth={1} />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-serif font-light text-ink-light">
                  등록된 가족이 없습니다
                </h3>
                <p className="text-sm text-ink-light/50 font-light">
                  가족 관리 페이지에서 인연을 추가해주세요
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </motion.section>

      {/* Footer */}
      <motion.section variants={fadeInUp} className="text-center space-y-4 opacity-50 mt-8">
        <p className="text-xs text-ink-light/40 font-light italic">
          ※ 세 가지 차원이 어우러질 때 비로소 온전한 그림이 완성되고,
          <br />그 속에서 당신만의 길이 선명하게 드러납니다
        </p>
        <div className="flex items-center justify-center gap-4 uppercase tracking-[0.2em] font-sans font-light text-[10px]">
          <span>Authentic</span>
          <span className="w-1 h-1 bg-primary/50 rounded-full" />
          <span>Integrated</span>
          <span className="w-1 h-1 bg-primary/50 rounded-full" />
          <span>Haehwadang</span>
        </div>
      </motion.section>
    </motion.div>
  )
}
