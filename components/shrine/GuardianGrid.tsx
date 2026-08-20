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
import { equipGuardians, purchaseGuardian } from '@/app/actions/shrine/guardians'
import { EL_KO, EL_COLOR } from '@/lib/domain/shrine/energy'
import { mattersLabel } from '@/lib/domain/shrine/item-matters'

/**
 * 신수(神獸) 그리드 — 봉헌(구매)과 착좌를 한 자리에서.
 *
 * 처음에는 구매를 아이템 탭에 미뤘는데, 32좌를 보고 → 탭을 건너가 사고 → 돌아와 고르는
 * 왕복이 "선택이 안 된다"로 읽혔다(CEO 보고). 미보유 카드는 누르면 그 자리에서 봉헌되고,
 * 결제·인벤토리는 purchaseToInventory 한 벌을 재사용한다 — 파는 곳이 두 곳이어도 경로는 하나다.
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
  /** 이 화면에서 방금 봉헌한 것 — 서버 스냅샷(ownedNames)에 아직 없다 */
  const [ownedExtra, setOwnedExtra] = useState<Set<string>>(new Set())
  const owned = useMemo(() => new Set([...ownedNames, ...ownedExtra]), [ownedNames, ownedExtra])
  const [selected, setSelected] = useState<string[]>(equipped)
  const [saving, setSaving] = useState(false)
  const [buyingSlug, setBuyingSlug] = useState<string | null>(null)

  /** 봉헌 → 성공하면 그 자리에서 바로 고를 수 있게 착좌 후보에도 넣어 준다(빈 자리가 있으면) */
  const buy = async (slug: string, name: string) => {
    setBuyingSlug(slug)
    const res = await purchaseGuardian(slug)
    setBuyingSlug(null)
    if (!res.success) {
      toast.error(res.error === 'INSUFFICIENT_BOKCHAE' ? '복채가 모자랍니다' : '봉헌이 이루어지지 않았습니다')
      return
    }
    setOwnedExtra((prev) => new Set(prev).add(name))
    setSelected((prev) => (prev.length < MAX_GUARDIANS && !prev.includes(slug) ? [...prev, slug] : prev))
    // 빈자리가 있으면 서버가 봉헌과 함께 착좌까지 마친다 — 토스트가 다음 할 일을 정확히 말해야 한다
    toast.success(
      res.seated === true
        ? `${name} — 모셔 왔습니다. 신당에 바로 착좌했어요`
        : `${name} — 모셔 왔습니다. 「이대로 모시기」로 착좌합니다`
    )
  }

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
          <h2 className="font-serif text-caption font-bold tracking-[0.2em] text-gold-500/60">
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
                  disabled={!has && buyingSlug !== null}
                  onClick={() => (has ? toggle(g.slug) : void buy(g.slug, g.name))}
                  className={`relative rounded-xl border p-2.5 text-left transition-colors ${
                    on
                      ? 'border-gold-500/55 bg-gold-500/[0.12]'
                      : has
                        ? 'border-white/12 bg-white/[0.03]'
                        : 'border-white/[0.06] bg-black/25 opacity-80'
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
                    <span className="absolute bottom-1.5 right-2 inline-flex items-center gap-1 rounded-md border border-gold-500/40 bg-gold-500/[0.12] px-1.5 py-0.5 font-sans text-[9.5px] font-bold text-gold-200">
                      {buyingSlug === g.slug ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>복채 {g.price}만냥 봉헌</>
                      )}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
      ))}

      <p className="font-sans text-[10.5px] leading-relaxed text-ink-light/35">
        카드를 누르면 그 자리에서 봉헌(구매)됩니다 — 신을 아직 모시지 않았어도 신수는 먼저 곁에 둘 수 있습니다. 복채
        충전은{' '}
        <Link href="/protected/store" className="text-gold-500/70 underline underline-offset-2">
          상점
        </Link>
        에서.
      </p>
    </div>
  )
}
