'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { readSaju3, readChild } from '@/app/actions/saju3'
import { shareText, type Saju3Result, type ChildResult } from '@/lib/domain/saju/saju3'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'
import { trackEvent } from '@/lib/analytics/ga4'
import { Saju3Card } from './saju3-card'

type Mode = 'me' | 'child'

interface Props {
  siteUrl: string
  utm: Record<string, string>
  /** 아이 모드로 열린 진입점(/saju3/child)인지 */
  initialMode?: Mode
}

function withUtm(path: string, utm: Record<string, string>, medium: string): string {
  const q = new URLSearchParams({ utm_source: utm.utm_source || 'threads', utm_medium: medium })
  if (utm.utm_campaign) q.set('utm_campaign', utm.utm_campaign)
  return `${path}?${q.toString()}`
}

export function Saju3Form({ siteUrl, utm, initialMode = 'me' }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const [pending, startTransition] = useTransition()
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [unknownTime, setUnknownTime] = useState(true)
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<Saju3Result | null>(null)
  const [child, setChild] = useState<ChildResult | null>(null)
  const [copied, setCopied] = useState(false)

  const reset = () => {
    setResult(null)
    setChild(null)
    setBirthDate('')
    setBirthTime('')
    setError(null)
  }

  const submit = () => {
    setError(null)
    const time = unknownTime || !birthTime ? null : birthTime
    startTransition(async () => {
      if (mode === 'child') {
        const res = await readChild({ birthDate, birthTime: time, gender })
        if (!res.success) return setError(res.error)
        const { success: _ok, ...rest } = res
        setChild(rest)
        trackEvent({ action: 'saju3_child_result', category: 'saju3' })
        return
      }
      const res = await readSaju3({ birthDate, birthTime: time })
      if (!res.success) return setError(res.error)
      const { success: _ok, ...rest } = res
      setResult(rest)
      trackEvent({ action: 'saju3_result', category: 'saju3', label: rest.type.slug })
    })
  }

  // ── 결과: 나 ───────────────────────────────────────────────
  if (result) {
    const shareUrl = `${siteUrl}/saju3/${result.type.slug}?utm_source=threads&utm_medium=share`
    const text = shareText(result.type, shareUrl)
    const intent = `https://www.threads.net/intent/post?text=${encodeURIComponent(text)}`

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        trackEvent({ action: 'saju3_share', category: 'saju3', label: 'copy' })
        setTimeout(() => setCopied(false), 1800)
      } catch {
        /* 클립보드 거부 — 조용히 */
      }
    }

    return (
      <div className="space-y-4">
        <Saju3Card result={result} />

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <a
              href={intent}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ action: 'saju3_share', category: 'saju3', label: 'threads' })}
            >
              <Share2 className="mr-1.5 h-4 w-4" />
              스레드에 올리기
            </a>
          </Button>
          <Button variant="outline" className="h-11" onClick={copy}>
            {copied ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copied ? '복사됨' : '문구 복사'}
          </Button>
        </div>

        <section className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center">
          <p className="font-serif text-[15px] text-ink-primary">이건 지도의 첫 장이야</p>
          <p className="mt-1.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
            여덟 글자 전부랑 올해 흐름까지 보려면 가입하면 돼. 복채 {SIGNUP_BONUS_TALISMANS}만냥(사주 풀이{' '}
            {SIGNUP_BONUS_SAJU_COUNT}회분) 주니까 바로 볼 수 있어.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link
              href={withUtm('/auth/sign-up', utm, 'saju3')}
              onClick={() => trackEvent({ action: 'saju3_cta_signup', category: 'saju3', label: result.type.slug })}
            >
              복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 전체 보기
            </Link>
          </Button>
        </section>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => {
              reset()
              setMode('child')
            }}
          >
            우리 아이도 보기
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={reset}>
            다시 보기
          </Button>
        </div>
      </div>
    )
  }

  // ── 결과: 아이 ─────────────────────────────────────────────
  if (child) {
    return (
      <div className="space-y-4">
        <section className="hanji-card rounded-xl border border-gold-500/25 p-6">
          <p className="text-center font-sans text-[11px] tracking-[0.18em] text-gold-500/80">우리 아이 결정적 시기</p>
          <p className="mt-3 break-keep text-center font-serif text-[19px] leading-snug text-gold-300">
            {child.headline}
          </p>
          <dl className="mt-6 space-y-3.5">
            {[
              ['공부', child.studyLine],
              ['기질', child.temperLine],
              ['때', child.decisiveLine],
            ].map(([label, line]) => (
              <div key={label} className="flex gap-3">
                <dt className="mt-[3px] shrink-0 rounded-[3px] border border-gold-500/30 px-2 py-0.5 font-sans text-[11.5px] text-gold-300">
                  {label}
                </dt>
                <dd className="break-keep font-sans text-[14px] leading-[1.75] text-ink-light/90">{line}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 font-sans text-[11px] leading-relaxed text-ink-light/55">
            10년 단위로 보는 흐름이라 «몇 살 무렵»까지만 말할 수 있어. 아이는 특히 한 번 보고 덮으면 안 돼 — 초등 때
            답이랑 중등 때 답이 다르거든.
          </p>
        </section>

        <section className="rounded-xl border border-gold-500/25 bg-gold-500/[0.06] p-5 text-center">
          <p className="break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
            해마다 어떻게 달라지는지까지 보려면 가입하면 돼. 복채 {SIGNUP_BONUS_TALISMANS}만냥 주니까 바로 볼 수 있어.
          </p>
          <Button asChild className="mt-3.5 w-full">
            <Link
              href={withUtm('/auth/sign-up', utm, 'saju3_child')}
              onClick={() => trackEvent({ action: 'saju3_cta_signup', category: 'saju3', label: 'child' })}
            >
              복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 시작하기
            </Link>
          </Button>
        </section>

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1"
            onClick={() => {
              reset()
              setMode('me')
            }}
          >
            내 사주 보기
          </Button>
          <Button variant="ghost" size="sm" className="flex-1" onClick={reset}>
            다시 보기
          </Button>
        </div>
      </div>
    )
  }

  // ── 입력 ───────────────────────────────────────────────────
  return (
    <form
      className="hanji-card space-y-5 rounded-xl border border-gold-500/20 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-ink-light/10 p-1">
        {(
          [
            ['me', '내 사주'],
            ['child', '우리 아이'],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={
              mode === m
                ? 'rounded-md bg-gold-500/15 py-2 font-sans text-[13.5px] text-gold-300'
                : 'rounded-md py-2 font-sans text-[13.5px] text-ink-light/60 hover:text-ink-light/85'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="bd">{mode === 'child' ? '아이 생년월일 (양력)' : '생년월일 (양력)'}</Label>
        <Input
          id="bd"
          type="date"
          min="1900-01-01"
          max={new Date().toISOString().slice(0, 10)}
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          required
          className="h-12 text-[16px]"
        />
      </div>

      {mode === 'child' ? (
        <div className="space-y-1.5">
          <Label>아이 성별</Label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ['M', '남자'],
                ['F', '여자'],
              ] as const
            ).map(([g, label]) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={
                  gender === g
                    ? 'rounded-md border border-gold-500/40 bg-gold-500/10 py-2.5 font-sans text-[14px] text-gold-300'
                    : 'rounded-md border border-ink-light/15 py-2.5 font-sans text-[14px] text-ink-light/70'
                }
              >
                {label}
              </button>
            ))}
          </div>
          <p className="font-sans text-[11.5px] text-ink-light/55">흐름이 흘러가는 방향이 달라서 필요해.</p>
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Checkbox id="ut" checked={unknownTime} onCheckedChange={(v) => setUnknownTime(v === true)} />
          <Label htmlFor="ut" className="font-normal text-ink-light/80">
            태어난 시간은 몰라요
          </Label>
        </div>
        {!unknownTime ? (
          <Input
            type="time"
            value={birthTime}
            onChange={(e) => setBirthTime(e.target.value)}
            className="h-12 text-[16px]"
            aria-label="태어난 시각"
          />
        ) : null}
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-light/55">
          몰라도 4분의 3은 나와. 다만 <b className="font-medium text-ink-light/75">밤 11시 이후</b> 태어났으면 날이
          넘어가서 달라지니까 그때만 시간을 넣어줘.
        </p>
      </div>

      {error ? <p className="font-sans text-[13px] text-red-400">{error}</p> : null}

      <Button type="submit" className="h-12 w-full text-[15px]" disabled={pending || !birthDate}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : mode === 'child' ? (
          '아이 지도 펴보기'
        ) : (
          '내 지도 펴보기'
        )}
      </Button>

      <p className="text-center font-sans text-[11px] text-ink-light/55">
        생년월일은 계산에만 쓰고 저장하지 않아 · 로그인 없음
      </p>
    </form>
  )
}
