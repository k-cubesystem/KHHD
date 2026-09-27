'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Download, Monitor, Smartphone, X } from 'lucide-react'
import { toast } from 'sonner'
import { useHydrated } from '@/hooks/use-hydrated'

/** BeforeInstallPromptEvent -- not yet in lib.dom.d.ts */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
  prompt(): Promise<void>
}

interface Platform {
  isMobile: boolean
  isIOS: boolean
  /** 이미 홈 화면/앱으로 실행 중 — 설치 안내가 필요 없다 */
  isStandalone: boolean
}

const SSR_PLATFORM: Platform = { isMobile: false, isIOS: false, isStandalone: false }

/** UA·display-mode 판정. navigator 를 읽으므로 마운트 시 1회(lazy 초기화)만 호출한다. */
function detectPlatform(): Platform {
  if (typeof window === 'undefined') return SSR_PLATFORM
  const userAgent = window.navigator.userAgent.toLowerCase()
  return {
    isMobile: /iphone|ipad|ipod|android|blackberry|windows phone/.test(userAgent),
    isIOS: /iphone|ipad|ipod/.test(userAgent),
    isStandalone: window.matchMedia('(display-mode: standalone)').matches,
  }
}

/**
 * 로그인 뒤 도착하는 홈에서만 띄운다. 공개 화면에서는 로그인·Google 버튼, /story 하단 고정 버튼,
 * 웹툰 하단 탭 바를 덮었다 — 아직 아무것도 안 본 방문자에게 설치부터 권할 이유도 없다.
 */
const PROMPT_PATH = '/protected'

/** 닫으면 이 기간 동안 다시 띄우지 않는다 — 전에는 새로 들어올 때마다 다시 떴다. */
const DISMISS_KEY = 'hhd:pwa-install-dismissed-at'
const DISMISS_MS = 14 * 24 * 60 * 60 * 1000

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const at = Number(window.localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && at > 0 && Date.now() - at < DISMISS_MS
  } catch {
    return false
  }
}

function rememberDismissed(): void {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // 저장소가 막힌 브라우저 — 이번 방문 동안만 닫힌다.
  }
}

export function PWAInstallPrompt() {
  const pathname = usePathname()
  const hydrated = useHydrated()
  const [platform] = useState<Platform>(detectPlatform)
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(readDismissed)

  useEffect(() => {
    if (platform.isStandalone) return

    // Chrome/Android 만 발화. iOS 는 이 이벤트가 없어 아래 파생식에서 따로 처리한다.
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [platform.isStandalone])

  // 표시 여부는 상태가 아니라 파생값이다 — 설치 이벤트/플랫폼/닫기 셋으로 결정된다.
  const isVisible =
    hydrated &&
    !dismissed &&
    pathname === PROMPT_PATH &&
    !platform.isStandalone &&
    (deferredPrompt !== null || platform.isIOS)

  const handleDismiss = () => {
    rememberDismissed()
    setDismissed(true)
  }

  const handleInstallClick = async () => {
    if (platform.isIOS) {
      toast.info("화면 하단의 '공유' 버튼을 누르고 '홈 화면에 추가'를 선택하세요.", {
        duration: 5000,
        icon: <Smartphone className="w-5 h-5" />,
      })
      return
    }

    if (!deferredPrompt) {
      // Fallback if prompt is missing but user clicked button
      toast.error('설치 기능이 지원되지 않는 브라우저입니다.')
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      setDeferredPrompt(null)
      toast.success('앱이 설치되었습니다!')
    }
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed left-4 right-4 z-50 animate-in slide-in-from-bottom-5 duration-500"
      style={{ bottom: 'calc(60px + env(safe-area-inset-bottom, 0px) + 12px)' }}
    >
      <div className="mx-auto max-w-md bg-surface/90 backdrop-blur-md border border-gold-500/30 p-4 rounded-xl shadow-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-gold-500/20 p-2 rounded-lg">
            {platform.isMobile ? (
              <Smartphone className="w-6 h-6 text-gold-500" />
            ) : (
              <Monitor className="w-6 h-6 text-gold-500" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">
              {platform.isMobile ? '해화당 앱 설치하기' : 'PC 버전 설치하기'}
            </h3>
            <p className="text-xs text-ink-light/60">
              {platform.isMobile ? '홈 화면에 추가하여 더 빠르게 이용하세요' : '바탕화면에 바로가기를 만들어보세요'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleInstallClick}
            className="bg-gold-500 hover:bg-gold-300 text-black font-bold h-9 px-4"
          >
            <Download className="w-4 h-4 mr-2" />
            {platform.isIOS ? '안내' : '설치'}
          </Button>
          <button
            onClick={handleDismiss}
            aria-label="설치 안내 닫기"
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-ink-light/60" />
          </button>
        </div>
      </div>
    </div>
  )
}
