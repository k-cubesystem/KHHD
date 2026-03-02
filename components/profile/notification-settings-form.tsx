'use client'

import { useState } from 'react'
import { Bell, BellOff, MessageSquare, Calendar, CreditCard, Send, Loader2, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  saveNotificationPreferences,
  sendTestAlimtalk,
  type NotificationPreferences,
} from '@/app/actions/core/notification'

interface NotificationSettingsFormProps {
  initialPrefs: NotificationPreferences
}

export function NotificationSettingsForm({ initialPrefs }: NotificationSettingsFormProps) {
  const [phoneNumber, setPhoneNumber] = useState(
    initialPrefs.phone_number ? initialPrefs.phone_number.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3') : ''
  )
  const [alimtalkEnabled, setAlimtalkEnabled] = useState(initialPrefs.alimtalk_enabled)
  const [dailyFortuneEnabled, setDailyFortuneEnabled] = useState(initialPrefs.daily_fortune_enabled)
  const [attendanceEnabled, setAttendanceEnabled] = useState(initialPrefs.attendance_reward_enabled)
  const [paymentEnabled, setPaymentEnabled] = useState(initialPrefs.payment_enabled)

  const [isSaving, setIsSaving] = useState(false)
  const [isTesting, setIsTesting] = useState(false)

  // 마스터 스위치 OFF 시 하위 항목 모두 비활성화
  const handleMasterToggle = (enabled: boolean) => {
    setAlimtalkEnabled(enabled)
    if (!enabled) {
      setDailyFortuneEnabled(false)
      setAttendanceEnabled(false)
      setPaymentEnabled(false)
    }
  }

  const handlePhoneInput = (value: string) => {
    // 숫자만 추출 후 하이픈 자동 추가
    const digits = value.replace(/\D/g, '').slice(0, 11)
    if (digits.length <= 3) setPhoneNumber(digits)
    else if (digits.length <= 7) setPhoneNumber(`${digits.slice(0, 3)}-${digits.slice(3)}`)
    else setPhoneNumber(`${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`)
  }

  const handleSave = async () => {
    // 전화번호 유효성 검사
    const digits = phoneNumber.replace(/-/g, '')
    if (alimtalkEnabled && (!digits || !/^01[0-9]{8,9}$/.test(digits))) {
      toast.error('올바른 전화번호를 입력해주세요. (010-XXXX-XXXX)')
      return
    }

    setIsSaving(true)
    try {
      const result = await saveNotificationPreferences({
        phone_number: digits || null,
        alimtalk_enabled: alimtalkEnabled,
        daily_fortune_enabled: dailyFortuneEnabled,
        attendance_reward_enabled: attendanceEnabled,
        payment_enabled: paymentEnabled,
      })

      if (result.success) {
        toast.success('알림 설정이 저장되었습니다.')
      } else {
        toast.error('저장 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch {
      toast.error('저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleTest = async () => {
    setIsTesting(true)
    try {
      const result = await sendTestAlimtalk()
      if (result.success) {
        toast.success('테스트 알림톡이 발송되었습니다.')
      } else {
        toast.error('발송 실패: ' + (result.error || '알 수 없는 오류'))
      }
    } catch {
      toast.error('테스트 발송 중 오류가 발생했습니다.')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* 마스터 스위치 + 전화번호 */}
      <Card className="bg-surface/30 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-serif font-light text-ink-light flex items-center gap-2">
            {alimtalkEnabled ? (
              <Bell className="w-4 h-4 text-primary" strokeWidth={1} />
            ) : (
              <BellOff className="w-4 h-4 text-ink-light/40" strokeWidth={1} />
            )}
            카카오 알림톡
          </CardTitle>
          <p className="text-xs text-ink-light/50 font-light mt-1">카카오톡으로 운세 소식과 중요 알림을 받아보세요</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* 마스터 토글 */}
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm font-light text-ink-light">알림톡 수신 동의</p>
              <p className="text-xs text-ink-light/50 font-light">모든 카카오 알림톡 수신을 제어합니다</p>
            </div>
            <Switch
              checked={alimtalkEnabled}
              onCheckedChange={handleMasterToggle}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* 전화번호 */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-light text-ink-light flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" strokeWidth={1} />
              전화번호
            </Label>
            <Input
              id="phone"
              type="tel"
              inputMode="numeric"
              value={phoneNumber}
              onChange={(e) => handlePhoneInput(e.target.value)}
              placeholder="010-0000-0000"
              className="bg-surface/50 border-primary/20 focus:border-primary font-sans font-light tracking-wider"
              disabled={!alimtalkEnabled}
            />
            <p className="text-xs text-ink-light/40 font-light">
              카카오 알림톡 수신에 사용할 휴대폰 번호를 입력해주세요
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 세부 알림 항목 */}
      <Card
        className={`bg-surface/30 border-primary/20 transition-opacity duration-200 ${
          !alimtalkEnabled ? 'opacity-40 pointer-events-none' : ''
        }`}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-serif font-light text-ink-light">알림 항목 선택</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 오늘의 운세 */}
          <div className="flex items-center justify-between py-1 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-4 h-4 text-primary" strokeWidth={1} />
              </div>
              <div>
                <p className="text-sm font-light text-ink-light">오늘의 운세</p>
                <p className="text-xs text-ink-light/50 font-light">매일 아침 오늘의 운세 요약</p>
              </div>
            </div>
            <Switch
              checked={dailyFortuneEnabled}
              onCheckedChange={setDailyFortuneEnabled}
              disabled={!alimtalkEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* 출석 보상 */}
          <div className="flex items-center justify-between py-1 border-b border-primary/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-primary" strokeWidth={1} />
              </div>
              <div>
                <p className="text-sm font-light text-ink-light">출석 보상</p>
                <p className="text-xs text-ink-light/50 font-light">출석 체크 복채 적립 알림</p>
              </div>
            </div>
            <Switch
              checked={attendanceEnabled}
              onCheckedChange={setAttendanceEnabled}
              disabled={!alimtalkEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* 복채 결제 */}
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="w-4 h-4 text-primary" strokeWidth={1} />
              </div>
              <div>
                <p className="text-sm font-light text-ink-light">복채 결제</p>
                <p className="text-xs text-ink-light/50 font-light">충전 및 사용 내역 알림</p>
              </div>
            </div>
            <Switch
              checked={paymentEnabled}
              onCheckedChange={setPaymentEnabled}
              disabled={!alimtalkEnabled}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </CardContent>
      </Card>

      {/* 액션 버튼 */}
      <div className="flex gap-3 pt-2">
        {/* 테스트 발송 */}
        <Button
          type="button"
          variant="outline"
          onClick={handleTest}
          disabled={isTesting || !alimtalkEnabled || !phoneNumber}
          className="flex-1 border-primary/30 text-ink-light hover:bg-primary/5"
        >
          {isTesting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1} />
          ) : (
            <Send className="w-4 h-4 mr-2" strokeWidth={1} />
          )}
          테스트 발송
        </Button>

        {/* 저장 */}
        <Button type="button" onClick={handleSave} disabled={isSaving} className="flex-1">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" strokeWidth={1} />
          ) : (
            <Bell className="w-4 h-4 mr-2" strokeWidth={1} />
          )}
          설정 저장
        </Button>
      </div>

      {/* 안내 문구 */}
      <div className="bg-primary/5 border border-primary/15 rounded-lg p-4">
        <p className="text-xs font-light text-ink-light/70 leading-relaxed">
          카카오 알림톡은 마케팅 목적이 아닌 서비스 안내 목적으로만 발송됩니다. 수신 동의 후 언제든지 설정에서 해제하실
          수 있습니다.
        </p>
      </div>
    </div>
  )
}
