'use client'

import { useState } from 'react'
import { Sun, Moon, Bell, Clock, Check } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

export function NotificationSettings() {
  const [dailyFortune, setDailyFortune] = useState(false)
  const [specialEvents, setSpecialEvents] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleToggle = (setter: (value: boolean) => void, value: boolean) => {
    setter(value)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Daily Fortune Notification */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gold-500/10">
            <Sun className="w-5 h-5 text-gold-500" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="daily-fortune" className="font-bold cursor-pointer">
              매일 아침 운세 알림
            </Label>
            <p className="text-xs text-muted-foreground">매일 오전 7시에 오늘의 운세를 알려드립니다</p>
          </div>
        </div>
        <Switch
          id="daily-fortune"
          checked={dailyFortune}
          onCheckedChange={(value) => handleToggle(setDailyFortune, value)}
          className="data-[state=checked]:bg-gold-500"
        />
      </div>

      {/* Special Events Notification */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Moon className="w-5 h-5 text-primary" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="special-events" className="font-bold cursor-pointer">
              특별한 날 알림
            </Label>
            <p className="text-xs text-muted-foreground">절기, 길일, 생일 등 특별한 날에 알림을 받습니다</p>
          </div>
        </div>
        <Switch
          id="special-events"
          checked={specialEvents}
          onCheckedChange={(value) => handleToggle(setSpecialEvents, value)}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Notification Time Info */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-white/5">
        <Clock className="w-4 h-4" />
        <span>알림은 카카오톡 채널을 통해 발송됩니다. 채널 추가 후 이용 가능합니다.</span>
      </div>

      {/* Save Indicator */}
      {saved && (
        <div className="flex items-center justify-center gap-2 text-sm text-primary animate-in fade-in duration-200">
          <Check className="w-4 h-4" />
          <span>설정이 저장되었습니다</span>
        </div>
      )}
    </div>
  )
}
