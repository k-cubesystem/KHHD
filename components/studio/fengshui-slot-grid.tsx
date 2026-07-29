'use client'

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, X, Loader2, Check } from 'lucide-react'
import { compressImageForUpload } from '@/lib/utils/compress-image'
import { verifyImageFile, UNSUPPORTED_IMAGE_MESSAGE, type ImageBytesVerdict } from '@/lib/security/magic-bytes'
import { logger } from '@/lib/utils/logger'
import type { FengshuiSlotSpec } from '@/lib/domain/analysis/fengshui-slots'

export interface SlotImageValue {
  /** data: 접두어 없는 base64 (서버 전송용) */
  base64: string
  /** 미리보기용 data URL */
  dataUrl: string
  /** 압축 후 크기(byte) */
  bytes: number
}

interface FengshuiSlotGridProps {
  spec: FengshuiSlotSpec
  /** slotId → 이미지 (controlled) */
  value: Record<string, SlotImageValue>
  onChange: (next: Record<string, SlotImageValue>) => void
}

/**
 * 풍수 라벨 슬롯 그리드 — 대상별(집/사업장/외관) 슬롯마다 사진 1장을 담는다.
 * 압축은 반드시 compressImageForUpload 경유(413 방지, ZERO-LATENCY Client Compress).
 * 최소 1장이면 분석 가능하며, 채워진 슬롯의 라벨만 서버로 전송된다.
 */
export function FengshuiSlotGrid({ spec, value, onChange }: FengshuiSlotGridProps) {
  const filledCount = Object.keys(value).length

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gold-500/70 font-medium tracking-widest uppercase">사진 슬롯</p>
        <span className="text-[11px] text-white/40 font-sans tabular-nums">
          {filledCount}/{spec.max}장 · 최소 {spec.min}장
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {spec.slots.map((slot) => (
          <SlotTile
            key={slot.id}
            label={slot.label}
            recommended={slot.recommended}
            image={value[slot.id]}
            onPick={(img) => onChange({ ...value, [slot.id]: img })}
            onClear={() => {
              const next = { ...value }
              delete next[slot.id]
              onChange(next)
            }}
          />
        ))}
      </div>

      <p className="text-[11px] text-white/35 font-sans font-light leading-relaxed">
        채운 슬롯만 분석에 사용됩니다. 여러 공간을 담으면 공간별 진단 후 종합 진단으로 이어집니다.
      </p>
    </div>
  )
}

function SlotTile({
  label,
  recommended,
  image,
  onPick,
  onClear,
}: {
  label: string
  recommended: boolean
  image?: SlotImageValue
  onPick: (img: SlotImageValue) => void
  onClear: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [compressing, setCompressing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 가능합니다.')
      return
    }
    // 매직바이트 검증(S-2) — 차감(분석 시작) 전에 끊어야 환불 경로를 타지 않는다. 읽기 실패는 fail-closed.
    const verdict = await verifyImageFile(file).catch((): ImageBytesVerdict => ({ ok: false, reason: 'EMPTY' }))
    if (!verdict.ok) {
      logger.warn('[FengshuiSlotGrid] 매직바이트 검증 실패:', { reason: verdict.reason })
      setError(UNSUPPORTED_IMAGE_MESSAGE)
      return
    }
    setCompressing(true)
    try {
      const compressed = await compressImageForUpload(file)
      onPick({ base64: compressed.base64, dataUrl: compressed.dataUrl, bytes: compressed.bytes })
    } catch (e: unknown) {
      logger.warn('[FengshuiSlotGrid] compress failed:', e)
      setError(
        e instanceof Error && e.message === 'IMAGE_TOO_LARGE_FOR_UPLOAD'
          ? '사진이 너무 큽니다. 다른 사진으로 시도해주세요.'
          : '사진을 처리하지 못했습니다.'
      )
    } finally {
      setCompressing(false)
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  return (
    <div className="relative">
      <input ref={inputRef} type="file" accept="image/*" onChange={onInputChange} className="hidden" />

      {image ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gold-500/40"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={image.dataUrl} alt={label} className="w-full h-full object-cover bg-black/30" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 flex items-center gap-1">
            <Check className="w-3 h-3 text-gold-500 shrink-0" />
            <span className="text-[11px] text-white/90 font-sans truncate">{label}</span>
          </div>
          <button
            type="button"
            onClick={onClear}
            aria-label={`${label} 사진 삭제`}
            className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 border border-white/20 flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </motion.div>
      ) : (
        <button
          type="button"
          disabled={compressing}
          onClick={() => inputRef.current?.click()}
          className={`aspect-[4/3] w-full rounded-xl border border-dashed flex flex-col items-center justify-center gap-1.5 transition-all ${
            recommended
              ? 'border-gold-500/40 bg-gold-500/[0.04] hover:bg-gold-500/[0.08]'
              : 'border-white/10 bg-white/[0.02] hover:border-white/25'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {compressing ? (
            <Loader2 className="w-6 h-6 text-gold-500 animate-spin" />
          ) : (
            <Plus className={`w-6 h-6 ${recommended ? 'text-gold-500' : 'text-white/40'}`} strokeWidth={1.5} />
          )}
          <span className={`text-xs font-sans ${recommended ? 'text-gold-500/90 font-medium' : 'text-white/50'}`}>
            {label}
          </span>
          {recommended && <span className="text-[9px] text-gold-500/50 font-sans">권장</span>}
        </button>
      )}

      {error && <p className="mt-1 text-[10px] text-red-400 text-center font-sans">{error}</p>}
    </div>
  )
}
