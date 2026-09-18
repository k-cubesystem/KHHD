'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/auth'
import { updateUserRole, deleteUser, adjustUserPasses, updateUserSubscription } from '../actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AdminCard } from '@/components/admin/ui/admin-card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Trash2, Users, FileText, Ticket, Crown, Edit, Save, X, Flame, ArrowUpDown } from 'lucide-react'
import { describePaymentSettlement } from '../../payments/payment-display'
import { PASS_VALID_DAYS, heldPassCount, passSummaryLines, type PassSummary } from '@/lib/domain/entitlement/pass'
import { deductKeyLabel } from '@/lib/domain/payment/feature-costs'
import type { PassLedgerEntry } from '@/lib/services/entitlement'

interface AdminUserProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
  created_at: string | null
}

interface AdminSajuRecord {
  id: string
  name: string
  birth_year: number
  birth_month: number
  birth_day: number
  ganji_year: string
  ganji_month: string
  ganji_day: string
  created_at: string
}

interface AdminFamilyMember {
  id: string
  name: string
  relationship: string
  birth_year: number
  birth_month: number
  birth_day: number
}

interface AdminPaymentRecord {
  id: string
  amount: number
  /** 누적 취소 금액(원) — 부분 취소는 status 가 'completed' 로 남아 이 값만이 단서다 */
  cancelled_amount?: number | null
  order_id: string
  status: string
  created_at: string
}

interface AdminSubscription {
  /** 정기결제 구독은 current_period_end 만, 관리자 부여는 둘 다 채운다 — 판정 기준(lib/auth/subscription)과 같은 순서로 읽는다. */
  current_period_end: string | null
  end_date: string | null
  membership_plans?: {
    tier: string
  }
}

const LEDGER_KIND_LABEL: Record<PassLedgerEntry['kind'], string> = {
  grant: '발급',
  consume: '사용',
  refund: '되돌림',
  revoke: '회수',
}

const LEDGER_POCKET_LABEL: Record<PassLedgerEntry['pocket'], string> = {
  membership: '멤버십 이번 달 몫',
  pass: '보유 이용권',
}

const isLedgerPlus = (kind: PassLedgerEntry['kind']) => kind === 'grant' || kind === 'refund'

interface AdminShrine {
  id: string
  name: string
  targetName: string
  isFamily: boolean
  deityName: string | null
  themeName: string | null
  visibility: string
  visitorCount: number
  placedItems: number
}

interface UserDetailClientProps {
  user: AdminUserProfile
  sajuRecords: AdminSajuRecord[]
  familyMembers: AdminFamilyMember[]
  payments: AdminPaymentRecord[]
  subscription?: AdminSubscription | null
  passSummary: PassSummary
  passLedger: PassLedgerEntry[]
  shrines: AdminShrine[]
  authCreatedAt?: string | null
}

export function UserDetailClient({
  user,
  sajuRecords,
  familyMembers,
  payments,
  subscription,
  passSummary,
  passLedger,
  shrines,
  authCreatedAt,
}: UserDetailClientProps) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(user.role as UserRole)
  const [isAdjusting, setIsAdjusting] = useState(false)
  const [delta, setDelta] = useState('')
  const [validDays, setValidDays] = useState(String(PASS_VALID_DAYS))
  const [reason, setReason] = useState('')
  const [adjustSaving, setAdjustSaving] = useState(false)
  const [adjustKey, setAdjustKey] = useState('')

  const held = heldPassCount(passSummary)
  const passLines = passSummaryLines(passSummary)
  const deltaNum = Number(delta)

  const subscriptionEnd = subscription?.current_period_end ?? subscription?.end_date ?? null
  const [currentTier, setCurrentTier] = useState(subscription?.membership_plans?.tier || 'FREE')
  const [isEditingTier, setIsEditingTier] = useState(false)

  const handleRoleChange = async (newRole: UserRole) => {
    setRole(newRole)
    toast.promise(updateUserRole(user.id, newRole), {
      loading: '권한 변경 중...',
      success: '권한이 변경되었습니다.',
      error: '권한 변경 실패',
    })
  }

  const openAdjust = () => {
    setAdjustKey(crypto.randomUUID())
    setIsAdjusting(true)
  }

  const resetAdjust = () => {
    setIsAdjusting(false)
    setDelta('')
    setValidDays(String(PASS_VALID_DAYS))
    setReason('')
    setAdjustKey('')
  }

  const handlePassAdjust = async () => {
    if (!Number.isInteger(deltaNum) || deltaNum === 0) {
      toast.error('조정 장수는 0이 아닌 정수여야 해요.')
      return
    }
    if (!reason.trim()) {
      toast.error('조정 사유를 입력하세요.')
      return
    }
    setAdjustSaving(true)
    const result = await adjustUserPasses(user.id, deltaNum, reason, deltaNum > 0 ? Number(validDays) : null, adjustKey)
    setAdjustSaving(false)
    if (result.success) {
      resetAdjust()
      toast.success(
        deltaNum > 0 ? `이용권 ${result.granted}장을 발급했어요.` : `이용권 ${result.revoked}장을 회수했어요.`
      )
      router.refresh()
    } else {
      toast.error('이용권 조정 실패: ' + result.error)
    }
  }

  const handleTierUpdate = async (tier: string) => {
    const result = await updateUserSubscription(user.id, tier === 'FREE' ? null : tier)
    if (result.success) {
      setCurrentTier(tier)
      setIsEditingTier(false)
      toast.success('멤버십 등급이 수정되었습니다.')
      router.refresh()
    } else {
      toast.error('멤버십 수정 실패: ' + result.error)
    }
  }

  const handleDelete = async () => {
    if (!confirm('⚠️ 경고: 정말로 이 사용자를 삭제하시겠습니까?\n모든 데이터가 사라지며 복구할 수 없습니다.')) return

    const toastId = toast.loading('사용자 삭제 처리 중...')
    const result = await deleteUser(user.id)

    if (result.success) {
      toast.success('사용자가 삭제되었습니다.', { id: toastId })
      router.push('/admin/users')
    } else {
      toast.error('삭제 실패: ' + result.error, { id: toastId })
    }
  }

  const roleBadge = () => {
    if (role === 'admin')
      return <Badge className="text-[9px] bg-error-light text-error-text border border-error-border">ADMIN</Badge>
    if (role === 'tester')
      return <Badge className="text-[9px] bg-gold-500/10 text-gold-400 border border-gold-500/20">TESTER</Badge>
    return <Badge className="text-[9px] bg-white/30 text-ink-primary/40 border border-white/[0.08]">USER</Badge>
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => router.back()}
            className="h-8 w-8 border-white/[0.12] text-ink-primary/55 hover:text-gold-400 hover:border-gold-500/30 hover:bg-surface/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-bold text-ink-primary">{user.full_name || '이름 없음'}</h1>
              {roleBadge()}
            </div>
            <p className="text-xs text-ink-primary/40 font-mono">{user.email}</p>
          </div>
        </div>

        <Button
          onClick={handleDelete}
          className="h-8 text-xs bg-error-light text-error-text border border-error-border hover:bg-error/20 hover:border-error/40"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 삭제
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start bg-surface/50 border border-white/[0.08] p-1 h-auto gap-1 rounded-lg overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="profile"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            기본 정보
          </TabsTrigger>
          <TabsTrigger
            value="passes"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            이용권 & 멤버십
          </TabsTrigger>
          <TabsTrigger
            value="saju"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            사주 비록 ({sajuRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="family"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            가족 ({familyMembers.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            결제 ({payments.length})
          </TabsTrigger>
          <TabsTrigger
            value="pass-ledger"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            이용권 내역 ({passLedger.length})
          </TabsTrigger>
          <TabsTrigger
            value="shrines"
            className="text-xs text-ink-primary/40 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            신당 ({shrines.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Tab */}
        <TabsContent value="profile" className="mt-3">
          <AdminCard title="계정 정보">
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-ink-primary/40 font-medium">사용자 ID (UUID)</Label>
                  <Input
                    value={user.id}
                    readOnly
                    className="h-7 text-xs font-mono bg-surface/50 border-white/[0.12] text-ink-primary/55"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-ink-primary/40 font-medium">이메일</Label>
                  <Input
                    value={user.email || ''}
                    readOnly
                    className="h-7 text-xs bg-surface/50 border-white/[0.12] text-ink-primary/70"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-ink-primary/40 font-medium">이름</Label>
                  <Input
                    value={user.full_name || ''}
                    readOnly
                    className="h-7 text-xs bg-surface/50 border-white/[0.12] text-ink-primary/70"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-ink-primary/40 font-medium">가입일</Label>
                  <Input
                    value={
                      authCreatedAt
                        ? new Date(authCreatedAt).toLocaleString('ko-KR')
                        : user.created_at
                          ? new Date(user.created_at).toLocaleString('ko-KR')
                          : '-'
                    }
                    readOnly
                    className="h-7 text-xs bg-surface/50 border-white/[0.12] text-ink-primary/55"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gold-400 font-bold">권한 (Role)</Label>
                  <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                    <SelectTrigger className="h-8 text-xs bg-surface/50 border-white/[0.12] text-ink-primary/85">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-white/[0.08]">
                      <SelectItem value="user" className="text-ink-primary/70 text-xs">
                        USER (일반)
                      </SelectItem>
                      <SelectItem value="tester" className="text-gold-400 text-xs">
                        TESTER (테스터)
                      </SelectItem>
                      <SelectItem value="admin" className="text-error-text text-xs font-bold">
                        ADMIN (관리자)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-ink-primary/30 mt-1">
                    * 관리자 권한 부여 시 모든 데이터에 접근 가능합니다.
                  </p>
                </div>
              </div>
            </div>
          </AdminCard>
        </TabsContent>

        {/* 2. 이용권 & 멤버십 — 🔴 멤버십 몫과 보유 이용권을 한 숫자로 합치지 않는다 */}
        <TabsContent value="passes" className="mt-3">
          <AdminCard>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-ink-primary flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-gold-400" />
                    이용권
                  </h3>
                </div>

                <div className="p-4 bg-surface/30 rounded-lg border border-white/[0.08] space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <Ticket className="w-6 h-6 text-gold-400" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-ink-primary/40 font-medium">보유 이용권</Label>
                      <p className="text-2xl font-serif font-bold text-ink-primary/85 tabular-nums">
                        {passSummary.unlimited ? '역할로 통과' : `${held}장`}
                      </p>
                    </div>
                  </div>

                  {passLines.length === 0 ? (
                    <p className="text-[11px] text-ink-primary/40">보유 이용권도 멤버십 몫도 없습니다.</p>
                  ) : (
                    <ul className="space-y-1">
                      {passLines.map((line) => (
                        <li key={line} className="text-[11px] text-ink-primary/60">
                          {line}
                        </li>
                      ))}
                    </ul>
                  )}

                  {isAdjusting ? (
                    <div className="space-y-2 pt-2 border-t border-white/[0.08]">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-ink-primary/40">조정 장수 (양수=발급, 음수=회수)</Label>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDelta((d) => String((Number(d) || 0) - 1))}
                            className="h-8 px-2 rounded bg-surface border border-white/[0.10] text-ink-primary/70 text-xs"
                          >
                            −1
                          </button>
                          <Input
                            type="number"
                            value={delta}
                            onChange={(e) => setDelta(e.target.value)}
                            placeholder="예: 3 또는 -1"
                            className="h-8 text-sm bg-surface border-white/[0.10] text-white flex-1"
                          />
                          <button
                            type="button"
                            onClick={() => setDelta((d) => String((Number(d) || 0) + 1))}
                            className="h-8 px-2 rounded bg-surface border border-white/[0.10] text-ink-primary/70 text-xs"
                          >
                            +1
                          </button>
                        </div>
                        {delta !== '' && deltaNum !== 0 && !passSummary.unlimited && (
                          <p className="text-[10px] text-ink-primary/40">
                            보유 이용권:{' '}
                            <span className="text-gold-400 font-bold tabular-nums">
                              {held}장 → {Math.max(0, held + deltaNum)}장
                            </span>
                          </p>
                        )}
                      </div>
                      {deltaNum > 0 && (
                        <div className="space-y-1">
                          <Label className="text-[10px] text-ink-primary/40">유효기간 (발급일로부터, 일)</Label>
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={validDays}
                            onChange={(e) => setValidDays(e.target.value)}
                            className="h-8 text-sm bg-surface border-white/[0.10] text-white"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <Label className="text-[10px] text-ink-primary/40">조정 사유 (필수)</Label>
                        <Input
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="예: CS 보상, 이벤트 지급, 오류 정정"
                          maxLength={200}
                          className="h-8 text-sm bg-surface border-white/[0.10] text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={adjustSaving}
                          className="h-8 bg-success hover:bg-success/80 text-xs gap-1.5"
                          onClick={handlePassAdjust}
                        >
                          <Save className="w-3.5 h-3.5" /> 적용
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-ink-primary/55 hover:text-error-text text-xs"
                          onClick={resetAdjust}
                        >
                          <X className="w-3.5 h-3.5 mr-1" /> 취소
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs border-white/[0.12] text-ink-primary/70 hover:text-gold-400 hover:border-gold-500/30"
                      onClick={openAdjust}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1.5" /> 이용권 조정
                    </Button>
                  )}
                </div>
              </div>

              {/* Membership Tier */}
              <div className="space-y-3 pt-4 border-t border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-ink-primary flex items-center gap-2">
                    <Crown className="w-4 h-4 text-gold-400" />
                    멤버십 등급
                  </h3>
                  {!isEditingTier && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-ink-primary/40 hover:text-gold-400"
                      onClick={() => setIsEditingTier(true)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-surface/30 rounded-lg border border-white/[0.08]">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-6 h-6 text-gold-400" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-ink-primary/40 font-medium">현재 등급</Label>
                      {isEditingTier ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={currentTier} onValueChange={handleTierUpdate}>
                            <SelectTrigger className="h-8 text-xs bg-surface border-white/[0.10] text-ink-primary/85 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-surface border-white/[0.08]">
                              <SelectItem value="FREE" className="text-ink-primary/70">
                                FREE (무료)
                              </SelectItem>
                              <SelectItem value="SINGLE" className="text-info-text">
                                SINGLE (싱글)
                              </SelectItem>
                              <SelectItem value="FAMILY" className="text-obangsaek-red">
                                FAMILY (패밀리)
                              </SelectItem>
                              <SelectItem value="BUSINESS" className="text-gold-300 font-bold">
                                BUSINESS (비즈니스)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-ink-primary/55 hover:text-error-text"
                            onClick={() => setIsEditingTier(false)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-serif font-bold text-ink-primary/85">{currentTier || 'FREE'}</p>
                          <p className="text-[10px] text-ink-primary/40">
                            {subscription
                              ? subscriptionEnd
                                ? `이번 기간 끝: ${new Date(subscriptionEnd).toLocaleDateString('ko-KR')}`
                                : '기간 정보 없음'
                              : '구독 중이 아닙니다'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        </TabsContent>

        {/* 3. Saju Records Tab */}
        <TabsContent value="saju" className="mt-3">
          <AdminCard title="저장된 사주 풀이">
            <div className="space-y-3">
              {sajuRecords.length === 0 ? (
                <div className="text-center py-8 text-ink-primary/40 text-sm">저장된 기록이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {sajuRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-surface/30 rounded-lg border border-white/[0.08] hover:border-gold-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-gold-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-ink-primary/85">{record.name}님 사주</p>
                          <p className="text-[10px] text-ink-primary/40 font-mono mt-0.5">
                            {record.birth_year}.{record.birth_month}.{record.birth_day}
                          </p>
                          <p className="text-[10px] text-ink-primary/30 mt-0.5">
                            {record.ganji_year}년 {record.ganji_month}월 {record.ganji_day}일
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-ink-primary/30 font-mono">
                        {new Date(record.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>

        {/* 4. Family Tab */}
        <TabsContent value="family" className="mt-3">
          <AdminCard title="가족 관계">
            <div className="space-y-3">
              {familyMembers.length === 0 ? (
                <div className="text-center py-8 text-ink-primary/40 text-sm">등록된 가족이 없습니다.</div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-surface/30 rounded-lg border border-white/[0.08]"
                    >
                      <div className="w-8 h-8 rounded-full bg-surface/50 border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-ink-primary/55" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-ink-primary/85">{member.name}</p>
                        <p className="text-[10px] text-ink-primary/40">{member.relationship}</p>
                        <p className="text-[10px] text-ink-primary/30 font-mono mt-0.5">
                          {member.birth_year}.{member.birth_month}.{member.birth_day}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>

        {/* 5. Payments Tab */}
        <TabsContent value="payments" className="mt-3">
          <AdminCard title="결제 내역">
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="text-center py-8 text-ink-primary/40 text-sm">결제 내역이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => {
                    const settlement = describePaymentSettlement(payment)
                    return (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between p-3 border-b border-white/[0.08] last:border-0"
                      >
                        <div>
                          <p
                            className={`text-sm font-bold font-mono ${
                              settlement.kind === 'none' ? 'text-ink-primary' : 'text-warning-text'
                            }`}
                          >
                            {settlement.net.toLocaleString()}원
                          </p>
                          {settlement.kind !== 'none' && (
                            <p className="text-[10px] font-mono text-ink-primary/40 mt-0.5">
                              <span className="line-through">{payment.amount.toLocaleString()}원</span>
                              <span
                                className={settlement.kind === 'full' ? ' text-error-text/90' : ' text-warning-text/90'}
                              >
                                {' '}
                                −{settlement.cancelled.toLocaleString()}원
                              </span>
                            </p>
                          )}
                          <p className="text-[10px] text-ink-primary/30 font-mono mt-0.5">{payment.order_id}</p>
                        </div>
                        <div className="text-right">
                          <Badge
                            className={
                              settlement.kind === 'full'
                                ? 'text-[9px] bg-error-light text-error-text border border-error/30'
                                : settlement.kind === 'partial'
                                  ? 'text-[9px] bg-warning-light text-warning-text border border-warning/30'
                                  : payment.status === 'completed'
                                    ? 'text-[9px] bg-success-light text-success-text border border-success-border'
                                    : 'text-[9px] bg-white/30 text-ink-primary/40 border border-white/[0.08]'
                            }
                          >
                            {settlement.kind === 'full'
                              ? '전액취소'
                              : settlement.kind === 'partial'
                                ? '부분취소'
                                : payment.status === 'completed'
                                  ? '완료'
                                  : payment.status}
                          </Badge>
                          <p className="text-[10px] text-ink-primary/30 mt-1">
                            {new Date(payment.created_at).toLocaleDateString('ko-KR', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>

        {/* 6. 이용권 내역 — 발급·사용·되돌림·회수가 왜 이렇게 됐는지 추적 (CS 대응) */}
        <TabsContent value="pass-ledger" className="mt-3">
          <AdminCard
            title={
              <>
                <ArrowUpDown className="h-4 w-4 text-gold-400" aria-hidden /> 이용권 내역
              </>
            }
          >
            <div className="space-y-3">
              <p className="text-[10px] text-ink-primary/40 mb-3">최근 50건 · 멤버십 몫과 보유 이용권은 따로 셉니다</p>
              {passLedger.length === 0 ? (
                <div className="text-center py-8 text-ink-primary/40 text-sm">이용권 내역이 없습니다.</div>
              ) : (
                <div className="divide-y divide-white/[0.06]">
                  {passLedger.map((entry) => {
                    const plus = isLedgerPlus(entry.kind)
                    const title = entry.featureKey ? deductKeyLabel(entry.featureKey) : entry.note
                    return (
                      <div key={entry.id} className="flex items-start justify-between gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-ink-primary/70 truncate">
                            {LEDGER_KIND_LABEL[entry.kind]}
                            {title ? ` · ${title}` : ''}
                          </p>
                          <p className="text-[10px] text-ink-primary/30 mt-0.5">
                            {LEDGER_POCKET_LABEL[entry.pocket]} · {new Date(entry.createdAt).toLocaleString('ko-KR')}
                          </p>
                        </div>
                        <span
                          className={`text-xs font-bold font-mono whitespace-nowrap tabular-nums ${
                            plus ? 'text-success-text' : 'text-error-text'
                          }`}
                        >
                          {plus ? '+' : '−'}
                          {entry.units}장
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>

        {/* 7. 신당 현황 — 본인 + 가족별 (主神·테마·배치) */}
        <TabsContent value="shrines" className="mt-3">
          <AdminCard
            title={
              <>
                <Flame className="h-4 w-4 text-gold-400" aria-hidden /> 신당 현황
              </>
            }
          >
            <div className="space-y-3">
              {shrines.length === 0 ? (
                <div className="text-center py-8 text-ink-primary/40 text-sm">개설한 신당이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {shrines.map((s) => (
                    <div key={s.id} className="p-3 bg-surface/30 rounded-lg border border-white/[0.08]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-ink-primary/85">{s.name}</p>
                        <Badge
                          className={`text-[9px] border ${
                            s.isFamily
                              ? 'bg-obangsaek-blue/15 text-info-text border-obangsaek-blue/30'
                              : 'bg-gold-500/10 text-gold-300 border-gold-500/20'
                          }`}
                        >
                          {s.targetName}
                        </Badge>
                        {s.visibility === 'public' && (
                          <Badge className="text-[9px] bg-success-light text-success-text border border-success-border">
                            공개
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-[10px]">
                        <div>
                          <span className="text-ink-primary/30">主神</span>
                          <p className="text-ink-primary/70 mt-0.5">{s.deityName ?? '미좌정'}</p>
                        </div>
                        <div>
                          <span className="text-ink-primary/30">테마</span>
                          <p className="text-ink-primary/70 mt-0.5">{s.themeName ?? '기본'}</p>
                        </div>
                        <div>
                          <span className="text-ink-primary/30">배치 신물</span>
                          <p className="text-ink-primary/70 mt-0.5 tabular-nums">{s.placedItems}개</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AdminCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
