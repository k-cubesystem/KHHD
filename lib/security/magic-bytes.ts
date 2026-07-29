/**
 * 업로드 이미지 매직바이트 검증 (S-2).
 *
 * 확장자·Content-Type·클라이언트가 보낸 MIME 은 전부 위조 가능하다. 실제 선두 바이트로
 * 포맷을 판정하고, 표명된 MIME 과 어긋나면 거부한다.
 *
 * 서버 액션과 클라이언트 업로더 양쪽에서 import 되므로 Buffer·atob 같은 런타임 전용 API를
 * 쓰지 않는다(순수 함수만). base64 도 자체 디코더로 앞부분만 푼다 — 판정에 필요한 건 12바이트다.
 */

/** 허용 포맷 — 관상·손금·풍수 업로더가 실제로 만들어 낼 수 있는 형식만. */
export type AllowedImageFormat = 'jpeg' | 'png' | 'webp' | 'heic'

/** 판정에 읽어야 할 선두 바이트 수. ftyp 브랜드(8~11바이트)까지 보려면 12가 최소, 여유로 32. */
export const MAGIC_BYTES_HEADER_SIZE = 32

/** 게이트 거부 시 사용자에게 보여줄 한국어 메시지. */
export const UNSUPPORTED_IMAGE_MESSAGE =
  '지원하지 않는 이미지 형식입니다. JPG·PNG·WebP·HEIC 사진으로 다시 시도해주세요.'

export type ImageBytesRejectReason =
  /** 바이트가 없음(빈 문자열·디코드 실패) */
  | 'EMPTY'
  /** 허용 목록에 없는 포맷(또는 이미지가 아님) */
  | 'UNKNOWN_FORMAT'
  /** 실제 바이트와 표명된 MIME 이 다름 */
  | 'MIME_MISMATCH'

export interface ImageBytesVerdict {
  ok: boolean
  format?: AllowedImageFormat
  reason?: ImageBytesRejectReason
  /** 판정된 실제 MIME — 로깅·디버깅용. */
  detectedMime?: string
}

/** HEIF 계열 ftyp 브랜드. HEIC(애플 카메라 원본)와 그 컨테이너 변종들. */
const HEIF_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'heif', 'mif1', 'msf1']

const FORMAT_MIMES: Record<AllowedImageFormat, string[]> = {
  jpeg: ['image/jpeg', 'image/jpg', 'image/pjpeg'],
  png: ['image/png', 'image/x-png'],
  webp: ['image/webp'],
  heic: ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'],
}

const CANONICAL_MIME: Record<AllowedImageFormat, string> = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function matchesSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  if (bytes.length < offset + signature.length) return false
  for (let i = 0; i < signature.length; i++) {
    if (bytes[offset + i] !== signature[i]) return false
  }
  return true
}

/** offset 부터 length 바이트를 ASCII 로 읽는다. 범위를 벗어나면 빈 문자열. */
function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  if (bytes.length < offset + length) return ''
  let out = ''
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(bytes[offset + i]!)
  }
  return out
}

/**
 * 선두 바이트로 이미지 포맷을 판정한다. 허용 목록에 없으면 null.
 * - JPEG: FF D8 FF
 * - PNG:  89 50 4E 47 0D 0A 1A 0A
 * - WebP: 'RIFF' ....(길이 4바이트).... 'WEBP'
 * - HEIC/HEIF: 4바이트 박스 크기 뒤 'ftyp' + HEIF 계열 브랜드
 */
export function detectImageFormat(bytes: Uint8Array): AllowedImageFormat | null {
  if (bytes.length < 4) return null

  if (matchesSignature(bytes, [0xff, 0xd8, 0xff])) return 'jpeg'
  if (matchesSignature(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'png'
  if (readAscii(bytes, 0, 4) === 'RIFF' && readAscii(bytes, 8, 4) === 'WEBP') return 'webp'
  if (readAscii(bytes, 4, 4) === 'ftyp' && HEIF_BRANDS.includes(readAscii(bytes, 8, 4).toLowerCase())) return 'heic'

  return null
}

/**
 * 표명된 MIME 이 실제 포맷과 양립하는지. 빈 값·image/* 처럼 포맷을 특정하지 않는 값은
 * "표명하지 않음"으로 보고 통과시킨다(브라우저가 HEIC 에 빈 type 을 주는 사례가 실재).
 */
export function isMimeConsistent(format: AllowedImageFormat, declaredMime?: string | null): boolean {
  const mime = declaredMime?.trim().toLowerCase().split(';')[0]
  if (!mime || mime === 'image/*' || mime === 'application/octet-stream') return true
  return FORMAT_MIMES[format].includes(mime)
}

/** 실제 바이트 기준 검증. declaredMime 이 있으면 교차 확인까지 한다. */
export function verifyImageBytes(bytes: Uint8Array, declaredMime?: string | null): ImageBytesVerdict {
  if (bytes.length === 0) return { ok: false, reason: 'EMPTY' }

  const format = detectImageFormat(bytes)
  if (!format) return { ok: false, reason: 'UNKNOWN_FORMAT' }

  if (!isMimeConsistent(format, declaredMime)) {
    return { ok: false, format, reason: 'MIME_MISMATCH', detectedMime: CANONICAL_MIME[format] }
  }

  return { ok: true, format, detectedMime: CANONICAL_MIME[format] }
}

/** data URL 이면 MIME 과 payload 를 분리한다. 아니면 입력을 그대로 payload 로 본다. */
export function parseBase64Input(input: string): { payload: string; declaredMime: string | null } {
  const dataUrl = input.match(/^data:([^;,]*)(;[^,]*)*,/)
  if (!dataUrl) return { payload: input, declaredMime: null }
  return {
    payload: input.slice(dataUrl[0].length),
    declaredMime: dataUrl[1]?.trim() || null,
  }
}

/**
 * base64 문자열의 앞부분만 디코드한다(전체를 메모리에 풀지 않는다).
 * 공백·개행은 건너뛰고, 그 외 비-base64 문자를 만나면 거기서 멈춘다.
 */
export function decodeBase64Prefix(base64: string, maxBytes: number = MAGIC_BYTES_HEADER_SIZE): Uint8Array {
  const { payload } = parseBase64Input(base64)
  const out = new Uint8Array(maxBytes)
  let outLength = 0
  let buffer = 0
  let bits = 0

  for (let i = 0; i < payload.length && outLength < maxBytes; i++) {
    const char = payload[i]!
    if (char === '=') break
    if (char === '\n' || char === '\r' || char === ' ' || char === '\t') continue

    const value = BASE64_ALPHABET.indexOf(char)
    if (value < 0) break

    buffer = (buffer << 6) | value
    bits += 6
    if (bits >= 8) {
      bits -= 8
      out[outLength++] = (buffer >> bits) & 0xff
    }
  }

  return out.subarray(0, outLength)
}

/**
 * base64(또는 data URL) 이미지 검증 — 서버 액션 입구용.
 * data URL 이면 그 안에 표명된 MIME 을 실바이트와 교차 확인한다.
 */
export function verifyBase64Image(base64: string, declaredMime?: string | null): ImageBytesVerdict {
  if (!base64 || base64.trim().length === 0) return { ok: false, reason: 'EMPTY' }
  const { declaredMime: inlineMime } = parseBase64Input(base64)
  return verifyImageBytes(decodeBase64Prefix(base64), declaredMime ?? inlineMime)
}

/**
 * 브라우저 업로더용 — 파일 선두 바이트만 읽어 검증한다(전체를 메모리에 올리지 않는다).
 * 판정은 verifyImageBytes 가 하고, 여기서는 바이트를 꺼내오기만 한다.
 * arrayBuffer() 미지원 구형 브라우저는 FileReader 로 폴백한다.
 */
export async function verifyImageFile(
  file: Blob,
  maxBytes: number = MAGIC_BYTES_HEADER_SIZE
): Promise<ImageBytesVerdict> {
  const head = file.slice(0, maxBytes)
  const buffer =
    typeof head.arrayBuffer === 'function'
      ? await head.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as ArrayBuffer)
          reader.onerror = () => reject(new Error('FILE_HEADER_READ_FAILED'))
          reader.readAsArrayBuffer(head)
        })
  return verifyImageBytes(new Uint8Array(buffer), file.type)
}
