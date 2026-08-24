'use client'

import { toast } from 'sonner'
import { AI_DISCLOSURE_ATTR, AI_DISCLOSURE_TEXT, type DisclaimerTone } from '@/components/shared/ServiceDisclaimer'
import { cn } from '@/lib/utils'

/**
 * AI 고지 배지 — 한 줄 문구를 화면에서 걷어내되 「AI기본법」 §31② 표시는 남기는 형태.
 *
 * 🔴 왜 이 모양인가(2026-08-24 CEO 지시 「이 문구 없어졌으면 좋겠다」):
 *    문답 화면에서 고지는 입력창 위에 상시 한 줄로 떠 있었고, 그 자리가 대화를 가렸다.
 *    법이 요구하는 것은 «결과물이 생성형 인공지능으로 생성되었다는 사실»의 표시이지 «문장의 길이»가
 *    아니다. 그래서 ①배지로 «AI»를 상시 노출하고 ②누르면 법정 문언 전문을 띄운다.
 *    조사 정본: docs/REPORTS/RESEARCH-20260812-ai-basic-act.md
 *
 * ⚠️ 배지까지 없애면 표시가 사라져 §31② 위반이 된다 — 이 컴포넌트를 지우지 말 것.
 *    (지워도 되는지는 법률 자문의 영역이고, 지금 판단은 «남긴다» 이다.)
 */
export function AiDisclosureBadge({ tone = 'chat', className }: { tone?: DisclaimerTone; className?: string }) {
  const text = AI_DISCLOSURE_TEXT[tone]
  return (
    <button
      type="button"
      {...{ [AI_DISCLOSURE_ATTR]: tone }}
      onClick={() => toast(text, { duration: 5000 })}
      aria-label={text}
      title={text}
      className={cn(
        'shrink-0 rounded-full border border-primary/25 bg-primary/[0.07] px-1.5 py-[1px]',
        'text-[9px] font-medium tracking-wider text-primary/60',
        'hover:border-primary/45 hover:text-primary/85 transition-colors',
        className
      )}
    >
      AI
    </button>
  )
}
