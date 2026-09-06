'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Users } from 'lucide-react'
import { ELEMENTS, EL_COLOR, EL_KO, EL_LABEL } from '@/lib/domain/shrine/energy'
import { getFamilyEnergySummary } from '@/app/actions/shrine/energy-map'
import type { FamilyEnergySummary } from '@/lib/domain/shrine/energy-map'
import { trackEvent } from '@/lib/analytics/ga4'

/**
 * 「우리 가족 기운 지도」 배너 — 허브(사주·궁합)에서 복주머니 바로 아래 자리 (CEO 2026-09-04).
 *
 * ── 왜 «가족 관리» 가 아니라 «기운 지도» 인가
 * CEO 지시는 「가족관리 배너」였고, 이어서 「가족관리도 가족지도 서로의 기운을 확인할 수 있으니
 * 그 부분 기획해서」였다. 확인해 보니 **허브에도 하단 탭에도 가족관리로 가는 문이 없었다**
 * (런처 여덟 칸은 풀이 도구뿐, 하단 탭은 홈·오늘운세·분석·비록·프로필). 그래서 이 배너가 곧
 * 그 문이다 — 「가족 관리」 보조 링크가 명부를 열고, 주 버튼은 **가족을 등록해야만 볼 수 있는 것**,
 * 즉 서로의 오행을 나란히 두고 견주는 화면(`/protected/family/map`)을 연다.
 *
 * ⚠️ 가족 계열은 **멤버십 게이트** 뒤에 있다(app/protected/family/layout.tsx). 비회원이 눌러도
 *    오류가 아니라 안내 화면이 서므로 링크를 막지 않는다 — 대신 배너가 «무료»라고 말하지도 않는다.
 *
 * ── 세 상태
 *   null      비로그인·조회 실패 → **아무것도 그리지 않는다**(빈 카드가 자리만 먹지 않게)
 *   count<2   견줄 상대가 없다 → 가족 등록 유도
 *   그 외      구성원 칩 + 한 줄 풀이 + 지도 열기
 *
 * 🔴 여기 뜨는 기운은 **타고난 기운**(사주)이다. 지도 화면은 신당 살림·관상·손금까지 얹은
 *    «지금의 기운»이라 값이 다르다 — 그래서 배너가 그 말을 라벨로 달고 있다. 라벨을 떼면
 *    두 화면이 «서로 다른 수를 말하는» 것처럼 보인다(getFamilyEnergySummary 주석 참고).
 *
 * 🔴 조회는 카드가 스스로 한다(자가 조회 배너 패턴 — JourneyCard·WallpaperCard 와 같다).
 *    AnalysisDashboard 는 서버 액션을 import 하지 않는다(회귀 테스트가 막는다).
 */

/** 칩으로 세울 사람 수. 넷이면 430px 폭에서 두 줄로 넘어가 배너가 목록처럼 길어진다(실측) — 셋 + «+N». */
const CHIP_MAX = 3

const MAP_HREF = '/protected/family/map'
const FAMILY_HREF = '/protected/family'
const PRESCRIPTION_HREF = '/protected/prescription'

/** 먹빛 바탕 — 위의 복주머니 배너(진홍·비단)보다 한 걸음 물러서야 «주 배너»가 하나로 읽힌다. */
const MAP_BG = 'linear-gradient(160deg, #12100C 0%, #171410 55%, #0F0D0A 100%)'

export function FamilyMapCard() {
  const [summary, setSummary] = useState<FamilyEnergySummary | null>(null)
  const viewed = useRef(false)

  useEffect(() => {
    let active = true
    getFamilyEnergySummary()
      .then((data) => {
        if (!active || !data) return
        setSummary(data)
        if (viewed.current) return
        viewed.current = true
        trackEvent({ action: 'family_map_banner_view', category: 'engagement', label: String(data.count) })
      })
      .catch(() => {
        // 조회 실패는 배너를 비운다 — 허브 첫 화면에서 오류 문구를 띄울 자리가 아니다
      })
    return () => {
      active = false
    }
  }, [])

  if (!summary) return null

  const enough = summary.count >= 2
  const shown = summary.members.slice(0, CHIP_MAX)
  const rest = summary.count - shown.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border border-gold-500/15"
      style={{ background: MAP_BG }}
    >
      {/* 오행 다섯 색이 번지는 원경 — 「지도」의 바탕. 글자를 가리지 않을 만큼만 옅다. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.16]"
        style={{
          background: `radial-gradient(circle at 12% 28%, ${EL_COLOR.wood} 0%, transparent 42%),
            radial-gradient(circle at 84% 22%, ${EL_COLOR.fire} 0%, transparent 40%),
            radial-gradient(circle at 50% 96%, ${EL_COLOR.water} 0%, transparent 46%)`,
        }}
      />

      <div className="relative z-10 flex flex-col gap-3 px-5 py-4">
        {/* 머리 — 라벨 + 오행 다섯 점(범례 모티프) + 인원 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="font-serif text-[10px] tracking-[0.34em] text-gold-500/60">기 운 지 도</p>
            <span aria-hidden className="flex items-center gap-[3px]">
              {ELEMENTS.map((el) => (
                <span
                  key={el}
                  className="h-[5px] w-[5px] rounded-full"
                  style={{ background: EL_COLOR[el], opacity: 0.75 }}
                />
              ))}
            </span>
          </div>
          <span className="flex items-center gap-1 font-serif text-[11px] tabular-nums text-gold-500/70">
            <Users className="h-3 w-3" />
            {summary.count}명
          </span>
        </div>

        {enough ? (
          <>
            <h3
              className="font-serif text-[15px] font-bold leading-snug text-ink-light"
              style={{ wordBreak: 'keep-all' }}
            >
              우리 가족, <span className="text-gold-500">서로의 기운</span>이 어떻게 맞물릴까요
            </h3>

            {/* 구성원 칩 — 이름 첫 글자를 그 사람의 «넘치는 기운» 색으로 두른다.
                아바타 그림을 쓰지 않는 이유는 허브 첫 화면이기 때문이다(이미지 N장이 더 붙는다). */}
            <ul className="flex flex-wrap items-center gap-1.5">
              {shown.map((m) => (
                <li
                  key={m.targetId}
                  className="flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5"
                  style={{ borderColor: `${EL_COLOR[m.strongest]}55`, background: `${EL_COLOR[m.strongest]}14` }}
                >
                  <span
                    aria-hidden
                    className="grid h-5 w-5 place-items-center rounded-full font-serif text-[10px] font-bold"
                    style={{ background: `${EL_COLOR[m.strongest]}30`, color: '#E8E4DC' }}
                  >
                    {m.name.slice(0, 1)}
                  </span>
                  <span className="max-w-[64px] truncate font-serif text-[11.5px] text-ink-light/85">{m.name}</span>
                  <span className="font-serif text-[11px]" style={{ color: EL_COLOR[m.strongest] }}>
                    {EL_KO[m.strongest]}
                  </span>
                </li>
              ))}
              {rest > 0 && (
                <li className="rounded-full border border-white/10 px-2.5 py-1 font-serif text-[11px] text-ink-light/45">
                  +{rest}
                </li>
              )}
            </ul>

            {/* 한 줄 풀이 — 메워주는 짝이 있으면 그것을, 없으면 온 가족이 함께 채울 기운을.
                조사(이/가·을/를)가 갈리지 않는 문장만 쓴다 — 오행 이름이 값에 따라 바뀌므로. */}
            <p
              className="rounded-lg border border-white/[0.06] bg-black/25 px-3 py-2 text-[11.5px] font-light leading-relaxed text-ink-light/70"
              style={{ wordBreak: 'keep-all' }}
            >
              {summary.complement ? (
                <>
                  <b className="font-serif font-bold text-ink-light/90">{summary.complement.fromName}</b>님의 넘치는{' '}
                  <b className="font-serif font-bold" style={{ color: EL_COLOR[summary.complement.element] }}>
                    {EL_LABEL[summary.complement.element]}({EL_KO[summary.complement.element]})
                  </b>{' '}
                  기운이 <b className="font-serif font-bold text-ink-light/90">{summary.complement.toName}</b>님의
                  모자란 자리를 메웁니다
                </>
              ) : (
                <>
                  온 가족이 함께 채울 기운은{' '}
                  <b className="font-serif font-bold" style={{ color: EL_COLOR[summary.familyYongsin] }}>
                    {EL_LABEL[summary.familyYongsin]}({EL_KO[summary.familyYongsin]})
                  </b>
                  입니다
                </>
              )}
              <span className="ml-1 text-ink-light/35">· 타고난 기운 기준</span>
            </p>
          </>
        ) : (
          <>
            <h3
              className="font-serif text-[15px] font-bold leading-snug text-ink-light"
              style={{ wordBreak: 'keep-all' }}
            >
              가족을 등록하면 <span className="text-gold-500">서로의 기운</span>을 나란히 두고 볼 수 있습니다
            </h3>
            <p className="text-[11.5px] font-light leading-relaxed text-ink-light/55" style={{ wordBreak: 'keep-all' }}>
              한 분만 더 있어도 다섯 기운(목·화·토·금·수)을 견주어, 누가 누구의 모자란 자리를 메우는지 볼 수 있어요.
            </p>
          </>
        )}

        {/* CTA — 견줄 상대가 있으면 지도로, 없으면 등록으로. 문은 하나만 강조한다. */}
        <div className="flex items-center gap-2">
          <Link
            href={enough ? MAP_HREF : FAMILY_HREF}
            onClick={() =>
              trackEvent({
                action: enough ? 'family_map_open' : 'family_register_from_hub',
                category: 'engagement',
                label: 'hub_banner',
              })
            }
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-gold-500/45 bg-gold-500/[0.12] py-2.5 font-serif text-[12.5px] font-bold text-gold-200 transition-colors hover:bg-gold-500/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
          >
            {enough ? '우리 가족 기운 지도 열기' : '가족 등록하러 가기'}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          {enough && (
            <Link
              href={FAMILY_HREF}
              onClick={() =>
                trackEvent({ action: 'family_manage_from_hub', category: 'engagement', label: 'hub_banner' })
              }
              className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2.5 font-serif text-[12px] text-ink-light/65 transition-colors hover:text-ink-light focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
            >
              가족 관리
            </Link>
          )}
        </div>

        {/* 처방전 — 가족이 없어도 «내» 것은 볼 수 있다. 무료는 맛보기, 멤버십이 나머지를 연다(P0). */}
        <Link
          href={PRESCRIPTION_HREF}
          onClick={() => trackEvent({ action: 'prescription_from_hub', category: 'engagement', label: 'hub_banner' })}
          className="-mt-1 inline-flex items-center gap-1 self-start font-serif text-[11.5px] text-ink-light/50 transition-colors hover:text-gold-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
        >
          내 기운 처방전 — 모자란 기운을 무엇으로 채울지
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </motion.div>
  )
}
