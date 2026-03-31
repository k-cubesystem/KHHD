declare global {
  interface Window {
    Kakao?: {
      init: (key: string) => void
      isInitialized: () => boolean
      Share: {
        sendDefault: (options: KakaoShareOptions) => void
      }
    }
  }
}

interface KakaoShareLink {
  webUrl: string
  mobileWebUrl: string
}

interface KakaoShareContent {
  title: string
  description: string
  imageUrl: string
  link: KakaoShareLink
}

interface KakaoShareButton {
  title: string
  link: KakaoShareLink
}

interface KakaoShareOptions {
  objectType: 'feed'
  content: KakaoShareContent
  buttons?: KakaoShareButton[]
}

const KAKAO_SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js'

let loadPromise: Promise<void> | null = null

export function loadKakaoSDK(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('SSR'))
      return
    }

    if (window.Kakao?.isInitialized()) {
      resolve()
      return
    }

    if (window.Kakao) {
      initKakao()
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = KAKAO_SDK_URL
    script.async = true
    script.onload = () => {
      initKakao()
      resolve()
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('카카오 SDK 로드 실패'))
    }
    document.head.appendChild(script)
  })

  return loadPromise
}

function initKakao() {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY
  if (!key || !window.Kakao) return
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(key)
  }
}

export async function shareKakao({
  title,
  description,
  imageUrl,
  webUrl,
  buttonTitle = '내 운명 보기',
}: {
  title: string
  description: string
  imageUrl: string
  webUrl: string
  buttonTitle?: string
}): Promise<boolean> {
  try {
    await loadKakaoSDK()

    if (!window.Kakao?.isInitialized()) {
      return false
    }

    const link = { webUrl, mobileWebUrl: webUrl }

    window.Kakao.Share.sendDefault({
      objectType: 'feed',
      content: { title, description, imageUrl, link },
      buttons: [{ title: buttonTitle, link }],
    })

    return true
  } catch {
    return false
  }
}
