'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, Save, RotateCcw, Eye, Trash2, FileText, Ticket, ChevronDown, ChevronUp } from 'lucide-react'
import type { AIPrompt } from '@/app/admin/prompts/actions'
import { cn } from '@/lib/utils'

interface PromptEditorProps {
  prompt: AIPrompt
  onSave: (key: string, data: { template: string; talisman_cost: number }) => Promise<void>
  onDelete: (key: string) => Promise<void>
  isSaving: boolean
}

const CATEGORY_STYLE: Record<string, string> = {
  ANALYSIS: 'bg-primary/10 text-primary border-primary/30',
  CHAT: 'bg-primary-dark/10 text-primary-dark border-primary-dark/30',
  SYSTEM: 'bg-stone-700/30 text-stone-400 border-stone-600/30',
  IMAGE: 'bg-primary-dim/10 text-primary-dim border-primary-dim/30',
}

export function PromptEditor({ prompt, onSave, onDelete, isSaving }: PromptEditorProps) {
  const [editedTemplate, setEditedTemplate] = useState(prompt.template)
  const [editedCost, setEditedCost] = useState(prompt.talisman_cost || 1)
  const [expanded, setExpanded] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const isEdited = editedTemplate !== prompt.template || editedCost !== prompt.talisman_cost

  // Extract template variables ({{variable}})
  const extractVariables = (template: string): string[] => {
    const matches = template.match(/\{\{([^}]+)\}\}/g) || []
    return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '').trim()))]
  }

  // Highlight template variables in text
  const highlightVariables = (text: string) => {
    const parts = text.split(/(\{\{[^}]+\}\})/g)
    return parts.map((part, index) => {
      if (part.match(/\{\{[^}]+\}\}/)) {
        return (
          <span key={index} className="bg-gold-500/20 text-gold-400 px-1 py-0.5 rounded font-semibold">
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
    const sampleData: Record<string, string> = {
      name: '홍길동',
      context: '사주 정보: 木 20%, 火 15%, 土 30%, 金 20%, 水 15%',
      date: new Date().toLocaleDateString('ko-KR'),
      birthDate: '1990-01-15',
      saju: '庚子年 戊寅月 甲午日 丙寅時',
      job: '소프트웨어 개발자',
      gender: '남성',
      goal_name: 'CEO의 상',
      goal_desc: '재물운 강화',
      goal_traits: '둥근 코끝, 넓은 이마',
      room_type: '거실',
      theme_name: '재물 가득',
      theme_colors: '골드, 웜 브라운',
      theme_elements: '금전수 화분, 황금 소품',
    }
    variables.forEach((v) => {
      preview = preview.replace(new RegExp(`\\{\\{${v}\\}\\}`, 'g'), sampleData[v] || `[${v}]`)
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
  const categoryStyle = CATEGORY_STYLE[prompt.category] ?? CATEGORY_STYLE.SYSTEM

  return (
    <Card
      className={cn(
        'relative bg-gradient-to-br from-stone-800/30 to-stone-900/20 border border-stone-700/30 overflow-hidden transition-all',
        isEdited && 'border-amber-500/30'
      )}
    >
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.02] mix-blend-overlay pointer-events-none" />

      {/* ── 헤더 행 (항상 표시) ── */}
      <div className="relative flex items-center gap-3 p-3.5">
        {/* 아이콘 */}
        <div className="w-8 h-8 rounded-lg bg-stone-900/50 border border-stone-700/30 flex items-center justify-center flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-stone-400" />
        </div>

        {/* 요약 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-stone-100 font-serif truncate">{prompt.label}</span>
            <Badge className={cn('text-[9px] border', categoryStyle)}>{prompt.category}</Badge>
            <Badge variant="outline" className="text-[9px] text-stone-500 border-stone-600/50 font-mono">
              {prompt.key}
            </Badge>
            {isEdited && (
              <Badge className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/30">수정됨</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[10px] text-stone-500 truncate">{prompt.description || '설명 없음'}</span>
            <span className="text-[10px] text-gold-400 font-mono flex items-center gap-0.5 flex-shrink-0">
              <Ticket className="w-2.5 h-2.5" />
              {editedCost}장
            </span>
            <span className="text-[10px] text-stone-600 flex-shrink-0">{variables.length}개 변수</span>
            <span className="text-[10px] text-stone-600 flex-shrink-0">{editedTemplate.length}자</span>
          </div>
        </div>

        {/* 액션 버튼들 */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {isEdited && (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={handleReset}
                className="h-7 w-7 border-stone-700/50 text-stone-400 hover:text-stone-300 hover:bg-stone-800/50"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-7 px-2.5 text-xs bg-gradient-to-r from-gold-500 to-gold-600 text-ink-950 font-bold shadow-lg shadow-gold-500/20"
              >
                {isSaving ? (
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

          {/* 펼치기 버튼 */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpanded(!expanded)}
            className="h-7 w-7 text-stone-500 hover:text-stone-300 hover:bg-stone-800/50"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </div>

      {/* ── 상세 편집 영역 (펼쳤을 때) ── */}
      {expanded && (
        <div className="relative border-t border-stone-700/30 p-4 space-y-4">
          {/* 부적 비용 + 미리보기/삭제 버튼 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-[10px] text-stone-400 font-medium whitespace-nowrap">부적 소모량</Label>
              <div className="relative w-24">
                <Ticket className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-gold-500" />
                <Input
                  type="number"
                  min="0"
                  value={editedCost}
                  onChange={(e) => setEditedCost(parseInt(e.target.value) || 0)}
                  className="pl-7 h-7 text-xs bg-stone-900/50 border-stone-700/50 text-stone-200 focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20"
                />
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              {/* 미리보기 */}
              <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs border-stone-700/50 text-stone-400 hover:bg-stone-800/50 hover:text-gold-400 hover:border-gold-500/30"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    미리보기
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
                    <p className="text-[10px] text-stone-600">* 샘플 데이터로 치환된 미리보기입니다.</p>
                  </div>
                </DialogContent>
              </Dialog>

              {/* 삭제 */}
              <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2.5 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-stone-900 border-stone-700 text-stone-100 max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-stone-100">프롬프트 삭제</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <p className="text-sm text-stone-300">
                      <strong className="text-stone-100">{prompt.label}</strong> 프롬프트를 삭제하시겠습니까?
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
            </div>
          </div>

          {/* 변수 목록 */}
          {variables.length > 0 && (
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] text-stone-500 font-medium">변수:</span>
              {variables.map((v, i) => (
                <Badge
                  key={i}
                  variant="outline"
                  className="text-[10px] bg-gold-500/10 text-gold-400 border-gold-500/30 font-mono"
                >
                  {`{{${v}}}`}
                </Badge>
              ))}
            </div>
          )}

          {/* 템플릿 에디터 */}
          <div className="space-y-2">
            <Textarea
              value={editedTemplate}
              onChange={(e) => setEditedTemplate(e.target.value)}
              className={cn(
                'font-mono text-xs min-h-[200px] leading-relaxed transition-colors',
                'bg-stone-900/50 text-stone-300 border-stone-700/50 placeholder:text-stone-600',
                'focus:border-gold-500/50 focus:ring-1 focus:ring-gold-500/20'
              )}
              placeholder="프롬프트 템플릿을 입력하세요... ({{변수명}} 형식으로 동적 데이터 삽입)"
            />

            {/* 하이라이팅 미리보기 */}
            <div className="bg-stone-800/30 p-3 rounded-lg border border-stone-700/30">
              <p className="text-[10px] text-stone-500 mb-1.5 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                변수 하이라이팅
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
        </div>
      )}
    </Card>
  )
}
