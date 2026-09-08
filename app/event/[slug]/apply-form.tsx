'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { applyToEvent } from '@/app/actions/event/apply'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'

interface Props {
  roundSlug: string
  utm: Record<string, string>
}

export function EventApplyForm({ roundSlug, utm }: Props) {
  const [startedAt] = useState(() => Date.now())
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    threadsUsername: '',
    birthDate: '',
    birthTime: '',
    unknownTime: false,
    gender: 'female' as 'male' | 'female' | 'other',
    question: '',
    contact: '',
    consentPublic: true,
    consentPrivacy: false,
    website: '', // 허니팟 — 사람은 안 보이는 필드
  })

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    setError(null)
    if (!form.consentPrivacy) {
      setError('개인정보 수집·이용에 동의해 주세요')
      return
    }
    startTransition(async () => {
      const res = await applyToEvent({
        roundSlug,
        threadsUsername: form.threadsUsername,
        birthDate: form.birthDate,
        birthTime: form.unknownTime ? '' : form.birthTime,
        gender: form.gender,
        question: form.question,
        contact: form.contact,
        consentPublic: form.consentPublic,
        consentPrivacy: true as const,
        website: form.website,
        startedAt,
        utm,
      })
      if (res.success) setDone(true)
      else setError(res.error)
    })
  }

  if (done) {
    return (
      <div className="hanji-card rounded-xl border border-gold-500/25 p-6 text-center">
        <p className="font-serif text-lg text-ink-primary">신청이 접수됐어요 🙏</p>
        <p className="mt-2 break-keep font-sans text-[13.5px] leading-relaxed text-ink-light/80">
          마감 후 선정 결과는 스레드에서 발표합니다. 선정되시면 아이디를 멘션해 알려드려요.
        </p>
        <div className="mt-5 rounded-lg border border-gold-500/25 bg-gold-500/[0.06] p-4">
          <p className="font-serif text-[15px] text-ink-primary">
            기다리는 동안 — 가입하면 복채 {SIGNUP_BONUS_TALISMANS}만냥을 드려요
          </p>
          <p className="mt-1.5 break-keep font-sans text-[12.5px] leading-relaxed text-ink-light/75">
            사주 풀이 {SIGNUP_BONUS_SAJU_COUNT}회를 볼 수 있는 양이고, 오늘의 운세와 신년운세는 원래 무료예요. 선정되지
            않아도 내 사주는 바로 볼 수 있습니다.
          </p>
          <Button asChild className="mt-3.5 w-full">
            <Link
              href={`/auth/sign-up?utm_source=threads&utm_medium=event_thanks&utm_campaign=${encodeURIComponent(roundSlug)}`}
            >
              복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 시작하기
            </Link>
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm" className="mt-2">
          <Link href="/?utm_source=threads&utm_medium=event_thanks">먼저 둘러볼게요</Link>
        </Button>
      </div>
    )
  }

  return (
    <form
      className="hanji-card space-y-5 rounded-xl border border-gold-500/20 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="tu">스레드 아이디</Label>
        <Input
          id="tu"
          placeholder="@없이 아이디만"
          value={form.threadsUsername}
          onChange={(e) => set('threadsUsername', e.target.value)}
          required
          maxLength={64}
        />
        <p className="font-sans text-[11.5px] text-ink-light/60">
          선정 발표 때 이 아이디를 멘션해요. 정확히 적어주세요.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="bd">생년월일(양력)</Label>
          <Input
            id="bd"
            type="date"
            value={form.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bt">태어난 시각</Label>
          <Input
            id="bt"
            type="time"
            value={form.birthTime}
            onChange={(e) => set('birthTime', e.target.value)}
            disabled={form.unknownTime}
          />
          <label className="flex items-center gap-1.5 font-sans text-[11.5px] text-ink-light/70">
            <Checkbox checked={form.unknownTime} onCheckedChange={(v) => set('unknownTime', v === true)} /> 모름
          </label>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>성별</Label>
        <RadioGroup
          value={form.gender}
          onValueChange={(v) => set('gender', v as typeof form.gender)}
          className="flex gap-4"
        >
          <label className="flex items-center gap-1.5 text-[13px]">
            <RadioGroupItem value="female" /> 여
          </label>
          <label className="flex items-center gap-1.5 text-[13px]">
            <RadioGroupItem value="male" /> 남
          </label>
          <label className="flex items-center gap-1.5 text-[13px]">
            <RadioGroupItem value="other" /> 표기 안 함
          </label>
        </RadioGroup>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="q">궁금한 점</Label>
        <Textarea
          id="q"
          rows={4}
          placeholder="구체적으로 적어주실수록 풀이가 또렷해져요. (10~500자)"
          value={form.question}
          onChange={(e) => set('question', e.target.value)}
          required
          minLength={10}
          maxLength={500}
        />
        <p className="text-right font-sans text-[11px] text-ink-light/50">{form.question.length}/500</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ct">
          연락처 <span className="text-ink-light/50">(선택 · 이메일)</span>
        </Label>
        <Input
          id="ct"
          type="email"
          placeholder="선정 시 개별 안내가 필요하면"
          value={form.contact}
          onChange={(e) => set('contact', e.target.value)}
          maxLength={120}
        />
      </div>

      {/* 허니팟 — 시각적으로 숨김. 자동완성·봇이 채우면 조용히 거른다 */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          website
          <input
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => set('website', e.target.value)}
          />
        </label>
      </div>

      <div className="space-y-2.5 border-t border-gold-500/15 pt-4">
        <label className="flex items-start gap-2 font-sans text-[12.5px] leading-relaxed text-ink-light/85">
          <Checkbox
            checked={form.consentPublic}
            onCheckedChange={(v) => set('consentPublic', v === true)}
            className="mt-0.5"
          />
          <span>선정되면 결과 카드를 스레드에 공개하는 데 동의해요 (아이디 마스킹 · 생년월일 비공개)</span>
        </label>
        <label className="flex items-start gap-2 font-sans text-[12.5px] leading-relaxed text-ink-light/85">
          <Checkbox
            checked={form.consentPrivacy}
            onCheckedChange={(v) => set('consentPrivacy', v === true)}
            className="mt-0.5"
          />
          <span>
            <b className="text-ink-primary">[필수]</b> 생년월일시·성별을 선정과 풀이 목적으로 수집·이용하는 데 동의해요.
            라운드 종료 90일 후 파기됩니다.
          </span>
        </label>
      </div>

      {error ? <p className="font-sans text-[13px] text-error-text">{error}</p> : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        신청하기
      </Button>
    </form>
  )
}
