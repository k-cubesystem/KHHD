import { useState, useCallback } from 'react'

/** Daum Postcode API 응답 데이터 */
interface DaumPostcodeData {
  roadAddress: string
  jibunAddress: string
  zonecode: string
  address: string
  addressType: string
  buildingName: string
}

/** Daum Postcode 생성자 옵션 */
interface DaumPostcodeOptions {
  oncomplete: (data: DaumPostcodeData) => void
  width?: string
  height?: string
}

/** Daum Postcode 인스턴스 */
interface DaumPostcodeInstance {
  open: () => void
}

/** Daum Postcode 생성자 */
interface DaumPostcodeConstructor {
  new (options: DaumPostcodeOptions): DaumPostcodeInstance
}

/** window.daum 확장 */
interface DaumWindow {
  daum?: {
    Postcode?: DaumPostcodeConstructor
  }
}

export function useKakaoAddress() {
  const [isLoading, setIsLoading] = useState(false)

  const loadKakaoScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 이미 로드되어 있으면 즉시 반환
      if ((window as unknown as DaumWindow).daum?.Postcode) {
        resolve()
        return
      }

      // 스크립트 로드
      const script = document.createElement('script')
      script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('카카오 주소 API 로드 실패'))
      document.body.appendChild(script)
    })
  }, [])

  const openAddressSearch = useCallback(
    async (onComplete: (address: string) => void) => {
      setIsLoading(true)

      try {
        await loadKakaoScript()

        const daumWindow = window as unknown as DaumWindow
        const PostcodeClass = daumWindow.daum?.Postcode
        if (!PostcodeClass) {
          throw new Error('카카오 주소 API가 로드되지 않았습니다.')
        }

        new PostcodeClass({
          oncomplete: function (data: DaumPostcodeData) {
            // 도로명 주소 우선, 없으면 지번 주소
            const fullAddress = data.roadAddress || data.jibunAddress
            onComplete(fullAddress)
          },
          width: '100%',
          height: '100%',
        }).open()
      } catch (error) {
        console.error('카카오 주소 검색 오류:', error)
      } finally {
        setIsLoading(false)
      }
    },
    [loadKakaoScript]
  )

  return {
    openAddressSearch,
    isLoading,
  }
}
