'use client'

import { useState } from 'react'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { quickAddDestinyTarget } from '@/app/actions/user/family'
import { logger } from '@/lib/utils/logger'
import {
  MEMBER_CATEGORIES,
  MEMBER_CATEGORY_META,
  relationsFor,
  type MemberCategory,
} from '@/lib/domain/family/member-category'

/**
 * 인연 즉석 등록 — **풀이 화면을 떠나지 않고** 사람을 하나 더한다.
 *
 * ## 왜 여기 있나
 * 「아는 사람 사주 좀 봐주고 싶다」가 지금까지는 이렇게 흘렀다 — 대상 선택기를 열고, 등록된
 * 사람이 없는 걸 확인하고, 가족 페이지로 나가서, 폼을 채우고, 돌아온다. **나가는 순간 절반이
 * 돌아오지 않는다.** 그래서 최소 입력(이름·생년월일)만 받아 그 자리에서 만들고 곧바로 고른다.
 *
 * 🔴 여기서 받는 것은 **최소값**이다. 태어난 시각·직업·사진 같은 것은 나중에 가족 화면에서
 *    채운다 — 지금 다 받으려 들면 이 폼이 결국 그 폼이 되고, 나가지 않게 만든 이유가 사라진다.
 */
export function QuickAddTarget({
  defaultCategory = 'acquaintance',
  onAdded,
  onCancel,
}: {
  defaultCategory?: MemberCategory
  /** 등록 직후 그 사람을 바로 고르게 하려고 id 를 넘긴다. */
  onAdded: (id: string) => void
  onCancel: () => void
}) {
  const [category, setCategory] = useState<MemberCategory>(defaultCategory)
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [calendarType, setCalendarType] = useState<'solar' | 'lunar'>('solar')
  const [relationship, setRelationship] = useState(relationsFor(defaultCategory)[0])
  const [saving, setSaving] = useState(false)

  const pickCategory = (next: MemberCategory) => {
    setCategory(next)
    // 갈래를 바꾸면 관계 목록이 통째로 바뀐다 — 이전 갈래의 관계가 남아 있으면 데이터가 어긋난다.
    setRelationship(relationsFor(next)[0])
  }

  const submit = async () => {
    setSaving(true)
    try {
      const result = await quickAddDestinyTarget({
        name,
        birthDate,
        birthTime: birthTime || null,
        gender,
        calendarType,
        relationship,
        category,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success(`${name}님을 등록했습니다.`)
      onAdded(result.id)
    } catch (error) {
      logger.error('[QuickAddTarget] 등록 실패:', error)
      toast.error('등록 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const ready = name.trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(birthDate)

  return (
    <div className="space-y-3 rounded-xl border border-gold-500/25 bg-surface/40 p-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-gold-400" />
        <h3 className="font-serif text-sm font-bold text-ink-light">인연 등록</h3>
      </div>

      {/* 갈래 — 가족인가 지인인가 */}
      <div className="grid grid-cols-2 gap-2">
        {MEMBER_CATEGORIES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => pickCategory(key)}
            aria-pressed={category === key}
            className={`rounded-lg border px-3 py-2 text-[13px] transition-colors ${
              category === key
                ? 'border-gold-500/50 bg-gold-500/[0.12] font-bold text-gold-300'
                : 'border-white/10 bg-white/[0.02] text-ink-light/60'
            }`}
          >
            {MEMBER_CATEGORY_META[key].label}
          </button>
        ))}
      </div>
      <p className="text-[11px] font-light leading-relaxed text-ink-light/45">
        {MEMBER_CATEGORY_META[category].pickHint}
      </p>

      <label className="block">
        <span className="sr-only">이름</span>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="이름"
          className="w-full rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-[13px] text-ink-light placeholder:text-ink-light/30"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] text-ink-light/40">생년월일</span>
          <input
            type="date"
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-[13px] text-ink-light"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] text-ink-light/40">태어난 시각 (모르면 비움)</span>
          <input
            type="time"
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface/60 px-3 py-2 text-[13px] text-ink-light"
          />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] text-ink-light/40">관계</span>
          <select
            value={relationship}
            onChange={(event) => setRelationship(event.target.value)}
            className="w-full rounded-lg border border-white/10 bg-surface/60 px-2 py-2 text-[13px] text-ink-light"
          >
            {relationsFor(category).map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] text-ink-light/40">성별</span>
          <select
            value={gender}
            onChange={(event) => setGender(event.target.value === 'female' ? 'female' : 'male')}
            className="w-full rounded-lg border border-white/10 bg-surface/60 px-2 py-2 text-[13px] text-ink-light"
          >
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] text-ink-light/40">양·음력</span>
          <select
            value={calendarType}
            onChange={(event) => setCalendarType(event.target.value === 'lunar' ? 'lunar' : 'solar')}
            className="w-full rounded-lg border border-white/10 bg-surface/60 px-2 py-2 text-[13px] text-ink-light"
          >
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-white/10 py-2 text-[12px] text-ink-light/60"
        >
          그만두기
        </button>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!ready || saving}
          className="flex flex-[2] items-center justify-center gap-1.5 rounded-lg border border-gold-500/40 bg-gold-500/[0.12] py-2 text-[12px] font-bold text-gold-300 disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          등록하고 바로 보기
        </button>
      </div>
    </div>
  )
}
