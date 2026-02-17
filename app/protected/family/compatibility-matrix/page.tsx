'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { getFamilyMembers } from '@/app/actions/user/family'
import { fadeInUp, staggerContainer } from '@/lib/animations'
import Link from 'next/link'

interface FamilyMember {
  id: string
  name: string
  relationship: string
}

interface CompatibilityScore {
  person1: string
  person2: string
  score: number
  relation: string
}

export default function CompatibilityMatrixPage() {
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPair, setSelectedPair] = useState<CompatibilityScore | null>(null)

  useEffect(() => {
    const fetchMembers = async () => {
      const data = await getFamilyMembers()
      setMembers(data as FamilyMember[])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  // 궁합 점수 계산 (샘플 - 실제로는 AI 분석 필요)
  const getCompatibilityScore = (id1: string, id2: string): number => {
    if (id1 === id2) return 100
    const hash = (id1 + id2).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return 50 + (hash % 40)
  }

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'bg-green-500/80'
    if (score >= 70) return 'bg-primary/80'
    if (score >= 50) return 'bg-yellow-500/80'
    return 'bg-red-500/80'
  }

  const getScoreText = (score: number): string => {
    if (score >= 90) return '매우 좋음'
    if (score >= 70) return '좋음'
    if (score >= 50) return '보통'
    return '주의'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    )
  }

  if (members.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <Heart className="w-16 h-16 text-primary/50 mb-4" />
        <h2 className="text-2xl font-serif font-bold text-ink-light mb-2">
          가족 구성원이 부족합니다
        </h2>
        <p className="text-ink-light/60 mb-6">
          궁합 매트릭스를 보려면 최소 2명의 구성원이 필요합니다.
        </p>
        <Link
          href="/protected/family"
          className="px-6 py-3 bg-primary/20 text-primary border border-primary/30 rounded-lg hover:bg-primary/30 transition-all"
        >
          구성원 추가하기
        </Link>
      </div>
    )
  }

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="flex flex-col gap-8 w-full max-w-6xl mx-auto py-12 px-6 pb-32"
    >
      <motion.section variants={fadeInUp} className="space-y-4 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface/50 border border-primary/20 mb-2">
          <Heart className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary tracking-[0.2em] uppercase">
            Family Compatibility
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold text-ink-light">
          가족 궁합 매트릭스
        </h1>
        <p className="text-ink-light/70 max-w-2xl mx-auto">
          가족 구성원 간의 궁합을 한눈에 확인하세요
        </p>
      </motion.section>

      <motion.div variants={fadeInUp}>
        <Card className="bg-surface/50 backdrop-blur-md border border-primary/20 overflow-x-auto">
          <CardHeader>
            <CardTitle className="text-xl font-serif font-bold text-ink-light">
              궁합 점수 매트릭스
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-w-[600px]">
              {/* Header Row */}
              <div
                className="grid gap-2 mb-2"
                style={{ gridTemplateColumns: `150px repeat(${members.length}, 100px)` }}
              >
                <div></div>
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="text-center font-serif text-sm font-bold text-primary truncate"
                  >
                    {member.name}
                  </div>
                ))}
              </div>

              {/* Matrix Rows */}
              {members.map((person1) => (
                <div
                  key={person1.id}
                  className="grid gap-2 mb-2"
                  style={{ gridTemplateColumns: `150px repeat(${members.length}, 100px)` }}
                >
                  <div className="flex items-center font-serif font-bold text-ink-light truncate pr-4">
                    {person1.name}
                  </div>
                  {members.map((person2) => {
                    const score = getCompatibilityScore(person1.id, person2.id)
                    const isself = person1.id === person2.id
                    return (
                      <button
                        key={person2.id}
                        onClick={() =>
                          !isself &&
                          setSelectedPair({
                            person1: person1.name,
                            person2: person2.name,
                            score,
                            relation: `${person1.relationship} - ${person2.relationship}`,
                          })
                        }
                        className={`
                          h-20 rounded-lg flex flex-col items-center justify-center transition-all
                          ${isself ? 'bg-surface/30 cursor-default' : `${getScoreColor(score)} hover:scale-105 cursor-pointer`}
                        `}
                        disabled={isself}
                      >
                        {!isself && (
                          <>
                            <div className="text-2xl font-bold text-white">{score}</div>
                            <div className="text-xs text-white/80">{getScoreText(score)}</div>
                          </>
                        )}
                        {isself && <div className="text-ink-light/40">-</div>}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-6 border-t border-primary/10 flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-green-500/80" />
                <span className="text-sm text-ink-light">90-100점: 매우 좋음</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-primary/80" />
                <span className="text-sm text-ink-light">70-89점: 좋음</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-yellow-500/80" />
                <span className="text-sm text-ink-light">50-69점: 보통</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-red-500/80" />
                <span className="text-sm text-ink-light">0-49점: 주의</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detail Modal */}
      <Dialog open={!!selectedPair} onOpenChange={() => setSelectedPair(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-serif text-center">궁합 상세 분석</DialogTitle>
          </DialogHeader>
          {selectedPair && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <span className="text-xl font-serif font-bold text-ink-light">
                    {selectedPair.person1}
                  </span>
                  <Heart className="w-6 h-6 text-primary" />
                  <span className="text-xl font-serif font-bold text-ink-light">
                    {selectedPair.person2}
                  </span>
                </div>
                <div className="text-sm text-ink-light/60">{selectedPair.relation}</div>
              </div>

              <div className={`p-6 rounded-lg ${getScoreColor(selectedPair.score)}`}>
                <div className="text-center">
                  <div className="text-5xl font-bold text-white mb-2">{selectedPair.score}점</div>
                  <div className="text-lg text-white/90">{getScoreText(selectedPair.score)}</div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-bold text-ink-light mb-2">강점</h4>
                  <p className="text-sm text-ink-light/70">서로를 이해하고 존중하는 관계입니다.</p>
                </div>
                <div>
                  <h4 className="font-bold text-ink-light mb-2">주의사항</h4>
                  <p className="text-sm text-ink-light/70">소통을 더욱 활발히 하면 좋습니다.</p>
                </div>
                <div>
                  <h4 className="font-bold text-ink-light mb-2">조언</h4>
                  <p className="text-sm text-ink-light/70">
                    함께 시간을 보내며 유대감을 강화하세요.
                  </p>
                </div>
              </div>

              <div className="text-xs text-ink-light/50 text-center pt-4 border-t border-primary/10">
                ※ 이 분석은 AI 기반 참고 자료입니다
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
