'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronRight, Plus, Trash2, UserMinus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  addCircleMember,
  createCircle,
  deleteCircle,
  removeCircleMember,
  type CircleActionResult,
  type CircleDetail,
  type CircleError,
  type CirclesOverview,
} from '@/app/actions/circle/circles'
import {
  CIRCLE_KIND_META,
  CIRCLE_NAME_MAX,
  CONSENT_TEXT,
  CREATABLE_CIRCLE_KINDS,
  type CircleKind,
} from '@/lib/domain/circle/circle'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 「무리」 탭 — 가족(가상)과 내가 만든 무리들. 만들기 · 사람 넣기/빼기 · 지우기 · 기운 지도 문.
 *
 * 상한·동의는 서버가 판정한다. 여기서는 결과를 말로 옮길 뿐이다.
 * 🔴 «무제한» 같은 말은 쓰지 않는다 — 상한은 숫자로 말한다(표시광고법 규율).
 */

const MEMBERSHIP_HREF = '/protected/store?tab=membership'

function mapHref(circleId: string): string {
  return circleId === 'family' ? '/protected/family/map' : `/protected/family/map?circle=${circleId}`
}

function errorMessage(error: CircleError, overview: CirclesOverview): string {
  switch (error) {
    case 'MEMBERSHIP_REQUIRED':
      return '멤버십 회원만 무리를 만들 수 있습니다.'
    case 'LIMIT_CIRCLES':
      return overview.nextTier
        ? `지금 등급에서는 무리를 ${overview.limits.maxCircles}개까지 만들 수 있습니다. ${overview.nextTier} 멤버십이 더 엽니다.`
        : `무리는 ${overview.limits.maxCircles}개까지 만들 수 있습니다.`
    case 'LIMIT_MEMBERS':
      return `한 무리에는 ${overview.limits.maxMembers}명까지 넣을 수 있습니다.`
    case 'DAILY_LIMIT':
      return '오늘은 무리를 더 만들 수 없습니다. 내일 다시 만들어 주세요.'
    case 'INVALID_NAME':
      return `무리 이름은 1~${CIRCLE_NAME_MAX}자로 적어 주세요.`
    case 'CONSENT_REQUIRED':
      return '직장 무리에는 본인 동의를 받은 사람만 넣을 수 있습니다.'
    case 'NOT_FOUND':
      return '무리나 사람을 찾지 못했습니다. 화면을 새로 고쳐 주세요.'
    default:
      return '잠시 뒤 다시 시도해 주세요.'
  }
}

function KindBadge({ kind }: { kind: CircleKind }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-[1px] font-sans text-[10.5px] text-ink-light/55">
      {CIRCLE_KIND_META[kind].label}
    </span>
  )
}

function CircleCard({
  circle,
  overview,
  onChanged,
}: {
  circle: CircleDetail
  overview: CirclesOverview
  onChanged: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [pickId, setPickId] = useState<string>('')
  const [role, setRole] = useState('')
  const [consent, setConsent] = useState(false)
  const meta = CIRCLE_KIND_META[circle.kind]
  const inCircle = new Set(circle.members.map((m) => m.memberId))
  const candidates = overview.people.filter((p) => !inCircle.has(p.id))

  const handle = (run: () => Promise<CircleActionResult>, okMessage: string, event: string, after?: () => void) => {
    startTransition(async () => {
      const result = await run()
      if (!result.success) {
        toast.error(errorMessage(result.error, overview))
        return
      }
      toast.success(okMessage)
      trackEvent({ action: event, category: 'engagement', label: circle.kind })
      after?.()
      onChanged()
    })
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface/30">
      <div className="flex items-center gap-2 px-3.5 py-3">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-ink-light/40 transition-transform ${open ? 'rotate-180' : ''}`}
          />
          <span className="truncate font-serif text-[14px] font-bold text-ink-light">{circle.name}</span>
          <KindBadge kind={circle.kind} />
          <span className="shrink-0 text-[11px] tabular-nums text-ink-light/45">{circle.members.length + 1}명</span>
        </button>
        <Link
          href={mapHref(circle.id)}
          onClick={() => trackEvent({ action: 'circle_map_open', category: 'engagement', label: circle.kind })}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-gold-500/35 bg-gold-500/[0.08] px-2.5 py-1.5 font-serif text-[11.5px] text-gold-300 hover:bg-gold-500/[0.14]"
        >
          기운 지도 <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {open && (
        <div className="space-y-3 border-t border-white/[0.06] px-3.5 pb-3.5 pt-3">
          {meta.notice && (
            <p className="text-[10.5px] leading-relaxed text-gold-200/70" style={{ wordBreak: 'keep-all' }}>
              {meta.notice}
            </p>
          )}

          <ul className="space-y-1.5">
            <li className="flex items-center justify-between text-[12px] text-ink-light/70">
              <span>
                나 <span className="text-ink-light/35">· 모든 무리에 들어 있습니다</span>
              </span>
            </li>
            {circle.members.map((m) => (
              <li key={m.memberId} className="flex items-center justify-between gap-2 text-[12px]">
                <span className="min-w-0 truncate text-ink-light/85">
                  {m.name} <span className="text-ink-light/40">· {m.relationship}</span>
                  {m.role && <span className="text-ink-light/40"> · {m.role}</span>}
                  {m.consentAt && <span className="ml-1 text-[10px] text-gold-300/70">동의</span>}
                </span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    handle(
                      () => removeCircleMember({ circleId: circle.id, memberId: m.memberId }),
                      `${m.name}님을 뺐습니다.`,
                      'circle_member_remove'
                    )
                  }
                  aria-label={`${m.name} 빼기`}
                  className="shrink-0 rounded-md border border-white/10 p-1 text-ink-light/45 hover:text-ink-light disabled:opacity-40"
                >
                  <UserMinus className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>

          {candidates.length > 0 ? (
            <div className="space-y-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5">
              <div className="grid grid-cols-[1fr_88px] gap-2">
                <Select value={pickId} onValueChange={setPickId}>
                  <SelectTrigger className="h-9 border-white/10 bg-black/30 text-[12px]">
                    <SelectValue placeholder="넣을 사람" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {p.relationship}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  maxLength={20}
                  placeholder="자리(선택)"
                  className="h-9 bg-black/20 text-[12px]"
                />
              </div>
              <label className="flex cursor-pointer items-start gap-2">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5 border-gold-500/60"
                />
                <span className="text-[10.5px] leading-snug text-ink-light/60" style={{ wordBreak: 'keep-all' }}>
                  {CONSENT_TEXT}
                  {meta.consentRequired && <b className="ml-1 text-gold-300/80">(직장 무리는 필수)</b>}
                </span>
              </label>
              <Button
                type="button"
                size="sm"
                disabled={pending || !pickId}
                onClick={() =>
                  handle(
                    () => addCircleMember({ circleId: circle.id, memberId: pickId, consent, role }),
                    '무리에 넣었습니다.',
                    'circle_member_add',
                    () => {
                      setPickId('')
                      setRole('')
                      setConsent(false)
                    }
                  )
                }
                className="h-8 w-full bg-gold-500 text-[12px] text-black hover:bg-gold-500/80"
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> 넣기
              </Button>
            </div>
          ) : (
            <p className="text-[11px] text-ink-light/40">등록된 인연이 모두 이 무리에 들어 있습니다.</p>
          )}

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`「${circle.name}」 무리를 지울까요? 사람 정보는 남고 무리만 사라집니다.`)) return
              handle(() => deleteCircle(circle.id), '무리를 지웠습니다.', 'circle_delete')
            }}
            className="inline-flex items-center gap-1 text-[11px] text-ink-light/40 hover:text-seal-light disabled:opacity-40"
          >
            <Trash2 className="h-3.5 w-3.5" /> 무리 지우기
          </button>
        </div>
      )}
    </div>
  )
}

export function CirclePanel({ overview }: { overview: CirclesOverview }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [kind, setKind] = useState<CircleKind>('work')
  const canCreate = overview.circles.length < overview.limits.maxCircles
  const refresh = () => router.refresh()

  const submit = () => {
    startTransition(async () => {
      const result = await createCircle({ name, kind })
      if (!result.success) {
        toast.error(errorMessage(result.error, overview))
        if (result.error === 'LIMIT_CIRCLES' || result.error === 'MEMBERSHIP_REQUIRED') {
          trackEvent({ action: 'circle_upsell_view', category: 'conversion', label: overview.tier ?? 'free' })
        }
        return
      }
      toast.success('무리를 만들었습니다. 사람을 넣어 보세요.')
      trackEvent({ action: 'circle_create', category: 'engagement', label: kind })
      setName('')
      setFormOpen(false)
      refresh()
    })
  }

  return (
    <section aria-label="무리 목록" className="space-y-3">
      <p className="px-1 text-[11px] leading-relaxed text-ink-light/50" style={{ wordBreak: 'keep-all' }}>
        무리는 기운을 나란히 볼 사람들의 묶음입니다. 가족은 등록된 대로 한 무리이고, 직장·모임은 직접 만듭니다. 한
        사람이 여러 무리에 들어갈 수 있습니다.
      </p>

      {/* 가족 — 가상 무리 */}
      <div className="flex items-center gap-2 rounded-xl border border-gold-500/25 bg-gold-500/[0.05] px-3.5 py-3">
        <span className="min-w-0 flex-1 truncate font-serif text-[14px] font-bold text-ink-light">
          우리 {overview.family.name}
        </span>
        <KindBadge kind="family" />
        <span className="shrink-0 text-[11px] tabular-nums text-ink-light/45">{overview.family.memberCount}명</span>
        <Link
          href={mapHref('family')}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-gold-500/35 bg-gold-500/[0.08] px-2.5 py-1.5 font-serif text-[11.5px] text-gold-300 hover:bg-gold-500/[0.14]"
        >
          기운 지도 <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {overview.circles.map((c) => (
        <CircleCard key={c.id} circle={c} overview={overview} onChanged={refresh} />
      ))}

      {/* 만들기 */}
      {formOpen ? (
        <div className="space-y-2.5 rounded-xl border border-white/10 bg-surface/30 p-3.5">
          <div className="grid grid-cols-[1fr_112px] gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={CIRCLE_NAME_MAX}
              placeholder="무리 이름 (예: 마케팅팀)"
              className="h-9 bg-black/20 text-[13px]"
              autoFocus
            />
            <Select value={kind} onValueChange={(v) => setKind(v as CircleKind)}>
              <SelectTrigger className="h-9 border-white/10 bg-black/30 text-[12px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CREATABLE_CIRCLE_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {CIRCLE_KIND_META[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-[10.5px] leading-snug text-ink-light/45" style={{ wordBreak: 'keep-all' }}>
            {CIRCLE_KIND_META[kind].hint}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || name.trim().length === 0}
              onClick={submit}
              className="h-8 flex-1 bg-gold-500 text-[12px] text-black hover:bg-gold-500/80"
            >
              {pending ? '만드는 중…' : '만들기'}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => setFormOpen(false)}
              className="h-8 text-[12px] text-ink-light/60"
            >
              닫기
            </Button>
          </div>
        </div>
      ) : canCreate ? (
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-gold-500/30 bg-gold-500/[0.03] py-3 font-serif text-[13px] text-gold-300 hover:bg-gold-500/[0.08]"
        >
          <Plus className="h-4 w-4" /> 무리 만들기
          <span className="font-sans text-[10.5px] text-ink-light/40">
            ({overview.circles.length}/{overview.limits.maxCircles})
          </span>
        </button>
      ) : (
        <div className="space-y-1.5 rounded-xl border border-white/10 bg-surface/20 px-3.5 py-3 text-center">
          <p className="text-[12px] text-ink-light/60">
            지금 등급에서는 무리를 {overview.limits.maxCircles}개까지 만들 수 있습니다.
          </p>
          {overview.nextTier && (
            <Link
              href={MEMBERSHIP_HREF}
              onClick={() =>
                trackEvent({ action: 'circle_upsell_click', category: 'conversion', label: overview.tier ?? 'free' })
              }
              className="inline-flex items-center gap-1 font-serif text-[12px] font-bold text-gold-400"
            >
              {overview.nextTier} 멤버십이 무리를 더 엽니다 <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
