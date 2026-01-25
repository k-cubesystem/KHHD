"use client";

import { useState, useEffect } from "react";
import { AIPrompt, getPrompts, updatePrompt } from "./actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PromptManagementClient() {
    const [prompts, setPrompts] = useState<AIPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingPrompts, setEditingPrompts] = useState<Record<string, string>>({}); // Key -> Edited Template
    const [saving, setSaving] = useState<string | null>(null); // Key of prompt being saved

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

    const handleTemplateChange = (key: string, value: string) => {
        setEditingPrompts((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async (key: string) => {
        const newTemplate = editingPrompts[key];
        if (newTemplate === undefined) return; // No change

        setSaving(key);
        const result = await updatePrompt(key, newTemplate);
        if (result.success) {
            toast.success("프롬프트가 수정되었습니다.");
            // Update local state to reflect saved status
            setPrompts(prompts.map(p => p.key === key ? { ...p, template: newTemplate } : p));

            // Clear edit state for this key (optional, keeping it allows further edits without reset)
            // setEditingPrompts(prev => { const n = {...prev}; delete n[key]; return n; });
        } else {
            toast.error("저장 실패: " + result.error);
        }
        setSaving(null);
    };

    const handleReset = (key: string) => {
        const original = prompts.find(p => p.key === key)?.template || "";
        setEditingPrompts(prev => ({ ...prev, [key]: original }));
        toast.info("변경 사항을 취소했습니다.");
    };

    // Group prompts by category for Tabs (if needed), or just list them
    // For now, listing them in a nice grid or categories is good.
    const categories = Array.from(new Set(prompts.map(p => p.category)));

    // Fallback if no prompts (e.g. initial load before seed)
    if (!loading && prompts.length === 0) {
        return (
            <div className="text-center py-20 bg-white border border-zen-border rounded-xl">
                <p className="text-zen-muted">등록된 프롬프트가 없습니다.</p>
                <p className="text-xs text-zen-muted/50 mt-1">DB 마이그레이션을 확인하세요.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                            {prompts.filter(p => p.category === cat).map(prompt => {
                                const isEdited = editingPrompts[prompt.key] !== undefined && editingPrompts[prompt.key] !== prompt.template;
                                const currentValue = editingPrompts[prompt.key] !== undefined ? editingPrompts[prompt.key] : prompt.template;

                                return (
                                    <Card key={prompt.key} className="p-6 bg-white border-zen-border shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-bold text-zen-text flex items-center gap-2">
                                                        <Sparkles className="w-4 h-4 text-zen-gold" />
                                                        {prompt.label}
                                                    </h3>
                                                    <Badge variant="outline" className="text-[10px] text-zen-muted border-zen-border bg-zen-bg">
                                                        {prompt.key}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-zen-muted mt-1">{prompt.description}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                {isEdited && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleReset(prompt.key)}
                                                        className="border-zen-border text-zen-muted hover:text-zen-text"
                                                    >
                                                        <RotateCcw className="w-4 h-4 mr-1" /> 되돌리기
                                                    </Button>
                                                )}
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleSave(prompt.key)}
                                                    disabled={!isEdited || saving === prompt.key}
                                                    className="bg-zen-wood text-white hover:bg-zen-wood/90"
                                                >
                                                    {saving === prompt.key ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <>
                                                            <Save className="w-4 h-4 mr-1" />
                                                            저장 ({currentValue.length}자)
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Textarea
                                                value={currentValue}
                                                onChange={(e) => handleTemplateChange(prompt.key, e.target.value)}
                                                className="font-mono text-sm min-h-[200px] bg-zen-bg/30 text-zen-text border-zen-border focus:border-zen-gold leading-relaxed"
                                                placeholder="프롬프트 내용을 입력하세요..."
                                            />
                                            <div className="flex justify-between text-xs text-zen-muted/60 px-1">
                                                <span>마지막 수정: {new Date(prompt.updated_at).toLocaleString()}</span>
                                                <span>Tip: &#123;&#123;변수명&#125;&#125; 형태로 동적 데이터를 삽입할 수 있습니다.</span>
                                            </div>
                                        </div>
                                    </Card>
                                );
                            })}
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
