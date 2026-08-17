'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { RemedyItem, RemedySet } from '@/lib/domain/remedy/remedy'

/**
 * 개운 처방 패널 — **유료 풀이 전체가 함께 쓰는 하나의 화면 조각**.
 *
 * 테마·관상·손금·풍수·궁합·종합사주가 각자 처방을 그리면 그 순간 여섯 벌의 문구가 생기고,
 * 항목을 하나 더할 때마다 여섯 곳을 고쳐야 한다. 처방을 만드는 곳이 하나(`lib/domain/remedy`)
 * 이듯 그리는 곳도 하나다.
 *
 * ## 🔴 항목은 엔진 값 그대로 그린다
 * 라벨·값·근거·행동은 전부 서버가 계산한 결정론 값이다. 화면에서 문장을 다시 만들지 않는다 —
 * 그러면 같은 처방이 화면마다 다른 말로 보인다.
 */

/**
 * 처방 한 줄.
 *
 * 🔴 `<li>` 는 **카드가 아니라 카드+주석을 감싸는 자리**다. 예전에는 카드 자체가 `<li>` 였고
 *    주석을 붙이려고 바깥에 `<li className="contents">` 를 한 겹 더 씌워 **`<li>` 안에 `<li>`** 가
 *    됐다. 브라우저 파서가 여는 `<li>` 를 조기 종료시켜 서버 HTML 과 클라이언트 트리가 어긋난다
 *    (하이드레이션 오류). 이 패널은 6화면 공용이라 한 번 어긋나면 여섯 군데가 같이 어긋난다.
 */
function RemedyRow({ item, dim = false, note }: { item: RemedyItem; dim?: boolean; note?: string }) {
  return (
    <li>
      <div
        className={`rounded-xl border p-3 ${
          dim ? 'border-white/[0.06] bg-white/[0.02]' : 'border-white/10 bg-surface/40'
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`font-serif text-[13px] ${dim ? 'text-ink-light/70' : 'text-gold-300'}`}>{item.label}</span>
          <span className={`text-[13px] ${dim ? 'text-ink-light/60' : 'text-ink-light'}`}>{item.value}</span>
        </div>
        {!dim && <p className="mt-1 text-[11px] font-light text-ink-light/45">{item.basis}</p>}
        <p
          className={`mt-1.5 text-[12px] font-light leading-relaxed ${dim ? 'text-ink-light/50' : 'text-gold-200/70'}`}
        >
          → {item.action}
        </p>
      </div>
      {note && <p className="mt-1 px-3 text-[12px] font-light leading-relaxed text-ink-light/70">{note}</p>}
    </li>
  )
}

/**
 * 유료 — 처방 전량.
 * `notes` 는 AI 가 각 항목을 「왜 나에게」로 풀어 쓴 문장. 없으면 항목만 그린다(관상·손금·풍수는
 * 처방을 프롬프트에 태우지 않고 결과에 결정론으로 얹으므로 해설이 없다 — AI 비용 0).
 */
export function RemedyPanel({
  remedy,
  notes = [],
  title = '채우면 숨이 트이는 것',
}: {
  remedy: RemedySet
  notes?: readonly string[]
  title?: string
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="font-serif text-sm text-gold-500/80">{title}</h2>
        <span className="text-[10px] text-ink-light/40">{remedy.items.length}가지</span>
      </div>

      <ul className="space-y-2">
        {remedy.items.map((item, index) => (
          <RemedyRow key={`${item.kind}-${item.label}`} item={item} note={notes[index]} />
        ))}
      </ul>

      <h3 className="pt-1 font-serif text-sm text-ink-light/60">덜어내면 가벼워지는 것</h3>
      <ul className="space-y-2">
        {remedy.avoid.map((item) => (
          <RemedyRow key={`avoid-${item.label}`} item={item} dim />
        ))}
      </ul>
    </section>
  )
}

/**
 * 무료 — 맛보기 하나 + 잠긴 개수.
 *
 * 🔴 후킹은 **사실 위에서만** 성립한다. 한 가지는 진짜로 주고, 남은 개수는 실제 배열 길이를
 *    그대로 쓴다. 숫자를 부풀리면 그 순간 거짓 표시가 된다.
 */
export function RemedyTeaserPanel({
  preview,
  hiddenCount,
  ctaHref,
  ctaLabel,
  title = '채우면 숨이 트이는 것',
}: {
  preview: RemedyItem
  hiddenCount: number
  ctaHref?: string
  ctaLabel?: string
  title?: string
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-sm text-gold-500/80">{title}</h2>

      <ul className="space-y-2">
        <RemedyRow item={preview} />
      </ul>

      <div className="rounded-xl border border-dashed border-gold-500/25 bg-gold-500/[0.04] p-4 text-center">
        <p className="text-[12px] font-light leading-relaxed text-ink-light/70">
          이 사주에 맞는 처방이 <span className="font-bold text-gold-300">{hiddenCount}가지</span> 더 있습니다.
          <br />
          앉는 방향, 몸이 붙는 시간, 흐름이 트이는 철, 집에서 손댈 자리까지.
        </p>
        {ctaHref && ctaLabel && (
          <Link
            href={ctaHref}
            className="mt-3 inline-flex items-center gap-1 rounded-lg border border-gold-500/40 bg-gold-500/[0.12] px-4 py-2 text-[12px] font-bold text-gold-300"
          >
            {ctaLabel}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
        <p className="mt-2 text-[10px] text-ink-light/35">시기와 행동, 되짚어 볼 과거도 함께 나옵니다.</p>
      </div>
    </section>
  )
}
