"use client";

import { useState, useEffect } from "react";
import { AIPrompt, getPrompts, updatePrompt, createPrompt, deletePrompt } from "./actions";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { PromptEditor } from "@/components/admin/prompt-editor";

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

    const handleSave = async (key: string, newTemplate: string) => {
        setSaving(key);
        const result = await updatePrompt(key, newTemplate);
        if (result.success) {
            toast.success("프롬프트가 수정되었습니다.");
            setPrompts(prompts.map(p => p.key === key ? { ...p, template: newTemplate, updated_at: new Date().toISOString() } : p));
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
        const result = await createPrompt(newKey, newLabel, newCategory, newTemplate, newDescription);
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
    };

    const categories = Array.from(new Set(prompts.map(p => p.category)));

    if (!loading && prompts.length === 0) {
        return (
            <div className="text-center py-20 bg-white border border-zen-border rounded-xl">
                <p className="text-zen-muted">등록된 프롬프트가 없습니다.</p>
                <p className="text-xs text-zen-muted/50 mt-1">아래 버튼을 눌러 새 프롬프트를 생성하세요.</p>
                <Button onClick={() => setShowCreateDialog(true)} className="mt-4">
                    <Plus className="w-4 h-4 mr-2" /> 프롬프트 생성
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Create Button */}
            <div className="flex justify-end">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-zen-wood text-white hover:bg-zen-wood/90">
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
                                        placeholder="saju_analysis"
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

                            <div>
                                <Label htmlFor="label">레이블 (표시명) *</Label>
                                <Input
                                    id="label"
                                    value={newLabel}
                                    onChange={(e) => setNewLabel(e.target.value)}
                                    placeholder="사주 상세 분석"
                                />
                            </div>

                            <div>
                                <Label htmlFor="description">설명</Label>
                                <Input
                                    id="description"
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    placeholder="사주 팔자를 바탕으로 한 상세 분석 프롬프트"
                                />
                            </div>

                            <div>
                                <Label htmlFor="template">템플릿 *</Label>
                                <Textarea
                                    id="template"
                                    value={newTemplate}
                                    onChange={(e) => setNewTemplate(e.target.value)}
                                    placeholder="프롬프트 템플릿을 입력하세요...&#10;&#10;예시:&#10;당신은 전문 역술인입니다.&#10;{{name}}님의 사주를 분석하세요.&#10;&#10;변수 사용: {{변수명}}"
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

            {/* Prompts List */}
            {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-48 bg-zen-bg rounded-xl animate-pulse" />
                ))
            ) : (
                <Tabs defaultValue={categories[0]} className="w-full">
                    <TabsList className="w-full justify-start bg-white border border-zen-border p-1 h-auto flex-wrap gap-2">
                        {categories.map(cat => (
                            <TabsTrigger
                                key={cat}
                                value={cat}
                                className="data-[state=active]:bg-zen-wood data-[state=active]:text-white capitalize px-4 py-2"
                            >
                                {cat}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {categories.map(cat => (
                        <TabsContent key={cat} value={cat} className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {prompts.filter(p => p.category === cat).map(prompt => (
                                <PromptEditor
                                    key={prompt.key}
                                    prompt={prompt}
                                    onSave={handleSave}
                                    onDelete={handleDelete}
                                    isSaving={saving === prompt.key}
                                />
                            ))}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
