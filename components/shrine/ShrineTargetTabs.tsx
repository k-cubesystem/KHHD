'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { TargetSelect } from '@/components/destiny/target-select'

/**
 * 신당 대상 선택 — 본인 | 가족들. 고민상담 「점사 대상」과 동일한 대상 축.
 *
 * 🔴 2026-08-25 CEO 지시로 **아바타 탭 줄 → 드롭다운**이 됐다(사람 고르기는 전 화면 드롭다운).
 *    정령·신위 그림은 사라지지 않았다 — `TargetSelect` 가 항목마다 같은 아바타를 그린다.
 *
 * 🔴 옆의 「가족관리」는 **가족관리로 가는 유일한 문**이다(2026-08-01 하단 내비에서 옮겨 왔다).
 *    가족이 0명이어도 이 줄은 그린다 — 문이 사라지면 등록 자체를 할 수 없어 갇힌다.
 *    드롭다운 안의 항목으로 집어넣지 말 것: 「고르는 것」과 「관리하러 가는 것」은 다른 일이다.
 */

export interface ShrineTargetTab {
  /** null = 본인 신당 */
  id: string | null
  name: string
  /** 가족: 오행 정령 avatar_id / 본인: 프로필 이미지 URL */
  avatarId?: string | null
  avatarUrl?: string | null
}

interface Props {
  tabs: ShrineTargetTab[]
  activeId: string | null
}

/** 본인 행의 자리표시 id — 가족 id 는 uuid 라 이 문자열과 부딪히지 않는다. */
const SELF_ID = 'self'

export function ShrineTargetTabs({ tabs, activeId }: Props) {
  const router = useRouter()

  const options = tabs.map((t) => ({
    id: t.id ?? SELF_ID,
    name: t.id ? t.name : '나',
    relation: t.id ? null : '본인',
    avatarId: t.avatarId,
    avatarUrl: t.avatarUrl,
  }))

  return (
    <div className="px-1 pb-3">
      <TargetSelect
        label="신당의 주인"
        targets={options}
        value={activeId ?? SELF_ID}
        onChange={(id) => router.push(id === SELF_ID ? '/protected/shrine' : `/protected/shrine?member=${id}`)}
        action={
          <Link
            href="/protected/family"
            aria-label="가족관리 페이지로 이동"
            className="flex items-center gap-1 text-[11px] font-sans text-ink-light/45 transition-colors hover:text-gold-500"
          >
            <Users className="h-3.5 w-3.5" />
            가족관리
          </Link>
        }
      />
    </div>
  )
}
