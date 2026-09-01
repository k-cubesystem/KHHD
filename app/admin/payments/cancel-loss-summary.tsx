import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { logger } from '@/lib/utils/logger'
import { LOSS_CANCEL_MAX_AMOUNT, LOSS_CANCEL_MAX_COUNT, lossCapWindowStart } from '@/lib/domain/payment/loss-cap'

/**
 * 취소 「손실 처리」 가시성 패널 (최근 365일 이동창).
 *
 * 두 가지를 한 화면에서 본다.
 *  1) 실제로 회사가 떠안은 손실 — status='SUCCEEDED' & loss_credits>0
 *  2) 상한에 걸려 막힌 요청 — toss_error_code LIKE 'LOSS_CAP_%' (status='FAILED' 라 상한 집계엔 안 든다)
 *
 * 상한 정책 자체는 lib/domain/payment/loss-cap.ts 단일 출처.
 */

const WINDOW_ROW_LIMIT = 200

interface LossRow {
  id: string
  user_id: string
  loss_credits: number | null
  loss_amount: number | null
  refund_amount: number | null
  status: string
  toss_error_code: string | null
  created_at: string
}

interface ProfileRow {
  id: string
  email: string | null
  full_name: string | null
}

const won = (value: number) => `${value.toLocaleString('ko-KR')}원`

function when(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="border border-white/[0.10] bg-surface/40 p-4">
      <p className="text-[11px] uppercase tracking-widest text-ink-primary/40 mb-1.5">{label}</p>
      <p className="text-xl text-ink-primary font-medium tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-ink-primary/40 mt-1">{hint}</p>}
    </div>
  )
}

export async function CancelLossSummary() {
  // 레이아웃에서 이미 막지만, 이 컴포넌트만 다른 곳에 붙어도 안전하도록 한 번 더 본다.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if ((profile as { role?: string } | null)?.role !== 'admin') return null

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('payment_cancel_requests')
    .select('id, user_id, loss_credits, loss_amount, refund_amount, status, toss_error_code, created_at')
    .eq('kind', 'CHARGE')
    .gt('loss_credits', 0)
    .gte('created_at', lossCapWindowStart().toISOString())
    .order('created_at', { ascending: false })
    .limit(WINDOW_ROW_LIMIT)

  if (error) {
    logger.error(new Error('[Admin] 취소 손실 집계 조회 실패'), { message: error.message })
    return null
  }

  const rows = (data ?? []) as LossRow[]
  if (rows.length === 0) return null

  const realized = rows.filter((row) => row.status === 'SUCCEEDED')
  const capped = rows.filter((row) => (row.toss_error_code ?? '').startsWith('LOSS_CAP_'))
  const lossAmount = realized.reduce((sum, row) => sum + Math.max(0, row.loss_amount ?? 0), 0)
  const lossCredits = realized.reduce((sum, row) => sum + Math.max(0, row.loss_credits ?? 0), 0)

  const userIds = Array.from(new Set(rows.slice(0, 20).map((row) => row.user_id)))
  const { data: profileRows } = await admin.from('profiles').select('id, email, full_name').in('id', userIds)
  const profiles = new Map((((profileRows ?? []) as ProfileRow[]) ?? []).map((row) => [row.id, row]))

  // 상한을 이미 채운 계정 — 반복 시도가 몰리는 곳을 바로 짚어준다.
  const perUser = new Map<string, { count: number; amount: number }>()
  for (const row of realized) {
    const current = perUser.get(row.user_id) ?? { count: 0, amount: 0 }
    perUser.set(row.user_id, {
      count: current.count + 1,
      amount: current.amount + Math.max(0, row.loss_amount ?? 0),
    })
  }
  const exhausted = Array.from(perUser.values()).filter(
    (usage) => usage.count >= LOSS_CANCEL_MAX_COUNT || usage.amount >= LOSS_CANCEL_MAX_AMOUNT
  ).length

  return (
    <section className="mb-8">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="text-sm text-ink-primary/70 font-medium">취소 손실 처리 · 최근 365일</h2>
        <p className="text-[11px] text-ink-primary/40">
          상한 계정당 {LOSS_CANCEL_MAX_COUNT}회 / {won(LOSS_CANCEL_MAX_AMOUNT)}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat label="손실 처리 건수" value={`${realized.length}건`} />
        <Stat label="누적 손실" value={won(lossAmount)} hint={`복채 ${lossCredits}만냥 회수 실패`} />
        <Stat label="상한 차단" value={`${capped.length}건`} hint="막힌 요청" />
        <Stat label="상한 소진 계정" value={`${exhausted}명`} />
      </div>

      <div className="border border-white/[0.10]">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.08] hover:bg-transparent">
              <TableHead className="text-ink-primary/40 text-xs">일시</TableHead>
              <TableHead className="text-ink-primary/40 text-xs">회원</TableHead>
              <TableHead className="text-ink-primary/40 text-xs">손실</TableHead>
              <TableHead className="text-ink-primary/40 text-xs">환불</TableHead>
              <TableHead className="text-ink-primary/40 text-xs">처리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 20).map((row) => {
              const owner = profiles.get(row.user_id)
              const blocked = (row.toss_error_code ?? '').startsWith('LOSS_CAP_')
              return (
                <TableRow key={row.id} className="border-white/[0.08] hover:bg-surface/30">
                  <TableCell className="text-xs text-ink-primary/40">{when(row.created_at)}</TableCell>
                  <TableCell>
                    <span className="block text-sm text-ink-primary/85">{owner?.full_name || 'Unknown'}</span>
                    <span className="block text-xs text-ink-primary/40">{owner?.email ?? row.user_id.slice(0, 8)}</span>
                  </TableCell>
                  <TableCell className="text-sm text-ink-primary/85 tabular-nums">
                    {won(Math.max(0, row.loss_amount ?? 0))}
                    <span className="block text-[11px] text-ink-primary/40">{row.loss_credits ?? 0}만냥</span>
                  </TableCell>
                  <TableCell className="text-sm text-ink-primary/55 tabular-nums">
                    {won(Math.max(0, row.refund_amount ?? 0))}
                  </TableCell>
                  <TableCell>
                    {blocked ? (
                      <Badge
                        variant="secondary"
                        className="bg-warning-light text-warning-text border border-warning-border"
                      >
                        상한 차단
                      </Badge>
                    ) : row.status === 'SUCCEEDED' ? (
                      <Badge variant="secondary" className="bg-error-light text-error-text border border-error-border">
                        손실 확정
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-white/30 text-ink-primary/55 border border-white/[0.08]">
                        {row.status}
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  )
}
