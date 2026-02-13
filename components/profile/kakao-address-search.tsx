'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, MapPin } from 'lucide-react'
import { toast } from 'sonner'

interface KakaoAddressSearchProps {
  label: string
  value: string
  onChange: (address: string) => void
  placeholder?: string
}

export function KakaoAddressSearch({
  label,
  value,
  onChange,
  placeholder,
}: KakaoAddressSearchProps) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)

  useEffect(() => {
    // 카카??주소 검??API ?�크립트 로드
    const script = document.createElement('script')
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    script.onload = () => setIsScriptLoaded(true)
    script.onerror = () => {
      console.error('Failed to load Kakao address script')
      toast.error('주소 검???�비?��? 불러?????�습?�다.')
    }
    document.body.appendChild(script)

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleSearchAddress = () => {
    if (!isScriptLoaded) {
      toast.error('주소 검???�비?��? 로딩 중입?�다. ?�시 ???�시 ?�도?�주?�요.')
      return
    }

    // @ts-expect-error - Daum Postcode API
    new window.daum.Postcode({
      oncomplete: function (data: any) {
        // ?�용?��? ?�택??주소 ?�?�에 ?�라 ?�당 주소 값을 가?�온??
        let fullAddress = ''
        let extraAddress = ''

        if (data.userSelectedType === 'R') {
          // ?�로�?주소
          fullAddress = data.roadAddress
        } else {
          // 지�?주소
          fullAddress = data.jibunAddress
        }

        // 법정?�명???�을 경우 추�?
        if (data.bname !== '' && /[??�?가]$/g.test(data.bname)) {
          extraAddress += data.bname
        }
        // 건물명이 ?�고, 공동주택??경우 추�?
        if (data.buildingName !== '' && data.apartment === 'Y') {
          extraAddress += extraAddress !== '' ? ', ' + data.buildingName : data.buildingName
        }
        // ?�시??참고??��???�을 경우, 괄호까�? 추�???최종 문자?�을 만든??
        if (extraAddress !== '') {
          fullAddress += ' (' + extraAddress + ')'
        }

        onChange(fullAddress)
      },
      theme: {
        bgColor: '#0A0A0A', // 배경??
        searchBgColor: '#1A1A1A', // 검?�창 배경??
        contentBgColor: '#151515', // 본문 배경??
        pageBgColor: '#0A0A0A', // ?�이지 배경??
        textColor: '#E0E0E0', // 기본 ?�스???�상
        queryTextColor: '#FFFFFF', // 검?�창 ?�스???�상
        emphTextColor: '#D4AF37', // 강조 ?�스???�상 (Gold)
      },
    }).open()
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`address-${label}`} className="text-sm font-light text-ink-light">
        {label}
      </Label>
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <MapPin
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-light/40"
            strokeWidth={1}
          />
          <Input
            id={`address-${label}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-surface/50 border-primary/20 focus:border-primary font-light pl-10"
            placeholder={placeholder || '주소�?검?�하?�요'}
            readOnly
          />
        </div>
        <Button
          type="button"
          onClick={handleSearchAddress}
          variant="outline"
          className="px-4 flex-shrink-0"
          disabled={!isScriptLoaded}
        >
          <Search className="w-4 h-4 mr-1" strokeWidth={1} />
          검??
        </Button>
      </div>
      <p className="text-xs text-ink-light/40 font-light">
        카카??주소 검?�으�??�확??주소�??�력?�세??
      </p>
    </div>
  )
}
