'use client'

import { useRef, useState } from 'react'
import { logger } from '@/lib/utils/logger'
import { Button } from '@/components/ui/button'
import { Download, Share2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CanvasCardProps {
  data: {
    title: string
    name: string
    score?: number
    keyword?: string
    description: string
    date?: string
  }
  trigger?: React.ReactNode
}

export function CanvasCardGenerator({ data, trigger }: CanvasCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownload = async () => {
    if (!cardRef.current) return
    setIsGenerating(true)

    try {
      await document.fonts.ready // Wait for fonts
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(cardRef.current, {
        scale: 2, // Retina quality
        backgroundColor: '#0A0A0A', // Force background
        useCORS: true,
      })

      const link = document.createElement('a')
      link.download = `haehwadang-${data.name}-${Date.now()}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()

      toast.success('카드가 갤러리에 저장되었습니다.')
    } catch (error) {
      logger.error(error)
      toast.error('이미지 저장에 실패했습니다.')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <div onClick={handleDownload} className="cursor-pointer">
        {trigger || (
          <Button className="w-full btn-manse gap-2">
            <Download className="w-4 h-4" />
            이미지로 저장하기
          </Button>
        )}
      </div>

      {/* Hidden Capture Area (Fixed position off-screen) */}
      <div style={{ position: 'fixed', top: '-9999px', left: '-9999px' }}>
        {/* <div className="fixed top-20 left-20 z-50">  Debug mode */}
        <div
          ref={cardRef}
          className="w-[600px] h-[600px] bg-[#0A0A0A] relative flex flex-col items-center justify-between p-12 text-center overflow-hidden border-8 border-[#D4AF37]/20"
        >
          {/* Background Texture */}
          <div className="absolute inset-0 bg-noise-pattern opacity-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#D4AF37]/5 via-transparent to-[#D4AF37]/5" />

          {/* Header */}
          <div className="relative z-10 space-y-2">
            <p className="text-[#D4AF37] font-serif text-lg tracking-[0.3em] uppercase opacity-80">Haehwadang</p>
            <h1 className="text-4xl font-serif font-bold text-white tracking-widest">청담해화당</h1>
          </div>

          {/* Main Content */}
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="px-6 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10">
              <span className="text-[#D4AF37] font-bold tracking-widest text-xl">{data.title}</span>
            </div>

            {data.score ? (
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-serif font-bold text-[#D4AF37]">{data.score}</span>
                <span className="text-xl text-[#D4AF37]/60">점</span>
              </div>
            ) : data.keyword ? (
              <h2 className="text-4xl font-serif font-bold text-[#D4AF37] leading-tight my-4 break-keep">
                {data.keyword}
              </h2>
            ) : null}

            <div className="space-y-4 max-w-md">
              <p className="text-2xl text-white font-bold">&quot;{data.name}&quot;님의 운세</p>
              <p className="text-lg text-white/70 leading-relaxed font-serif break-keep">{data.description}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 w-full pt-8 border-t border-white/10 flex justify-between items-end">
            <div className="text-left">
              <p className="text-[#D4AF37]/60 text-sm font-serif">Premium Oriental Fortune</p>
              <p className="text-white/30 text-xs mt-1">{data.date || new Date().toLocaleDateString()}</p>
            </div>
            <div className="w-16 h-16 rounded-full border border-[#D4AF37]/30 flex items-center justify-center bg-[#D4AF37]/5">
              <Sparkles className="w-8 h-8 text-[#D4AF37]" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
