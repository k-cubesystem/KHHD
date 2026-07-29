'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Camera, Upload, X, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { compressImageForUpload } from '@/lib/utils/compress-image'
import { verifyImageFile, UNSUPPORTED_IMAGE_MESSAGE, type ImageBytesVerdict } from '@/lib/security/magic-bytes'
import { logger } from '@/lib/utils/logger'

interface ImageCaptureProps {
  onImageCapture: (base64: string, file: File) => void
  acceptedFormats?: string
  maxSizeMB?: number
  /** 카메라 방향 — 관상(셀피)은 "user", 손금·풍수는 후면 "environment" */
  cameraFacing?: 'user' | 'environment'
}

export function ImageCapture({
  onImageCapture,
  acceptedFormats = 'image/*',
  maxSizeMB = 10,
  cameraFacing = 'environment',
}: ImageCaptureProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compressing, setCompressing] = useState(false)

  const handleFileSelect = async (file: File) => {
    setError(null)

    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      setError(`파일 크기는 ${maxSizeMB}MB를 초과할 수 없습니다.`)
      return
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.')
      return
    }

    // 매직바이트 검증(S-2) — 확장자·MIME 위조를 복채 차감(분석 시작) 전에 끊는다.
    // 서버 액션에도 같은 게이트가 있으나, 차감은 이 화면에서 먼저 일어나므로 여기서 막아야
    // 환불 경로를 타지 않는다. 읽기 실패는 fail-closed(막는다).
    const verdict = await verifyImageFile(file).catch((): ImageBytesVerdict => ({ ok: false, reason: 'EMPTY' }))
    if (!verdict.ok) {
      logger.warn('[ImageCapture] 매직바이트 검증 실패:', { reason: verdict.reason })
      setError(UNSUPPORTED_IMAGE_MESSAGE)
      return
    }

    // 클라이언트 압축(1280px·JPEG) — 원본 그대로 보내면 Vercel 페이로드 한도(4.5MB)에
    // 걸려 413으로 분석이 튕긴다(2026-07-23 실측). 압축 실패 시 안전 폴백은 util 담당.
    setCompressing(true)
    try {
      const compressed = await compressImageForUpload(file)
      setPreview(compressed.dataUrl)
      onImageCapture(compressed.base64, file)
    } catch (e: unknown) {
      logger.warn('[ImageCapture] compress failed:', e)
      setError(
        e instanceof Error && e.message === 'IMAGE_TOO_LARGE_FOR_UPLOAD'
          ? '이 형식의 사진은 크기가 너무 큽니다. 다른 사진을 선택하거나 스크린샷으로 시도해주세요.'
          : '사진을 처리하지 못했습니다. 다른 사진으로 시도해주세요.'
      )
    } finally {
      setCompressing(false)
    }
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const clearPreview = () => {
    setPreview(null)
    setError(null)
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <Card className="card-glass-manse p-6 border-gold-500/20">
      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {!preview ? (
            <motion.div
              key="upload-options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              {/* Camera Capture (Mobile) */}
              <Button
                type="button"
                disabled={compressing}
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gold-500/30
                  bg-transparent hover:bg-gold-500/5
                  flex flex-col gap-3 text-white"
              >
                {compressing ? (
                  <Loader2 className="w-10 h-10 text-gold-500 animate-spin" />
                ) : (
                  <Camera className="w-10 h-10 text-gold-500" />
                )}
                <span className="text-sm font-sans">{compressing ? '사진 준비 중...' : '사진 촬영하기'}</span>
              </Button>
              <input
                ref={cameraInputRef}
                type="file"
                accept={acceptedFormats}
                capture={cameraFacing}
                onChange={handleCameraCapture}
                className="hidden"
              />

              {/* File Upload (Desktop) */}
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-gold-500/30 text-gold-500 
                  hover:bg-gold-500/10"
              >
                <Upload className="w-5 h-5 mr-2" />
                갤러리에서 선택
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFormats}
                onChange={handleFileUpload}
                className="hidden"
              />

              <p className="text-xs text-white/40 text-center font-sans">최대 {maxSizeMB}MB까지 업로드 가능합니다</p>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative"
            >
              <div className="relative rounded-lg overflow-hidden border-2 border-gold-500/30">
                <img src={preview} alt="Preview" className="w-full h-auto max-h-[400px] object-contain bg-black/20" />
                <Button
                  onClick={clearPreview}
                  className="absolute top-3 right-3 w-10 h-10 p-0 
                    bg-black/60 hover:bg-black/80 rounded-full border border-white/20"
                >
                  <X className="w-5 h-5 text-white" />
                </Button>
              </div>
              <p className="text-xs text-gold-500 text-center mt-2 font-sans">✓ 이미지가 선택되었습니다</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <p
            className="text-sm text-red-400 text-center font-sans anim-fade-in-up"
            style={
              {
                '--fade-y': '-10px',
                animation: 'fade-in-up 0.3s ease-out both',
              } as React.CSSProperties
            }
          >
            {error}
          </p>
        )}
      </div>
    </Card>
  )
}
