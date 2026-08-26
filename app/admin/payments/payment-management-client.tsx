'use client'

import { useState, useEffect , useCallback } from 'react'
import { AdminPayment, getPayments } from './actions'
import {
  describePaymentSettlement,
  isPaymentStatusFilter,
  type PaymentSettlement,
  type PaymentStatusFilter,
} from './payment-display'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, FileText } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function PaymentManagementClient() {
  const [payments, setPayments] = useState<AdminPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<PaymentStatusFilter>('all')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  // 적재 함수를 메모이즈해 이펙트 의존성으로 쓴다 — 함수 선언을 의존성 밖에 두면
  // 필터·쪽이 바뀌었는데도 옛 값을 잡은 함수가 도는 «낡은 클로저»가 생긴다.
  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const { data, total } = await getPayments(page, limit, statusFilter)
      setPayments(data)
      setTotal(total)
    } catch {
      toast.error('결제 내역을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }, [page, limit, statusFilter])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const totalPages = Math.ceil(total / limit)

  /**
   * 상태 배지 — 취소가 상태보다 먼저다.
   * 부분 취소는 status 가 'completed' 로 남기 때문에 status 만 보면 「성공」으로 보인다(이번 수복 대상).
   */
  const getStatusBadge = (status: string, settlement: PaymentSettlement) => {
    if (settlement.kind === 'full') {
      return (
        <Badge className="bg-rose-500/10 text-rose-300 border border-rose-500/30 text-[9px] md:text-[10px]">
          전액취소
        </Badge>
      )
    }
    if (settlement.kind === 'partial') {
      return (
        <Badge className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[9px] md:text-[10px]">
          부분취소
        </Badge>
      )
    }
    switch (status) {
      case 'completed':
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] md:text-[10px]">
            성공
          </Badge>
        )
      case 'failed':
        return (
          <Badge className="bg-red-500/10 text-red-400 border border-red-500/20 text-[9px] md:text-[10px]">실패</Badge>
        )
      case 'test_charge':
        return (
          <Badge className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[9px] md:text-[10px]">
            테스트
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-ink-primary/40 border-white/[0.08] text-[9px] md:text-[10px]">
            {status}
          </Badge>
        )
    }
  }

  /** 금액 — 취소가 있으면 «실결제액» 을 크게, 원 청구액은 취소선으로 함께 보여 준다. */
  const renderAmount = (payment: AdminPayment, settlement: PaymentSettlement, size: 'row' | 'card') => (
    <div className="flex flex-col items-start gap-0.5">
      <span
        className={`font-mono font-bold tabular-nums ${size === 'card' ? 'text-base' : ''} ${
          settlement.kind === 'none' ? 'text-ink-primary' : 'text-amber-200'
        }`}
      >
        ₩{settlement.net.toLocaleString()}
      </span>
      {settlement.kind !== 'none' && (
        <span className="text-[10px] font-mono text-ink-primary/40">
          <span className="line-through">₩{payment.amount.toLocaleString()}</span>
          <span className={`ml-1.5 ${settlement.kind === 'full' ? 'text-rose-300/90' : 'text-amber-300/90'}`}>
            {settlement.kind === 'full' ? '전액취소' : '부분취소'} −₩{settlement.cancelled.toLocaleString()}
          </span>
        </span>
      )}
    </div>
  )

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl md:text-2xl font-black text-ink-primary font-serif">결제 내역</h1>
        <p className="text-xs md:text-sm text-ink-primary/40">회원들의 결제 및 충전 기록을 확인하세요.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs md:text-sm text-ink-primary/40 font-medium">상태 필터:</span>
          <Select
            value={statusFilter}
            onValueChange={(val) => {
              if (!isPaymentStatusFilter(val)) return
              setStatusFilter(val)
              setPage(1)
            }}
          >
            <SelectTrigger className="w-[140px] md:w-[180px] h-8 md:h-9 bg-surface/50 border-white/[0.12] text-ink-primary/85 text-xs md:text-sm">
              <SelectValue placeholder="모든 상태" />
            </SelectTrigger>
            <SelectContent className="bg-surface border-white/[0.08]">
              <SelectItem value="all" className="text-ink-primary/70">
                모든 결제
              </SelectItem>
              <SelectItem value="completed" className="text-emerald-400">
                결제 성공
              </SelectItem>
              <SelectItem value="partial_cancel" className="text-amber-300">
                부분 취소
              </SelectItem>
              <SelectItem value="refunded" className="text-rose-300">
                전액 취소
              </SelectItem>
              <SelectItem value="test_charge" className="text-yellow-400">
                테스트 충전
              </SelectItem>
              <SelectItem value="failed" className="text-red-400">
                결제 실패
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Pagination */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="h-8 w-8 md:h-9 md:w-9 bg-surface/50 border-white/[0.12] text-ink-primary/55 hover:bg-surface hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
          <span className="text-xs md:text-sm font-medium text-ink-primary/55 px-2 font-mono">
            {page} / {totalPages || 1}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="h-8 w-8 md:h-9 md:w-9 bg-surface/50 border-white/[0.12] text-ink-primary/55 hover:bg-surface hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </Button>
        </div>
      </div>

      {/* Desktop Table - hidden on mobile */}
      <div className="hidden md:block rounded-xl border border-white/[0.08] bg-gradient-to-br from-surface/30 to-surface/20 overflow-hidden shadow-lg">
        <Table>
          <TableHeader className="bg-surface/50">
            <TableRow className="border-white/[0.08] hover:bg-surface/50">
              <TableHead className="text-ink-primary/55 font-serif text-xs">주문 ID</TableHead>
              <TableHead className="text-ink-primary/55 font-serif text-xs">사용자</TableHead>
              <TableHead className="text-ink-primary/55 font-serif text-xs">금액</TableHead>
              <TableHead className="text-ink-primary/55 font-serif text-xs">크레딧</TableHead>
              <TableHead className="text-ink-primary/55 font-serif text-xs">상태</TableHead>
              <TableHead className="text-ink-primary/55 font-serif text-xs">일시</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell>
                    <div className="h-4 w-32 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-20 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-10 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-6 w-16 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                  <TableCell>
                    <div className="h-4 w-24 bg-surface/50 rounded animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow className="border-white/[0.08]">
                <TableCell colSpan={6} className="h-40 text-center text-ink-primary/40">
                  결제 내역이 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              <AnimatePresence>
                {payments.map((payment) => {
                  const settlement = describePaymentSettlement(payment)
                  return (
                    <motion.tr
                      key={payment.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-white/[0.08] hover:bg-surface/30 transition-colors group"
                    >
                      <TableCell className="font-mono text-xs text-ink-primary/40">{payment.order_id}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm text-ink-primary/85 font-medium">
                            {payment.profiles?.full_name || 'Unknown'}
                          </span>
                          <span className="text-xs text-ink-primary/40">{payment.profiles?.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{renderAmount(payment, settlement, 'row')}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="bg-gold-500/10 text-gold-400 border border-gold-500/20 text-xs"
                        >
                          +{payment.credits_purchased}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(payment.status, settlement)}</TableCell>
                      <TableCell className="text-xs text-ink-primary/40">
                        {new Date(payment.created_at).toLocaleString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {settlement.kind !== 'none' && payment.cancelled_at && (
                          <span className="block text-[10px] text-ink-primary/30">
                            취소{' '}
                            {new Date(payment.cancelled_at).toLocaleString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </TableCell>
                    </motion.tr>
                  )
                })}
              </AnimatePresence>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-3.5 bg-surface/30 rounded-xl border border-white/[0.08]">
              <div className="h-4 w-32 bg-surface/50 rounded animate-pulse mb-3" />
              <div className="h-3 w-48 bg-surface/50 rounded animate-pulse mb-2" />
              <div className="h-8 w-24 bg-surface/50 rounded animate-pulse" />
            </div>
          ))
        ) : payments.length === 0 ? (
          <div className="p-8 text-center bg-surface/30 rounded-xl border border-white/[0.08]">
            <FileText className="w-12 h-12 mx-auto mb-3 text-ink-primary/20" />
            <p className="text-sm text-ink-primary/40">결제 내역이 없습니다.</p>
          </div>
        ) : (
          <AnimatePresence>
            {payments.map((payment) => {
              const settlement = describePaymentSettlement(payment)
              return (
                <motion.div
                  key={payment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative p-3.5 bg-gradient-to-br from-surface/30 to-surface/20 rounded-xl border border-white/[0.08] hover:border-gold-500/30 transition-all duration-300 overflow-hidden group"
                >
                  {/* Noise Overlay */}
                  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                  {/* Payment Info */}
                  <div className="relative space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-ink-primary/85 truncate text-sm">
                          {payment.profiles?.full_name || '익명'}
                        </p>
                        <p className="text-xs text-ink-primary/40 truncate">{payment.profiles?.email}</p>
                      </div>
                      {getStatusBadge(payment.status, settlement)}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.08]">
                      <div className="min-w-0">
                        <p className="text-xs text-ink-primary/40">
                          {settlement.kind === 'none' ? '결제 금액' : '실결제액'}
                        </p>
                        {renderAmount(payment, settlement, 'card')}
                      </div>
                      <Badge className="bg-gold-500/10 text-gold-400 border border-gold-500/20 text-xs shrink-0">
                        +{payment.credits_purchased}장
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-white/[0.08]">
                      <p className="text-[10px] text-ink-primary/30 font-mono">{payment.order_id}</p>
                      <p className="text-[10px] text-ink-primary/30 mt-0.5">
                        {new Date(payment.created_at).toLocaleString('ko-KR')}
                      </p>
                      {settlement.kind !== 'none' && payment.cancelled_at && (
                        <p className="text-[10px] text-ink-primary/30 mt-0.5">
                          취소 {new Date(payment.cancelled_at).toLocaleString('ko-KR')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Shine Effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
