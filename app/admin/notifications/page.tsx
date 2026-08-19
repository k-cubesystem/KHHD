'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { logger } from '@/lib/utils/logger'
import { Bell, Clock, Save, Loader2, Play } from 'lucide-react'
import { getNotificationSettings, updateNotificationSetting, getNotificationLogs, runManualAutomation } from './actions'
import { AdminPageHeader } from '@/components/admin/ui/page-header'
import { AdminCard } from '@/components/admin/ui/admin-card'

/** `notification_logs` + 조인된 회원. 화면이 실제로 읽는 필드만 적는다. */
interface NotificationLog {
  id: string
  sent_at: string
  status: string
  error_message: string | null
  profiles: { full_name: string | null; email: string | null } | null
}

const STATUS_CLS: Record<string, string> = {
  SENT: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  FAILED: 'bg-seal/15 text-seal border-seal/30',
}

export default function NotificationAdminPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const s = await getNotificationSettings()
      setSettings(s)
      const l = await getNotificationLogs()
      setLogs((l.data ?? []) as NotificationLog[])
    } catch (error) {
      logger.error(error)
      toast.error('데이터 로드 실패')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(key: string, value: string) {
    setSaving(true)
    const result = await updateNotificationSetting(key, value)
    if (result.success) {
      toast.success('설정이 저장되었습니다.')
      setSettings((prev) => ({ ...prev, [key]: value }))
    } else {
      toast.error('저장 실패')
    }
    setSaving(false)
  }

  async function handleManualRun() {
    if (!confirm('현재 활성화된 모든 구독자에게 운세를 즉시 발송합니다. 계속하시겠습니까?')) return

    setRunning(true)
    const result = await runManualAutomation()
    if (result.success) {
      toast.success(result.message)
      loadData()
    } else {
      toast.error('실행 실패: ' + result.message)
    }
    setRunning(false)
  }

  if (loading)
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gold-500" />
      </div>
    )

  return (
    <div className="space-y-4 md:space-y-6">
      <AdminPageHeader
        title="알림 및 자동화 관리"
        description="오늘의 운세 자동 발송 시각과 알림톡 템플릿. 발송 결과는 로그 탭에서 확인한다."
        icon={<Bell className="h-5 w-5 text-gold-500" aria-hidden />}
      />

      <Tabs defaultValue="settings">
        <TabsList className="border-white/[0.08] bg-surface/50">
          <TabsTrigger
            value="settings"
            className="text-xs data-[state=active]:bg-gold-500 data-[state=active]:text-ink-950 md:text-sm"
          >
            자동 발송 설정
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="text-xs data-[state=active]:bg-gold-500 data-[state=active]:text-ink-950 md:text-sm"
          >
            발송 로그
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-4 space-y-3">
          <AdminCard
            title="오늘의 운세 자동 발송"
            subtitle="매일 정해진 시각에 활성 구독자에게 나간다."
            icon={<Clock className="h-4 w-4 text-gold-500" aria-hidden />}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.08] bg-surface/50 p-3">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <Label className="font-sans text-xs font-bold text-ink-primary/85">자동 발송</Label>
                  <p className="font-sans text-[11px] text-ink-primary/40">끄면 아래 시각이 와도 나가지 않는다.</p>
                </div>
                <Switch
                  checked={settings['daily_fortune_enabled'] === 'true'}
                  onCheckedChange={(c) => handleSave('daily_fortune_enabled', String(c))}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="font-sans text-xs font-bold text-ink-primary/70">발송 시각 (KST)</Label>
                <div className="flex gap-2">
                  <Input
                    type="time"
                    value={settings['daily_fortune_time'] || '08:00'}
                    onChange={(e) => setSettings((prev) => ({ ...prev, daily_fortune_time: e.target.value }))}
                    className="h-9 w-32 border-white/[0.12] bg-surface/50 text-xs text-ink-primary/85 md:w-40"
                  />
                  <Button
                    onClick={() => handleSave('daily_fortune_time', settings['daily_fortune_time'])}
                    size="sm"
                    className="h-9 bg-gold-500 text-xs text-ink-950 hover:bg-gold-400"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />}
                    저장
                  </Button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-sans text-xs font-bold text-ink-primary/70">카카오 알림톡 템플릿 ID</Label>
                <div className="flex gap-2">
                  <Input
                    value={settings['kakao_template_id'] || ''}
                    onChange={(e) => setSettings((prev) => ({ ...prev, kakao_template_id: e.target.value }))}
                    placeholder="KA01..."
                    className="h-9 border-white/[0.12] bg-surface/50 text-xs text-ink-primary/85"
                  />
                  <Button
                    onClick={() => handleSave('kakao_template_id', settings['kakao_template_id'])}
                    size="sm"
                    className="h-9 bg-gold-500 text-xs text-ink-950 hover:bg-gold-400"
                  >
                    저장
                  </Button>
                </div>
                <p className="font-sans text-[11px] text-ink-primary/40">
                  Solapi/CoolSMS 관리자에서 승인된 템플릿 ID를 넣는다.
                </p>
              </div>
            </div>
          </AdminCard>

          {/* 🔴 되돌릴 수 없는 조작 — 누르는 순간 활성 구독자 전원에게 실제로 나간다. */}
          <AdminCard
            tone="danger"
            title="지금 즉시 발송"
            subtitle="스케줄과 무관하게 활성 구독자 전원에게 실제로 발송한다. 되돌릴 수 없다."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRun}
                disabled={running}
                className="h-8 border-seal/40 text-xs text-seal hover:border-seal/60 hover:bg-seal/10"
              >
                {running ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Play className="mr-1 h-4 w-4" aria-hidden /> 실행
                  </>
                )}
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <AdminCard flush className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead className="border-b border-white/[0.08] bg-surface/50">
                  <tr>
                    <th className="p-2 text-left font-serif font-bold text-ink-primary/55 md:p-3">발송 시각</th>
                    <th className="p-2 text-left font-serif font-bold text-ink-primary/55 md:p-3">회원</th>
                    <th className="p-2 text-left font-serif font-bold text-ink-primary/55 md:p-3">상태</th>
                    <th className="p-2 text-left font-serif font-bold text-ink-primary/55 md:p-3">메시지</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/[0.06] transition-colors hover:bg-surface/30">
                      <td className="p-2 font-mono text-[10px] text-ink-primary/55 md:p-3 md:text-xs">
                        {new Date(log.sent_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="text-xs font-bold text-ink-primary/85 md:text-sm">
                          {log.profiles?.full_name || '이름 없음'}
                        </div>
                        <div className="max-w-[150px] truncate text-[10px] text-ink-primary/40 md:max-w-none md:text-xs">
                          {log.profiles?.email}
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <span
                          className={`rounded-full border px-1.5 py-0.5 text-[9px] font-bold md:px-2 md:text-[10px] ${
                            STATUS_CLS[log.status] ?? 'border-white/[0.08] bg-white/[0.06] text-ink-primary/40'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="max-w-xs break-all p-2 text-[10px] text-ink-primary/40 md:p-3 md:text-xs">
                        {log.error_message || '-'}
                      </td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-xs text-ink-primary/40 md:text-sm">
                        기록이 없습니다.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
