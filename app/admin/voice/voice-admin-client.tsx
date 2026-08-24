'use client'

import { useState } from 'react'
import { Loader2, Play, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import { AdminCard } from '@/components/admin/ui/admin-card'
import { VOICE_CATALOG, PITCH_MIN_HZ, PITCH_MAX_HZ } from '@/lib/domain/shrine/voice-catalog'
import { saveVoiceProfile, resetVoiceProfile } from './actions'
import { logger } from '@/lib/utils/logger'

export interface DeityVoiceRow {
  deityCode: string
  name: string
  archetype: string
  edgeVoice: string
  pitchHz: number
  rate: number
  browserPitch: number
  voiceHint: 'male' | 'female' | null
  /** true = 어드민이 손댄 값(코드 기본값이 아님) */
  customized: boolean
}

const SAMPLE_LINE = '오셨군요. 오늘은 흙이 두터워지는 날이니, 모으고 지키는 일에 마음을 쓰십시오.'

/**
 * 신위 음성 조절 — 목소리·속도·음높이를 바꾸고 «저장 전에» 들어본다.
 *
 * 🔴 미리듣기는 /api/tts 의 admin 전용 preview 경로를 쓴다(권한 확인은 서버가 한다).
 *    저장해야만 들을 수 있으면 조절이 «찍어 맞히기»가 되기 때문에 이 경로를 열었다.
 */
export function VoiceAdminClient({ rows }: { rows: DeityVoiceRow[] }) {
  const [state, setState] = useState<Record<string, DeityVoiceRow>>(
    Object.fromEntries(rows.map((r) => [r.deityCode, r]))
  )
  const [busy, setBusy] = useState<string | null>(null)

  const patch = (code: string, next: Partial<DeityVoiceRow>) =>
    setState((prev) => ({ ...prev, [code]: { ...prev[code], ...next } }))

  const preview = async (row: DeityVoiceRow) => {
    setBusy(`play:${row.deityCode}`)
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: SAMPLE_LINE,
          deityCode: row.deityCode,
          preview: { edgeVoice: row.edgeVoice, rate: row.rate, pitchHz: row.pitchHz },
        }),
      })
      if (!res.ok) {
        toast.error('미리듣기 실패 — 잠시 후 다시 시도해주세요.')
        return
      }
      const blob = await res.blob()
      const audio = new Audio(URL.createObjectURL(blob))
      await audio.play()
    } catch (e) {
      logger.warn('[voice-admin] preview 실패', e)
      toast.error('미리듣기 실패')
    } finally {
      setBusy(null)
    }
  }

  const save = async (row: DeityVoiceRow) => {
    setBusy(`save:${row.deityCode}`)
    const res = await saveVoiceProfile({
      deityCode: row.deityCode,
      edgeVoice: row.edgeVoice,
      pitchHz: row.pitchHz,
      rate: row.rate,
      browserPitch: row.browserPitch,
      voiceHint: row.voiceHint,
    })
    setBusy(null)
    if (res.success) {
      patch(row.deityCode, { customized: true })
      toast.success(`${row.name} 음성 저장됨 — 속풀이에 바로 반영됩니다`)
    } else toast.error(res.error ?? '저장 실패')
  }

  const reset = async (row: DeityVoiceRow) => {
    setBusy(`reset:${row.deityCode}`)
    const res = await resetVoiceProfile(row.deityCode)
    setBusy(null)
    if (res.success) toast.success(`${row.name} 기본값으로 되돌림 — 새로고침하면 원래 값이 보입니다`)
    else toast.error(res.error ?? '되돌리기 실패')
  }

  return (
    <div className="space-y-3">
      {rows.map((base) => {
        const row = state[base.deityCode]
        const isBusy = Boolean(busy && busy.endsWith(row.deityCode))
        return (
          <AdminCard key={row.deityCode}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-serif text-[15px] font-bold text-ink-primary">{row.name}</span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-[1px] text-[10px] text-ink-primary/45">
                  {row.archetype}
                </span>
                {row.customized && (
                  <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-[1px] text-[10px] text-gold-400">
                    직접 설정됨
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void preview(row)}
                  disabled={isBusy}
                  className="flex items-center gap-1 rounded-lg border border-gold-500/35 bg-gold-500/10 px-2.5 py-1.5 text-[12px] text-gold-300 hover:bg-gold-500/20 disabled:opacity-40"
                >
                  {busy === `play:${row.deityCode}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  들어보기
                </button>
                <button
                  type="button"
                  onClick={() => void save(row)}
                  disabled={isBusy}
                  className="flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-[12px] text-primary/85 hover:bg-primary/20 disabled:opacity-40"
                >
                  {busy === `save:${row.deityCode}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => void reset(row)}
                  disabled={isBusy || !row.customized}
                  title="기본값(코드 상수)으로 되돌립니다"
                  aria-label="기본값으로 되돌리기"
                  className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[12px] text-ink-primary/55 hover:border-white/20 disabled:opacity-30"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {/* 목소리 */}
              <label className="block">
                <span className="mb-1 block text-[11px] text-ink-primary/45">목소리</span>
                <select
                  value={row.edgeVoice}
                  onChange={(e) => patch(row.deityCode, { edgeVoice: e.target.value })}
                  className="w-full rounded-lg border border-white/12 bg-surface/60 px-2 py-1.5 text-[12.5px] text-ink-primary"
                >
                  <optgroup label="한국어 (발음 자연스러움)">
                    {VOICE_CATALOG.filter((v) => v.native).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="다국어 (목소리 결이 다름)">
                    {VOICE_CATALOG.filter((v) => !v.native).map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>

              {/* 속도 */}
              <label className="block">
                <span className="mb-1 flex justify-between text-[11px] text-ink-primary/45">
                  <span>말 속도</span>
                  <b className="tabular-nums text-ink-primary/70">{row.rate.toFixed(2)}×</b>
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={1.6}
                  step={0.02}
                  value={row.rate}
                  onChange={(e) => patch(row.deityCode, { rate: Number(e.target.value) })}
                  className="w-full accent-gold-400"
                />
                <span className="mt-0.5 block text-[10px] text-ink-primary/30">느리게 ← → 빠르게</span>
              </label>

              {/* 음높이 */}
              <label className="block">
                <span className="mb-1 flex justify-between text-[11px] text-ink-primary/45">
                  <span>음높이(톤)</span>
                  <b className="tabular-nums text-ink-primary/70">
                    {row.pitchHz >= 0 ? '+' : ''}
                    {row.pitchHz}Hz
                  </b>
                </span>
                <input
                  type="range"
                  min={PITCH_MIN_HZ}
                  max={PITCH_MAX_HZ}
                  step={1}
                  value={row.pitchHz}
                  onChange={(e) => patch(row.deityCode, { pitchHz: Number(e.target.value) })}
                  className="w-full accent-gold-400"
                />
                <span className="mt-0.5 block text-[10px] text-ink-primary/30">낮게(묵직) ← → 높게(맑게)</span>
              </label>
            </div>
          </AdminCard>
        )
      })}
    </div>
  )
}
