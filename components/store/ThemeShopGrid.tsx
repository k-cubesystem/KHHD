'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { ThemePack } from '@/lib/domain/shrine/types'
import { purchaseThemePack } from '@/app/actions/shrine/deities'
import { activateThemePack } from '@/app/actions/shrine/scene'
import { devotionLevelForTheme } from '@/lib/domain/shrine/devotion'
import { EL_KO, EL_COLOR, EL_LABEL } from '@/lib/domain/shrine/energy'
import { mattersLabel } from '@/lib/domain/shrine/item-matters'
import { findFamilyAvatar } from '@/lib/domain/family/avatars'

/** 궁합 신위 이름 — 아바타 카탈로그가 신위 시드와 같은 코드를 쓴다(단일 출처). 모르면 코드 그대로. */
function deityNames(codes: readonly string[]): string {
  return codes.map((c) => findFamilyAvatar(c)?.label ?? c).join(' · ')
}

/**
 * 적용 범위 — 이 값이 있으면 **보유 테마를 그 자리에서 신당에 입힌다**.
 *
 * 상점(통합 상점 테마 탭)은 이 값을 주지 않는다 — 파는 곳과 입히는 곳을 나눠 두던 종전 그대로다.
 * 모아보기(/protected/shrine/collection?tab=theme)만 준다: 신당 방 아래 테마 칩 줄이 걷히면서
 * (CEO 6차 지시 ②) **적용 손잡이가 이 화면으로 옮겨 왔다**. 손잡이가 없으면 산 테마를 입힐 길이 없다.
 */
export interface ThemeApplyScope {
  /** 지금 이 신당에 걸려 있는 테마 코드 */
  activeCode: string
  /** 가족 신당이면 그 가족 id. 본인 신당은 null */
  familyMemberId: string | null
}

/** 상점 신당 테마 탭 — 그라디언트 프리뷰 + 복채 구매. `apply` 를 주면 적용까지 여기서 한다. */
export function ThemeShopGrid({ themes, apply }: { themes: ThemePack[]; apply?: ThemeApplyScope }) {
  const t = useTranslations('store')
  const router = useRouter()
  const [ownedExtra, setOwnedExtra] = useState<Set<string>>(new Set())
  const [loadingCode, setLoadingCode] = useState<string | null>(null)
  /** 낙관 반영한 현재 테마. 서버 값(apply.activeCode)에서 출발한다 */
  const [activeCode, setActiveCode] = useState(apply?.activeCode ?? null)

  /** 신당에 입히기 — 실패하면 이전 테마로 되돌린다(칩 줄이 하던 것과 같은 낙관 규약) */
  const applyPack = async (pack: ThemePack) => {
    if (!apply) return
    const prev = activeCode
    setActiveCode(pack.code)
    setLoadingCode(pack.code)
    const res = await activateThemePack(pack.code, apply.familyMemberId)
    setLoadingCode(null)
    if (res.success) {
      toast.success(`${pack.name} — 신당에 입혔습니다`)
      // 라우터 캐시를 비운다 — 「신당으로」로 돌아갔을 때 옛 테마가 그려진 화면이 재사용되면
      // 방금 입힌 것이 안 먹힌 것처럼 보인다(적용은 서버에서 이미 끝났는데도).
      router.refresh()
    } else {
      setActiveCode(prev)
      toast.error('테마 변경 실패')
    }
  }

  const buy = async (pack: ThemePack) => {
    setLoadingCode(pack.code)
    const res = await purchaseThemePack(pack.code)
    setLoadingCode(null)
    if (res.success || res.error === 'ALREADY_OWNED') {
      setOwnedExtra((prev) => new Set(prev).add(pack.code))
      toast.success(t('themeBought', { name: pack.name }), { description: t('themeBoughtDesc') })
      // 봉헌 즉시 적용 — 걷어낸 테마 칩 줄이 하던 약속("봉헌 즉시 이 신당에 적용됩니다") 그대로다
      if (apply) await applyPack(pack)
    } else if (res.error === 'INSUFFICIENT_BOKCHAE') {
      toast.error(t('insufficientBokchae'))
    } else {
      toast.error(t('purchaseFailed'))
    }
  }

  const ownedCount = themes.filter((p) => p.owned || ownedExtra.has(p.code)).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="font-sans text-xs text-ink-light/40">{t('themeHint')}</p>
        <span className="shrink-0 font-serif text-[11px] font-bold tabular-nums text-gold-500">
          {ownedCount}/{themes.length} 수집
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {themes.map((pack) => {
          const owned = pack.owned || ownedExtra.has(pack.code)
          const free = pack.priceBokchae === 0
          const loading = loadingCode === pack.code
          const accent = pack.assets.accent ?? '#c9a84c'
          const devotionLvl = !owned ? devotionLevelForTheme(pack.code) : null
          return (
            <div
              key={pack.id}
              className="rounded-xl overflow-hidden border border-gold-500/[0.15] bg-gold-500/[0.03] flex flex-col"
            >
              {/* 방 프리뷰 — 실제 방 그림(room.webp). 없던 시절의 그라디언트는 폴백 배경으로만 남는다 */}
              <div className="relative h-28" style={{ background: pack.assets.wall }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/shrine/themes/${pack.code}/room.webp`}
                  alt={pack.name}
                  loading="lazy"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 h-1/2"
                  style={{ background: 'linear-gradient(180deg,transparent,rgba(10,8,5,0.72))' }}
                />
                {pack.elementAffinity && (
                  <span
                    className="absolute top-1.5 right-1.5 w-[18px] h-[18px] rounded-full text-[9px] font-serif grid place-items-center font-bold"
                    style={{
                      background: EL_COLOR[pack.elementAffinity],
                      color:
                        pack.elementAffinity === 'fire' || pack.elementAffinity === 'water' ? '#f2dcdc' : '#0a0a08',
                    }}
                  >
                    {EL_KO[pack.elementAffinity]}
                  </span>
                )}
                <span
                  className="absolute bottom-1.5 left-2 font-serif text-[13px] font-bold"
                  style={{ color: accent, textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}
                >
                  {pack.name}
                </span>
              </div>

              <div className="p-3 flex flex-col gap-1.5 flex-1">
                {/* 스토리 — 이 자리가 어떤 곳인가 */}
                {pack.story && <p className="font-sans text-[10.5px] leading-snug text-ink-light/55">{pack.story}</p>}
                {/* 기운 · 궁합 신 · 기도 — 오방기 문복과 같은 말을 쓴다(한 세계) */}
                <div className="space-y-0.5 font-sans text-[10px] leading-snug">
                  {pack.elementAffinity && (
                    <p className="text-gold-500/70">
                      기운 · {EL_KO[pack.elementAffinity]}({EL_LABEL[pack.elementAffinity]}) 기운을 돋운다
                    </p>
                  )}
                  {pack.deityCodes.length > 0 && (
                    <p className="text-ink-light/50">궁합 신 · {deityNames(pack.deityCodes)}</p>
                  )}
                  {pack.matters.length > 0 && <p className="text-ink-light/50">기도 · {mattersLabel(pack.matters)}</p>}
                </div>
                {/* 어떤 사주에 맞는가 */}
                {pack.sajuNote && (
                  <p className="border-l border-white/10 pl-1.5 font-sans text-[10px] leading-snug text-ink-light/35">
                    {pack.sajuNote}
                  </p>
                )}
                {devotionLvl != null && (
                  <p className="text-[10px] text-gold-500/70 font-sans">🕯 기원 {devotionLvl}단 무료</p>
                )}
                {owned && apply ? (
                  activeCode === pack.code ? (
                    <span className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-gold-500/50 bg-gold-500/[0.16] py-1.5 text-[11px] font-bold text-gold-200">
                      <Check className="w-3 h-3" />
                      적용 중
                    </span>
                  ) : (
                    <button
                      onClick={() => void applyPack(pack)}
                      disabled={loading}
                      className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-gold-500/35 bg-gold-500/[0.12] py-1.5 text-[11px] text-gold-300 disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : '신당에 입히기'}
                    </button>
                  )
                ) : owned ? (
                  <Link
                    href="/protected/shrine"
                    className="mt-auto flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-gold-500/[0.12] border border-gold-500/35 text-gold-300"
                  >
                    <Check className="w-3 h-3" />
                    {free ? t('themeFree') : t('themeOwned')}
                  </Link>
                ) : (
                  <button
                    onClick={() => void buy(pack)}
                    disabled={loading}
                    className="mt-auto flex items-center justify-center gap-1 text-[11px] py-1.5 rounded-lg bg-seal/15 border border-seal/40 text-seal disabled:opacity-50"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      t('themeBuy', { price: pack.priceBokchae })
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
