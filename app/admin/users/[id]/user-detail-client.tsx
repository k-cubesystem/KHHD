'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/auth'
import { updateUserRole, deleteUser, updateUserBalance, updateUserSubscription } from '../actions'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowLeft, Trash2, Users, FileText, Coins, Crown, Edit, Save, X } from 'lucide-react'

interface UserDetailClientProps {
  user: any
  sajuRecords: any[]
  familyMembers: any[]
  payments: any[]
  wallet?: any
  subscription?: any
}

export function UserDetailClient({
  user,
  sajuRecords,
  familyMembers,
  payments,
  wallet,
  subscription,
}: UserDetailClientProps) {
  const router = useRouter()
  const [role, setRole] = useState<UserRole>(user.role as UserRole)
  const [balance, setBalance] = useState(wallet?.balance || 0)
  const [isEditingBalance, setIsEditingBalance] = useState(false)
  const [newBalance, setNewBalance] = useState(wallet?.balance || 0)

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

  const handleBalanceUpdate = async () => {
    const result = await updateUserBalance(user.id, Number(newBalance))
    if (result.success) {
      setBalance(newBalance)
      setIsEditingBalance(false)
      toast.success('부적 잔액이 수정되었습니다.')
    } else {
      toast.error('잔액 수정 실패: ' + result.error)
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
    if (
      !confirm(
        '⚠️ 경고: 정말로 이 사용자를 영구 삭제하시겠습니까?\n모든 데이터가 사라지며 복구할 수 없습니다.'
      )
    )
      return

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
      return (
        <Badge className="text-[9px] bg-red-500/10 text-red-400 border border-red-500/20">
          ADMIN
        </Badge>
      )
    if (role === 'tester')
      return (
        <Badge className="text-[9px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          TESTER
        </Badge>
      )
    return (
      <Badge className="text-[9px] bg-stone-700/30 text-stone-500 border border-stone-600/30">
        USER
      </Badge>
    )
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
            className="h-8 w-8 border-stone-700/50 text-stone-400 hover:text-gold-400 hover:border-gold-500/30 hover:bg-stone-800/50"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-bold text-stone-100">
                {user.full_name || '이름 없음'}
              </h1>
              {roleBadge()}
            </div>
            <p className="text-xs text-stone-500 font-mono">{user.email}</p>
          </div>
        </div>

        <Button
          onClick={handleDelete}
          className="h-8 text-xs bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" /> 삭제
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="w-full justify-start bg-stone-900/50 border border-stone-700/30 p-1 h-auto gap-1 rounded-lg overflow-x-auto no-scrollbar">
          <TabsTrigger
            value="profile"
            className="text-xs text-stone-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            기본 정보
          </TabsTrigger>
          <TabsTrigger
            value="wallet"
            className="text-xs text-stone-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            지갑 & 멤버십
          </TabsTrigger>
          <TabsTrigger
            value="saju"
            className="text-xs text-stone-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            사주 비록 ({sajuRecords.length})
          </TabsTrigger>
          <TabsTrigger
            value="family"
            className="text-xs text-stone-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            가족 ({familyMembers.length})
          </TabsTrigger>
          <TabsTrigger
            value="payments"
            className="text-xs text-stone-500 data-[state=active]:bg-gradient-to-r data-[state=active]:from-gold-500 data-[state=active]:to-gold-600 data-[state=active]:text-ink-950 data-[state=active]:shadow-lg px-3 py-1.5 whitespace-nowrap"
          >
            결제 ({payments.length})
          </TabsTrigger>
        </TabsList>

        {/* 1. Profile Tab */}
        <TabsContent value="profile" className="mt-3">
          <Card className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
            <div className="relative space-y-3">
              <h3 className="text-sm font-serif font-bold text-stone-100">계정 정보</h3>
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-medium">사용자 ID (UUID)</Label>
                  <Input
                    value={user.id}
                    readOnly
                    className="h-7 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-400"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-medium">이메일</Label>
                  <Input
                    value={user.email || ''}
                    readOnly
                    className="h-7 text-xs bg-stone-900/50 border-stone-700/50 text-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-medium">이름</Label>
                  <Input
                    value={user.full_name || ''}
                    readOnly
                    className="h-7 text-xs bg-stone-900/50 border-stone-700/50 text-stone-300"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-stone-500 font-medium">가입일</Label>
                  <Input
                    value={new Date(user.updated_at || user.created_at).toLocaleString('ko-KR')}
                    readOnly
                    className="h-7 text-xs bg-stone-900/50 border-stone-700/50 text-stone-400"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-gold-400 font-bold">권한 (Role)</Label>
                  <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)}>
                    <SelectTrigger className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-stone-700">
                      <SelectItem value="user" className="text-stone-300 text-xs">
                        USER (일반)
                      </SelectItem>
                      <SelectItem value="tester" className="text-yellow-400 text-xs">
                        TESTER (테스터)
                      </SelectItem>
                      <SelectItem value="admin" className="text-red-400 text-xs font-bold">
                        ADMIN (관리자)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-stone-600 mt-1">
                    * 관리자 권한 부여 시 모든 데이터에 접근 가능합니다.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 2. Wallet & Membership Tab */}
        <TabsContent value="wallet" className="mt-3">
          <Card className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
            <div className="relative space-y-6">
              {/* Talisman Wallet */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-stone-100 flex items-center gap-2">
                    <Coins className="w-4 h-4 text-gold-400" />
                    부적 지갑
                  </h3>
                  {!isEditingBalance && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-stone-500 hover:text-gold-400"
                      onClick={() => {
                        setIsEditingBalance(true)
                        setNewBalance(balance)
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-stone-900/30 rounded-lg border border-stone-700/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                      <Coins className="w-6 h-6 text-gold-400" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-stone-500 font-medium">보유 부적</Label>
                      {isEditingBalance ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Input
                            type="number"
                            value={newBalance}
                            onChange={(e) => setNewBalance(Number(e.target.value))}
                            className="h-8 text-sm bg-stone-800 border-stone-600 text-white w-24"
                          />
                          <Button
                            size="sm"
                            className="h-8 w-8 p-0 bg-green-600 hover:bg-green-700"
                            onClick={handleBalanceUpdate}
                          >
                            <Save className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-stone-400 hover:text-red-400"
                            onClick={() => setIsEditingBalance(false)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <p className="text-2xl font-serif font-bold text-stone-200">
                          {balance.toLocaleString()}장
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Membership Tier */}
              <div className="space-y-3 pt-4 border-t border-stone-700/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-serif font-bold text-stone-100 flex items-center gap-2">
                    <Crown className="w-4 h-4 text-gold-400" />
                    멤버십 등급
                  </h3>
                  {!isEditingTier && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-stone-500 hover:text-gold-400"
                      onClick={() => setIsEditingTier(true)}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>

                <div className="p-4 bg-stone-900/30 rounded-lg border border-stone-700/30">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <Label className="text-[10px] text-stone-500 font-medium">현재 등급</Label>
                      {isEditingTier ? (
                        <div className="flex items-center gap-2 mt-1">
                          <Select value={currentTier} onValueChange={handleTierUpdate}>
                            <SelectTrigger className="h-8 text-xs bg-stone-800 border-stone-600 text-stone-200 w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-stone-900 border-stone-700">
                              <SelectItem value="FREE" className="text-stone-300">
                                FREE (무료)
                              </SelectItem>
                              <SelectItem value="SINGLE" className="text-purple-300">
                                SINGLE (싱글)
                              </SelectItem>
                              <SelectItem value="FAMILY" className="text-pink-300">
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
                            className="h-8 w-8 p-0 text-stone-400 hover:text-red-400"
                            onClick={() => setIsEditingTier(false)}
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-serif font-bold text-stone-200">
                            {currentTier || 'FREE'}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {subscription
                              ? `만료일: ${new Date(subscription.end_date).toLocaleDateString()}`
                              : '구독 중이 아닙니다'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* 3. Saju Records Tab */}
        <TabsContent value="saju" className="mt-3">
          <Card className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
            <div className="relative">
              <h3 className="text-sm font-serif font-bold text-stone-100 mb-3">저장된 사주 풀이</h3>
              {sajuRecords.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-sm">
                  저장된 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {sajuRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-3 bg-stone-900/30 rounded-lg border border-stone-700/30 hover:border-gold-500/20 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-3.5 h-3.5 text-gold-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-200">{record.name}님 사주</p>
                          <p className="text-[10px] text-stone-500 font-mono mt-0.5">
                            {record.birth_year}.{record.birth_month}.{record.birth_day}
                          </p>
                          <p className="text-[10px] text-stone-600 mt-0.5">
                            {record.ganji_year}년 {record.ganji_month}월 {record.ganji_day}일
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-stone-600 font-mono">
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
          </Card>
        </TabsContent>

        {/* 4. Family Tab */}
        <TabsContent value="family" className="mt-3">
          <Card className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
            <div className="relative">
              <h3 className="text-sm font-serif font-bold text-stone-100 mb-3">가족 관계</h3>
              {familyMembers.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-sm">
                  등록된 가족이 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {familyMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 bg-stone-900/30 rounded-lg border border-stone-700/30"
                    >
                      <div className="w-8 h-8 rounded-full bg-stone-800/50 border border-stone-700/30 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-stone-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-200">{member.name}</p>
                        <p className="text-[10px] text-stone-500">{member.relationship}</p>
                        <p className="text-[10px] text-stone-600 font-mono mt-0.5">
                          {member.birth_year}.{member.birth_month}.{member.birth_day}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* 5. Payments Tab */}
        <TabsContent value="payments" className="mt-3">
          <Card className="relative p-4 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />
            <div className="relative">
              <h3 className="text-sm font-serif font-bold text-stone-100 mb-3">결제 내역</h3>
              {payments.length === 0 ? (
                <div className="text-center py-8 text-stone-500 text-sm">결제 내역이 없습니다.</div>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-3 border-b border-stone-700/30 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-bold text-stone-100 font-mono">
                          {payment.amount.toLocaleString()}원
                        </p>
                        <p className="text-[10px] text-stone-600 font-mono mt-0.5">
                          {payment.order_id}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          className={
                            payment.status === 'completed'
                              ? 'text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'text-[9px] bg-stone-700/30 text-stone-500 border border-stone-600/30'
                          }
                        >
                          {payment.status === 'completed' ? '완료' : payment.status}
                        </Badge>
                        <p className="text-[10px] text-stone-600 mt-1">
                          {new Date(payment.created_at).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
