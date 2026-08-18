import Link from 'next/link'
import { Users } from 'lucide-react'
import { AdminCard } from '@/components/admin/ui/admin-card'
import { getGeminiUserUsage } from '@/app/actions/admin/gemini-usage'

/**
 * **누가 · 무엇에 · 얼마나** 썼는지.
 *
 * 🔴 액션별 합계만으로는 «한 사람이 몰아 쓰는 것»이 안 보인다. 복채를 안 받는 내부 기능
 *    (고민상담·신탁)은 특히 회원 단위로만 드러난다 — 원가는 나가는데 매출이 0인 자리다.
 */
export async function GeminiUserUsage({ daysBack = 30 }: { daysBack?: number }) {
  const rows = await getGeminiUserUsage(daysBack)
  const totalKrw = rows.reduce((sum, r) => sum + r.cost_krw, 0)

  return (
    <AdminCard
      title="회원별 사용량"
      subtitle={`최근 ${daysBack}일 · 원가 많은 순 · 합계 ${totalKrw.toLocaleString('ko-KR')}원`}
      icon={<Users className="h-3.5 w-3.5 text-gold-500" aria-hidden />}
    >
      {rows.length === 0 ? (
        <p className="py-6 text-center font-sans text-[12px] text-ink-primary/35">기간 내 호출이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="py-2 text-left font-sans text-[10.5px] font-medium tracking-wider text-ink-primary/40">
                  회원
                </th>
                <th className="py-2 text-left font-sans text-[10.5px] font-medium tracking-wider text-ink-primary/40">
                  무엇에 썼나 (상위 3)
                </th>
                <th className="py-2 text-right font-sans text-[10.5px] font-medium tracking-wider text-ink-primary/40">
                  호출
                </th>
                <th className="py-2 text-right font-sans text-[10.5px] font-medium tracking-wider text-ink-primary/40">
                  토큰
                </th>
                <th className="py-2 text-right font-sans text-[10.5px] font-medium tracking-wider text-ink-primary/40">
                  원가
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className="border-b border-white/[0.04] last:border-0">
                  <td className="py-2.5 pr-3 align-top">
                    <span className="block max-w-[14rem] truncate font-sans text-[12px] text-ink-primary/85">
                      {r.full_name ?? r.email ?? '이름 없음'}
                    </span>
                    {r.email && r.full_name && (
                      <span className="block max-w-[14rem] truncate font-sans text-[10.5px] text-ink-primary/35">
                        {r.email}
                      </span>
                    )}
                    {r.user_id !== 'system' && (
                      <Link
                        href={`/admin/users/${r.user_id}`}
                        className="font-sans text-[10.5px] text-gold-500/70 hover:text-gold-500"
                      >
                        상세 보기
                      </Link>
                    )}
                  </td>
                  <td className="py-2.5 pr-3 align-top">
                    <ul className="space-y-0.5">
                      {r.top_actions.map((a) => (
                        <li key={a.action_type} className="font-sans text-[11px] text-ink-primary/60">
                          {a.label}
                          <span className="text-ink-primary/30">
                            {' '}
                            · {a.calls}회 · {a.cost_krw.toLocaleString('ko-KR')}원
                          </span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="py-2.5 text-right align-top font-sans text-[12px] tabular-nums text-ink-primary/70">
                    {r.calls.toLocaleString('ko-KR')}
                  </td>
                  <td className="py-2.5 text-right align-top font-sans text-[12px] tabular-nums text-ink-primary/50">
                    {r.total_tokens.toLocaleString('ko-KR')}
                  </td>
                  <td className="py-2.5 text-right align-top font-serif text-[12.5px] font-bold tabular-nums text-gold-500">
                    {r.cost_krw.toLocaleString('ko-KR')}원
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminCard>
  )
}
