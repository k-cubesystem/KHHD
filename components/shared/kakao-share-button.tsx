'use client'

import { useState } from 'react'
import { MessageCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shareKakao } from '@/lib/kakao-sdk'
import { logger } from '@/lib/utils/logger'
import { GA } from '@/lib/analytics/ga4'

interface KakaoShareButtonProps {
  title: string
  description: string
  imageUrl: string
  webUrl: string
  buttonTitle?: string
  className?: string
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
}

export function KakaoShareButton({
  title,
  description,
  imageUrl,
  webUrl,
  buttonTitle,
  className,
  variant = 'default',
  size = 'default',
}: KakaoShareButtonProps) {
  const [sharing, setSharing] = useState(false)

  async function handleShare() {
    setSharing(true)
    try {
      const success = await shareKakao({ title, description, imageUrl, webUrl, buttonTitle })
      if (success) GA.shareKakao('saju')

      if (!success) {
        // SDK 로드 실패 시 Web Share API 폴백
        if (navigator.share) {
          await navigator.share({ title, text: description, url: webUrl })
        } else {
          await navigator.clipboard.writeText(webUrl)
        }
      }
    } catch (err) {
      logger.error('[KakaoShare] Failed:', err)
    } finally {
      setSharing(false)
    }
  }

  return (
    <Button
      onClick={handleShare}
      disabled={sharing}
      variant={variant}
      size={size}
      className={`gap-2 bg-[#FEE500] hover:bg-[#FDD800] text-[#191919] font-sans ${className ?? ''}`}
    >
      {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
      카카오톡 공유
    </Button>
  )
}
