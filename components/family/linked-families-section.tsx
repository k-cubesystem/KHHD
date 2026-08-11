import { Home, ListChecks, Users } from 'lucide-react'
import type { LinkedFamily } from '@/app/actions/family-invite'

/**
 * 「내가 연결된 가족」 — 초대를 수락해 다른 사람의 가족 자리에 붙은 계정이 보는 칸.
 *
 * v1 폭은 **읽기뿐**이다: 어느 가족의 어느 자리인지, 그 자리의 신당과 미션이 어디까지 왔는지.
 * 수정·삭제 권한은 넘어가지 않는다(RLS 도 SELECT 정책만 열려 있다).
 */
export function LinkedFamiliesSection({ families }: { families: LinkedFamily[] }) {
  if (families.length === 0) return null

  return (
    <section className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-4">
      <header className="flex items-center gap-2">
        <Users className="h-4 w-4 text-gold-400" strokeWidth={1.6} />
        <h2 className="font-serif text-[14px] font-medium text-ink-light">내가 연결된 가족</h2>
      </header>

      <ul className="mt-3 space-y-2">
        {families.map((family) => (
          <li key={family.memberId} className="rounded-lg border border-white/[0.07] bg-black/25 px-3 py-2.5">
            <p className="text-[13px] text-ink-light">
              {family.ownerName}님의 가족
              <span className="ml-1.5 text-[11px] font-light text-ink-light/45">
                {family.memberName} · {family.relationship}
              </span>
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-light text-ink-light/50">
              <span className="flex items-center gap-1">
                <Home className="h-3 w-3" strokeWidth={1.6} />
                {family.shrineId ? (family.shrineName ?? '신당') : '신당 없음'}
              </span>
              <span className="flex items-center gap-1 tabular-nums">
                <ListChecks className="h-3 w-3" strokeWidth={1.6} />
                미션 {family.missionsCompleted}/{family.missionsTotal}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
