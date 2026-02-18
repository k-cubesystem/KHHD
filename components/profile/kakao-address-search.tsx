'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Search, MapPin } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DaumPostcodeEmbed from 'react-daum-postcode'
import { cn } from '@/lib/utils'

interface KakaoAddressSearchProps {
  label: string
  value: string
  onChange: (address: string) => void
  placeholder?: string
  className?: string
}

export function KakaoAddressSearch({
  label,
  value,
  onChange,
  placeholder,
  className,
}: KakaoAddressSearchProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleComplete = (data: any) => {
    let fullAddress = data.address
    let extraAddress = ''

    if (data.addressType === 'R') {
      if (data.bname !== '') {
        extraAddress += data.bname
      }
      if (data.buildingName !== '') {
        extraAddress += extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName
      }
      fullAddress += extraAddress !== '' ? ` (${extraAddress})` : ''
    }

    onChange(fullAddress)
    setIsOpen(false)
  }

  return (
    <div className={cn('space-y-2', className)}>
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
            className="bg-surface/50 border-primary/20 focus:border-primary font-light !pl-10 h-12"
            placeholder={placeholder || '주소를 검색하세요'}
            readOnly
            onClick={() => setIsOpen(true)}
          />
        </div>
        <Button
          type="button"
          onClick={() => setIsOpen(true)}
          variant="outline"
          className="px-4 flex-shrink-0 h-12 border-primary/30 text-ink-light hover:bg-primary/10 hover:text-primary transition-all"
        >
          <Search className="w-4 h-4 mr-1" strokeWidth={1} />
          검색
        </Button>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-stone-900 border-primary/20 text-ink-light">
          <DialogHeader>
            <DialogTitle className="text-primary font-serif">주소 검색</DialogTitle>
          </DialogHeader>
          <div className="h-[400px] w-full border border-primary/10 rounded overflow-hidden">
            <DaumPostcodeEmbed
              onComplete={handleComplete}
              style={{ height: '100%', width: '100%' }}
              theme={{
                bgColor: '#0A0A0A',
                searchBgColor: '#1A1A1A',
                contentBgColor: '#151515',
                pageBgColor: '#0A0A0A',
                textColor: '#E0E0E0',
                queryTextColor: '#FFFFFF',
                emphTextColor: '#D4AF37',
                outlineColor: '#D4AF37',
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
