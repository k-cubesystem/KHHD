'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { logger } from '@/lib/utils/logger'
import { Share2, Download, Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
interface ShareSaveButtonsProps {
  resultContainerId: string // DOM element ID to capture
  analysisTitle: string // e.g. "손금 분석 결과"
  memberName?: string
}

export function ShareSaveButtons({ resultContainerId, analysisTitle, memberName }: ShareSaveButtonsProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [isSharing, setIsSharing] = useState(false)

  const captureAsImage = async (): Promise<Blob | null> => {
    const element = document.getElementById(resultContainerId)
    if (!element) {
      toast.error('결과를 찾을 수 없습니다.')
      return null
    }

    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(element, {
        backgroundColor: '#0A192F',
        scale: 2, // Higher quality
        logging: false,
        useCORS: true,
      })

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob)
        }, 'image/png')
      })
    } catch (error) {
      logger.error('Screenshot error:', error)
      toast.error('이미지 생성 중 오류가 발생했습니다.')
      return null
    }
  }

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const blob = await captureAsImage()
      if (!blob) {
        setIsSaving(false)
        return
      }

      // Download as PNG
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      const filename = `${analysisTitle}_${memberName || '결과'}_${new Date().getTime()}.png`
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('이미지가 저장되었습니다!')
    } catch (error) {
      logger.error('Save error:', error)
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleShare = async () => {
    setIsSharing(true)

    try {
      const blob = await captureAsImage()
      if (!blob) {
        setIsSharing(false)
        return
      }

      // Web Share API (mobile-friendly)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `${analysisTitle}.png`, { type: 'image/png' })

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${analysisTitle} - 해화당`,
            text: memberName ? `${memberName}님의 ${analysisTitle}` : analysisTitle,
            files: [file],
          })
          toast.success('공유되었습니다!')
          return
        }
      }

      // Fallback: Copy to clipboard
      try {
        const item = new ClipboardItem({ 'image/png': blob })
        await navigator.clipboard.write([item])
        toast.success('이미지가 클립보드에 복사되었습니다! 카카오톡에 붙여넣기 하세요.')
      } catch (clipboardError) {
        logger.error('Clipboard error:', clipboardError)
        // Final fallback: download
        handleSave()
      }
    } catch (error) {
      logger.error('Share error:', error)
      toast.error('공유 중 오류가 발생했습니다.')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Card className="card-glass-manse p-4 border-[#D4AF37]/20">
      <div className="flex gap-3">
        <Button
          onClick={handleShare}
          disabled={isSharing || isSaving}
          className="flex-1 bg-[#D4AF37] text-[#0A192F] hover:bg-[#F4E4BA] font-semibold"
        >
          {isSharing ? (
            <>로딩 중...</>
          ) : (
            <>
              <Share2 className="w-4 h-4 mr-2" />
              카카오톡 공유
            </>
          )}
        </Button>

        <Button
          onClick={handleSave}
          disabled={isSharing || isSaving}
          variant="outline"
          className="flex-1 border-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/10"
        >
          {isSaving ? (
            <>저장 중...</>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              이미지 저장
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-white/40 text-center mt-3 font-sans">
        💡 모바일에서는 공유하기 버튼으로 카카오톡에 바로 전송할 수 있습니다
      </p>
    </Card>
  )
}
