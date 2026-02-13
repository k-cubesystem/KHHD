'use client'

import { useState, useEffect } from 'react'
import {
  getAdminMembershipPlans,
  updateMembershipPlan,
  togglePlanStatus,
  type MembershipPlanAdmin,
} from './actions'
import { getAllPlans as getAllProducts, updatePlan as updateProduct } from '../../products/actions'
import { PricePlan } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import {
  Loader2,
  Save,
  RotateCcw,
  Crown,
  Users,
  Calendar,
  Database,
  Ticket,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function PlanManagementClient() {
  const [plans, setPlans] = useState<MembershipPlanAdmin[]>([])
  const [products, setProducts] = useState<PricePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [savingProduct, setSavingProduct] = useState<string | null>(null)
  const [editedPlans, setEditedPlans] = useState<Record<string, Partial<MembershipPlanAdmin>>>({})
  const [editedProducts, setEditedProducts] = useState<Record<string, Partial<PricePlan>>>({})
  const [expandedPlans, setExpandedPlans] = useState<Set<string>>(new Set())
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAllData()
  }, [])

  async function loadAllData() {
    setLoading(true)
    try {
      const [plansData, productsData] = await Promise.all([
        getAdminMembershipPlans(),
        getAllProducts(),
      ])
      setPlans(plansData)
      setProducts(productsData)
    } catch {
      toast.error('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // === HELPERS ===
  const getPlanVal = (plan: MembershipPlanAdmin, field: string) => {
    const edited = editedPlans[plan.id]
    return edited && field in edited
      ? (edited as Record<string, unknown>)[field]
      : (plan as unknown as Record<string, unknown>)[field]
  }

  const getProdVal = (prod: PricePlan, field: string) => {
    const edited = editedProducts[prod.id]
    return edited && field in edited
      ? (edited as Record<string, unknown>)[field]
      : (prod as unknown as Record<string, unknown>)[field]
  }

  const isPlanEdited = (id: string) => !!editedPlans[id] && Object.keys(editedPlans[id]).length > 0
  const isProdEdited = (id: string) =>
    !!editedProducts[id] && Object.keys(editedProducts[id]).length > 0

  const toggleExpand = (id: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setter(next)
  }

  // === MEMBERSHIP HANDLERS ===
  const changePlan = (planId: string, field: string, value: unknown) => {
    setEditedPlans((prev) => ({ ...prev, [planId]: { ...prev[planId], [field]: value } }))
  }

  const changeFeature = (planId: string, key: string, value: unknown) => {
    const plan = plans.find((p) => p.id === planId)
    const currentFeatures = editedPlans[planId]?.features ?? plan?.features ?? {}
    setEditedPlans((prev) => ({
      ...prev,
      [planId]: { ...prev[planId], features: { ...currentFeatures, [key]: value } },
    }))
  }

  const handleSave = async (planId: string) => {
    const updates = editedPlans[planId]
    if (!updates || !Object.keys(updates).length) return
    setSaving(planId)
    const result = await updateMembershipPlan(planId, updates)
    if (result.success) {
      toast.success('플랜이 저장되었습니다.')
      setPlans(plans.map((p) => (p.id === planId ? { ...p, ...updates } : p)))
      setEditedPlans((prev) => {
        const u = { ...prev }
        delete u[planId]
        return u
      })
    } else {
      toast.error('저장 실패: ' + result.error)
    }
    setSaving(null)
  }

  const handleReset = (planId: string) => {
    setEditedPlans((prev) => {
      const u = { ...prev }
      delete u[planId]
      return u
    })
    toast.info('변경 사항을 취소했습니다.')
  }

  const handleToggleStatus = async (planId: string) => {
    setSaving(planId)
    const result = await togglePlanStatus(planId)
    if (result.success) {
      toast.success(`${result.newStatus ? '활성화' : '비활성화'}되었습니다.`)
      setPlans(plans.map((p) => (p.id === planId ? { ...p, is_active: !!result.newStatus } : p)))
    } else {
      toast.error('상태 변경 실패: ' + result.error)
    }
    setSaving(null)
  }

  // === PRODUCT HANDLERS ===
  const changeProd = (prodId: string, field: string, value: unknown) => {
    setEditedProducts((prev) => ({ ...prev, [prodId]: { ...prev[prodId], [field]: value } }))
  }

  const addFeatureItem = (prodId: string) => {
    const prod = products.find((p) => p.id === prodId)
    const current: string[] = (getProdVal(prod!, 'features') as string[] | null) ?? []
    changeProd(prodId, 'features', [...current, ''])
  }

  const updateFeatureItem = (prodId: string, idx: number, value: string) => {
    const prod = products.find((p) => p.id === prodId)
    const current: string[] = [...((getProdVal(prod!, 'features') as string[] | null) ?? [])]
    current[idx] = value
    changeProd(prodId, 'features', current)
  }

  const removeFeatureItem = (prodId: string, idx: number) => {
    const prod = products.find((p) => p.id === prodId)
    const current: string[] = [...((getProdVal(prod!, 'features') as string[] | null) ?? [])]
    current.splice(idx, 1)
    changeProd(prodId, 'features', current)
  }

  const handleProductSave = async (prodId: string) => {
    const updates = editedProducts[prodId]
    if (!updates || !Object.keys(updates).length) return
    setSavingProduct(prodId)
    const result = await updateProduct(prodId, updates)
    if (result.success) {
      toast.success('상품이 저장되었습니다.')
      setProducts(products.map((p) => (p.id === prodId ? { ...p, ...updates } : p)))
      setEditedProducts((prev) => {
        const u = { ...prev }
        delete u[prodId]
        return u
      })
    } else {
      toast.error('저장 실패: ' + result.error)
    }
    setSavingProduct(null)
  }

  const handleProductReset = (prodId: string) => {
    setEditedProducts((prev) => {
      const u = { ...prev }
      delete u[prodId]
      return u
    })
    toast.info('변경 사항을 취소했습니다.')
  }

  const handleProductToggle = async (prodId: string) => {
    const prod = products.find((p) => p.id === prodId)!
    const newState = !prod.is_active
    setSavingProduct(prodId)
    const result = await updateProduct(prodId, { is_active: newState })
    if (result.success) {
      toast.success(`${newState ? '판매 시작' : '판매 중지'}되었습니다.`)
      setProducts(products.map((p) => (p.id === prodId ? { ...p, is_active: newState } : p)))
    } else {
      toast.error('상태 변경 실패: ' + result.error)
    }
    setSavingProduct(null)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-stone-900/30 rounded-xl animate-pulse border border-stone-700/30"
          />
        ))}
      </div>
    )
  }

  const tierTheme: Record<string, { badge: string; icon: string }> = {
    SINGLE: { badge: 'bg-stone-700/30 text-stone-300 border-stone-600/30', icon: 'text-stone-400' },
    FAMILY: { badge: 'bg-gold-500/10 text-gold-400 border-gold-500/30', icon: 'text-gold-400' },
    BUSINESS: {
      badge: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: 'text-purple-400',
    },
  }

  return (
    <div className="space-y-8">
      {/* ===== SECTION 1: 멤버십 구독 플랜 ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-700/30">
          <Crown className="w-4 h-4 text-gold-500" />
          <h2 className="text-sm font-bold text-stone-100 font-serif">멤버십 구독 플랜</h2>
          <span className="text-[10px] text-stone-500 ml-auto">{plans.length}개 플랜</span>
        </div>

        <div className="space-y-3">
          {plans.map((plan) => {
            const theme = tierTheme[plan.tier] ?? tierTheme.SINGLE
            const edited = isPlanEdited(plan.id)
            const expanded = expandedPlans.has(plan.id)
            const features = (editedPlans[plan.id]?.features ?? plan.features ?? {}) as Record<
              string,
              unknown
            >

            return (
              <Card
                key={plan.id}
                className={cn(
                  'relative bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden transition-all',
                  !plan.is_active && 'opacity-60'
                )}
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                {/* 헤더 행 */}
                <div className="relative flex items-center gap-3 p-3.5">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center bg-stone-900/50 border border-stone-700/30 flex-shrink-0',
                      theme.icon
                    )}
                  >
                    <Crown className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-100 font-serif truncate">
                        {getPlanVal(plan, 'name') as string}
                      </span>
                      <Badge className={cn('text-[9px] border', theme.badge)}>{plan.tier}</Badge>
                      {edited && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          수정됨
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-mono text-gold-400 font-bold">
                        {(getPlanVal(plan, 'price') as number)?.toLocaleString()}원/
                        {getPlanVal(plan, 'interval') === 'YEAR' ? '년' : '월'}
                      </span>
                      <span className="text-[10px] text-stone-500">
                        부적 {getPlanVal(plan, 'talismans_per_period') as number}장/월
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-bold',
                          plan.is_active ? 'text-emerald-400' : 'text-stone-600'
                        )}
                      >
                        {plan.is_active ? 'LIVE' : 'OFF'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => handleToggleStatus(plan.id)}
                      disabled={saving === plan.id}
                      className="scale-75"
                    />
                    {edited && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-stone-700/50 text-stone-400 hover:text-stone-300"
                          onClick={() => handleReset(plan.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 font-bold"
                          onClick={() => handleSave(plan.id)}
                          disabled={saving === plan.id}
                        >
                          {saving === plan.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3 h-3 mr-1" />
                              저장
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-stone-500 hover:text-stone-300"
                      onClick={() => toggleExpand(plan.id, expandedPlans, setExpandedPlans)}
                    >
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 상세 편집 영역 */}
                {expanded && (
                  <div className="relative border-t border-stone-700/30 p-4 space-y-4">
                    {/* 기본 정보 */}
                    <div>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">
                        기본 정보
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">플랜 이름</Label>
                          <Input
                            value={getPlanVal(plan, 'name') as string}
                            onChange={(e) => changePlan(plan.id, 'name', e.target.value)}
                            className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">결제 주기</Label>
                          <Select
                            value={getPlanVal(plan, 'interval') as string}
                            onValueChange={(v) => changePlan(plan.id, 'interval', v)}
                          >
                            <SelectTrigger className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-stone-900 border-stone-700">
                              <SelectItem value="MONTH" className="text-xs text-stone-300">
                                매월 (MONTH)
                              </SelectItem>
                              <SelectItem value="YEAR" className="text-xs text-stone-300">
                                매년 (YEAR)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">구독료 (원)</Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'price') as number}
                            onChange={(e) => changePlan(plan.id, 'price', parseInt(e.target.value))}
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">정렬 순서</Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'sort_order') as number}
                            onChange={(e) =>
                              changePlan(plan.id, 'sort_order', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[10px] text-stone-400">설명</Label>
                          <Textarea
                            value={(getPlanVal(plan, 'description') as string) || ''}
                            onChange={(e) => changePlan(plan.id, 'description', e.target.value)}
                            className="text-xs bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50"
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 사용 한도 */}
                    <div>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">
                        사용 한도
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Ticket className="w-2.5 h-2.5 text-gold-500" />월 부적 지급
                          </Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'talismans_per_period') as number}
                            onChange={(e) =>
                              changePlan(plan.id, 'talismans_per_period', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-gold-500/10 border-gold-500/30 text-gold-300 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Calendar className="w-2.5 h-2.5" />
                            일일 한도
                          </Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'daily_talisman_limit') as number}
                            onChange={(e) =>
                              changePlan(plan.id, 'daily_talisman_limit', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" />
                            인연 한도
                          </Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'relationship_limit') as number}
                            onChange={(e) =>
                              changePlan(plan.id, 'relationship_limit', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400 flex items-center gap-1">
                            <Database className="w-2.5 h-2.5" />
                            저장 한도
                          </Label>
                          <Input
                            type="number"
                            value={getPlanVal(plan, 'storage_limit') as number}
                            onChange={(e) =>
                              changePlan(plan.id, 'storage_limit', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                          <p className="text-[9px] text-stone-600">999 = 무제한</p>
                        </div>
                      </div>
                    </div>

                    {/* Features JSONB */}
                    <div>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">
                        기능 설정 (features)
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">보너스 비율 (%)</Label>
                          <Input
                            type="number"
                            value={(features.bonus_rate as number) ?? 0}
                            onChange={(e) =>
                              changeFeature(plan.id, 'bonus_rate', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">멀티 기기 허용</Label>
                          <Select
                            value={String(features.multi_device ?? false)}
                            onValueChange={(v) =>
                              changeFeature(plan.id, 'multi_device', v === 'true')
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-stone-900 border-stone-700">
                              <SelectItem value="true" className="text-xs text-emerald-400">
                                허용
                              </SelectItem>
                              <SelectItem value="false" className="text-xs text-stone-400">
                                불허
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">우선 지원</Label>
                          <Select
                            value={String(features.priority_support ?? false)}
                            onValueChange={(v) =>
                              changeFeature(plan.id, 'priority_support', v === 'true')
                            }
                          >
                            <SelectTrigger className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-stone-900 border-stone-700">
                              <SelectItem value="true" className="text-xs text-emerald-400">
                                허용
                              </SelectItem>
                              <SelectItem value="false" className="text-xs text-stone-400">
                                불허
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>

      {/* ===== SECTION 2: 부적 상품 (일회성) ===== */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-stone-700/30">
          <Ticket className="w-4 h-4 text-gold-500" />
          <h2 className="text-sm font-bold text-stone-100 font-serif">부적 상품 (단건 구매)</h2>
          <span className="text-[10px] text-stone-500 ml-auto">{products.length}개 상품</span>
        </div>

        <div className="space-y-3">
          {products.map((prod) => {
            const edited = isProdEdited(prod.id)
            const expanded = expandedProducts.has(prod.id)
            const featureList: string[] = (getProdVal(prod, 'features') as string[] | null) ?? []

            return (
              <Card
                key={prod.id}
                className={cn(
                  'relative bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden transition-all',
                  !prod.is_active && 'opacity-60'
                )}
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                {/* 헤더 행 */}
                <div className="relative flex items-center gap-3 p-3.5">
                  <div className="w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/20 flex items-center justify-center flex-shrink-0">
                    <Ticket className="w-4 h-4 text-gold-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-stone-100 font-serif truncate">
                        {getProdVal(prod, 'name') as string}
                      </span>
                      {(getProdVal(prod, 'badge_text') as string) && (
                        <Badge className="bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[9px]">
                          {getProdVal(prod, 'badge_text') as string}
                        </Badge>
                      )}
                      {edited && (
                        <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          수정됨
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs font-mono text-gold-400 font-bold">
                        {(getProdVal(prod, 'price') as number)?.toLocaleString()}원
                      </span>
                      <span className="text-[10px] text-stone-500">
                        부적 {getProdVal(prod, 'credits') as number}장
                      </span>
                      <span
                        className={cn(
                          'text-[9px] font-bold',
                          prod.is_active ? 'text-emerald-400' : 'text-stone-600'
                        )}
                      >
                        {prod.is_active ? '판매중' : '중지'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                      checked={prod.is_active}
                      onCheckedChange={() => handleProductToggle(prod.id)}
                      disabled={savingProduct === prod.id}
                      className="scale-75"
                    />
                    {edited && (
                      <>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-stone-700/50 text-stone-400 hover:text-stone-300"
                          onClick={() => handleProductReset(prod.id)}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 font-bold"
                          onClick={() => handleProductSave(prod.id)}
                          disabled={savingProduct === prod.id}
                        >
                          {savingProduct === prod.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-3 h-3 mr-1" />
                              저장
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-stone-500 hover:text-stone-300"
                      onClick={() => toggleExpand(prod.id, expandedProducts, setExpandedProducts)}
                    >
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* 상세 편집 */}
                {expanded && (
                  <div className="relative border-t border-stone-700/30 p-4 space-y-4">
                    {/* 기본 필드 */}
                    <div>
                      <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-2">
                        상품 정보
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2 space-y-1">
                          <Label className="text-[10px] text-stone-400">상품명</Label>
                          <Input
                            value={getProdVal(prod, 'name') as string}
                            onChange={(e) => changeProd(prod.id, 'name', e.target.value)}
                            className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">뱃지 텍스트</Label>
                          <Input
                            value={(getProdVal(prod, 'badge_text') as string) || ''}
                            onChange={(e) => changeProd(prod.id, 'badge_text', e.target.value)}
                            placeholder="예: 인기"
                            className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">가격 (원)</Label>
                          <Input
                            type="number"
                            value={getProdVal(prod, 'price') as number}
                            onChange={(e) => changeProd(prod.id, 'price', parseInt(e.target.value))}
                            className="h-8 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] text-stone-400">부적 수량</Label>
                          <Input
                            type="number"
                            value={getProdVal(prod, 'credits') as number}
                            onChange={(e) =>
                              changeProd(prod.id, 'credits', parseInt(e.target.value))
                            }
                            className="h-8 text-xs font-mono bg-gold-500/10 border-gold-500/30 text-gold-300 focus:border-gold-500/50"
                          />
                        </div>
                        <div className="sm:col-span-3 space-y-1">
                          <Label className="text-[10px] text-stone-400">상품 설명</Label>
                          <Input
                            value={(getProdVal(prod, 'description') as string) || ''}
                            onChange={(e) => changeProd(prod.id, 'description', e.target.value)}
                            placeholder="상품 설명"
                            className="h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                          />
                        </div>
                      </div>
                    </div>

                    {/* 기능 목록 */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider">
                          기능 목록 (features)
                        </p>
                        <button
                          onClick={() => addFeatureItem(prod.id)}
                          className="ml-auto flex items-center gap-1 text-[10px] text-gold-400 hover:text-gold-300 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          항목 추가
                        </button>
                      </div>
                      <div className="space-y-2">
                        {featureList.length === 0 ? (
                          <p className="text-[10px] text-stone-600 py-2 text-center">
                            기능 목록이 없습니다.
                          </p>
                        ) : (
                          featureList.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                              <span className="text-[10px] text-stone-500 w-4 text-right flex-shrink-0">
                                {idx + 1}.
                              </span>
                              <Input
                                value={item}
                                onChange={(e) => updateFeatureItem(prod.id, idx, e.target.value)}
                                className="h-7 text-xs flex-1 bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50"
                                placeholder={`기능 ${idx + 1}`}
                              />
                              <button
                                onClick={() => removeFeatureItem(prod.id, idx)}
                                className="text-stone-600 hover:text-red-400 transition-colors flex-shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </section>
    </div>
  )
}
