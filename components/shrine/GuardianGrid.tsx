'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'
import {
  GUARDIANS,
  GUARDIAN_CATEGORY_LABEL,
  MAX_GUARDIANS,
  guardianSpriteUrl,
  type GuardianCategory,
} from '@/lib/domain/shrine/guardians'
import { equipGuardians } from '@/app/actions/shrine/guardians'
import { EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'
import { mattersLabel } from '@/lib/domain/shrine/item-matters'

/**
 * 신수(神獸) 착좌 그리드 — 보유한 신수 중 둘까지 골라 신당에 모신다.
 *
 * 구매는 여기서 하지 않는다 — 신수는 카탈로그 아이템이라 **아이템 탭이 파는 곳**이고,
 * 여기는 "누구를 곁에 세울까"를 정하는 곳이다(테마 탭의 구매/적용 분리와 같은 규율).
 */

const CATEGORY_ORDER: readonly GuardianCategory[] = ['beast', 'chasa', 'dokkaebi', 'spirit']

export function GuardianGrid({
  ownedNames,
  equipped,
  familyMemberId,
}: {
  /** 보유한 신수의 카탈로그 이름 (구매가 인벤토리에 남긴다) */
  ownedNames: string[]
  /** 지금 착좌한 슬러그 (서버 스냅샷) */
  equipped: string[]
  familyMemberId: string | null
}) {
  const router = useRouter()
  const owned = useMemo(() => new Set(ownedNames), [ownedNames])
  const [selected, setSelected] = useState<string[]>(equipped)
  const [saving, setSaving] = useState(false)

  const dirty = useMemo(
    () => selected.length !== equipped.length || selected.some((s) => !equipped.includes(s)),
    [selected, equipped]
  )

  const toggle = (slug: string) => {
    setSelected((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug)
      if (prev.length >= MAX_GUARDIANS) {
        toast.error(`신수는 ${MAX_GUARDIANS}좌까지 모실 수 있습니다`)
        return prev
      }
      return [...prev, slug]
    })
  }

  const save = async () => {
    setSaving(true)
    const res = await equipGuardians(selected, familyMemberId)
    setSaving(false)
    if (!res.success) {
      toast.error(res.error === 'NOT_OWNED' ? '아직 모셔 오지 않은 신수가 있습니다' : '착좌하지 못했습니다')
      return
    }
    toast.success(selected.length > 0 ? '신수가 신당을 지키기 시작합니다' : '신수를 물렸습니다')
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-xs text-ink-light/40">
          신이 자리를 비울 때 신당을 지키는 영물 — {MAX_GUARDIANS}좌까지 거닙니다
        </p>
        <span className="shrink-0 font-serif text-[11px] font-bold tabular-nums text-gold-500">
          {selected.length}/{MAX_GUARDIANS} 착좌
        </span>
      </div>

      {dirty && (
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="sticky top-2 z-10 w-full rounded-xl border border-gold-500/50 bg-gold-500/[0.16] py-2.5 font-serif text-[13px] font-bold text-gold-200 backdrop-blur"
        >
          {saving ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : '이대로 모시기'}
        </button>
      )}

      {CATEGORY_ORDER.map((cat) => (
        <section key={cat} className="space-y-2">
          <h2 className="font-serif text-[12px] font-bold tracking-[0.2em] text-gold-500/60">
            {GUARDIAN_CATEGORY_LABEL[cat]}
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {GUARDIANS.filter((g) => g.category === cat).map((g) => {
              const has = owned.has(g.name)
              const on = selected.includes(g.slug)
              return (
                <button
                  key={g.slug}
                  type="button"
                  disabled={!has}
                  onClick={() => toggle(g.slug)}
                  className={`relative rounded-xl border p-2.5 text-left transition-colors ${
                    on
                      ? 'border-gold-500/55 bg-gold-500/[0.12]'
                      : has
                        ? 'border-white/12 bg-white/[0.03]'
                        : 'border-white/[0.06] bg-black/20 opacity-60'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={guardianSpriteUrl(g.slug)}
                      alt=""
                      loading="lazy"
                      className="h-12 w-12 shrink-0 object-contain"
                      style={has ? undefined : { filter: 'grayscale(1) brightness(0.6)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="truncate font-serif text-[13px] font-bold text-ink-light">{g.name}</span>
                        <span
                          className="grid h-[15px] w-[15px] shrink-0 place-items-center rounded-full font-serif text-[9px] font-bold"
                          style={{
                            background: EL_COLOR[g.element],
                            color: g.element === 'fire' || g.element === 'water' ? '#f2dcdc' : '#0a0a08',
                          }}
                        >
                          {EL_KO[g.element]}
                        </span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 font-sans text-[10px] leading-snug text-ink-light/50">
                        {g.role}
                      </p>
                      <p className="mt-0.5 font-sans text-[9.5px] text-ink-light/35">
                        기도 · {mattersLabel(g.matters)}
                      </p>
                    </div>
                  </div>
                  {on && (
                    <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-gold-500 text-black">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                  {!has && (
                    <span className="absolute bottom-1.5 right-2 font-sans text-[9px] text-gold-500/60">
                      복채 {g.price}만냥 · 아이템 탭에서 봉헌
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <p className="font-sans text-[10.5px] leading-relaxed text-ink-light/35">
        아직 모셔 오지 않은 신수는{' '}
        <Link href="/protected/shrine/collection?tab=item" className="text-gold-500/70 underline underline-offset-2">
          아이템 탭
        </Link>
        에서 봉헌합니다. 전승은 각 신수 카드의 아이템 설명에 적혀 있습니다.
      </p>
    </div>
  )
}
