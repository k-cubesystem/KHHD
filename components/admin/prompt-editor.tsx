"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Eye, Trash2, FileText } from "lucide-react";
import type { AIPrompt } from "@/app/admin/prompts/actions";
import { cn } from "@/lib/utils";

interface PromptEditorProps {
    prompt: AIPrompt;
    onSave: (key: string, newTemplate: string) => Promise<void>;
    onDelete: (key: string) => Promise<void>;
    isSaving: boolean;
}

export function PromptEditor({ prompt, onSave, onDelete, isSaving }: PromptEditorProps) {
    const [editedTemplate, setEditedTemplate] = useState(prompt.template);
    const [showPreview, setShowPreview] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const isEdited = editedTemplate !== prompt.template;

    // Extract template variables ({{variable}})
    const extractVariables = (template: string): string[] => {
        const matches = template.match(/\{\{([^}]+)\}\}/g) || [];
        return matches.map(m => m.replace(/\{\{|\}\}/g, '').trim());
    };

    // Highlight template variables in text
    const highlightVariables = (text: string) => {
        const parts = text.split(/(\{\{[^}]+\}\})/g);
        return parts.map((part, index) => {
            if (part.match(/\{\{[^}]+\}\}/)) {
                return (
                    <span key={index} className="bg-gold-100 text-gold-800 px-1 py-0.5 rounded font-semibold">
                        {part}
                    </span>
                );
            }
            return <span key={index}>{part}</span>;
        });
    };

    // Generate preview with sample data
    const generatePreview = () => {
        const variables = extractVariables(editedTemplate);
        let preview = editedTemplate;

        // Sample data for common variables
        const sampleData: Record<string, string> = {
            name: "홍길동",
            context: "사용자의 사주 정보: 木 20%, 火 15%, 土 30%, 金 20%, 水 15%",
            date: new Date().toLocaleDateString("ko-KR"),
            birthDate: "1990-01-15",
            saju: "庚子年 戊寅月 甲午日 丙寅時",
            job: "소프트웨어 개발자",
            gender: "남성",
        };

        variables.forEach(variable => {
            const value = sampleData[variable] || `[${variable} 샘플값]`;
            preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
        });

        return preview;
    };

    const handleSave = async () => {
        await onSave(prompt.key, editedTemplate);
    };

    const handleReset = () => {
        setEditedTemplate(prompt.template);
        toast.info("변경 사항을 취소했습니다.");
    };

    const handleDelete = async () => {
        await onDelete(prompt.key);
        setShowDeleteConfirm(false);
    };

    const variables = extractVariables(editedTemplate);

    return (
        <Card className="p-6 bg-white border-zen-border shadow-sm hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold text-zen-text">
                            {prompt.label}
                        </h3>
                        <Badge variant="outline" className="text-[10px] text-zen-muted border-zen-border bg-zen-bg">
                            {prompt.key}
                        </Badge>
                        <Badge className="text-[10px] bg-gold-100 text-gold-800 border-gold-300">
                            {prompt.category}
                        </Badge>
                    </div>
                    <p className="text-sm text-zen-muted mt-1">{prompt.description}</p>
                </div>

                <div className="flex gap-2">
                    {/* Preview Button */}
                    <Dialog open={showPreview} onOpenChange={setShowPreview}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-zen-border text-zen-text hover:bg-zen-bg"
                            >
                                <Eye className="w-4 h-4 mr-1" /> 미리보기
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
                            <DialogHeader>
                                <DialogTitle>프롬프트 미리보기</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="bg-zen-bg/50 p-4 rounded-lg border border-zen-border">
                                    <p className="text-sm text-zen-text whitespace-pre-wrap leading-relaxed">
                                        {generatePreview()}
                                    </p>
                                </div>
                                <p className="text-xs text-zen-muted">
                                    * 위 내용은 샘플 데이터로 치환된 미리보기입니다.
                                </p>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Button */}
                    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="border-red-300 text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>프롬프트 삭제</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <p className="text-sm text-zen-text">
                                    <strong>{prompt.label}</strong> 프롬프트를 삭제하시겠습니까?
                                </p>
                                <p className="text-xs text-red-600">
                                    이 작업은 되돌릴 수 없으며, AI 서비스에 영향을 줄 수 있습니다.
                                </p>
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowDeleteConfirm(false)}
                                    >
                                        취소
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDelete}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "삭제"}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {/* Reset Button */}
                    {isEdited && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReset}
                            className="border-zen-border text-zen-muted hover:text-zen-text"
                        >
                            <RotateCcw className="w-4 h-4 mr-1" /> 되돌리기
                        </Button>
                    )}

                    {/* Save Button */}
                    <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={!isEdited || isSaving}
                        className="bg-zen-wood text-white hover:bg-zen-wood/90"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-1" />
                                저장
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Variables Info */}
            {variables.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2 items-center">
                    <span className="text-xs text-zen-muted">사용 중인 변수:</span>
                    {variables.map((variable, index) => (
                        <Badge
                            key={index}
                            variant="outline"
                            className="text-xs bg-gold-50 text-gold-700 border-gold-300"
                        >
                            {`{{${variable}}}`}
                        </Badge>
                    ))}
                </div>
            )}

            {/* Template Editor */}
            <div className="space-y-2">
                <Textarea
                    value={editedTemplate}
                    onChange={(e) => setEditedTemplate(e.target.value)}
                    className={cn(
                        "font-mono text-sm min-h-[250px] leading-relaxed transition-colors",
                        "bg-zen-bg/30 text-zen-text border-zen-border",
                        "focus:border-gold-500 focus:ring-1 focus:ring-gold-500/20"
                    )}
                    placeholder="프롬프트 템플릿을 입력하세요... ({{변수명}} 형식으로 동적 데이터 삽입)"
                />

                {/* Template Highlight Preview */}
                <div className="bg-ink-50 p-3 rounded-lg border border-zen-border/50">
                    <p className="text-xs text-zen-muted mb-2 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        변수 하이라이팅:
                    </p>
                    <div className="text-xs text-zen-text leading-relaxed whitespace-pre-wrap font-mono">
                        {highlightVariables(editedTemplate)}
                    </div>
                </div>

                <div className="flex justify-between text-xs text-zen-muted/60 px-1">
                    <span>마지막 수정: {new Date(prompt.updated_at).toLocaleString("ko-KR")}</span>
                    <span>
                        {editedTemplate.length}자 | {variables.length}개 변수
                    </span>
                </div>
            </div>
        </Card>
    );
}
