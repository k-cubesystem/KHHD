'use client'

import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { QuickAddTarget } from '@/components/destiny/quick-add-target'
import type { MemberCategory } from '@/lib/domain/family/member-category'

/**
 * 대상 고르는 자리 바로 아래 붙는 «인연 추가» — 화면을 떠나지 않고 사람을 하나 더한다.
 *
 * ## 🔴 왜 화면마다 붙이나
 * 공용 바텀시트(`components/destiny/target-selector.tsx`)에 먼저 넣었더니 **아무 데도 안 보였다.**
 * 그 컴포넌트를 쓰는 화면이 하나도 없었기 때문이다(2026-08-16 확인) — 풀이 화면들은 저마다
 * `<Select>` 를 직접 들고 있다. 그래서 «선택기»를 고치는 대신 **각 화면의 선택 UI 아래에 얹는
 * 작은 조각**으로 만들었다. 붙이는 비용이 한 줄이면 빠지는 화면이 생기지 않는다.
 *
 * 🔴 `onAdded` 는 **방금 만든 사람을 곧바로 고르는** 책임까지 진다. 목록만 새로 고치면
 *    사용자가 자기가 만든 사람을 다시 찾아 눌러야 하고, 그러면 나가지 않게 만든 이유가 반감된다.
 */
export function AddRelationInline({
  onAdded,
  defaultCategory = 'acquaintance',
  label = '인연 추가 — 가족·지인',
}: {
  onAdded: (id: string) => void | Promise<void>
  defaultCategory?: MemberCategory
  label?: string
}) {
  const [open, setOpen] = useState(false)

  if (open) {
    return (
      <QuickAddTarget
        defaultCategory={defaultCategory}
        onAdded={async (id) => {
          setOpen(false)
          await onAdded(id)
        }}
        onCancel={() => setOpen(false)}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gold-500/30 bg-gold-500/[0.04] py-2.5 text-[12px] text-gold-300/90 transition-colors hover:border-gold-500/50 hover:bg-gold-500/[0.08]"
    >
      <UserPlus className="h-3.5 w-3.5" />
      {label}
    </button>
  )
}
