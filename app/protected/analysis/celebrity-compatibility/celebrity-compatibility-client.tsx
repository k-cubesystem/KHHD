'use client'

import { useState, useCallback, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Star, Heart, ChevronRight, X, Loader2, ArrowLeft } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import {
  searchCelebritiesAction,
  calculateCelebrityCompatibilityAction,
} from '@/app/actions/ai/celebrity-compatibility'
import { CELEBRITY_CATEGORIES, type Celebrity, type CelebrityCategory } from '@/lib/data/celebrities'
import { CelebrityCompatibilityResult } from './celebrity-compatibility-result'

const CATEGORY_COLORS: Record<CelebrityCategory, string> = {
  배우: 'bg-purple-100 text-purple-700 border-purple-200',
  가수: 'bg-pink-100 text-pink-700 border-pink-200',
  스포츠: 'bg-blue-100 text-blue-700 border-blue-200',
  정치: 'bg-gray-100 text-gray-700 border-gray-200',
  역사: 'bg-amber-100 text-amber-700 border-amber-200',
  기업: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
}

export function CelebrityCompatibilityClient() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<CelebrityCategory | null>(null)
  const [celebrities, setCelebrities] = useState<Celebrity[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [selectedCelebrity, setSelectedCelebrity] = useState<Celebrity | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compatibilityResult, setCompatibilityResult] = useState<any>(null)
  const [isSearching, startSearchTransition] = useTransition()
  const [isCalculating, startCalculatingTransition] = useTransition()

  const handleSearch = useCallback((q: string, cat: CelebrityCategory | null) => {
    startSearchTransition(async () => {
      const res = await searchCelebritiesAction(q, cat)
      if (res.success && res.data) {
        setCelebrities(res.data)
        setHasSearched(true)
      }
    })
  }, [])

  const handleQueryChange = (value: string) => {
    setQuery(value)
    handleSearch(value, selectedCategory)
  }

  const handleCategoryToggle = (cat: CelebrityCategory) => {
    const next = selectedCategory === cat ? null : cat
    setSelectedCategory(next)
    handleSearch(query, next)
    if (!hasSearched) setHasSearched(true)
  }

  const handleShowAll = () => {
    handleSearch('', null)
    setSelectedCategory(null)
    setQuery('')
  }

  const handleSelectCelebrity = (celebrity: Celebrity) => {
    setSelectedCelebrity(celebrity)
    setCompatibilityResult(null)
  }

  const handleCalculateCompatibility = () => {
    if (!selectedCelebrity) return
    startCalculatingTransition(async () => {
      const res = await calculateCelebrityCompatibilityAction(selectedCelebrity.id)
      if (res.success) {
        setCompatibilityResult(res)
        toast.success(`${selectedCelebrity.name}과의 궁합 계산 완료!`)
      } else {
        toast.error(res.error ?? '궁합 계산에 실패했습니다.')
      }
    })
  }

  const handleReset = () => {
    setSelectedCelebrity(null)
    setCompatibilityResult(null)
  }

  // 결과 화면
  if (compatibilityResult && selectedCelebrity) {
    return (
      <CelebrityCompatibilityResult result={compatibilityResult} celebrity={selectedCelebrity} onReset={handleReset} />
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0a00] via-[#2d1200] to-[#1a0a00] pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-[#1a0a00]/90 backdrop-blur-sm border-b border-[#D4AF37]/20 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-[#D4AF37] hover:bg-[#D4AF37]/10"
          onClick={() => router.back()}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-[#D4AF37]">스타 궁합</h1>
          <p className="text-xs text-[#D4AF37]/60">유명인과의 사주 궁합 보기</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* 선택된 유명인 미리보기 */}
        <AnimatePresence>
          {selectedCelebrity && (
            <motion.div {...fadeUp} className="relative">
              <Card className="bg-gradient-to-r from-[#D4AF37]/20 to-[#D4AF37]/5 border-[#D4AF37]/40">
                <CardContent className="p-4 flex items-center gap-4">
                  {/* 아바타 */}
                  <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border-2 border-[#D4AF37]/50 flex items-center justify-center flex-shrink-0">
                    <Star className="w-7 h-7 text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[#D4AF37]/60 mb-0.5">선택된 상대</p>
                    <p className="font-bold text-[#D4AF37] text-lg leading-tight">{selectedCelebrity.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[selectedCelebrity.category]}`}
                      >
                        {selectedCelebrity.category}
                      </Badge>
                      <span className="text-xs text-[#D4AF37]/50">{selectedCelebrity.birthDate}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="bg-[#D4AF37] text-[#1a0a00] hover:bg-[#b8941f] font-bold text-xs px-3"
                      onClick={handleCalculateCompatibility}
                      disabled={isCalculating}
                    >
                      {isCalculating ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <>
                          <Heart className="w-3 h-3 mr-1" />
                          궁합 보기
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-[#D4AF37]/50 hover:text-[#D4AF37] text-xs px-3"
                      onClick={handleReset}
                    >
                      <X className="w-3 h-3 mr-1" />
                      취소
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 검색 박스 */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#D4AF37]/50" />
          <Input
            className="pl-9 bg-[#2d1200]/80 border-[#D4AF37]/30 text-[#D4AF37] placeholder:text-[#D4AF37]/30 focus:border-[#D4AF37]/60"
            placeholder="유명인 이름 검색 (예: 손흥민, BTS, 아이유...)"
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
          />
        </div>

        {/* 카테고리 필터 */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleShowAll}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
              !selectedCategory && hasSearched
                ? 'bg-[#D4AF37] text-[#1a0a00] border-[#D4AF37]'
                : 'bg-transparent text-[#D4AF37]/60 border-[#D4AF37]/30 hover:border-[#D4AF37]/60'
            }`}
          >
            전체
          </button>
          {CELEBRITY_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryToggle(cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                selectedCategory === cat
                  ? 'bg-[#D4AF37] text-[#1a0a00] border-[#D4AF37]'
                  : 'bg-transparent text-[#D4AF37]/60 border-[#D4AF37]/30 hover:border-[#D4AF37]/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* 안내 문구 (검색 전) */}
        {!hasSearched && (
          <motion.div {...fadeUp} className="text-center py-12 space-y-3">
            <div className="text-5xl">⭐</div>
            <p className="text-[#D4AF37]/80 font-medium">좋아하는 스타를 찾아보세요</p>
            <p className="text-[#D4AF37]/40 text-sm">이름을 검색하거나 카테고리를 선택하세요</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
              onClick={handleShowAll}
            >
              전체 목록 보기
            </Button>
          </motion.div>
        )}

        {/* 로딩 */}
        {isSearching && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 text-[#D4AF37] animate-spin" />
          </div>
        )}

        {/* 결과 없음 */}
        {hasSearched && !isSearching && celebrities.length === 0 && (
          <motion.div {...fadeUp} className="text-center py-10">
            <p className="text-[#D4AF37]/50 text-sm">검색 결과가 없습니다.</p>
            <p className="text-[#D4AF37]/30 text-xs mt-1">다른 이름으로 검색해 보세요.</p>
          </motion.div>
        )}

        {/* 유명인 카드 목록 */}
        {!isSearching && celebrities.length > 0 && (
          <motion.div
            className="space-y-2"
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.04 } },
              hidden: {},
            }}
          >
            {celebrities.map((celebrity) => (
              <motion.div key={celebrity.id} variants={fadeUp}>
                <CelebrityCard
                  celebrity={celebrity}
                  isSelected={selectedCelebrity?.id === celebrity.id}
                  onSelect={handleSelectCelebrity}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

function CelebrityCard({
  celebrity,
  isSelected,
  onSelect,
}: {
  celebrity: Celebrity
  isSelected: boolean
  onSelect: (c: Celebrity) => void
}) {
  return (
    <button
      className={`w-full text-left transition-all rounded-xl border ${
        isSelected
          ? 'border-[#D4AF37] bg-[#D4AF37]/10'
          : 'border-[#D4AF37]/15 bg-[#2d1200]/50 hover:border-[#D4AF37]/40 hover:bg-[#2d1200]/80'
      }`}
      onClick={() => onSelect(celebrity)}
    >
      <div className="p-4 flex items-center gap-3">
        {/* 아바타 */}
        <div
          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${
            isSelected ? 'bg-[#D4AF37]/30' : 'bg-[#D4AF37]/10'
          }`}
        >
          <Star className={`w-5 h-5 ${isSelected ? 'text-[#D4AF37]' : 'text-[#D4AF37]/50'}`} />
        </div>

        {/* 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`font-semibold text-sm ${isSelected ? 'text-[#D4AF37]' : 'text-[#D4AF37]/80'}`}>
              {celebrity.name}
            </span>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${CATEGORY_COLORS[celebrity.category]}`}>
              {celebrity.category}
            </Badge>
          </div>
          <p className="text-[10px] text-[#D4AF37]/40">{celebrity.birthDate}</p>
          <p className="text-xs text-[#D4AF37]/50 truncate mt-0.5">{celebrity.description}</p>
        </div>

        <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#D4AF37]' : 'text-[#D4AF37]/30'}`} />
      </div>
    </button>
  )
}
