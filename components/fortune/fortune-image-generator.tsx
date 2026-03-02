'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, Share2, Loader2, ImageIcon, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateFortuneImage, FortuneImageType, FortuneImageContext } from '@/app/actions/ai/generate-image'

interface FortuneImageGeneratorProps {
  context?: FortuneImageContext
  defaultType?: FortuneImageType
  /** Show as inline section (default) or compact button-only */
  variant?: 'inline' | 'compact'
}

const TYPE_LABELS: Record<FortuneImageType, { label: string; emoji: string; desc: string }> = {
  talisman: { label: '나만의 부적', emoji: '🔴', desc: '재앙을 막고 복을 불러오는 전통 부적' },
  card: { label: '운세 카드', emoji: '✨', desc: '이달의 운세를 담은 아름다운 카드' },
  illustration: { label: '사주 일러스트', emoji: '🌌', desc: '팔자를 우주로 표현한 신비로운 그림' },
}

export function FortuneImageGenerator({
  context = {},
  defaultType = 'card',
  variant = 'inline',
}: FortuneImageGeneratorProps) {
  const [selectedType, setSelectedType] = useState<FortuneImageType>(defaultType)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageSource, setImageSource] = useState<'url' | 'base64'>('url')
  const [isExpanded, setIsExpanded] = useState(false)

  async function handleGenerate() {
    setIsGenerating(true)
    setGeneratedImage(null)

    try {
      const result = await generateFortuneImage(selectedType, context)

      if (result.success) {
        if (result.imageUrl) {
          setGeneratedImage(result.imageUrl)
          setImageSource('url')
        } else if (result.base64) {
          setGeneratedImage(result.base64)
          setImageSource('base64')
        }
        toast.success(`${TYPE_LABELS[selectedType].label} 생성 완료!`)
      } else {
        toast.error(result.error ?? '이미지 생성에 실패했습니다.')
      }
    } catch {
      toast.error('이미지 생성 중 오류가 발생했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  async function handleDownload() {
    if (!generatedImage) return

    try {
      let blob: Blob

      if (imageSource === 'base64') {
        const [header, data] = generatedImage.split(',')
        const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png'
        const bytes = atob(data)
        const arr = new Uint8Array(bytes.length)
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
        blob = new Blob([arr], { type: mimeType })
      } else {
        const response = await fetch(generatedImage)
        blob = await response.blob()
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `haehwadang-${selectedType}-${Date.now()}.png`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('이미지 저장 완료!')
    } catch {
      toast.error('이미지 저장에 실패했습니다.')
    }
  }

  async function handleShare() {
    if (!generatedImage) return

    try {
      if (navigator.share) {
        await navigator.share({
          title: `해화당 ${TYPE_LABELS[selectedType].label}`,
          text: '해화당에서 나만의 운세 이미지를 만들었어요!',
          url: imageSource === 'url' ? generatedImage : window.location.href,
        })
      } else {
        await navigator.clipboard.writeText(imageSource === 'url' ? generatedImage : window.location.href)
        toast.success('링크가 복사되었습니다!')
      }
    } catch {
      toast.error('공유에 실패했습니다.')
    }
  }

  if (variant === 'compact') {
    return (
      <Button
        onClick={() => {
          setIsExpanded(true)
          handleGenerate()
        }}
        className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-semibold shadow-md"
        disabled={isGenerating}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        나만의 운세 이미지 생성
      </Button>
    )
  }

  return (
    <div className="rounded-2xl border border-amber-200/50 bg-gradient-to-b from-amber-50/30 to-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center shadow-sm">
          <ImageIcon className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-amber-900 text-sm">나만의 운세 이미지 생성</h3>
          <p className="text-xs text-amber-600/70">AI가 사주 정보로 개인 맞춤 이미지를 생성합니다</p>
        </div>
      </div>

      {/* Type Selection */}
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TYPE_LABELS) as FortuneImageType[]).map((type) => {
          const info = TYPE_LABELS[type]
          const isSelected = selectedType === type
          return (
            <button
              key={type}
              onClick={() => {
                setSelectedType(type)
                setGeneratedImage(null)
              }}
              className={`rounded-xl p-2.5 text-center transition-all border ${
                isSelected
                  ? 'bg-amber-100 border-amber-400 shadow-sm'
                  : 'bg-white border-amber-100 hover:border-amber-300'
              }`}
            >
              <div className="text-lg mb-0.5">{info.emoji}</div>
              <div className={`text-xs font-semibold ${isSelected ? 'text-amber-800' : 'text-gray-600'}`}>
                {info.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected type desc */}
      <p className="text-xs text-center text-amber-700/60">{TYPE_LABELS[selectedType].desc}</p>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-600 hover:to-yellow-500 text-white font-bold shadow-md rounded-xl py-5"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            이미지 생성 중...
          </>
        ) : generatedImage ? (
          <>
            <RefreshCw className="w-4 h-4 mr-2" />
            다시 생성하기
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            이미지 생성하기
          </>
        )}
      </Button>

      {/* Loading Animation */}
      <AnimatePresence>
        {isGenerating && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center space-y-2">
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                    className="w-1.5 h-6 rounded-full bg-gradient-to-t from-amber-400 to-yellow-300"
                  />
                ))}
              </div>
              <p className="text-xs text-amber-700">AI가 {TYPE_LABELS[selectedType].label}을 그리고 있습니다...</p>
              <p className="text-xs text-amber-500/60">약 10-20초 소요됩니다</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generated Image */}
      <AnimatePresence>
        {generatedImage && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="space-y-3"
          >
            <div className="relative rounded-2xl overflow-hidden border-2 border-amber-200 shadow-lg">
              {/* AI-generated image: may be a base64 data: URI or an opaque external URL.
                  Next.js <Image> does not support data: URIs, so <img> is intentional. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={generatedImage}
                alt={`해화당 ${TYPE_LABELS[selectedType].label}`}
                width={600}
                height={320}
                loading="lazy"
                decoding="async"
                className="w-full object-contain max-h-80"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/40 to-transparent px-3 py-2">
                <p className="text-white text-xs font-medium">해화당 {TYPE_LABELS[selectedType].label}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Download className="w-4 h-4 mr-1.5" />
                저장하기
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="border-amber-200 text-amber-700 hover:bg-amber-50"
              >
                <Share2 className="w-4 h-4 mr-1.5" />
                공유하기
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
