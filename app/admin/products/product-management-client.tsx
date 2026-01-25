"use client";

import { useState, useEffect } from "react";
import { PricePlan } from "@/types/auth";
import { getAllPlans, updatePlan } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Zap, Edit2, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

export function ProductManagementClient() {
  const [plans, setPlans] = useState<PricePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<PricePlan | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    loadPlans();
  }, []);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await getAllPlans();
      setPlans(data);
    } catch (e) {
      toast.error("상품 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const handleToggleActive = async (plan: PricePlan) => {
    const newState = !plan.is_active;
    // Optimistic
    setPlans(plans.map(p => p.id === plan.id ? { ...p, is_active: newState } : p));

    const res = await updatePlan(plan.id, { is_active: newState });
    if (!res.success) {
      setPlans(plans); // Rollback
      toast.error("변경 실패");
    } else {
      toast.success(newState ? "상품이 활성화되었습니다." : "상품이 비활성화되었습니다.");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingPlan) return;

    const res = await updatePlan(editingPlan.id, {
      name: editingPlan.name,
      price: Number(editingPlan.price),
      credits: Number(editingPlan.credits),
      description: editingPlan.description,
      badge_text: editingPlan.badge_text
    });

    if (res.success) {
      toast.success("상품 정보가 수정되었습니다.");
      setOpen(false);
      loadPlans(); // Reload to be safe
    } else {
      toast.error("수정 실패: " + res.error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 rounded-xl bg-zen-bg animate-pulse border border-zen-border" />
        ))
      ) : plans.map((plan) => (
        <Card key={plan.id} className={cn(
          "p-6 bg-white border-zen-border relative overflow-hidden group transition-all duration-300 hover:shadow-lg",
          !plan.is_active && "opacity-60 grayscale"
        )}>
          {/* Active Status Ribbon */}
          <div className="absolute top-4 right-4 z-10">
            <Switch
              checked={plan.is_active}
              onCheckedChange={() => handleToggleActive(plan)}
            />
          </div>

          <div className="space-y-4 relative z-10">
            <div className="space-y-1 pr-12">
              <div className="text-xs text-zen-gold uppercase tracking-wider font-bold mb-1">
                Credit x {plan.credits}
              </div>
              <h3 className="text-xl font-bold text-zen-text font-serif">{plan.name}</h3>
              <p className="text-sm text-zen-muted h-10 line-clamp-2">{plan.description}</p>
            </div>

            <div className="flex items-baseline gap-1 py-2">
              <span className="text-3xl font-black text-zen-text tabular-nums">{plan.price.toLocaleString()}</span>
              <span className="text-sm font-medium text-zen-muted">원</span>
            </div>

            {/* Edit Button (Dialog Trigger) */}
            <Dialog open={open && editingPlan?.id === plan.id} onOpenChange={(v) => { if (!v) setEditingPlan(null); setOpen(v); }}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full bg-white hover:bg-zen-bg border-zen-border text-zen-text group-hover:border-zen-gold/50 transition-colors"
                  onClick={() => { setEditingPlan(plan); setOpen(true); }}
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  내용 수정하기
                </Button>
              </DialogTrigger>

              {/* Modal Content */}
              <DialogContent className="bg-white border-zen-border text-zen-text sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>상품 정보 수정</DialogTitle>
                  <DialogDescription>
                    실제 결제 금액과 크레딧 수량에 영향을 미칩니다. 신중하게 변경하세요.
                  </DialogDescription>
                </DialogHeader>

                {editingPlan && (
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">상품명</Label>
                      <Input
                        value={editingPlan.name}
                        onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                        className="col-span-3 bg-white border-zen-border text-zen-text"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">가격(원)</Label>
                      <Input
                        type="number"
                        value={editingPlan.price}
                        onChange={(e) => setEditingPlan({ ...editingPlan, price: Number(e.target.value) })}
                        className="col-span-3 bg-white border-zen-border text-zen-text"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">크레딧</Label>
                      <Input
                        type="number"
                        value={editingPlan.credits}
                        onChange={(e) => setEditingPlan({ ...editingPlan, credits: Number(e.target.value) })}
                        className="col-span-3 bg-white border-zen-border text-zen-text"
                      />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label className="text-right">뱃지 텍스트</Label>
                      <Input
                        value={editingPlan.badge_text || ""}
                        onChange={(e) => setEditingPlan({ ...editingPlan, badge_text: e.target.value })}
                        placeholder="예: BEST, 인기"
                        className="col-span-3 bg-white border-zen-border text-zen-text"
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>취소</Button>
                  <Button onClick={handleSaveEdit} className="bg-zen-wood text-white hover:bg-zen-wood/90">
                    <Save className="w-4 h-4 mr-2" />
                    저장하기
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Background Glow */}
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-zen-gold/10 rounded-full blur-[50px] group-hover:bg-zen-gold/20 transition-all duration-500" />
        </Card>
      ))}
    </div>
  );
}
