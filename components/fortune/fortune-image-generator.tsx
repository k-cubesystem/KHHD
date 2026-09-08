'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, Share2, Loader2, ImageIcon, RefreshCw, Shield, CreditCard, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { generateFortuneImage, FortuneImageType, FortuneImageContext } from '@/app/actions/ai/generate-image'
import { AI_DISCLOSURE_MARK, AI_DISCLOSURE_TEXT } from '@/components/shared/ServiceDisclaimer'
import { logger } from '@/lib/utils/logger'

interface FortuneImageGeneratorProps {
  context?: FortuneImageContext
  defaultType?: FortuneImageType
  /** Show as inline section (default) or compact button-only */
  variant?: 'inline' | 'compact'
}

const TYPE_ICONS: Record<FortuneImageType, typeof Shield> = {
  talisman: Shield,
  card: CreditCard,
  illustration: Palette,
}

const TYPE_LABELS: Record<FortuneImageType, { label: string; desc: string }> = {
  talisman: { label: '나만의 부적', desc: '재앙을 막고 복을 불러오는 전통 부적' },
  card: { label: '운세 카드', desc: '이달의 운세를 담은 아름다운 카드' },
  illustration: { label: '사주 일러스트', desc: '팔자를 우주로 표현한 신비로운 그림' },
}

/**
 * AI기본법 §31② — 저장·공유된 그림 파일은 앱 밖으로 나가고 화면 캡션은 따라가지 않는다.
 * 가이드라인이 「외부 반출 시 결과물 자체에 표시」로 구분한 지점이라 그림에 캡션을 태워 보낸다
 * (시행령 §23②1호 「사람이 인식할 수 있는 방법」 = 가시 워터마크).
 *
 * blob: URL 로 되돌려 그리므로 캔버스가 오염되지 않는다 — 원본이 외부 Storage URL 이어도 된다.
 * 실패하면 원본을 그대로 돌려준다: 표시를 못 태웠다고 저장 자체를 막을 일은 아니다.
 */
async function burnDisclosure(blob: Blob): Promise<Blob> {
  const objectUrl = URL.createObjectURL(blob)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('generated image decode failed'))
      el.src = objectUrl
    })

    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return blob
    ctx.drawImage(img, 0, 0)

    const pad = Math.max(8, Math.round(canvas.width * 0.022))
    const fontSize = Math.max(13, Math.round(canvas.width * 0.03))
    ctx.font = `${fontSize}px sans-serif`
    ctx.textAlign = 'right'
    ctx.textBaseline = 'alphabetic'
    const textWidth = ctx.measureText(AI_DISCLOSURE_MARK).width

    // 어떤 그림 위에서도 읽히도록 반투명 판을 깔고 흰 글씨를 얹는다
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(
      canvas.width - textWidth - pad * 2.4,
      canvas.height - fontSize - pad * 1.6,
      textWidth + pad * 2.4,
      fontSize + pad * 1.6
    )
    ctx.fillStyle = 'rgba(255,255,255,0.94)'
    ctx.fillText(AI_DISCLOSURE_MARK, canvas.width - pad * 1.2, canvas.height - pad * 0.7)

    const marked = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
    return marked ?? blob
  } catch (error) {
    logger.warn('[FortuneImageGenerator] AI 표시 소각 실패 — 원본으로 내보냄:', error)
    return blob
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
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
  const [_isExpanded, setIsExpanded] = useState(false)

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

  /** 생성 결과를 blob 으로 — base64 응답과 Storage URL 응답 두 경로를 하나로 모은다. */
  async function toBlob(): Promise<Blob> {
    if (imageSource === 'base64') {
      const [header, data] = generatedImage!.split(',')
      const mimeType = header.match(/:(.*?);/)?.[1] ?? 'image/png'
      const bytes = atob(data)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      return new Blob([arr], { type: mimeType })
    }
    const response = await fetch(generatedImage!)
    return response.blob()
  }

  async function handleDownload() {
    if (!generatedImage) return

    try {
      const blob = await burnDisclosure(await toBlob())

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
      // AI기본법 §31② — 링크만 넘기면 표시 없는 원본이 나간다. 표시를 태운 «파일» 을 먼저 시도한다.
      if (navigator.share && navigator.canShare) {
        const file = new File([await burnDisclosure(await toBlob())], `haehwadang-${selectedType}.png`, {
          type: 'image/png',
        })
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `해화당 ${TYPE_LABELS[selectedType].label}`,
            text: '해화당에서 나만의 운세 이미지를 만들었어요!',
            files: [file],
          })
          return
        }
      }

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
        className="bg-gradient-to-r from-gold-500 to-gold-antique hover:from-gold-600 hover:to-gold-500 text-ink-900 font-semibold shadow-md"
        disabled={isGenerating}
      >
        {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
        나만의 운세 이미지 생성
      </Button>
    )
  }

  return (
    <div className="rounded-2xl border border-gold-300/50 bg-gradient-to-b from-gold-300/20 to-white p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gold-500 to-gold-300 flex items-center justify-center shadow-sm">
          <ImageIcon className="w-4 h-4 text-ink-900" />
        </div>
        <div>
          <h3 className="font-bold text-gold-700 text-sm">나만의 운세 이미지 생성</h3>
          <p className="text-xs text-gold-600/70">AI가 사주 정보로 개인 맞춤 이미지를 생성합니다</p>
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
                  ? 'bg-gold-300/60 border-gold-500 shadow-sm'
                  : 'bg-white border-gold-300/60 hover:border-gold-400'
              }`}
            >
              {(() => {
                const Icon = TYPE_ICONS[type]
                return <Icon className={`w-5 h-5 mx-auto mb-0.5 ${isSelected ? 'text-gold-600' : 'text-ink-900/60'}`} />
              })()}
              <div className={`text-xs font-semibold ${isSelected ? 'text-gold-700' : 'text-ink-900/70'}`}>
                {info.label}
              </div>
            </button>
          )
        })}
      </div>

      {/* Selected type desc */}
      <p className="text-xs text-center text-gold-600/60">{TYPE_LABELS[selectedType].desc}</p>

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-gradient-to-r from-gold-500 to-gold-antique hover:from-gold-600 hover:to-gold-500 text-ink-900 font-bold shadow-md rounded-xl py-5"
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
            <div className="rounded-xl bg-gold-300/20 border border-gold-300/60 p-4 text-center space-y-2">
              <div className="flex justify-center gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scaleY: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.12 }}
                    className="w-1.5 h-6 rounded-full bg-gradient-to-t from-gold-500 to-gold-300"
                  />
                ))}
              </div>
              <p className="text-xs text-gold-600">AI가 {TYPE_LABELS[selectedType].label}을 그리고 있습니다...</p>
              <p className="text-xs text-gold-500/60">약 10-20초 소요됩니다</p>
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
            <div className="relative rounded-2xl overflow-hidden border-2 border-gold-300 shadow-lg">
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
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
                <p className="text-white text-xs font-medium">해화당 {TYPE_LABELS[selectedType].label}</p>
                {/* AI기본법 §31② 화면 표시. 이 카드는 밝은 배경이라 ServiceDisclaimer 의 색이
                    보이지 않는다 — 그림 위 어두운 띠에 얹고 문안만 단일 출처에서 가져온다.
                    저장·공유되는 파일에는 burnDisclosure 가 따로 태운다. */}
                <p className="text-white/85 text-[11px] font-light leading-snug">{AI_DISCLOSURE_TEXT.image}</p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                size="sm"
                className="border-gold-300 text-gold-600 hover:bg-gold-300/20"
              >
                <Download className="w-4 h-4 mr-1.5" />
                저장하기
              </Button>
              <Button
                onClick={handleShare}
                variant="outline"
                size="sm"
                className="border-gold-300 text-gold-600 hover:bg-gold-300/20"
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
