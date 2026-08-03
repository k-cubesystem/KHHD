'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAnimAudit } from '@/hooks/use-anim-audit'
import { auditSummary } from '@/lib/domain/shrine/anim-audit'

/**
 * 연출 계측 배지 — **실기기 검수용**. `?anim=1` 이 붙었을 때만 뜬다.
 *
 * 이게 필요한 이유는 하나다: 신당 연출이 죽었는지 확인할 방법이 지금껏 "사람이 눈으로 보기"뿐이었고,
 * 그마저 헤드리스로는 못 하고(compositing 없음), 눈으로 봐도 "원래 저렇게 은은한 건가"와
 * "죽은 건가"가 구분이 안 됐다. 숫자로 보면 구분된다.
 *
 * ⚠️ 권한을 걸지 않았다. 이 배지는 **읽기만** 한다 — 화면에 이미 있는 요소의 애니메이션 상태를
 *    셀 뿐이고, 어떤 데이터도 드러내지 않는다. 권한을 붙이려면 역할을 신당 씬까지 끌고 내려와야
 *    하는데, 아무것도 새지 않는 계측에 그만한 배선을 놓는 건 과하다.
 */
export function AnimAuditBadge() {
  const params = useSearchParams()
  const enabled = params.get('anim') === '1'
  const [open, setOpen] = useState(false)
  const { result, measure } = useAnimAudit(enabled)

  if (!enabled) return null

  const bad = result.dead.length > 0

  return (
    <div className="pointer-events-auto fixed bottom-3 left-3 z-[70] max-w-[75vw] font-sans text-[11px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`rounded-lg border px-2.5 py-1.5 backdrop-blur ${
          bad ? 'border-seal/60 bg-seal/20 text-[#ffd9d9]' : 'border-white/15 bg-black/60 text-white/70'
        }`}
      >
        {bad ? '⚠ ' : '✓ '}
        {auditSummary(result)}
      </button>

      {open && (
        <div className="mt-1.5 space-y-1 rounded-lg border border-white/15 bg-black/80 p-2.5 leading-relaxed text-white/70 backdrop-blur">
          <Row label="죽음" tone="text-[#ff9c9c]" items={result.dead} hint="클래스는 붙었는데 안 돈다" />
          <Row label="일부" tone="text-[#ffd08a]" items={result.partial} hint="같은 클래스 중 일부만" />
          <Row label="구동" tone="text-[#9fe3b0]" items={result.alive} />
          <Row label="없음" tone="text-white/35" items={result.absent} hint="화면에 없다 — 사고가 아니다" />
          <button
            type="button"
            onClick={measure}
            className="mt-1 rounded border border-white/20 px-2 py-1 text-white/70"
          >
            다시 재기
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, tone, items, hint }: { label: string; tone: string; items: string[]; hint?: string }) {
  if (items.length === 0) return null
  return (
    <p className="break-all">
      <span className={`font-bold ${tone}`}>
        {label} {items.length}
      </span>
      {hint && <span className="text-white/30"> — {hint}</span>}
      <span className="block text-white/45">{items.join(' · ')}</span>
    </p>
  )
}
