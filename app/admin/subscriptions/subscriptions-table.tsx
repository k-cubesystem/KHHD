'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSubscription, updateSubscriptionStatus, grantTalismans } from './actions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Gift, MoreHorizontal } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface SubscriptionsTableProps {
  subscriptions: AdminSubscription[]
  currentPage: number
  totalPages: number
  total: number
  statusFilter: string
}

const statusConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
  ACTIVE: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/20',
    label: '구독 중',
  },
  CANCELLED: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/20',
    label: '해지 예정',
  },
  EXPIRED: {
    bg: 'bg-stone-700/30',
    text: 'text-stone-500',
    border: 'border-stone-600/30',
    label: '만료됨',
  },
  PAYMENT_FAILED: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/20',
    label: '결제 실패',
  },
  PAUSED: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    label: '일시 중지',
  },
  PENDING: {
    bg: 'bg-stone-700/30',
    text: 'text-stone-500',
    border: 'border-stone-600/30',
    label: '대기 중',
  },
}

export function SubscriptionsTable({
  subscriptions,
  currentPage,
  totalPages,
  total,
  statusFilter,
}: SubscriptionsTableProps) {
  const router = useRouter()
  const [isGrantDialogOpen, setIsGrantDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [grantAmount, setGrantAmount] = useState('10')
  const [grantReason, setGrantReason] = useState('')

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  }

  const handleStatusFilterChange = (value: string) => {
    router.push(`/admin/subscriptions?status=${value}&page=1`)
  }

  const handlePageChange = (page: number) => {
    router.push(`/admin/subscriptions?status=${statusFilter}&page=${page}`)
  }

  const handleStatusChange = async (subscriptionId: string, newStatus: string) => {
    const result = await updateSubscriptionStatus(subscriptionId, newStatus)
    if (result.success) {
      toast.success('상태가 변경되었습니다.')
      router.refresh()
    } else {
      toast.error(result.error || '상태 변경에 실패했습니다.')
    }
  }

  const handleGrantTalismans = async () => {
    if (!selectedUserId) return

    const amount = parseInt(grantAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('유효한 수량을 입력하세요.')
      return
    }

    const result = await grantTalismans(selectedUserId, amount, grantReason || '관리자 수동 지급')
    if (result.success) {
      toast.success(`부적 ${amount}장이 지급되었습니다.`)
      setIsGrantDialogOpen(false)
      setSelectedUserId(null)
      setGrantAmount('10')
      setGrantReason('')
    } else {
      toast.error(result.error || '부적 지급에 실패했습니다.')
    }
  }

  const openGrantDialog = (userId: string) => {
    setSelectedUserId(userId)
    setIsGrantDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-serif font-bold text-stone-100">구독 관리</h1>
        <p className="text-xs text-stone-500">회원 구독 현황 및 부적 수동 지급을 관리합니다.</p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-500 font-medium">상태 필터:</span>
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[140px] h-8 bg-stone-900/50 border-stone-700/50 text-stone-200 text-xs">
              <SelectValue placeholder="상태 필터" />
            </SelectTrigger>
            <SelectContent className="bg-stone-900 border-stone-700">
              <SelectItem value="ALL" className="text-stone-300">
                전체
              </SelectItem>
              <SelectItem value="ACTIVE" className="text-emerald-400">
                구독 중
              </SelectItem>
              <SelectItem value="CANCELLED" className="text-amber-400">
                해지 예정
              </SelectItem>
              <SelectItem value="EXPIRED" className="text-stone-500">
                만료됨
              </SelectItem>
              <SelectItem value="PAYMENT_FAILED" className="text-red-400">
                결제 실패
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-stone-500 font-mono">총 {total}명</span>
      </div>

      {/* Mobile Card List */}
      <div className="space-y-2.5">
        {subscriptions.length === 0 ? (
          <div className="p-8 text-center bg-stone-900/30 rounded-xl border border-stone-700/30">
            <p className="text-sm text-stone-500">구독자가 없습니다.</p>
          </div>
        ) : (
          <AnimatePresence>
            {subscriptions.map((sub) => {
              const sc = statusConfig[sub.status] || statusConfig.PENDING
              return (
                <motion.div
                  key={sub.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 rounded-xl border border-stone-700/30 hover:border-gold-500/20 transition-all overflow-hidden group"
                >
                  <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                  <div className="relative flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-stone-200 text-sm truncate">
                        {sub.profile?.email || 'Unknown'}
                      </p>
                      <p className="text-[10px] text-stone-600 font-mono mt-0.5">
                        {sub.user_id.slice(0, 8)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        className={`${sc.bg} ${sc.text} border ${sc.border} text-[9px] font-bold`}
                      >
                        {sc.label}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-stone-500 hover:text-gold-400 hover:bg-stone-800/50"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-stone-900 border-stone-700 text-stone-200"
                        >
                          <DropdownMenuItem
                            onClick={() => openGrantDialog(sub.user_id)}
                            className="text-xs hover:bg-stone-800 cursor-pointer"
                          >
                            <Gift className="w-3.5 h-3.5 mr-2 text-gold-400" />
                            부적 지급
                          </DropdownMenuItem>
                          {sub.status === 'ACTIVE' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sub.id, 'PAUSED')}
                              className="text-xs hover:bg-stone-800 cursor-pointer"
                            >
                              일시 중지
                            </DropdownMenuItem>
                          )}
                          {sub.status === 'PAUSED' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sub.id, 'ACTIVE')}
                              className="text-xs hover:bg-stone-800 cursor-pointer"
                            >
                              재활성화
                            </DropdownMenuItem>
                          )}
                          {sub.status !== 'CANCELLED' && sub.status !== 'EXPIRED' && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(sub.id, 'CANCELLED')}
                              className="text-xs text-red-400 hover:bg-red-500/10 cursor-pointer"
                            >
                              강제 해지
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="relative grid grid-cols-3 gap-2 pt-2.5 border-t border-stone-700/30">
                    <div>
                      <p className="text-[9px] text-stone-600 mb-0.5">플랜</p>
                      <p className="text-xs text-stone-300 font-medium truncate">
                        {sub.plan?.name || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-stone-600 mb-0.5">구독 시작</p>
                      <p className="text-xs text-stone-400 font-mono">
                        {formatDate(sub.current_period_start)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-stone-600 mb-0.5">
                        {sub.status === 'CANCELLED' ? '종료일' : '다음 결제'}
                      </p>
                      <p className="text-xs text-stone-400 font-mono">
                        {sub.status === 'CANCELLED'
                          ? formatDate(sub.current_period_end)
                          : formatDate(sub.next_billing_date)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="h-8 w-8 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-mono text-stone-400 px-2">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="h-8 w-8 bg-stone-900/50 border-stone-700/50 text-stone-400 hover:bg-stone-800 hover:text-gold-400 hover:border-gold-500/30 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Grant Talismans Dialog */}
      <Dialog open={isGrantDialogOpen} onOpenChange={setIsGrantDialogOpen}>
        <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-stone-100">부적 수동 지급</DialogTitle>
            <DialogDescription className="text-stone-500 text-xs">
              선택한 사용자에게 부적을 지급합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount" className="text-xs text-stone-300 font-medium">
                지급 수량
              </Label>
              <Input
                id="amount"
                type="number"
                min="1"
                max="100"
                value={grantAmount}
                onChange={(e) => setGrantAmount(e.target.value)}
                className="h-9 bg-stone-800/50 border-stone-700/50 text-stone-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="reason" className="text-xs text-stone-300 font-medium">
                지급 사유 (선택)
              </Label>
              <Input
                id="reason"
                value={grantReason}
                onChange={(e) => setGrantReason(e.target.value)}
                placeholder="예: 이벤트 당첨, 고객 보상 등"
                className="h-9 bg-stone-800/50 border-stone-700/50 text-stone-200 text-sm placeholder:text-stone-600"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setIsGrantDialogOpen(false)}
              className="h-9 text-xs border-stone-700 text-stone-400 hover:bg-stone-800"
            >
              취소
            </Button>
            <Button
              onClick={handleGrantTalismans}
              className="h-9 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20"
            >
              지급하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
