'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Sparkles,
  Upload,
  ChevronRight,
  Check,
  CreditCard,
  Loader2,
  User,
  Users,
  Heart,
  Briefcase,
  MapPin,
  Search,
} from 'lucide-react'
import Image from 'next/image'
import { PaymentWidget } from '@/components/payment/payment-widget'
import { startFateAnalysis } from '@/app/actions/core/analysis'
import { getWalletBalance } from '@/app/actions/payment/wallet'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { DestinyTarget } from '@/app/actions/user/destiny'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTargetImageUrl } from '@/lib/domain/destiny/destiny-utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import DaumPostcode from 'react-daum-postcode'

interface AnalysisFormProps {
  targets: DestinyTarget[]
  initialTargetId?: string | null
}

export function AnalysisForm({ targets, initialTargetId }: AnalysisFormProps) {
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [isGuest, setIsGuest] = useState(false)
  const [step, setStep] = useState(initialTargetId ? 2 : 1) // Skip Step 1 if targetId exists
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(initialTargetId || null)
  const [facePreview, setFacePreview] = useState<string | null>(null)
  const [handPreview, setHandPreview] = useState<string | null>(null)
  const [faceFile, setFaceFile] = useState<File | null>(null)
  const [handFile, setHandFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [availableCredits, setAvailableCredits] = useState<number>(0)
  const [isLoadingCredits, setIsLoadingCredits] = useState(true)
  const [showAddressSearch, setShowAddressSearch] = useState(false)
  const [address, setAddress] = useState('')

  const faceInputRef = useRef<HTMLInputElement>(null)
  const handInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setIsMounted(true)
    checkAuthAndCredits()
  }, [])

  const checkAuthAndCredits = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsGuest(!user)
    if (user) {
      checkCredits()
    } else {
      setIsLoadingCredits(false)
    }
  }

  const checkCredits = async () => {
    setIsLoadingCredits(true)
    try {
      const credits = await getWalletBalance()
      setAvailableCredits(credits)
    } catch (err) {
      console.error('Failed to check credits', err)
    } finally {
      setIsLoadingCredits(false)
    }
  }

  if (!isMounted) {
    return <div className="w-full h-96 bg-white/5 animate-pulse rounded-2xl" />
  }

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void,
    setFile: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setPreview(url)
      setFile(file)
    } else {
      setPreview(null)
      setFile(null)
    }
  }

  const handleNext = () => {
    if (step === 1 && !selectedTargetId) return
    setStep((prev) => prev + 1)
  }

  const handleAddressComplete = (data: any) => {
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

    setAddress(fullAddress)
    setShowAddressSearch(false)
    toast.success('주소가 입력되었습니다.')
  }

  const handleStartAnalysis = async () => {
    if (isGuest) {
      toast.error('로그인이 필요한 기능입니다.')
      router.push('/auth/sign-up')
      return
    }

    if (!selectedTargetId) return

    if (availableCredits <= 0) {
      setShowPayment(true)
      return
    }

    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('memberId', selectedTargetId)
      if (address) formData.append('homeAddress', address)

      // 실제 File 객체 추가
      if (faceFile) {
        formData.append('faceImage', faceFile)
        console.log('[Form] Face image added to FormData:', faceFile.name)
      }
      if (handFile) {
        formData.append('handImage', handFile)
        console.log('[Form] Hand image added to FormData:', handFile.name)
      }

      await startFateAnalysis(formData)
      toast.success('분석이 시작되었습니다. 잠시 후 결과 페이지로 이동합니다.')
      window.location.href = '/protected/history'
    } catch (error: any) {
      toast.error(error.message || '분석 시작 중 오류가 발생했습니다.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-12 px-4 relative z-20">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex flex-col items-center gap-2 relative">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-500 border-2 relative z-10',
                step >= s
                  ? 'bg-gold-500 text-ink-950 border-gold-400 shadow-[0_0_20px_rgba(197,160,89,0.4)]'
                  : 'bg-ink-900 text-stone-600 border-white/5'
              )}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
            <span
              className={cn(
                'text-[10px] uppercase tracking-widest font-bold transition-all duration-300 absolute -bottom-6 whitespace-nowrap',
                step >= s ? 'text-gold-500' : 'text-stone-700'
              )}
            >
              {s === 1 ? '대상 선택' : s === 2 ? '관상/손금' : '최종 확인'}
            </span>
          </div>
        ))}
        {/* Connecting Lines */}
        <div className="absolute top-5 left-0 w-full h-[2px] bg-ink-800 -z-10" />
        <div
          className="absolute top-5 left-0 h-[2px] bg-gold-500/50 -z-10 transition-all duration-500"
          style={{ width: `${((step - 1) / 2) * 100}%` }}
        />
      </div>

      <div className="relative min-h-[400px]">
        {/* Step 1: Target Selection */}
        <div
          className={cn(
            'space-y-6 transition-all duration-500',
            step === 1
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 -translate-x-10 fixed top-0 pointer-events-none'
          )}
        >
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-serif font-bold text-stone-100">
              누구의 운명을 분석하시겠습니까?
            </h2>
            <p className="text-stone-400 text-sm font-light">
              등록된 본인 및 가족/지인 목록에서 선택하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {targets.length > 0 ? (
              targets.map((target) => {
                const imageUrl = getTargetImageUrl(target)
                const RelationIcon =
                  target.target_type === 'self'
                    ? User
                    : target.relation_type.includes('가족')
                      ? Users
                      : target.relation_type.includes('연인') ||
                          target.relation_type.includes('배우자')
                        ? Heart
                        : target.relation_type.includes('직장') ||
                            target.relation_type.includes('동료')
                          ? Briefcase
                          : User

                return (
                  <div
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={cn(
                      'cursor-pointer p-5 rounded-2xl border transition-all duration-300 flex items-center gap-4 group hover:scale-[1.02] glass-panel',
                      selectedTargetId === target.id
                        ? 'bg-gold-500/10 border-gold-500/50 shadow-[0_0_20px_rgba(197,160,89,0.15)]'
                        : 'bg-ink-900/40 border-white/5 hover:border-gold-500/30'
                    )}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={imageUrl || undefined} alt={target.name} />
                      <AvatarFallback
                        className={cn(
                          'text-lg font-serif font-bold transition-colors',
                          selectedTargetId === target.id
                            ? 'bg-gold-500 text-ink-950'
                            : 'bg-ink-950 text-stone-500 group-hover:text-gold-500'
                        )}
                      >
                        {target.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            'font-bold text-lg transition-colors',
                            selectedTargetId === target.id
                              ? 'text-gold-400'
                              : 'text-stone-200 group-hover:text-stone-100'
                          )}
                        >
                          {target.name}
                        </p>
                        {target.target_type === 'self' && (
                          <span className="px-2 py-0.5 bg-gold-500/20 border border-gold-500/50 text-gold-400 text-[10px] font-bold rounded">
                            본인
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <RelationIcon className="w-3 h-3 text-stone-500" />
                        <p className="text-xs text-stone-500">
                          {target.relation_type}
                          {target.birth_date && ` · ${target.birth_date}`}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-2 text-center py-12 rounded-2xl border border-dashed border-stone-800 bg-ink-900/20 text-stone-500">
                등록된 대상이 없습니다. <br />
                <span
                  className="text-gold-500 underline cursor-pointer"
                  onClick={() => router.push('/protected/family')}
                >
                  가족 관리
                </span>{' '}
                메뉴에서 먼저 등록해주세요.
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Image Upload */}
        <div
          className={cn(
            'space-y-6 transition-all duration-500',
            step === 2
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-10 fixed top-0 pointer-events-none'
          )}
        >
          <div className="text-center space-y-2 mb-8">
            <h2 className="text-3xl font-serif font-bold text-stone-100">천지인(天地人)의 완성</h2>
            <p className="text-stone-400 text-sm font-light">
              관상과 손금을 분석하여 <span className="text-gold-400 font-bold">정확도 30%</span>를
              높입니다.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Face Upload */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-gold-500/70 block text-center">
                관상 (선택)
              </Label>
              <div
                onClick={() => faceInputRef.current?.click()}
                className="aspect-[3/4] rounded-2xl border border-dashed border-stone-700 hover:border-gold-500/50 cursor-pointer flex flex-col items-center justify-center gap-3 bg-ink-900/30 hover:bg-gold-500/5 transition-all overflow-hidden relative group glass-panel"
              >
                {facePreview ? (
                  <Image
                    src={facePreview as string}
                    alt="Face"
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-ink-950 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shadow-lg">
                      <Upload className="w-6 h-6 text-stone-500 group-hover:text-gold-500 transition-colors" />
                    </div>
                    <span className="text-xs text-stone-500">얼굴 정면 사진</span>
                  </>
                )}
              </div>
              <input
                type="file"
                name="faceImage"
                ref={faceInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setFacePreview, setFaceFile)}
              />
              {facePreview && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFacePreview(null)
                      setFaceFile(null)
                      if (faceInputRef.current) faceInputRef.current.value = ''
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 h-6 hover:bg-rose-950/20"
                  >
                    사진 삭제
                  </Button>
                </div>
              )}
            </div>

            {/* Hand Upload */}
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase tracking-widest text-gold-500/70 block text-center">
                손금 (선택)
              </Label>
              <div
                onClick={() => handInputRef.current?.click()}
                className="aspect-[3/4] rounded-2xl border border-dashed border-stone-700 hover:border-gold-500/50 cursor-pointer flex flex-col items-center justify-center gap-3 bg-ink-900/30 hover:bg-gold-500/5 transition-all overflow-hidden relative group glass-panel"
              >
                {handPreview ? (
                  <Image
                    src={handPreview as string}
                    alt="Hand"
                    fill
                    className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-ink-950 flex items-center justify-center border border-white/5 group-hover:scale-110 transition-transform shadow-lg">
                      <Upload className="w-6 h-6 text-stone-500 group-hover:text-gold-500 transition-colors" />
                    </div>
                    <span className="text-xs text-stone-500">손바닥 전체 사진</span>
                  </>
                )}
              </div>
              <input
                type="file"
                name="handImage"
                ref={handInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleFileChange(e, setHandPreview, setHandFile)}
              />
              {handPreview && (
                <div className="text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setHandPreview(null)
                      setHandFile(null)
                      if (handInputRef.current) handInputRef.current.value = ''
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 h-6 hover:bg-rose-950/20"
                  >
                    사진 삭제
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Confirmation */}
        <div
          className={cn(
            'space-y-6 transition-all duration-500',
            step === 3
              ? 'opacity-100 translate-x-0'
              : 'opacity-0 translate-x-10 fixed top-0 pointer-events-none'
          )}
        >
          {!showPayment ? (
            <>
              <div className="text-center space-y-2 mb-8">
                <h2 className="text-3xl font-serif font-bold text-stone-100">
                  마지막 단계: 지기(地氣) 보정
                </h2>
                <p className="text-stone-400 text-sm font-light">
                  당신이 머무는 공간의 에너지를 분석에 반영합니다.
                </p>
              </div>

              {/* 스토리텔링 설명 */}
              <div className="glass-panel p-6 rounded-xl bg-gold-500/5 border border-gold-500/20 mb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-gold-400" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-gold-400 tracking-wide">
                      왜 위치 정보가 필요한가요?
                    </h3>
                    <p className="text-sm text-stone-300 leading-relaxed">
                      천지인(天地人) 분석에서{' '}
                      <span className="text-gold-400 font-medium">地(땅)</span>는 당신이 머무는
                      공간의 기운을 의미합니다. 집, 사무실, 출장지, 행사장... 장소가 바뀔 때마다
                      땅의 기운도 함께 변합니다.
                    </p>
                    <p className="text-sm text-stone-400 leading-relaxed">
                      지금 이 순간,{' '}
                      <span className="text-stone-200 font-medium">당신이 서 있는 곳</span>이 운명의
                      흐름에 영향을 줍니다. 현재 위치를 입력하시면 더욱 정밀한 분석이 가능합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-panel p-8 rounded-2xl space-y-8 border-gold-500/10">
                <div className="space-y-3">
                  <Label
                    htmlFor="address"
                    className="text-xs font-bold uppercase text-gold-500 tracking-wider flex items-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    현재 위치 / 거주지 / 사무실 주소 (선택)
                  </Label>
                  <div className="relative">
                    <Input
                      id="address"
                      name="homeAddress"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="출장지, 행사장, 집, 사무실 등 현재 머무는 곳을 입력하세요"
                      className="bg-ink-950/50 border-white/10 focus:border-gold-500/50 h-14 text-base text-stone-200 placeholder:text-stone-600 rounded-lg shadow-inner pr-32"
                    />
                    <Button
                      type="button"
                      onClick={() => setShowAddressSearch(true)}
                      variant="ghost"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-10 px-4 bg-gold-500/10 hover:bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:border-gold-500/50"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      주소 찾기
                    </Button>
                  </div>
                  <p className="text-xs text-stone-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    출장, 행사 등으로 위치가 바뀌면 다시 분석해보세요
                  </p>
                </div>

                <div className="pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-stone-500 font-medium">분석 대상</span>
                    <span className="font-bold text-lg text-stone-200 font-serif">
                      {targets.find((t) => t.id === selectedTargetId)?.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-stone-500 font-medium">보유 크레딧</span>
                    <div className="flex items-center gap-2">
                      {isLoadingCredits ? (
                        <Loader2 className="w-3 h-3 animate-spin text-stone-500" />
                      ) : (
                        <span
                          className={cn(
                            'font-black text-lg tabular-nums',
                            availableCredits > 0 ? 'text-gold-400' : 'text-rose-400'
                          )}
                        >
                          {availableCredits}{' '}
                          <span className="text-xs font-normal text-stone-500">Credits</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="bg-ink-950/30 p-3 rounded-lg flex items-center justify-between border border-white/5">
                      <span className="text-xs text-stone-500">관상</span>
                      {facePreview ? (
                        <Check className="w-4 h-4 text-gold-500" />
                      ) : (
                        <span className="text-xs text-stone-700">-</span>
                      )}
                    </div>
                    <div className="bg-ink-950/30 p-3 rounded-lg flex items-center justify-between border border-white/5">
                      <span className="text-xs text-stone-500">손금</span>
                      {handPreview ? (
                        <Check className="w-4 h-4 text-gold-500" />
                      ) : (
                        <span className="text-xs text-stone-700">-</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <PaymentWidget
              memberId={selectedTargetId!}
              homeAddress={address}
              onCancel={() => setShowPayment(false)}
            />
          )}
        </div>

        {/* Footer Actions */}
        {!showPayment && (
          <div className="flex justify-between mt-12 pt-6 border-t border-white/5">
            {step > 1 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((prev) => prev - 1)}
                disabled={isSubmitting}
                className="text-stone-500 hover:text-gold-500 hover:bg-transparent pl-0"
              >
                이전 단계
              </Button>
            )}

            <div className="ml-auto">
              {step < 3 ? (
                <Button
                  type="button"
                  onClick={handleNext}
                  disabled={step === 1 && !selectedTargetId}
                  className="bg-stone-200 text-ink-950 hover:bg-white font-bold px-8 rounded-full h-12 shadow-lg hover:shadow-xl transition-all"
                >
                  다음 <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleStartAnalysis}
                  disabled={isSubmitting || isLoadingCredits}
                  className="bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 font-bold px-10 h-14 text-lg rounded-full shadow-[0_0_30px_rgba(197,160,89,0.3)] hover:shadow-[0_0_50px_rgba(197,160,89,0.5)] transition-all transform hover:-translate-y-1"
                >
                  {isGuest ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      로그인하고 분석 시작
                    </>
                  ) : availableCredits > 0 ? (
                    <>
                      <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                      천기 누설 시작하기
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5 mr-2" />
                      크레딧 충전하고 분석받기
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mystic Loading Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950/90 backdrop-blur-xl animate-in fade-in duration-1000">
          <div className="relative">
            <div className="w-40 h-40 rounded-full border-t-2 border-gold-500 animate-spin" />
            <div
              className="w-40 h-40 rounded-full border-r-2 border-gold-500/30 animate-spin absolute top-0 left-0 reverse-spin"
              style={{ animationDirection: 'reverse', animationDuration: '3s' }}
            />
            <Sparkles className="w-12 h-12 text-gold-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
          </div>
          <h3 className="mt-10 text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold-300 via-gold-100 to-gold-300 animate-shimmer bg-[length:200%_auto]">
            우주의 기운을 계산중입니다...
          </h3>
          <p className="text-sm text-stone-500 mt-3 font-light">약 10~20초 정도 소요됩니다.</p>
        </div>
      )}

      {/* Address Search Modal */}
      <Dialog open={showAddressSearch} onOpenChange={setShowAddressSearch}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-white/10">
            <DialogTitle className="text-xl font-serif flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gold-500" />
              주소 검색
            </DialogTitle>
          </DialogHeader>
          <div className="p-2">
            <DaumPostcode
              onComplete={handleAddressComplete}
              autoClose={false}
              style={{ height: '500px' }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
