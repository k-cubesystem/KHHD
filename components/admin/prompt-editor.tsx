'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save, RotateCcw, Eye, Trash2, FileText, Ticket } from 'lucide-react'
import type { AIPrompt } from '@/app/admin/prompts/actions'
import { cn } from '@/lib/utils'

interface PromptEditorProps {
  prompt: AIPrompt
  onSave: (key: string, data: { template: string; talisman_cost: number }) => Promise<void>
  onDelete: (key: string) => Promise<void>
  isSaving: boolean
}

export function PromptEditor({ prompt, onSave, onDelete, isSaving }: PromptEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState(prompt.template)
  const [editedCost, setEditedCost] = useState(prompt.talisman_cost || 1)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEdited = editedTemplate !== prompt.template || editedCost !== prompt.talisman_cost

  // Extract template variables ({{variable}})
  const extractVariables = (template: string): string[] => {
    const matches = template.match(/\{\{([^}]+)\}\}/g) || []
    return matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim())
  }

  // Highlight template variables in text
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/\{\{[^}]+\}\}/)) {
        return (
          <span
            key={index}
            className="bg-gold-500/20 text-gold-400 px-1 py-0.5 rounded font-semibold"
          >
            {part}
          </span>
        )
      }
      return <span key={index}>{part}</span>
    })
  }

  // Generate preview with sample data
  const generatePreview = () => {
    const variables = extractVariables(editedTemplate)
    let preview = editedTemplate

    // Sample data for common variables
    const sampleData: Record<string, string> = {
      name: '홍길동',
      context: '사용자의 사주 정보: 木 20%, 火 15%, 土 30%, 金 20%, 水 15%',
      date: new Date().toLocaleDateString('ko-KR'),
      birthDate: '1990-01-15',
      saju: '庚子年 戊寅月 甲午日 丙寅時',
      job: '소프트웨어 개발자',
      gender: '남성',
    }

    variables.forEach((variable) => {
      const value = sampleData[variable] || `[${variable} 샘플값]`
      preview = preview.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value)
    })

    return preview
  }

  const handleSave = async () => {
    await onSave(prompt.key, { template: editedTemplate, talisman_cost: editedCost })
  }

  const handleReset = () => {
    setEditedTemplate(prompt.template)
    setEditedCost(prompt.talisman_cost || 1)
    toast.info('변경 사항을 취소했습니다.')
  }

  const handleDelete = async () => {
    await onDelete(prompt.key)
    setShowDeleteConfirm(false)
  }

  const variables = extractVariables(editedTemplate)

  return (
    <Card className="relative p-4 md:p-5 bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 shadow-lg hover:shadow-xl hover:border-gold-500/30 transition-all duration-300 overflow-hidden group">
      {/* Noise Overlay */}
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

      {/* Header */}
      <div className="relative flex flex-col md:flex-row justify-between items-start mb-4 gap-3">
        <div className="flex-1 w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base md:text-lg font-bold text-stone-100 font-serif">
              {prompt.label}
            </h3>
            <Badge
              variant="outline"
              className="text-[9px] md:text-[10px] text-stone-500 border-stone-600/50 bg-stone-800/50"
            >
              {prompt.key}
            </Badge>
            <Badge
              className={
                'text-[9px] md:text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/30'
              }
            >
              {prompt.category}
            </Badge>
          </div>
          <p className="text-xs md:text-sm text-stone-500 mt-1">{prompt.description}</p>

          {/* Cost Input */}
          <div className="mt-3 flex items-center gap-2">
            <div className="relative w-24 md:w-32">
              <Ticket className="w-3 h-3 md:w-4 md:h-4 absolute left-2 top-1/2 -translate-y-1/2 text-gold-500" />
              <Input
                type="number"
                min="0"
                value={editedCost}
                onChange={(e) => setEditedCost(parseInt(e.target.value) || 0)}
                className="pl-7 md:pl-8 h-7 md:h-8 text-xs md:text-sm bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
              />
            </div>
            <span className="text-[10px] md:text-xs text-stone-500 font-medium">부적 소모량</span>
          </div>
        </div>

        <div className="flex gap-1 md:gap-2 flex-shrink-0">
          {/* Preview Button */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-stone-700/50 text-stone-400 hover:bg-stone-800/50 hover:text-gold-400 hover:border-gold-500/30 h-7 md:h-8 px-2 md:px-3 text-xs"
              >
                <Eye className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                <span className="hidden md:inline">미리보기</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-auto bg-stone-900 border-stone-700 text-stone-100">
              <DialogHeader>
                <DialogTitle className="font-serif text-stone-100">프롬프트 미리보기</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="bg-stone-800/50 p-3 rounded-lg border border-stone-700/30">
                  <p className="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed font-mono">
                    {generatePreview()}
                  </p>
                </div>
                <p className="text-[10px] text-stone-600">
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
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 h-7 md:h-8 px-2"
              >
                <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-sm">
              <DialogHeader>
                <DialogTitle className="font-serif text-stone-100">프롬프트 삭제</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-stone-300">
                  <strong className="text-stone-100">{prompt.label}</strong> 프롬프트를
                  삭제하시겠습니까?
                </p>
                <p className="text-xs text-red-400">
                  이 작업은 되돌릴 수 없으며, AI 서비스에 영향을 줄 수 있습니다.
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="h-8 text-xs border-stone-700 text-stone-400 hover:bg-stone-800"
                  >
                    취소
                  </Button>
                  <Button
                    onClick={handleDelete}
                    disabled={isSaving}
                    className="h-8 text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  >
                    {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '삭제'}
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
              className="border-stone-700/50 text-stone-500 hover:text-stone-300 hover:bg-stone-800/50 h-7 md:h-8 px-2 md:px-3 text-xs"
            >
              <RotateCcw className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
              <span className="hidden md:inline">되돌리기</span>
            </Button>
          )}

          {/* Save Button */}
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isEdited || isSaving}
            className="bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 hover:from-gold-400 hover:to-gold-500 disabled:opacity-40 disabled:cursor-not-allowed h-7 md:h-8 px-2 md:px-3 text-xs font-bold shadow-lg shadow-gold-500/20"
          >
            {isSaving ? (
              <Loader2 className="w-3 h-3 md:w-4 md:h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                <span className="hidden md:inline">저장</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Variables Info */}
      {variables.length > 0 && (
        <div className="relative mb-3 flex flex-wrap gap-1.5 md:gap-2 items-center">
          <span className="text-[10px] md:text-xs text-stone-500 font-medium">사용 중인 변수:</span>
          {variables.map((variable, index) => (
            <Badge
              key={index}
              variant="outline"
              className="text-[10px] md:text-xs bg-gold-500/10 text-gold-400 border-gold-500/30 font-mono"
            >
              {`{{${variable}}}`}
            </Badge>
          ))}
        </div>
      )}

      {/* Template Editor */}
      <div className="relative space-y-2">
        <Textarea
          value={editedTemplate}
          onChange={(e) => setEditedTemplate(e.target.value)}
          className={cn(
            'font-mono text-xs md:text-sm min-h-[200px] md:min-h-[250px] leading-relaxed transition-colors',
            'bg-stone-900/50 text-stone-300 border-stone-700/50 placeholder:text-stone-600',
            'focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20'
          )}
          placeholder="프롬프트 템플릿을 입력하세요... ({{변수명}} 형식으로 동적 데이터 삽입)"
        />

        {/* Template Highlight Preview */}
        <div className="bg-stone-800/30 p-3 rounded-lg border border-stone-700/30">
          <p className="text-[10px] text-stone-500 mb-2 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            변수 하이라이팅:
          </p>
          <div className="text-[10px] text-stone-400 leading-relaxed whitespace-pre-wrap font-mono">
            {highlightVariables(editedTemplate)}
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-stone-600 px-1">
          <span>마지막 수정: {new Date(prompt.updated_at).toLocaleString('ko-KR')}</span>
          <span>
            {editedTemplate.length}자 | {variables.length}개 변수
          </span>
        </div>
      </div>
    </Card>
  )
}
