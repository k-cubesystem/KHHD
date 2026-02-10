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
                    <div key={i} className="h-64 bg-stone-900/30 rounded-xl animate-pulse border border-stone-700/30" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-12 md:space-y-16">

            {/* === SECTION 1: MEMBERSHIP PLANS === */}
            <section className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-2.5 md:gap-3 pb-3 md:pb-4 border-b border-stone-700/30">
                    <Crown className="w-5 h-5 md:w-6 md:h-6 text-gold-500" />
                    <h2 className="text-lg md:text-xl font-bold text-stone-100 font-serif">멤버십 구독 플랜 관리</h2>
                </div>

                <div className="space-y-6 md:space-y-8">
                    {plans.map(plan => {
                        const edited = isEdited(plan.id, editedPlans);
                        const themeMap: Record<string, { badge: string; icon: string; bg: string }> = {
                            SINGLE: { badge: "bg-stone-700/30 text-stone-300 border-stone-600/30", icon: "text-stone-400", bg: "from-stone-700/20 to-stone-800/10" },
                            FAMILY: { badge: "bg-gold-500/10 text-gold-400 border-gold-500/30", icon: "text-gold-500", bg: "from-gold-500/10 to-gold-600/5" },
                            BUSINESS: { badge: "bg-purple-500/10 text-purple-400 border-purple-500/30", icon: "text-purple-400", bg: "from-purple-500/10 to-purple-600/5" }
                        };
                        const tierTheme = themeMap[plan.tier as keyof typeof themeMap] ?? themeMap.SINGLE;

                        return (
                            <Card key={plan.id} className={cn("relative p-4 md:p-6 lg:p-8 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 shadow-lg overflow-hidden group")}>
                                {/* Noise Overlay */}
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                                {/* Header */}
                                <div className="relative flex flex-col gap-4 mb-6 md:mb-8 pb-4 md:pb-6 border-b border-stone-700/30">
                                    <div className="flex items-start gap-3 md:gap-4 flex-wrap">
                                        <div className={cn("w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center bg-gradient-to-br", tierTheme.bg, "border border-stone-700/30")}>
                                            <Crown className={cn("w-5 h-5 md:w-6 md:h-6", tierTheme.icon)} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h3 className="text-lg md:text-xl lg:text-2xl font-serif font-bold text-stone-100 truncate">
                                                    {getVal(plan, 'name', editedPlans)}
                                                </h3>
                                                <Badge className={cn(tierTheme.badge, "text-[9px] md:text-[10px] border")}>{plan.tier}</Badge>
                                            </div>
                                            <p className="text-xs md:text-sm text-stone-500 line-clamp-2">
                                                {getVal(plan, 'description', editedPlans) || "설명 없음"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                        <div className="flex items-center gap-2 bg-stone-900/50 px-2.5 md:px-3 py-1.5 rounded-lg border border-stone-700/30">
                                            <Switch
                                                checked={getVal(plan, 'is_active', editedPlans)}
                                                onCheckedChange={() => handleToggleStatus(plan.id)}
                                                disabled={saving === plan.id}
                                            />
                                            <span className="text-xs md:text-sm">
                                                {getVal(plan, 'is_active', editedPlans) ? (
                                                    <span className="text-emerald-400 font-bold">활성</span>
                                                ) : (
                                                    <span className="text-stone-600">비활성</span>
                                                )}
                                            </span>
                                        </div>

                                        {edited && (
                                            <div className="flex items-center gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleReset(plan.id)} className="h-7 md:h-8 border-stone-700/50 text-stone-400 hover:text-stone-300 hover:bg-stone-800/50">
                                                    <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                                                </Button>
                                                <Button size="sm" onClick={() => handleSave(plan.id)} disabled={saving === plan.id} className="h-7 md:h-8 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20">
                                                    {saving === plan.id ? <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" /> : <><Save className="w-3 h-3 md:w-4 md:h-4 mr-1" /> 저장</>}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Form Grid */}
                                <div className="relative grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 lg:gap-8">
                                    {/* Basic Info */}
                                    <div className="space-y-3 md:space-y-4">
                                        <div>
                                            <Label className="font-bold text-xs md:text-sm text-stone-300">플랜 이름</Label>
                                            <Input
                                                value={getVal(plan, 'name', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'name', e.target.value)}
                                                className="mt-1 h-8 md:h-9 text-xs md:text-sm bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold text-xs md:text-sm text-stone-300">설명 (메인 문구)</Label>
                                            <Textarea
                                                value={getVal(plan, 'description', editedPlans) || ''}
                                                onChange={(e) => handleFieldChange(plan.id, 'description', e.target.value)}
                                                className="mt-1 text-xs md:text-sm bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                                                rows={2}
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold text-xs md:text-sm text-stone-300">월 구독료 (원)</Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'price', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'price', parseInt(e.target.value))}
                                                className="mt-1 h-8 md:h-9 text-xs md:text-sm font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                                            />
                                        </div>
                                    </div>

                                    {/* Limits */}
                                    <div className="grid grid-cols-2 gap-3 md:gap-4">
                                        <div className="col-span-2">
                                            <Label className="font-bold flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-stone-300">
                                                <Ticket className="w-3 h-3 md:w-4 md:h-4 text-gold-500" /> 매월 지급 부적
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'talismans_per_period', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'talismans_per_period', parseInt(e.target.value))}
                                                className="mt-1 h-8 md:h-9 text-xs md:text-sm font-mono bg-gold-500/10 border-gold-500/30 text-gold-300 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold flex items-center gap-1.5 text-[10px] md:text-xs text-stone-500">
                                                <Calendar className="w-2.5 h-2.5 md:w-3 md:h-3" /> 일일 부적 한도
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'daily_talisman_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'daily_talisman_limit', parseInt(e.target.value))}
                                                className="mt-1 h-7 md:h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50"
                                            />
                                        </div>
                                        <div>
                                            <Label className="font-bold flex items-center gap-1.5 text-[10px] md:text-xs text-stone-500">
                                                <Users className="w-2.5 h-2.5 md:w-3 md:h-3" /> 인연 등록 한도
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'relationship_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'relationship_limit', parseInt(e.target.value))}
                                                className="mt-1 h-7 md:h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="font-bold flex items-center gap-1.5 text-[10px] md:text-xs text-stone-500">
                                                <Database className="w-2.5 h-2.5 md:w-3 md:h-3" /> 결과 저장 한도 (999=무제한)
                                            </Label>
                                            <Input
                                                type="number"
                                                value={getVal(plan, 'storage_limit', editedPlans)}
                                                onChange={(e) => handleFieldChange(plan.id, 'storage_limit', parseInt(e.target.value))}
                                                className="mt-1 h-7 md:h-8 text-xs bg-stone-900/50 border-stone-700/50 text-stone-300 focus:border-gold-500/50"
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
            <section className="space-y-4 md:space-y-6">
                <div className="flex items-center gap-2.5 md:gap-3 pb-3 md:pb-4 border-b border-stone-700/30">
                    <Ticket className="w-5 h-5 md:w-6 md:h-6 text-gold-500" />
                    <h2 className="text-lg md:text-xl font-bold text-stone-100 font-serif">부적 상품(단건) 관리</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 md:gap-6">
                    {products.map(product => {
                        const edited = isEdited(product.id, editedProducts);

                        return (
                            <Card key={product.id} className={cn("relative p-4 md:p-6 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group", !product.is_active && "opacity-60")}>
                                {/* Noise Overlay */}
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

                                <div className="relative flex flex-col md:flex-row gap-4 md:gap-6">
                                    {/* Preview / Header */}
                                    <div className="flex items-start gap-3 md:gap-4 md:w-1/3 border-b md:border-b-0 md:border-r border-stone-700/30 pb-4 md:pb-0 md:pr-4">
                                        <div className="w-10 h-10 md:w-12 md:h-12 bg-gold-500/10 rounded-full flex items-center justify-center shrink-0 border border-gold-500/20">
                                            <Ticket className="w-5 h-5 md:w-6 md:h-6 text-gold-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-serif font-bold text-base md:text-lg text-stone-100 truncate">
                                                    {getVal(product, 'name', editedProducts)}
                                                </h3>
                                                {getVal(product, 'badge_text', editedProducts) && (
                                                    <Badge className="bg-gold-500/20 text-gold-400 border border-gold-500/30 text-[9px] h-4 md:h-5 px-1.5">{getVal(product, 'badge_text', editedProducts)}</Badge>
                                                )}
                                            </div>
                                            <p className="text-lg md:text-2xl font-bold text-stone-100 mt-1 font-mono">
                                                {getVal(product, 'price', editedProducts)?.toLocaleString()}원
                                            </p>
                                            <div className="text-xs md:text-sm font-bold text-gold-400 mt-1">
                                                부적 {getVal(product, 'credits', editedProducts)}장
                                            </div>
                                        </div>
                                    </div>

                                    {/* Edit Fields */}
                                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                                        <div>
                                            <Label className="text-[10px] md:text-xs text-stone-500">상품명</Label>
                                            <Input
                                                value={getVal(product, 'name', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'name', e.target.value)}
                                                className="h-8 md:h-9 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] md:text-xs text-stone-500">가격 (원)</Label>
                                            <Input
                                                type="number"
                                                value={getVal(product, 'price', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'price', parseInt(e.target.value))}
                                                className="h-8 md:h-9 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] md:text-xs text-stone-500">제공 부적 수</Label>
                                            <Input
                                                type="number"
                                                value={getVal(product, 'credits', editedProducts)}
                                                onChange={(e) => handleProductFieldChange(product.id, 'credits', parseInt(e.target.value))}
                                                className="h-8 md:h-9 text-xs font-mono bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-[10px] md:text-xs text-stone-500">뱃지 텍스트</Label>
                                            <Input
                                                value={getVal(product, 'badge_text', editedProducts) || ''}
                                                onChange={(e) => handleProductFieldChange(product.id, 'badge_text', e.target.value)}
                                                className="h-8 md:h-9 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                                                placeholder="없음"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <Label className="text-[10px] md:text-xs text-stone-500">상품 설명</Label>
                                            <Input
                                                value={getVal(product, 'description', editedProducts) || ''}
                                                onChange={(e) => handleProductFieldChange(product.id, 'description', e.target.value)}
                                                className="h-8 md:h-9 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50"
                                                placeholder="상품 설명"
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex flex-col gap-2 justify-center md:border-l border-stone-700/30 md:pl-4 min-w-[100px] md:min-w-[120px]">
                                        <div className="flex items-center gap-2 justify-end md:justify-start bg-stone-900/50 px-2.5 py-1.5 rounded-lg border border-stone-700/30">
                                            <Switch
                                                checked={getVal(product, 'is_active', editedProducts)}
                                                onCheckedChange={() => handleProductToggleStatus(product.id, getVal(product, 'is_active', editedProducts))}
                                                disabled={savingProduct === product.id}
                                            />
                                            <span className="text-[10px] md:text-xs text-stone-400">{getVal(product, 'is_active', editedProducts) ? <span className="text-emerald-400 font-bold">판매중</span> : <span className="text-stone-600">중지</span>}</span>
                                        </div>

                                        {edited && (
                                            <div className="flex gap-2 mt-2 justify-end md:justify-start">
                                                <Button variant="outline" size="icon" className="h-7 w-7 md:h-8 md:w-8 border-stone-700/50 text-stone-400 hover:text-stone-300 hover:bg-stone-800/50" onClick={() => handleProductReset(product.id)}>
                                                    <RotateCcw className="w-3 h-3" />
                                                </Button>
                                                <Button size="sm" className="h-7 md:h-8 bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 shadow-lg shadow-gold-500/20 text-xs" onClick={() => handleProductSave(product.id)} disabled={savingProduct === product.id}>
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
