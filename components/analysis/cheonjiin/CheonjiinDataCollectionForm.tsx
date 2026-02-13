'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, MapPin, Camera, Hand, Search } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/destiny-targets'
import { useKakaoAddress } from '@/hooks/useKakaoAddress'

interface CheonjiinDataCollectionFormProps {
  target: DestinyTarget
  onComplete: (data: CollectedData) => void
}

export interface CollectedData {
  homeAddress: string
  workAddress: string
  faceImageUrl: string
  handImageUrl: string
}

export function CheonjiinDataCollectionForm({
  target,
  onComplete,
}: CheonjiinDataCollectionFormProps) {
  const [formData, setFormData] = useState({
    homeAddress: target.home_address || '',
    workAddress: '',
    faceImageUrl: target.face_image_url || '',
    handImageUrl: target.hand_image_url || '',
  })

  const [uploading, setUploading] = useState({
    face: false,
    hand: false,
  })

  // 카카오 주소 검색
  const { openAddressSearch, isLoading: kakaoLoading } = useKakaoAddress()

  const handleImageUpload = async (type: 'face' | 'hand', file: File) => {
    if (!file) return

    // 이미지 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.')
      return
    }

    // 이미지 타입 체크
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }

    setUploading((prev) => ({ ...prev, [type]: true }))

    try {
      // Base64로 변환 (임시 저장)
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string

        if (type === 'face') {
          setFormData((prev) => ({ ...prev, faceImageUrl: base64 }))
          toast.success('얼굴 사진이 업로드되었습니다.')
        } else {
          setFormData((prev) => ({ ...prev, handImageUrl: base64 }))
          toast.success('손금 사진이 업로드되었습니다.')
        }
      }
      reader.readAsDataURL(file)
    } catch (error) {
      toast.error('이미지 업로드에 실패했습니다.')
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }))
    }
  }

  // 카카오 주소 검색 핸들러
  const handleHomeAddressSearch = () => {
    openAddressSearch((address: string) => {
      setFormData((prev) => ({ ...prev, homeAddress: address }))
      toast.success('집 주소가 입력되었습니다.')
    })
  }

  const handleWorkAddressSearch = () => {
    openAddressSearch((address: string) => {
      setFormData((prev) => ({ ...prev, workAddress: address }))
      toast.success('회사 주소가 입력되었습니다.')
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 필수 데이터 검증
    if (!formData.homeAddress.trim()) {
      toast.error('집 주소를 입력해주세요.')
      return
    }

    if (!formData.faceImageUrl) {
      toast.error('얼굴 사진을 업로드해주세요.')
      return
    }

    // 손금은 선택사항이므로 검증 제거

    onComplete(formData)
  }

  const isValid = formData.homeAddress.trim() && formData.faceImageUrl

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-6">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#F4E5C3]/20 mx-auto mb-4 flex items-center justify-center text-4xl">
            ✨
          </div>
          <h1 className="text-3xl font-bold mb-2">{target.name}님의 천지인 분석</h1>
          <p className="text-muted-foreground">정확한 분석을 위해 아래 정보를 입력해주세요</p>
        </motion.div>

        {/* 안내 메시지 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6"
        >
          <h3 className="font-semibold mb-2 flex items-center gap-2">
            <span className="text-blue-600 dark:text-blue-400">ℹ️</span>
            천지인 분석이란?
          </h3>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6">
            <li>
              • <strong>천(天)</strong>: 사주 팔자로 타고난 운명 분석
            </li>
            <li>
              • <strong>지(地)</strong>: 주소 기반 풍수로 공간 기운 분석
            </li>
            <li>
              • <strong>인(人)</strong>: 관상으로 현재 운세 분석 (손금은 선택)
            </li>
          </ul>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
            💡 필수 정보: 집 주소, 얼굴 사진 / 선택 정보: 회사 주소, 손금 사진
          </p>
        </motion.div>

        {/* 폼 */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* 집 주소 (필수) - 카카오맵 */}
          <div className="bg-card p-6 rounded-lg border space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-[#D4AF37]" />
              <Label className="text-lg font-semibold">
                집 주소 <span className="text-red-500">*</span>
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="주소 검색 버튼을 클릭하세요"
                value={formData.homeAddress}
                readOnly
                className="text-base flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleHomeAddressSearch}
                disabled={kakaoLoading}
              >
                <Search className="w-4 h-4 mr-2" />
                주소 검색
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🗺️ 카카오맵으로 정확한 주소를 검색합니다 (풍수 분석용)
            </p>
          </div>

          {/* 회사 주소 (선택) - 카카오맵 */}
          <div className="bg-card p-6 rounded-lg border space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              <Label className="text-lg font-semibold">
                회사/학교 주소 <span className="text-gray-400">(선택)</span>
              </Label>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="주소 검색 버튼을 클릭하세요"
                value={formData.workAddress}
                readOnly
                className="text-base flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleWorkAddressSearch}
                disabled={kakaoLoading}
              >
                <Search className="w-4 h-4 mr-2" />
                주소 검색
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              🗺️ 업무/학업 공간의 기운도 함께 분석합니다
            </p>
          </div>

          {/* 얼굴 사진 (필수) */}
          <div className="bg-card p-6 rounded-lg border space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Camera className="w-5 h-5 text-[#D4AF37]" />
              <Label className="text-lg font-semibold">
                얼굴 사진 <span className="text-red-500">*</span>
              </Label>
            </div>

            {formData.faceImageUrl ? (
              <div className="space-y-3">
                <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-green-500">
                  <img
                    src={formData.faceImageUrl}
                    alt="얼굴 사진"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    ✓ 업로드 완료
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, faceImageUrl: '' }))}
                >
                  다시 선택
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-[#D4AF37]/50 transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <Label htmlFor="face-upload" className="cursor-pointer">
                  <span className="text-sm text-muted-foreground">
                    클릭하여 사진 업로드 (정면 얼굴)
                  </span>
                </Label>
                <Input
                  id="face-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload('face', file)
                  }}
                  disabled={uploading.face}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              • 정면을 바라보는 사진
              <br />
              • 이마, 눈썹, 눈, 코, 입이 명확하게 보여야 합니다
              <br />• 최대 5MB
            </p>
          </div>

          {/* 손금 사진 (선택) */}
          <div className="bg-card p-6 rounded-lg border space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Hand className="w-5 h-5 text-gray-500" />
              <Label className="text-lg font-semibold">
                손금 사진 <span className="text-gray-400">(선택)</span>
              </Label>
            </div>

            {formData.handImageUrl ? (
              <div className="space-y-3">
                <div className="relative w-full h-64 rounded-lg overflow-hidden border-2 border-green-500">
                  <img
                    src={formData.handImageUrl}
                    alt="손금 사진"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                    ✓ 업로드 완료
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormData((prev) => ({ ...prev, handImageUrl: '' }))}
                >
                  다시 선택
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center hover:border-[#D4AF37]/50 transition-colors">
                <Upload className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <Label htmlFor="hand-upload" className="cursor-pointer">
                  <span className="text-sm text-muted-foreground">
                    클릭하여 사진 업로드 (손바닥)
                  </span>
                </Label>
                <Input
                  id="hand-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload('hand', file)
                  }}
                  disabled={uploading.hand}
                />
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              • 손바닥을 펼친 사진 (오른손 권장)
              <br />
              • 생명선, 지능선, 감정선, 운명선이 선명하게 보여야 합니다
              <br />• 최대 5MB
            </p>
          </div>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            size="lg"
            className="w-full bg-gradient-to-r from-[#D4AF37] to-[#F4E5C3] hover:from-[#C5A028] hover:to-[#E5D6B4] text-black font-semibold"
            disabled={!isValid}
          >
            {isValid ? '천지인 분석 시작하기 ✨' : '모든 필수 정보를 입력해주세요'}
          </Button>

          {/* 안내 */}
          <p className="text-xs text-center text-muted-foreground">
            입력하신 정보는 분석에만 사용되며 안전하게 보호됩니다
          </p>
        </motion.form>
      </div>
    </div>
  )
}
