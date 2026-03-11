'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Upload, Search, MapPin, Camera, Hand } from 'lucide-react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { useKakaoAddress } from '@/hooks/use-kakao-address'

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

// 섹션 래퍼
function FormSection({
  index,
  icon: Icon,
  title,
  sub,
  badge,
  required,
  children,
}: {
  index: number
  icon: React.ElementType
  title: string
  sub: string
  badge: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl"
      style={{
        background: 'linear-gradient(160deg, #0f0c08 0%, #17130d 60%, #0a0807 100%)',
        border: required ? '1px solid rgba(212,175,55,0.22)' : '1px solid rgba(255,255,255,0.07)',
        boxShadow: required
          ? '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,175,55,0.05)'
          : '0 4px 20px rgba(0,0,0,0.3)',
      }}
    >
      {required && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.4), transparent)' }}
        />
      )}
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: required ? 'rgba(212,175,55,0.1)' : 'rgba(255,255,255,0.04)',
              border: required ? '1px solid rgba(212,175,55,0.25)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Icon
              className="w-4 h-4"
              strokeWidth={1.5}
              style={{ color: required ? '#D4AF37' : 'rgba(255,255,255,0.35)' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3
                className="font-serif font-medium"
                style={{ fontSize: '15px', color: required ? 'rgba(244,228,186,0.9)' : 'rgba(255,255,255,0.6)' }}
              >
                {title}
              </h3>
              <span
                className="text-[9px] px-2 py-0.5 rounded-full font-medium tracking-wide"
                style={{
                  background: required ? 'rgba(212,175,55,0.12)' : 'rgba(255,255,255,0.05)',
                  border: required ? '1px solid rgba(212,175,55,0.3)' : '1px solid rgba(255,255,255,0.1)',
                  color: required ? '#D4AF37' : 'rgba(255,255,255,0.3)',
                }}
              >
                {badge}
              </span>
            </div>
            <p className="text-[11.5px] font-light" style={{ color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>
              {sub}
            </p>
          </div>
        </div>
        {children}
      </div>
    </motion.div>
  )
}

export function CheonjiinDataCollectionForm({ target, onComplete }: CheonjiinDataCollectionFormProps) {
  const [formData, setFormData] = useState({
    homeAddress: target.home_address || '',
    workAddress: '',
    faceImageUrl: target.face_image_url || '',
    handImageUrl: target.hand_image_url || '',
  })
  const [uploading, setUploading] = useState({ face: false, hand: false })
  const { openAddressSearch, isLoading: kakaoLoading } = useKakaoAddress()

  const handleImageUpload = async (type: 'face' | 'hand', file: File) => {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('이미지 크기는 5MB 이하여야 합니다.')
      return
    }
    if (!file.type.startsWith('image/')) {
      toast.error('이미지 파일만 업로드 가능합니다.')
      return
    }
    setUploading((p) => ({ ...p, [type]: true }))
    try {
      const reader = new FileReader()
      reader.onloadend = () => {
        const base64 = reader.result as string
        if (type === 'face') {
          setFormData((p) => ({ ...p, faceImageUrl: base64 }))
          toast.success('관상 사진이 담겼습니다.')
        } else {
          setFormData((p) => ({ ...p, handImageUrl: base64 }))
          toast.success('손금 사진이 담겼습니다.')
        }
      }
      reader.readAsDataURL(file)
    } catch {
      toast.error('사진을 담는 데 실패했습니다.')
    } finally {
      setUploading((p) => ({ ...p, [type]: false }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.homeAddress.trim()) {
      toast.error('기운이 깃든 공간의 주소를 알려주세요.')
      return
    }
    if (!formData.faceImageUrl) {
      toast.error('하늘이 새긴 인상 사진을 올려주세요.')
      return
    }
    onComplete(formData)
  }

  const isValid = formData.homeAddress.trim() && formData.faceImageUrl

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #080604 0%, #0f0c08 50%, #080604 100%)' }}
    >
      <div className="max-w-xl mx-auto px-4 py-10 pb-28">
        {/* 헤더 */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10 space-y-3"
        >
          {/* 한자 원형 */}
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(212,175,55,0.08)',
                border: '1px solid rgba(212,175,55,0.3)',
                boxShadow: '0 0 30px rgba(212,175,55,0.12)',
              }}
            >
              <span style={{ fontFamily: 'serif', fontSize: '1.8rem', color: '#D4AF37' }}>命</span>
            </div>
          </div>

          <h1
            className="font-serif font-medium leading-tight"
            style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.92)', wordBreak: 'keep-all' }}
          >
            {target.name}님의{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #F4E4BA, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              천지인 운명
            </span>
            을<br />
            펼치기 전
          </h1>
          <p
            className="font-light leading-relaxed"
            style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', wordBreak: 'keep-all' }}
          >
            세 가지 진실이 하나로 모일 때,
            <br />
            운명의 전부가 드러납니다
          </p>

          {/* 天地人 미니 태그 */}
          <div className="flex items-center justify-center gap-2 pt-2">
            {[
              { char: '天', label: '사주' },
              { char: '地', label: '풍수' },
              { char: '人', label: '관상·손금' },
            ].map(({ char, label }) => (
              <div
                key={char}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px]"
                style={{
                  background: 'rgba(212,175,55,0.07)',
                  border: '1px solid rgba(212,175,55,0.18)',
                  color: 'rgba(212,175,55,0.7)',
                }}
              >
                <span style={{ fontFamily: 'serif' }}>{char}</span>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 집 주소 */}
          <FormSection
            index={0}
            icon={MapPin}
            title="나의 기운이 깃든 공간"
            sub="당신이 쉬고 잠드는 땅의 기운이 운명에 깊이 스며있습니다 (풍수지리)"
            badge="地 필수"
            required
          >
            <div className="flex gap-2">
              <input
                readOnly
                value={formData.homeAddress}
                placeholder="주소 검색으로 입력해주세요"
                className="flex-1 h-11 px-4 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: formData.homeAddress ? 'rgba(244,228,186,0.8)' : 'rgba(255,255,255,0.25)',
                }}
              />
              <button
                type="button"
                onClick={() =>
                  openAddressSearch((addr: string) => {
                    setFormData((p) => ({ ...p, homeAddress: addr }))
                    toast.success('공간의 기운을 담았습니다.')
                  })
                }
                disabled={kakaoLoading}
                className="flex items-center gap-1.5 px-4 h-11 rounded-xl text-[12px] font-medium flex-shrink-0"
                style={{
                  background: 'rgba(212,175,55,0.12)',
                  border: '1px solid rgba(212,175,55,0.3)',
                  color: '#D4AF37',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                검색
              </button>
            </div>
          </FormSection>

          {/* 직장/학교 주소 */}
          <FormSection
            index={1}
            icon={MapPin}
            title="낮의 기운이 머무는 곳"
            sub="깨어있는 시간을 보내는 공간도 당신의 운세에 영향을 줍니다"
            badge="地 선택"
          >
            <div className="flex gap-2">
              <input
                readOnly
                value={formData.workAddress}
                placeholder="직장·학교 주소 (선택)"
                className="flex-1 h-11 px-4 rounded-xl text-[13px] outline-none"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: formData.workAddress ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                }}
              />
              <button
                type="button"
                onClick={() =>
                  openAddressSearch((addr: string) => {
                    setFormData((p) => ({ ...p, workAddress: addr }))
                    toast.success('낮의 공간을 담았습니다.')
                  })
                }
                disabled={kakaoLoading}
                className="flex items-center gap-1.5 px-4 h-11 rounded-xl text-[12px] font-medium flex-shrink-0"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.4)',
                }}
              >
                <Search className="w-3.5 h-3.5" />
                검색
              </button>
            </div>
          </FormSection>

          {/* 얼굴 사진 */}
          <FormSection
            index={2}
            icon={Camera}
            title="하늘이 새긴 나의 인상"
            sub="이마부터 턱선까지, 삶의 궤적과 타고난 기운이 담겨 있습니다 (관상)"
            badge="人 필수"
            required
          >
            {formData.faceImageUrl ? (
              <div className="space-y-3">
                <div
                  className="relative w-full h-52 rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(212,175,55,0.3)' }}
                >
                  {/* base64 data: URI from FileReader — Next.js <Image> does not support data: URLs */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.faceImageUrl}
                    alt="관상 사진"
                    width={600}
                    height={208}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: 'rgba(212,175,55,0.9)', color: '#0a0807' }}
                  >
                    ✦ 담김 완료
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, faceImageUrl: '' }))}
                  className="text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  다시 선택하기
                </button>
              </div>
            ) : (
              <label htmlFor="face-upload" className="block cursor-pointer">
                <div
                  className="w-full rounded-xl p-8 text-center transition-all duration-300"
                  style={{ border: '1.5px dashed rgba(212,175,55,0.25)', background: 'rgba(212,175,55,0.03)' }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(212,175,55,0.4)' }} />
                  <p className="text-[13px] font-serif" style={{ color: 'rgba(244,228,186,0.6)' }}>
                    정면 얼굴 사진을 올려주세요
                  </p>
                  <p className="text-[11px] mt-1 font-light" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    이마·눈·코·입이 선명하게 보이는 사진 · 최대 5MB
                  </p>
                </div>
                <Input
                  id="face-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload('face', f)
                  }}
                  disabled={uploading.face}
                />
              </label>
            )}
          </FormSection>

          {/* 손금 사진 */}
          <FormSection
            index={3}
            icon={Hand}
            title="손에 새겨진 운명의 선"
            sub="오른 손바닥에 새겨진 생명선·지능선·운명선이 시간의 흔적을 말합니다"
            badge="人 선택"
          >
            {formData.handImageUrl ? (
              <div className="space-y-3">
                <div
                  className="relative w-full h-52 rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  {/* base64 data: URI from FileReader — Next.js <Image> does not support data: URLs */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={formData.handImageUrl}
                    alt="손금 사진"
                    width={600}
                    height={208}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                  <div
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-medium"
                    style={{ background: 'rgba(255,255,255,0.8)', color: '#0a0807' }}
                  >
                    ✦ 담김 완료
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData((p) => ({ ...p, handImageUrl: '' }))}
                  className="text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  다시 선택하기
                </button>
              </div>
            ) : (
              <label htmlFor="hand-upload" className="block cursor-pointer">
                <div
                  className="w-full rounded-xl p-8 text-center"
                  style={{ border: '1.5px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.02)' }}
                >
                  <Upload className="w-8 h-8 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <p className="text-[13px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    손바닥 사진을 올려주세요 (선택)
                  </p>
                  <p className="text-[11px] mt-1 font-light" style={{ color: 'rgba(255,255,255,0.2)' }}>
                    오른손 권장 · 선이 선명하게 보이는 사진 · 최대 5MB
                  </p>
                </div>
                <Input
                  id="hand-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleImageUpload('hand', f)
                  }}
                  disabled={uploading.hand}
                />
              </label>
            )}
          </FormSection>

          {/* 구분선 */}
          <div
            className="h-px"
            style={{ background: 'linear-gradient(90deg, transparent, rgba(212,175,55,0.25), transparent)' }}
          />

          {/* 제출 버튼 */}
          <motion.button
            type="submit"
            whileHover={isValid ? { scale: 1.015 } : {}}
            whileTap={isValid ? { scale: 0.975 } : {}}
            disabled={!isValid}
            className="relative overflow-hidden w-full h-14 rounded-xl font-serif font-bold tracking-[0.1em] text-[15px]"
            style={{
              background: isValid
                ? 'linear-gradient(105deg, #B8860B, #D4AF37 45%, #E2C55A 75%, #C9A227)'
                : 'rgba(255,255,255,0.06)',
              border: isValid ? '1px solid rgba(244,228,186,0.2)' : '1px solid rgba(255,255,255,0.08)',
              color: isValid ? '#0C0A07' : 'rgba(255,255,255,0.25)',
              boxShadow: isValid ? '0 4px 28px rgba(212,175,55,0.25)' : 'none',
              cursor: isValid ? 'pointer' : 'not-allowed',
            }}
          >
            {isValid ? '운명의 문을 열겠습니다 ✦' : '필수 정보를 모두 입력해주세요'}
          </motion.button>

          <p className="text-center text-[11px] font-light" style={{ color: 'rgba(255,255,255,0.18)' }}>
            입력하신 정보는 오직 운명 분석에만 사용되며 소중히 보호됩니다
          </p>
        </form>
      </div>
    </div>
  )
}
