'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Loader2, Share2, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { resolveIlgan } from '@/app/actions/ilgan'
import { ILGAN, ilganShareText, type IlganSlug } from '@/lib/domain/saju/ilgan'
import { SIGNUP_BONUS_TALISMANS, SIGNUP_BONUS_SAJU_COUNT } from '@/lib/domain/payment/feature-costs'
import { trackEvent } from '@/lib/analytics/ga4'
import { IlganCard } from './ilgan-card'

interface Props {
  siteUrl: string
  utm: Record<string, string>
}

function withUtm(path: string, utm: Record<string, string>, medium: string): string {
  const q = new URLSearchParams({ utm_source: utm.utm_source || 'threads', utm_medium: medium })
  if (utm.utm_campaign) q.set('utm_campaign', utm.utm_campaign)
  return `${path}?${q.toString()}`
}

export function IlganForm({ siteUrl, utm }: Props) {
  const [pending, startTransition] = useTransition()
  const [birthDate, setBirthDate] = useState('')
  const [birthTime, setBirthTime] = useState('')
  const [unknownTime, setUnknownTime] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ slug: IlganSlug; dayPillar: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const res = await resolveIlgan({ birthDate, birthTime: unknownTime || !birthTime ? null : birthTime })
      if (!res.success) {
        setError(res.error)
        return
      }
      setResult({ slug: res.slug, dayPillar: res.dayPillar })
      trackEvent({ action: 'ilgan_result', category: 'ilgan', label: res.slug })
    })
  }

  if (result) {
    const info = ILGAN[result.slug]
    const shareUrl = `${siteUrl}/ilgan/${info.slug}?utm_source=threads&utm_medium=share`
    const shareText = ilganShareText(info, shareUrl)
    const threadsIntent = `https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`

    const copy = async () => {
      try {
        await navigator.clipboard.writeText(shareText)
        setCopied(true)
        trackEvent({ action: 'ilgan_share', category: 'ilgan', label: 'copy' })
        setTimeout(() => setCopied(false), 1800)
      } catch {
        /* 클립보드 거부 — 조용히 */
      }
    }

    return (
      <div className="space-y-4">
        <IlganCard info={info} dayPillar={result.dayPillar} />

        <div className="grid grid-cols-2 gap-2">
          <Button asChild variant="outline" className="h-11">
            <a
              href={threadsIntent}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackEvent({ action: 'ilgan_share', category: 'ilgan', label: 'threads' })}
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
          <p className="font-serif text-[15px] text-ink-primary">일간은 여덟 글자 중 하나예요</p>
          <p className="mt-1.5 break-keep font-sans text-[13px] leading-relaxed text-ink-light/75">
            나머지 일곱 글자와 십성·대운까지 읽는 정식 풀이는 가입하면 복채 {SIGNUP_BONUS_TALISMANS}만냥(사주 풀이{' '}
            {SIGNUP_BONUS_SAJU_COUNT}회분)으로 바로 볼 수 있어요. 오늘의 운세는 원래 무료.
          </p>
          <Button asChild className="mt-4 w-full">
            <Link
              href={withUtm('/auth/sign-up', utm, 'ilgan')}
              onClick={() => trackEvent({ action: 'ilgan_cta_signup', category: 'ilgan', label: info.slug })}
            >
              복채 {SIGNUP_BONUS_TALISMANS}만냥 받고 여덟 글자 다 보기
            </Link>
          </Button>
        </section>

        <button
          type="button"
          className="w-full py-2 font-sans text-[12.5px] text-ink-light/55 underline-offset-4 hover:underline"
          onClick={() => {
            setResult(null)
            setBirthDate('')
            setBirthTime('')
          }}
        >
          다른 생년월일로 다시 보기
        </button>
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
        <Label htmlFor="bd">생년월일 (양력)</Label>
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
          일간은 시간 없이도 나옵니다. 다만 <b className="font-medium text-ink-light/75">밤 11시 이후</b> 출생이면 다음
          날로 넘어가 바뀔 수 있어 시간을 넣어 주세요.
        </p>
      </div>

      {error ? <p className="font-sans text-[13px] text-red-400">{error}</p> : null}

      <Button type="submit" className="h-12 w-full text-[15px]" disabled={pending || !birthDate}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : '내 일간 보기'}
      </Button>

      <p className="text-center font-sans text-[11px] text-ink-light/55">
        생년월일은 계산에만 쓰고 저장하지 않습니다 · 로그인 없음
      </p>
    </form>
  )
}
