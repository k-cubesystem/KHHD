"use client";

import { useState, useEffect } from "react";
import { AIPrompt, getPrompts, updatePrompt, createPrompt, deletePrompt } from "./actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2, Ticket, Sparkles, BookOpen } from "lucide-react";
import { PromptEditor } from "@/components/admin/prompt-editor";

const VARIABLE_GUIDE = {
    ANALYSIS: [
        { name: "{{name}}", desc: "사용자 이름" },
        { name: "{{gender}}", desc: "성별 (남성/여성)" },
        { name: "{{birthDate}}", desc: "생년월일 (YYYY-MM-DD)" },
        { name: "{{birthTime}}", desc: "태어난 시간 (HH:mm)" },
        { name: "{{saju}}", desc: "사주 팔자 텍스트 (예: 甲子년...)" },
        { name: "{{date}}", desc: "기준 날짜 (오늘)" }
    ],
    CHAT: [
        { name: "{{context}}", desc: "이전 대화 요약" },
        { name: "{{user_input}}", desc: "사용자 질문" }
    ],
    SYSTEM: [],
    IMAGE: []
};

const DEFAULT_TEMPLATES = {
    daily_fortune: `당신은 '해화당'의 AI 점술가입니다.\n사용자의 사주 정보를 바탕으로 '오늘의 운세'를 생성해주세요.\n날짜: {{date}}\n사용자: {{name}} ({{gender}}, {{birthDate}} {{birthTime}})\n사주: {{saju}}\n\n요구사항:\n1. 100~200자 내외로 핵심만 간결하게 작성하세요.\n2. 부드럽고 신뢰감 있는 '해요체'를 사용하세요.\n3. 오늘의 총운, 재물운, 애정운, 조언을 자연스럽게 섞어서 이야기해주세요.\n4. 마지막에는 행운의 색상과 방향을 추천해주세요.`
};

export function PromptManagementClient() {
    const [prompts, setPrompts] = useState<AIPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);
    const [showCreateDialog, setShowCreateDialog] = useState(false);

    // Create form state
    const [newKey, setNewKey] = useState("");
    const [newLabel, setNewLabel] = useState("");
    const [newCategory, setNewCategory] = useState("ANALYSIS");
    const [newTemplate, setNewTemplate] = useState("");
    const [newDescription, setNewDescription] = useState("");
    const [newTalismanCost, setNewTalismanCost] = useState(1);

    useEffect(() => {
        loadPrompts();
    }, []);

    async function loadPrompts() {
        setLoading(true);
        try {
            const data = await getPrompts();
            setPrompts(data);
        } catch {
            toast.error("프롬프트 목록을 불러오지 못했습니다.");
        } finally {
            setLoading(false);
        }
    }

    const handleSave = async (key: string, data: { template: string, talisman_cost: number }) => {
        setSaving(key);
        const result = await updatePrompt(key, { template: data.template, talisman_cost: data.talisman_cost });
        if (result.success) {
            toast.success("프롬프트가 수정되었습니다.");
            setPrompts(prompts.map(p => p.key === key ? {
                ...p,
                template: data.template,
                talisman_cost: data.talisman_cost,
                updated_at: new Date().toISOString()
            } : p));
        } else {
            toast.error("저장 실패: " + result.error);
        }
        setSaving(null);
    };

    const handleDelete = async (key: string) => {
        setSaving(key);
        const result = await deletePrompt(key);
        if (result.success) {
            toast.success("프롬프트가 삭제되었습니다.");
            setPrompts(prompts.filter(p => p.key !== key));
        } else {
            toast.error("삭제 실패: " + result.error);
        }
        setSaving(null);
    };

    const handleCreate = async () => {
        if (!newKey || !newLabel || !newTemplate) {
            toast.error("필수 항목을 모두 입력해주세요.");
            return;
        }

        setSaving("create");
        const result = await createPrompt(newKey, newLabel, newCategory, newTemplate, newDescription, newTalismanCost);
        if (result.success) {
            toast.success("새 프롬프트가 생성되었습니다.");
            await loadPrompts();
            setShowCreateDialog(false);
            resetCreateForm();
        } else {
            toast.error("생성 실패: " + result.error);
        }
        setSaving(null);
    };

    const resetCreateForm = () => {
        setNewKey("");
        setNewLabel("");
        setNewCategory("ANALYSIS");
        setNewTemplate("");
        setNewDescription("");
        setNewTalismanCost(1);
    };

    const handleQuickCreateDaily = () => {
        setNewKey("daily_fortune");
        setNewLabel("오늘의 운세");
        setNewCategory("ANALYSIS");
        setNewTemplate(DEFAULT_TEMPLATES.daily_fortune);
        setNewDescription("매일 아침 제공되는 오늘의 운세 프롬프트");
        setNewTalismanCost(0);
        setShowCreateDialog(true);
    };

    const hasDailyFortune = prompts.some(p => p.key.toLowerCase() === "daily_fortune");

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                {/* Quick Actions */}
                {!loading && !hasDailyFortune && (
                    <Button
                        variant="outline"
                        onClick={handleQuickCreateDaily}
                        className="bg-gold-50 border-gold-200 text-gold-700 hover:bg-gold-100"
                    >
                        <Sparkles className="w-4 h-4 mr-2" />
                        '오늘의 운세' 프롬프트 자동 생성 (필수)
                    </Button>
                )}

                {/* Create Button */}
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-zen-wood text-white hover:bg-zen-wood/90 ml-auto">
                            <Plus className="w-4 h-4 mr-2" /> 새 프롬프트 생성
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
                        <DialogHeader>
                            <DialogTitle>새 AI 프롬프트 생성</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="key">키 (고유값) *</Label>
                                    <Input
                                        id="key"
                                        value={newKey}
                                        onChange={(e) => setNewKey(e.target.value)}
                                        placeholder="daily_fortune"
                                        className="font-mono"
                                    />
                                    <p className="text-xs text-zen-muted mt-1">영문, 숫자, 언더스코어만 사용</p>
                                </div>
                                <div>
                                    <Label htmlFor="category">카테고리 *</Label>
                                    <Select value={newCategory} onValueChange={setNewCategory}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ANALYSIS">ANALYSIS</SelectItem>
                                            <SelectItem value="CHAT">CHAT</SelectItem>
                                            <SelectItem value="SYSTEM">SYSTEM</SelectItem>
                                            <SelectItem value="IMAGE">IMAGE</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="label">레이블 (표시명) *</Label>
                                    <Input
                                        id="label"
                                        value={newLabel}
                                        onChange={(e) => setNewLabel(e.target.value)}
                                        placeholder="오늘의 운세"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="cost">차감 부적 개수</Label>
                                    <div className="relative">
                                        <Ticket className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gold-500" />
                                        <Input
                                            id="cost"
                                            type="number"
                                            min="0"
                                            value={newTalismanCost}
                                            onChange={(e) => setNewTalismanCost(parseInt(e.target.value) || 0)}
                                            className="pl-9"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="description">설명</Label>
                                <Input
                                    id="description"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="프롬프트에 대한 설명"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="template">템플릿 *</Label>

                                {/* Variable Guide */}
                                <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs space-y-2">
                                    <p className="font-bold flex items-center gap-1 text-slate-700">
                                        <BookOpen className="w-3 h-3" /> 사용 가능한 변수 ({newCategory})
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(VARIABLE_GUIDE[newCategory as keyof typeof VARIABLE_GUIDE] || []).map((v) => (
                                            <div key={v.name} className="flex items-center gap-1 bg-white px-2 py-1 rounded border border-slate-100 shadow-sm" title={v.desc}>
                                                <code className="text-gold-600 font-bold">{v.name}</code>
                                                <span className="text-slate-500">{v.desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <Textarea
                                    id="template"
                                    value={newTemplate}
                                    onChange={(e) => setNewTemplate(e.target.value)}
                                    placeholder="프롬프트 템플릿을 입력하세요..."
                                    className="font-mono text-sm min-h-[200px]"
                                />
                            </div>

                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowCreateDialog(false)}
                                >
                                    취소
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={saving === "create"}
                                    className="bg-zen-wood text-white"
                                >
                                    {saving === "create" ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        "생성"
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Prompts List Grid (No Tabs) */}
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-48 bg-zen-bg rounded-xl animate-pulse" />
                ))
            ) : (
                <div className="grid grid-cols-1 gap-4 md:gap-6 pb-20">
                    {prompts.map(prompt => (
                        <PromptEditor
                            key={prompt.key}
                            prompt={prompt}
                            onSave={handleSave}
                            onDelete={handleDelete}
                            isSaving={saving === prompt.key}
                        />
                    ))}
                    {prompts.length === 0 && !hasDailyFortune && (
                        <div className="col-span-full text-center py-20 bg-white border border-zen-border rounded-xl">
                            <p className="text-zen-muted">등록된 프롬프트가 없습니다.</p>
                            <Button onClick={handleQuickCreateDaily} className="mt-4 bg-gold-500 hover:bg-gold-600">
                                <Sparkles className="w-4 h-4 mr-2" /> '오늘의 운세' 프롬프트 생성하기
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
