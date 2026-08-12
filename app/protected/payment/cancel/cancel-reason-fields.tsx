'use client'

import {
  CANCEL_MEMO_MAX_LENGTH,
  CANCEL_MEMO_PRIVACY_NOTICE,
  CANCEL_REASONS,
  type CancelReasonCode,
} from '@/lib/domain/payment/self-cancel'

interface CancelReasonFieldsProps {
  /** 라디오 name 충돌 방지용 접두사 */
  idPrefix: string
  reasonCode: CancelReasonCode | ''
  memo: string
  disabled?: boolean
  onReasonChange: (code: CancelReasonCode) => void
  onMemoChange: (memo: string) => void
}

/** 취소 사유 객관식 + 메모. 충전 취소·멤버십 해지가 같은 입력을 쓴다. */
export function CancelReasonFields({
  idPrefix,
  reasonCode,
  memo,
  disabled,
  onReasonChange,
  onMemoChange,
}: CancelReasonFieldsProps) {
  const memoRequired = CANCEL_REASONS.find((item) => item.code === reasonCode)?.memoRequired ?? false

  return (
    <div className="space-y-4">
      <fieldset disabled={disabled} className="space-y-2">
        <legend className="text-[11px] tracking-[0.08em] uppercase font-semibold text-ink-light/50 mb-2">
          취소 사유 (필수)
        </legend>
        {CANCEL_REASONS.map((option) => (
          <label
            key={option.code}
            htmlFor={`${idPrefix}-${option.code}`}
            className="flex items-center gap-3 px-3 py-2.5 border border-primary/15 bg-surface/30 cursor-pointer hover:border-primary/40 transition-colors"
          >
            <input
              id={`${idPrefix}-${option.code}`}
              type="radio"
              name={`${idPrefix}-reason`}
              value={option.code}
              checked={reasonCode === option.code}
              onChange={() => onReasonChange(option.code)}
              className="accent-primary w-4 h-4"
            />
            <span className="text-sm font-light text-ink-light/90">{option.label}</span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1.5">
        <label
          htmlFor={`${idPrefix}-memo`}
          className="block text-[11px] tracking-[0.08em] uppercase font-semibold text-ink-light/50"
        >
          남기실 말씀 {memoRequired ? '(필수)' : '(선택)'}
        </label>
        <textarea
          id={`${idPrefix}-memo`}
          value={memo}
          disabled={disabled}
          maxLength={CANCEL_MEMO_MAX_LENGTH}
          rows={3}
          onChange={(event) => onMemoChange(event.target.value)}
          placeholder={memoRequired ? '어떤 사유인지 알려주세요.' : '더 나은 서비스를 위해 참고하겠습니다.'}
          className="w-full bg-surface/40 border border-primary/20 px-3 py-2 text-sm font-light text-ink-light placeholder:text-ink-light/30 focus:border-primary/50 focus:outline-none resize-none"
        />
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] text-ink-light/40 font-light leading-relaxed">{CANCEL_MEMO_PRIVACY_NOTICE}</p>
          <span className="text-[11px] text-ink-light/30 shrink-0 tabular-nums">
            {memo.length}/{CANCEL_MEMO_MAX_LENGTH}
          </span>
        </div>
      </div>
    </div>
  )
}
