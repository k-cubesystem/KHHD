'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Flame, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TargetSelect, type TargetOption } from '@/components/destiny/target-select'
import { addWish } from '@/app/actions/shrine/shrine-wishes'
import { PRAYER_MAX_LEN, validatePrayerText } from '@/lib/domain/shrine/family-prayer'
import { devotionProgress } from '@/lib/domain/shrine/devotion'
import { SHRINE_PRAYED_EVENT } from '@/lib/config/gamefeel'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 기도 올리기 시트 — 백일기도 v2 (CEO 2026-08-25 «간단하게 가족 선택하고 기도 올리기»).
 *
 * 하는 일이 전부다: 대상(나·가족)을 고르고 → 한 줄 기도를 적고 → 올린다.
 * 저장은 기존 addWish(shrine_wishes) 그대로라 기원(devotion) 적립·복 포인트·기도 연출
 * (SHRINE_PRAYED_EVENT)이 종전 규칙 그대로 이어진다. 올린 기도는 새로고침 후 신당 벽 —
 * 가족 선반장 위 — 의 액자(PrayerBoard)에 걸린다.
 *
 * 🔴 대상 선택은 `TargetSelect` 다(2026-08-25 드롭다운 통일 — 사람 고르기의 단일 출처).
 * 🔴 「가족 관리」 링크를 여기서 지우지 말 것 — 신당 가족 탭이 사라진 뒤(같은 날 CEO 지시)
 *    이 시트의 링크가 신당 계열에서 가족관리로 가는 문이다.
 */

export interface PrayerFamilyOption {
  id: string
  name: string
  relationship: string
}

/** 본인 항목의 자리표시 id — 가족 id 는 uuid 라 부딪히지 않는다(ShrineTargetTabs 승계 규약). */
const SELF_ID = 'self'

interface PrayerSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shrineId: string
  family: readonly PrayerFamilyOption[]
}

export function PrayerSheet({ open, onOpenChange, shrineId, family }: PrayerSheetProps) {
  const router = useRouter()
  const [targetId, setTargetId] = useState<string>(SELF_ID)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const options: TargetOption[] = useMemo(
    () => [
      { id: SELF_ID, name: '나', relation: '본인' },
      ...family.map((f) => ({ id: f.id, name: f.name, relation: f.relationship })),
    ],
    [family]
  )

  const handleSubmit = useCallback(async () => {
    const checked = validatePrayerText(text)
    if (!checked.ok) {
      toast.error(checked.error)
      return
    }
    setSaving(true)
    const familyMemberId = targetId === SELF_ID ? null : targetId
    const result = await addWish({ shrineId, wishText: checked.text, familyMemberId })
    setSaving(false)

    if (!result.success) {
      toast.error('기도를 올리지 못했습니다. 다시 시도해 주세요.')
      return
    }

    const targetName = options.find((o) => o.id === targetId)?.name ?? '나'
    trackEvent({ action: 'family_prayer', category: 'shrine', label: familyMemberId ? 'family' : 'self' })
    if (result.devotionGained) {
      const p = devotionProgress(result.devotionTotalDays ?? 0)
      toast.success(`기도가 액자에 걸렸습니다 · ${targetName} 🙏`, {
        description: p.nextLevel ? `기원 ${p.level}단 · ${p.nextLevel}단까지 ${p.daysToNext}일` : '기원이 지극합니다',
      })
      // 기도 연출 신호는 refresh 보다 먼저 — 서버 렌더 교체 타이밍에 유실되지 않게(ShrineWishForm 규약)
      window.dispatchEvent(new CustomEvent(SHRINE_PRAYED_EVENT))
    } else {
      toast.success(`기도가 액자에 걸렸습니다 · ${targetName} 🙏`)
    }
    setText('')
    onOpenChange(false)
    router.refresh()
  }, [text, targetId, shrineId, options, onOpenChange, router])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[400px] rounded-2xl border border-gold-500/30 bg-[#151210]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif text-base font-bold text-ink-light">
            <Flame className="h-4 w-4 text-gold-500" fill="#C9A84C" />
            기도 올리기
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="font-sans text-[12px] font-light leading-relaxed text-ink-light/55">
            누구를 위한 기도인지 고르고 한 줄을 적어 주세요.
            <br />
            올린 기도는 신당 벽의 <span className="text-gold-500/80">액자</span>에 걸립니다.
          </p>

          <TargetSelect
            label="누구를 위한 기도인가요"
            targets={options}
            value={targetId}
            onChange={setTargetId}
            action={
              <Link
                href="/protected/family"
                className="text-[11px] font-sans text-white/35 transition-colors hover:text-gold-500"
              >
                가족 관리
              </Link>
            }
          />

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-xs font-serif tracking-widest text-gold-500/70">기도문</span>
              <span className="font-sans text-[10px] tabular-nums text-ink-light/35">
                {text.length}/{PRAYER_MAX_LEN}
              </span>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, PRAYER_MAX_LEN))}
              rows={2}
              placeholder="예) 올해도 온 가족 건강하게 해 주세요"
              className="w-full resize-none rounded-lg border border-gold-500/25 bg-black/30 px-3 py-2.5 font-serif text-sm leading-relaxed text-ink-light placeholder:text-ink-light/25 focus:border-gold-500/50 focus:outline-none"
            />
          </div>

          <button
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="relative w-full overflow-hidden rounded-lg py-3 transition-transform duration-200 hover:scale-[1.01] active:scale-[0.97] disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #E8D5A0 0%, #C9A84C 45%, #A8903F 100%)',
              boxShadow: '0 4px 20px rgba(201,168,76,0.25)',
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 font-serif text-[14px] font-bold tracking-[0.1em] text-[#0A0A08]">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              기도 올리기
            </span>
          </button>

          <p className="text-center font-sans text-[10px] font-light text-ink-light/30">
            같은 대상에게 새 기도를 올리면 액자의 글이 바뀝니다
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
