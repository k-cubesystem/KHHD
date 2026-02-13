'use client'

import { useState, useEffect } from 'react'
import { PricePlan } from '@/types/auth'
import { getAllPlans, updatePlan } from './actions'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Zap, Edit2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'

export function ProductManagementClient() {
  const [plans, setPlans] = useState<PricePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPlan, setEditingPlan] = useState<PricePlan | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    loadPlans()
  }, [])

  async function loadPlans() {
    setLoading(true)
    try {
      const data = await getAllPlans()
      setPlans(data)
    } catch (e) {
      toast.error('상품 정보를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (plan: PricePlan) => {
    const newState = !plan.is_active
    // Optimistic
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, is_active: newState } : p)))

    const res = await updatePlan(plan.id, { is_active: newState })
    if (!res.success) {
      setPlans(plans) // Rollback
      toast.error('변경 실패')
    } else {
      toast.success(newState ? '상품이 활성화되었습니다.' : '상품이 비활성화되었습니다.')
    }
  }

  const handleSaveEdit = async () => {
    if (!editingPlan) return

    const res = await updatePlan(editingPlan.id, {
      name: editingPlan.name,
      price: Number(editingPlan.price),
      credits: Number(editingPlan.credits),
      description: editingPlan.description,
      badge_text: editingPlan.badge_text,
    })

    if (res.success) {
      toast.success('상품 정보가 수정되었습니다.')
      setOpen(false)
      loadPlans() // Reload to be safe
    } else {
      toast.error('수정 실패: ' + res.error)
    }
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h1 className="text-xl font-serif font-bold text-stone-100">스토어 관리</h1>
        <p className="text-xs text-stone-500">결제 상품과 크레딧 플랜을 관리합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-stone-800/30 animate-pulse border border-stone-700/30"
              />
            ))
          : plans.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  'relative p-3.5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 hover:border-gold-500/20 transition-all overflow-hidden group',
                  !plan.is_active && 'opacity-50'
                )}
              >
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[10px] text-gold-400 uppercase tracking-wider font-bold font-mono">
                        Credit × {plan.credits}
                      </span>
                      {plan.badge_text && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-gold-500/20 text-gold-400 border border-gold-500/30 rounded font-bold">
                          {plan.badge_text}
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-stone-100 font-serif">{plan.name}</h3>
                    <p className="text-[10px] text-stone-500 truncate">{plan.description}</p>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <div className="text-right">
                      <span className="text-lg font-black text-stone-100 font-mono tabular-nums">
                        {plan.price.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-500 ml-0.5">원</span>
                    </div>

                    <Switch
                      checked={plan.is_active}
                      onCheckedChange={() => handleToggleActive(plan)}
                      className="scale-75"
                    />

                    <Dialog
                      open={open && editingPlan?.id === plan.id}
                      onOpenChange={(v) => {
                        if (!v) setEditingPlan(null)
                        setOpen(v)
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7 border-stone-700/50 text-stone-400 hover:text-gold-400 hover:border-gold-500/30 hover:bg-stone-800/50"
                          onClick={() => {
                            setEditingPlan(plan)
                            setOpen(true)
                          }}
                        >
                          <Edit2 className="w-3 h-3" />
                        </Button>
                      </DialogTrigger>

                      <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-sm">
                        <DialogHeader>
                          <DialogTitle className="font-serif text-stone-100">
                            상품 정보 수정
                          </DialogTitle>
                          <DialogDescription className="text-stone-500 text-xs">
                            실제 결제 금액과 크레딧 수량에 영향을 미칩니다.
                          </DialogDescription>
                        </DialogHeader>

                        {editingPlan && (
                          <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-stone-300 font-medium">상품명</Label>
                              <Input
                                value={editingPlan.name}
                                onChange={(e) =>
                                  setEditingPlan({ ...editingPlan, name: e.target.value })
                                }
                                className="h-8 text-xs bg-stone-800/50 border-stone-700/50 text-stone-200"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-xs text-stone-300 font-medium">
                                  가격(원)
                                </Label>
                                <Input
                                  type="number"
                                  value={editingPlan.price}
                                  onChange={(e) =>
                                    setEditingPlan({
                                      ...editingPlan,
                                      price: Number(e.target.value),
                                    })
                                  }
                                  className="h-8 text-xs bg-stone-800/50 border-stone-700/50 text-stone-200 font-mono"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-xs text-stone-300 font-medium">크레딧</Label>
                                <Input
                                  type="number"
                                  value={editingPlan.credits}
                                  onChange={(e) =>
                                    setEditingPlan({
                                      ...editingPlan,
                                      credits: Number(e.target.value),
                                    })
                                  }
                                  className="h-8 text-xs bg-stone-800/50 border-stone-700/50 text-stone-200 font-mono"
                                />
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-stone-300 font-medium">
                                뱃지 텍스트
                              </Label>
                              <Input
                                value={editingPlan.badge_text || ''}
                                onChange={(e) =>
                                  setEditingPlan({ ...editingPlan, badge_text: e.target.value })
                                }
                                placeholder="예: BEST, 인기"
                                className="h-8 text-xs bg-stone-800/50 border-stone-700/50 text-stone-200 placeholder:text-stone-600"
                              />
                            </div>
                          </div>
                        )}

                        <DialogFooter className="gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="h-8 text-xs border-stone-700 text-stone-400 hover:bg-stone-800"
                          >
                            취소
                          </Button>
                          <Button
                            onClick={handleSaveEdit}
                            className="h-8 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20"
                          >
                            <Save className="w-3 h-3 mr-1.5" />
                            저장하기
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </Card>
            ))}
      </div>
    </div>
  )
}
