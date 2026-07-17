'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Megaphone, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  createAnnouncement,
  deleteAnnouncement,
  setAnnouncementActive,
  type AnnouncementRow,
} from '@/app/actions/guide'

export function AnnouncementsClient({ initialItems }: { initialItems: AnnouncementRow[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const submit = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('제목과 내용을 입력하세요')
      return
    }
    setSaving(true)
    const res = await createAnnouncement({ title, body })
    setSaving(false)
    if (res.success) {
      toast.success('공지가 등록되었습니다 — 신 가이드로 전달됩니다')
      setTitle('')
      setBody('')
      router.refresh()
    } else {
      toast.error(`등록 실패: ${res.error ?? '알 수 없는 오류'}`)
    }
  }

  const toggle = async (item: AnnouncementRow) => {
    setBusyId(item.id)
    const res = await setAnnouncementActive(item.id, !item.isActive)
    setBusyId(null)
    if (res.success) router.refresh()
    else toast.error('변경 실패')
  }

  const remove = async (item: AnnouncementRow) => {
    if (!window.confirm(`「${item.title}」 공지를 삭제할까요?`)) return
    setBusyId(item.id)
    const res = await deleteAnnouncement(item.id)
    setBusyId(null)
    if (res.success) {
      toast.success('삭제되었습니다')
      router.refresh()
    } else {
      toast.error('삭제 실패')
    }
  }

  return (
    <div className="space-y-6">
      {/* 작성 */}
      <div className="rounded-xl border border-primary/20 bg-surface/30 p-4 space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-bold text-gold-300">
          <Megaphone className="w-4 h-4" /> 새 공지
        </p>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
          placeholder="제목 (80자 이내)"
          className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={4}
          placeholder="내용 (500자 이내) — 신 가이드 말풍선에 그대로 표시됩니다"
          className="w-full rounded-lg bg-background/60 border border-primary/20 px-3 py-2 text-sm text-ink-light outline-none focus:border-primary/50 resize-none"
        />
        <div className="flex justify-end">
          <Button onClick={submit} disabled={saving} className="bg-primary text-background">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : '공지 등록'}
          </Button>
        </div>
      </div>

      {/* 목록 */}
      <div className="rounded-xl border border-primary/15 divide-y divide-primary/10 overflow-hidden">
        {initialItems.length === 0 && (
          <p className="p-6 text-center text-xs text-ink-light/40">등록된 공지가 없습니다.</p>
        )}
        {initialItems.map((item) => (
          <div key={item.id} className="flex items-start gap-3 p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-bold text-ink-light truncate">{item.title}</p>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
                    item.isActive
                      ? 'border-emerald-500/40 text-emerald-300 bg-emerald-900/20'
                      : 'border-white/15 text-ink-light/40'
                  }`}
                >
                  {item.isActive ? '활성' : '비활성'}
                </span>
              </div>
              <p className="text-xs text-ink-light/60 mt-1 line-clamp-2 whitespace-pre-wrap">{item.body}</p>
              <p className="text-[10px] text-ink-light/35 mt-1">
                {new Date(item.createdAt).toLocaleString('ko-KR')} 등록
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === item.id}
                onClick={() => void toggle(item)}
                className="h-7 px-2.5 text-[11px] border-primary/25"
              >
                {item.isActive ? '내리기' : '올리기'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busyId === item.id}
                onClick={() => void remove(item)}
                className="h-7 px-2 text-seal hover:text-seal hover:bg-seal/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
