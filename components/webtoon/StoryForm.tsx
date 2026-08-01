'use client'

/**
 * 「내 이야기 쓰기」 — 독자의 사연을 비공개로 접수한다.
 *
 * ⚠️ 이 폼이 지키는 약속은 셋이고, **보내기 전에 전부 화면에 있어야 한다**(CEO 지시):
 *    ① 사연은 공개되지 않는다 — 청담해화당으로만 간다
 *    ② 성함·연락처·카카오톡은 **제작을 위한 소통에만** 쓴다
 *    ③ **선정되신 경우에만** 연락드린다
 *    보내고 나서 알려 주는 것은 약속이 아니다. 그래서 고지가 제출 버튼 위가 아니라 **입력 위**에 있다.
 *
 * ⚠️ 접수 뒤에도 연락처를 되보여 주지 않는다 — 어깨너머로 읽히는 것까지 막는 것이 이 폼의 규율이다.
 */

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, Send, Lock, Coins } from 'lucide-react'
import { toast } from 'sonner'
import { submitStory, type StoryGateInfo } from '@/app/actions/webtoon/webtoon'
import {
  STORY_BODY_MAX,
  STORY_BODY_MIN,
  STORY_CONTACT_NOTICE,
  STORY_FREE_NOTICE,
  STORY_KAKAO_MAX,
  STORY_MEMBER_ONLY_NOTICE,
  STORY_NO_EXTRA_COST_NOTICE,
  STORY_REPLY_NOTICE,
  STORY_NAME_MAX,
  STORY_PHONE_MAX,
  STORY_PRIVACY_NOTICE,
  STORY_SELECTION_NOTICE,
  STORY_TITLE_MAX,
  validateStory,
  type StoryDraft,
} from '@/lib/domain/webtoon/story'
import { trackEvent } from '@/lib/analytics/ga4'

const ERROR_MSG: Record<string, string> = {
  UNAUTHORIZED: '로그인이 필요합니다',
  RATE_LIMITED: '잠시 뒤 다시 보내 주세요',
  DAILY_LIMIT: '오늘 보내실 수 있는 몫을 다 쓰셨습니다',
  FAILED: '접수하지 못했습니다 — 잠시 뒤 다시 시도해 주세요',
}

const FIELD =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-sans text-[13px] text-ink-primary placeholder:text-ink-primary/25 focus:border-gold-500/40 focus:outline-none'
const LABEL = 'mb-1.5 block font-serif text-[12px] text-gold-200'

export function StoryForm({ gate, onDone }: { gate: StoryGateInfo; onDone?: () => void }) {
  const [draft, setDraft] = useState<StoryDraft>({
    title: '',
    body: '',
    contactName: '',
    contactPhone: '',
    contactKakao: '',
  })
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const issues = useMemo(() => validateStory(draft), [draft])
  const ready = issues.length === 0
  const set = <K extends keyof StoryDraft>(k: K, v: string) => setDraft((d) => ({ ...d, [k]: v }))

  const onSubmit = useCallback(async () => {
    setBusy(true)
    const res = await submitStory(draft)
    setBusy(false)
    if (!res.success) {
      toast.error(res.message ?? ERROR_MSG[res.error ?? 'FAILED'] ?? '접수하지 못했습니다')
      return
    }
    trackEvent({ action: 'webtoon_story_submit', category: 'webtoon', label: 'ok' })
    setSent(true)
    onDone?.()
  }, [draft, onDone])

  if (sent) {
    return (
      <div className="rounded-2xl border border-gold-500/25 p-6 text-center" style={{ background: '#16140F' }}>
        <p className="font-serif text-[15px] font-bold text-gold-200">사연이 잘 도착했습니다</p>
        <p className="mt-2.5 font-sans text-[12.5px] leading-relaxed text-ink-primary/55">
          보내 주신 이야기는 공개되지 않습니다.
          <br />
          찬찬히 읽어 보고, <b className="text-ink-primary/80">선정되신 경우에만</b> 적어 주신 연락처로
          연락드리겠습니다.
        </p>
        <p className="mt-3 font-sans text-[11px] leading-relaxed text-ink-primary/35">
          연락드릴 때는 어디까지 그려도 좋을지 먼저 여쭙습니다 — 이름과 지명은 바꾸고, 원하지 않으시는 대목은 뺍니다.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 rounded-2xl border border-gold-500/25 p-5" style={{ background: '#16140F' }}>
      <div>
        <p className="font-serif text-[10px] tracking-[0.3em] text-gold-500/60">내 이 야 기</p>
        <h2 className="mt-1 font-serif text-[17px] font-bold text-ink-primary">그대의 이야기를 들려주세요</h2>
        <p className="mt-2 font-sans text-[12.5px] leading-relaxed text-ink-primary/55">
          선정되면 청담해화당 웹툰의 한 화로 그려 드립니다. 겪으신 일, 마음에 남은 일, 아직 아무에게도 하지 못한 이야기
          — 무엇이든 좋습니다.
        </p>
      </div>

      {/* 약속 셋 — 입력 **위**에 둔다. 보내고 나서 알려 주는 것은 약속이 아니다 */}
      <div className="space-y-1.5 rounded-xl border border-gold-500/20 bg-gold-500/[0.05] px-3 py-3">
        <p className="flex items-center gap-1.5 font-serif text-[11px] font-bold text-gold-200">
          <Lock className="h-3 w-3" />
          비공개로 접수됩니다
        </p>
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/60">{STORY_PRIVACY_NOTICE}</p>
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/60">
          성함·연락처·카카오톡 아이디는 <b className="text-ink-primary/85">이야기 제작을 위한 연락에만</b> 씁니다.
          공개되지 않으며 <b className="text-ink-primary/85">선정되신 경우에만</b> 연락드립니다.
        </p>
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/45">{STORY_SELECTION_NOTICE}</p>
      </div>

      {/*
        접수는 누구나 값 없이. **제작 자격만** 멤버십이다(CEO 2026-08-01).
        ⚠️ 이 사실은 **보내기 전에** 있어야 한다 — 다 쓰고 보낸 뒤에 "회원이 아니라 그릴 수 없다"고
           알리면 값을 받지 않았어도 사람의 시간을 받은 것이 된다.
      */}
      <div className="space-y-1.5 rounded-xl border border-white/10 bg-black/20 px-3 py-3">
        <p className="flex items-center gap-1.5 font-serif text-[11px] font-bold text-gold-200">
          <Coins className="h-3 w-3" />
          {STORY_FREE_NOTICE}
        </p>
        {gate.member ? (
          <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/60">
            멤버십 회원이시라 <b className="text-ink-primary/85">선정 대상</b>입니다. {STORY_NO_EXTRA_COST_NOTICE}
          </p>
        ) : (
          <>
            <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/60">{STORY_MEMBER_ONLY_NOTICE}</p>
            <Link
              href="/protected/store?tab=membership"
              className="inline-flex items-center gap-1 font-sans text-[11.5px] font-bold text-gold-300 underline"
            >
              멤버십 보기
            </Link>
          </>
        )}
        <p className="font-sans text-[11.5px] leading-relaxed text-ink-primary/45">{STORY_REPLY_NOTICE}</p>
      </div>

      <div>
        <label className={LABEL} htmlFor="story-title">
          제목
        </label>
        <input
          id="story-title"
          value={draft.title}
          onChange={(e) => set('title', e.target.value.slice(0, STORY_TITLE_MAX))}
          maxLength={STORY_TITLE_MAX}
          placeholder="이야기에 이름을 붙여 주세요"
          className={FIELD}
        />
      </div>

      <div>
        <label className={LABEL} htmlFor="story-body">
          사연{' '}
          <span className="font-sans text-[11px] text-ink-primary/35">
            · {draft.body.trim().length}/{STORY_BODY_MAX}자 (최소 {STORY_BODY_MIN}자)
          </span>
        </label>
        <textarea
          id="story-body"
          value={draft.body}
          onChange={(e) => set('body', e.target.value.slice(0, STORY_BODY_MAX))}
          maxLength={STORY_BODY_MAX}
          rows={9}
          placeholder="언제, 어디서, 무슨 일이 있었는지 — 순서가 없어도 괜찮습니다. 떠오르는 대로 적어 주세요."
          className={`${FIELD} resize-y leading-relaxed`}
        />
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
        <p className="font-serif text-[11.5px] font-bold text-gold-200">연락처 (비공개)</p>
        <div>
          <label className={LABEL} htmlFor="story-name">
            성함
          </label>
          <input
            id="story-name"
            value={draft.contactName}
            onChange={(e) => set('contactName', e.target.value.slice(0, STORY_NAME_MAX))}
            maxLength={STORY_NAME_MAX}
            autoComplete="name"
            placeholder="연락드릴 때 부를 이름"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="story-phone">
            휴대전화
          </label>
          <input
            id="story-phone"
            value={draft.contactPhone}
            onChange={(e) => set('contactPhone', e.target.value.slice(0, STORY_PHONE_MAX))}
            maxLength={STORY_PHONE_MAX}
            inputMode="tel"
            autoComplete="tel"
            placeholder="010-0000-0000"
            className={FIELD}
          />
        </div>
        <div>
          <label className={LABEL} htmlFor="story-kakao">
            카카오톡 아이디 <span className="font-sans text-[11px] text-ink-primary/35">· 선택</span>
          </label>
          <input
            id="story-kakao"
            value={draft.contactKakao}
            onChange={(e) => set('contactKakao', e.target.value.slice(0, STORY_KAKAO_MAX))}
            maxLength={STORY_KAKAO_MAX}
            placeholder="카카오톡으로 연락받길 원하시면"
            className={FIELD}
          />
        </div>
        <p className="font-sans text-[10.5px] leading-relaxed text-gold-500/60">
          🔒 {STORY_CONTACT_NOTICE.replace(/\*\*/g, '')}
        </p>
      </div>

      {issues.length > 0 && draft.body.length > 0 && (
        <p className="font-sans text-[11.5px] text-ink-primary/45">{issues[0].message}</p>
      )}

      <button
        type="button"
        onClick={() => void onSubmit()}
        disabled={!ready || busy}
        // 주 CTA — 도장 반경 3px + 도장 그림자 (DESIGN.md "buttons 3px")
        className="flex w-full items-center justify-center gap-1.5 rounded-[3px] border border-gold-500/50 bg-gold-500/15 py-3 font-serif text-[13px] font-bold text-gold-200 shadow-dojang disabled:opacity-40"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        비공개로 보내기
      </button>
    </div>
  )
}
