/**
 * 클라이언트 이미지 압축 — 스튜디오(관상·손금·풍수) 업로드 전 공통 처리.
 *
 * 배경: 카메라 원본(3~12MB)을 그대로 base64 전송하면 Vercel 함수 페이로드 한도(4.5MB)에
 * 걸려 413 FUNCTION_PAYLOAD_TOO_LARGE → 분석이 시작도 못 하고 튕긴다(2026-07-23 실측).
 * 최대 변 1280px · JPEG q0.85 로 재인코딩하면 150~450KB — 한도의 1/10 수준이 된다.
 * 부수 효과: 업로드 시간 단축(ZERO-LATENCY Client Compress), Gemini 비전 처리도 빨라짐.
 *
 * HEIC 등 브라우저가 디코드 못 하는 포맷은 원본 폴백하되, 폴백조차 한도를 넘길 크기면
 * 명확한 한국어 에러를 던져 사용자가 원인을 알 수 있게 한다.
 */

/** 최대 변(maxEdge) 안에 비율 유지로 맞춘 목표 치수. 원본이 더 작으면 그대로. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 }
  const longest = Math.max(width, height)
  if (longest <= maxEdge) return { width, height }
  const scale = maxEdge / longest
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

/** base64 문자열의 대략적 바이트 수 (4/3 팽창 역산) */
export function base64Bytes(base64: string): number {
  return Math.floor((base64.length * 3) / 4)
}

/** 압축 없이 보내도 안전한 원본 상한 — Vercel 4.5MB 한도에 base64 팽창(×1.37) 여유를 둔 값 */
const RAW_FALLBACK_MAX_BYTES = 3 * 1024 * 1024

const MAX_EDGE = 1280
const JPEG_QUALITY = 0.85

async function decodeToBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap: EXIF 회전 자동 반영. 실패(HEIC 미지원 브라우저 등) 시 <img> 폴백.
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      // fall through
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('IMAGE_DECODE_FAILED'))
    }
    img.src = url
  })
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = () => reject(new Error('FILE_READ_FAILED'))
    reader.readAsDataURL(file)
  })
}

export interface CompressedImage {
  /** data: 접두어 없는 base64 (서버 액션 전송용) */
  base64: string
  /** 미리보기용 data URL */
  dataUrl: string
  /** 압축 후 크기(byte) */
  bytes: number
  /** 압축 경로: canvas 재인코딩 성공 여부 (false = 원본 폴백) */
  compressed: boolean
}

/**
 * 파일을 전송용 JPEG base64 로 압축한다.
 * @throws Error('IMAGE_TOO_LARGE_FOR_UPLOAD') — 디코드 실패 + 원본이 폴백 상한 초과
 */
export async function compressImageForUpload(file: File): Promise<CompressedImage> {
  try {
    const bitmap = await decodeToBitmap(file)
    const srcW = 'naturalWidth' in bitmap ? bitmap.naturalWidth : bitmap.width
    const srcH = 'naturalHeight' in bitmap ? bitmap.naturalHeight : bitmap.height
    const { width, height } = fitWithin(srcW, srcH, MAX_EDGE)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('CANVAS_UNAVAILABLE')
    ctx.drawImage(bitmap, 0, 0, width, height)
    if ('close' in bitmap) bitmap.close()

    const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
    const base64 = dataUrl.split(',')[1] ?? ''
    if (!base64) throw new Error('CANVAS_ENCODE_FAILED')
    return { base64, dataUrl, bytes: base64Bytes(base64), compressed: true }
  } catch {
    // 디코드/캔버스 실패 → 원본 폴백. 단, 한도 초과 원본은 서버에서 413으로 죽으므로 여기서 막는다.
    if (file.size > RAW_FALLBACK_MAX_BYTES) {
      throw new Error('IMAGE_TOO_LARGE_FOR_UPLOAD')
    }
    const base64 = await readAsBase64(file)
    return {
      base64,
      dataUrl: `data:${file.type || 'image/jpeg'};base64,${base64}`,
      bytes: base64Bytes(base64),
      compressed: false,
    }
  }
}
