"use client";

import { useState, useEffect } from "react";
import {
    getAdminMembershipPlans,
    updateMembershipPlan,
    togglePlanStatus,
    type MembershipPlanAdmin
} from "./actions";
import { getAllPlans as getAllProducts, updatePlan as updateProduct } from "../../products/actions";
import { PricePlan } from "@/types/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, CheckCircle2, XCircle, Crown, Users, Calendar, Database, Ticket, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

export function PlanManagementClient() {
    const [plans, setPlans] = useState<MembershipPlanAdmin[]>([]);
    const [products, setProducts] = useState<PricePlan[]>([]);
    const [loading, setLoading] = useState(true);

    // Saving states
    const [saving, setSaving] = useState<string | null>(null);
    const [savingProduct, setSavingProduct] = useState<string | null>(null);

    // Edited states
    const [editedPlans, setEditedPlans] = useState<Record<string, Partial<MembershipPlanAdmin>>>({});
    const [editedProducts, setEditedProducts] = useState<Record<string, Partial<PricePlan>>>({});

    useEffect(() => {
        loadAllData();
    }, []);

    async function loadAllData() {
        setLoading(true);
        try {
            const [plansData, productsData] = await Promise.all([
                getAdminMembershipPlans(),
                getAllProducts()
            ]);
            setPlans(plansData);
            setProducts(productsData);
        } catch (error) {
            console.error("Load error:", error);
            toast.error("데이터를 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    // === MEMBERSHIP HANDLERS ===
    const handleFieldChange = (planId: string, field: string, value: unknown) => {
        setEditedPlans(prev => ({
            ...prev,
            [planId]: { ...prev[planId], [field]: value }
        }));
    };

    const handleSave = async (planId: string) => {
        const updates = editedPlans[planId];
        if (!updates || Object.keys(updates).length === 0) return;

        setSaving(planId);
        const result = await updateMembershipPlan(planId, updates);
        if (result.success) {
            toast.success("플랜이 수정되었습니다.");
            setPlans(plans.map(p => p.id === planId ? { ...p, ...updates } : p));
            setEditedPlans(prev => {
                const updated = { ...prev };
                delete updated[planId];
                return updated;
            });
        } else {
            toast.error("저장 실패: " + result.error);
        }
        setSaving(null);
    };

    const handleReset = (planId: string) => {
        setEditedPlans(prev => {
            const updated = { ...prev };
            delete updated[planId];
            return updated;
        });
        toast.info("변경 사항을 취소했습니다.");
    };

    const handleToggleStatus = async (planId: string) => {
        setSaving(planId);
        const result = await togglePlanStatus(planId);
        if (result.success) {
            toast.success(`플랜이 ${result.newStatus ? '활성화' : '비활성화'}되었습니다.`);
            const refreshed = await getAdminMembershipPlans();
            setPlans(refreshed);
        } else {
            toast.error("상태 변경 실패: " + result.error);
        }
        setSaving(null);
    };

    // === PRODUCT HANDLERS ===
    const handleProductFieldChange = (prodId: string, field: string, value: unknown) => {
        setEditedProducts(prev => ({
            ...prev,
            [prodId]: { ...prev[prodId], [field]: value }
        }));
    };

    const handleProductSave = async (prodId: string) => {
        const updates = editedProducts[prodId];
        if (!updates || Object.keys(updates).length === 0) return;

        setSavingProduct(prodId);
        const result = await updateProduct(prodId, updates);
        if (result.success) {
            toast.success("상품이 수정되었습니다.");
            setProducts(products.map(p => p.id === prodId ? { ...p, ...updates } : p));
            setEditedProducts(prev => {
                const updated = { ...prev };
                delete updated[prodId];
                return updated;
            });
        } else {
            toast.error("저장 실패: " + result.error);
        }
        setSavingProduct(null);
    };

    const handleProductReset = (prodId: string) => {
        setEditedProducts(prev => {
            const updated = { ...prev };
            delete updated[prodId];
            return updated;
        });
        toast.info("변경 사항을 취소했습니다.");
    };

    const handleProductToggleStatus = async (prodId: string, currentStatus: boolean) => {
        setSavingProduct(prodId);
        const newState = !currentStatus;
        const result = await updateProduct(prodId, { is_active: newState });

        if (result.success) {
            toast.success(`상품이 ${newState ? '활성화' : '비활성화'}되었습니다.`);
            setProducts(products.map(p => p.id === prodId ? { ...p, is_active: newState } : p));
        } else {
            toast.error("상태 변경 실패: " + result.error);
        }
        setSavingProduct(null);
    };

    // Helpers
    const getVal = (plan: any, field: string, editedMap: any) => {
        return editedMap[plan.id]?.[field] !== undefined ? editedMap[plan.id][field] : plan[field];
    };

    const isEdited = (id: string, map: any) => map[id] && Object.keys(map[id]).length > 0;

    if (loading) {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-64 bg-zen-bg rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-16">

            {/* === SECTION 1: MEMBERSHIP PLANS === */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-zen-border">
                    <Crown className="w-6 h-6 text-zen-gold" />
                    <h2 className="text-xl font-bold text-zen-text">멤버십 구독 플랜 관리</h2>
                </div>

                <div className="space-y-8">
                    {plans.map(plan => {
                        const edited = isEdited(plan.id, editedPlans);
                        const themeMap: Record<string, { badge: string; icon: string }> = {
                            SINGLE: { badge: "bg-gray-100 text-gray-700", icon: "text-gray-500" },
                            FAMILY: { badge: "bg-gold-100 text-gold-800", icon: "text-zen-gold" },
                            BUSINESS: { badge: "bg-ink-900 text-gold-300", icon: "text-gold-400" }
                        };
                        const tierTheme = themeMap[plan.tier] || themeMap.SINGLE;

                        return (
                            <Card key={plan.id} className="p-8 bg-white border-zen-border shadow-md">
                                {/* Header */}
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 pb-6 border-b border-zen-border">
                                    <div className="flex items-center gap-4">
                                        <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center", tierTheme.badge)}>
                                            <Crown className={cn("w-6 h-6", tierTheme.icon)} />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-2xl font-serif font-bold text-zen-text">
                                                    {getVal(plan, 'name', editedPlans)}
                                                </h3>
                                                <Badge className={tierTheme.badge}>{plan.tier}</Badge>
                                            </div>
                                            <p className="text-sm text-zen-muted max-w-md">
                                                {getVal(plan, 'description', editedPlans) || "설명 없음"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2 bg-zen-bg px-3 py-1.5 rounded-sm">
                                            <Switch
                                                checked={getVal(plan, 'is_active', editedPlans)}
                                                onCheckedChange={() => handleToggleStatus(plan.id)}
                                                disabled={saving === plan.id}
                                            />
                                            <span className="text-sm text-zen-muted">
                                                {getVal(plan, 'is_active', editedPlans) ? (
                                                    <span className="text-green-600 font-bold">활성</span>
                                                ) : (
                                                    <span className="text-gray-400">비활성</span>
                                                )}
                                            </span>
                                        </div>

                                        {edited && (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleReset(plan.id)}>
                                                    <RotateCcw className="w-4 h-4" />
                                                </Button>
                                                <Button size="sm" onClick={() => handleSave(plan.id)} disabled={saving === plan.id} className="bg-zen-wood text-white">
                                                    {saving === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-1" />} 저장
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Form Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <div>
                                            <Label className="font-bold">플랜 이름</Label>
                                            <Input
                                                value={getVal(plan, 'name', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                                                className="mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold">설명 (메인 문구)</Label>
                                            <Textarea
                                                value={getVal(plan, 'description', editedPlans) || ''}
                                                onChange={(e) => handleFieldChange(plan.id, 'description', e.target.value)}
                                                className="mt-1"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold">월 구독료 (원)</Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'price', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'price', parseInt(e.target.value))}
                                                className="mt-1 font-mono"
                                            />
                                        </div>
                                    </div>

                                    {/* Limits */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2">
                                            <Label className="font-bold flex items-center gap-2">
                                                <Ticket className="w-4 h-4 text-zen-gold" /> 매월 지급 부적
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'talismans_per_period', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'talismans_per_period', parseInt(e.target.value))}
                                                className="mt-1 font-mono bg-gold-50/50 border-gold-200"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold flex items-center gap-2 text-xs text-zen-muted">
                                                <Calendar className="w-3 h-3" /> 일일 부적 한도
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'daily_talisman_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'daily_talisman_limit', parseInt(e.target.value))}
                                                className="mt-1 h-8 text-sm"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold flex items-center gap-2 text-xs text-zen-muted">
                                                <Users className="w-3 h-3" /> 인연 등록 한도
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'relationship_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'relationship_limit', parseInt(e.target.value))}
                                                className="mt-1 h-8 text-sm"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="font-bold flex items-center gap-2 text-xs text-zen-muted">
                                                <Database className="w-3 h-3" /> 결과 저장 한도 (999=무제한)
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'storage_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'storage_limit', parseInt(e.target.value))}
                                                className="mt-1 h-8 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </section>

            {/* === SECTION 2: PRODUCTS === */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 pb-2 border-b border-zen-border">
                    <Ticket className="w-6 h-6 text-zen-wood" />
                    <h2 className="text-xl font-bold text-zen-text">부적 상품(단건) 관리</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {products.map(product => {
                        const edited = isEdited(product.id, editedProducts);

                        return (
                            <Card key={product.id} className={cn("p-6 bg-white border-zen-border shadow-sm hover:shadow-md transition-shadow", !product.is_active && "opacity-75 bg-gray-50")}>
                                <div className="flex flex-col md:flex-row gap-6">
                                    {/* Preview / Header */}
                                    <div className="flex items-start gap-4 md:w-1/3 border-b md:border-b-0 md:border-r border-zen-border pb-4 md:pb-0 md:pr-4">
                                        <div className="w-12 h-12 bg-zen-bg rounded-full flex items-center justify-center shrink-0">
                                            <Ticket className="w-6 h-6 text-zen-wood" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-serif font-bold text-lg text-zen-text">
                                                    {getVal(product, 'name', editedProducts)}
                                                </h3>
                                                {getVal(product, 'badge_text', editedProducts) && (
                                                    <Badge className="bg-zen-gold text-[10px] h-5 px-1.5">{getVal(product, 'badge_text', editedProducts)}</Badge>
                                                )}
                                            </div>
                                            <p className="text-2xl font-bold text-zen-text mt-1">
                                                {getVal(product, 'price', editedProducts)?.toLocaleString()}원
                                            </p>
                                            <div className="text-sm font-bold text-zen-gold mt-1">
                                                부적 {getVal(product, 'credits', editedProducts)}장
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-xs text-zen-muted">상품명</Label>
                                            <Input
                                                value={getVal(product, 'name', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'name', e.target.value)}
                                                className="h-9"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-zen-muted">가격 (원)</Label>
                                            <Input
                                                type="number"
                                                value={getVal(product, 'price', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'price', parseInt(e.target.value))}
                                                className="h-9"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-zen-muted">제공 부적 수 (Credits)</Label>
                                            <Input
                                                type="number"
                                                value={getVal(product, 'credits', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'credits', parseInt(e.target.value))}
                                                className="h-9"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-zen-muted">뱃지 텍스트 (예: BEST)</Label>
                                            <Input
                                                value={getVal(product, 'badge_text', editedProducts) || ''}
                                                onChange={(e) => handleProductFieldChange(product.id, 'badge_text', e.target.value)}
                                                className="h-9"
                                                placeholder="없음"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-xs text-zen-muted">상품 설명 (사용자에게 노출)</Label>
                                            <Input
                                                value={getVal(product, 'description', editedProducts) || ''}
                                                onChange={(e) => handleProductFieldChange(product.id, 'description', e.target.value)}
                                                className="h-9"
                                                placeholder="상품 설명"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 justify-center md:border-l border-zen-border md:pl-4 min-w-[120px]">
                                        <div className="flex items-center gap-2 justify-end md:justify-start">
                                            <Switch
                                                checked={getVal(product, 'is_active', editedProducts)}
                                                onCheckedChange={() => handleProductToggleStatus(product.id, getVal(product, 'is_active', editedProducts))}
                                                disabled={savingProduct === product.id}
                                            />
                                            <span className="text-xs">{getVal(product, 'is_active', editedProducts) ? '판매중' : '중지'}</span>
                                        </div>

                                        {edited && (
                                            <div className="flex gap-2 mt-2 justify-end md:justify-start">
                                                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleProductReset(product.id)}>
                                                    <RotateCcw className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" className="h-8 bg-zen-wood text-white" onClick={() => handleProductSave(product.id)} disabled={savingProduct === product.id}>
                                                    {savingProduct === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
