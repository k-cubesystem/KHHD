import {
  detectImageFormat,
  isMimeConsistent,
  verifyImageBytes,
  verifyBase64Image,
  decodeBase64Prefix,
  parseBase64Input,
  MAGIC_BYTES_HEADER_SIZE,
} from '@/lib/security/magic-bytes'

/** 선두 바이트 뒤에 임의 페이로드를 붙인 가짜 파일 — 실제 이미지 없이 헤더만 재현한다. */
function bytes(...values: number[]): Uint8Array {
  return new Uint8Array([...values, ...new Array(24).fill(0x00)])
}

function ascii(text: string): number[] {
  return text.split('').map((c) => c.charCodeAt(0))
}

const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0)
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
const WEBP = bytes(...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP'))
const HEIC = bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftyp'), ...ascii('heic'))
const HEIX = bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftyp'), ...ascii('heix'))
const MIF1 = bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftyp'), ...ascii('mif1'))

const GIF = bytes(...ascii('GIF89a'))
const PDF = bytes(...ascii('%PDF-1.7'))
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04)
const SVG = bytes(...ascii('<svg xmlns='))
const MP4 = bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftyp'), ...ascii('isom'))

function toBase64(input: Uint8Array): string {
  return Buffer.from(input).toString('base64')
}

describe('detectImageFormat', () => {
  it('허용 포맷을 선두 바이트로 판정한다', () => {
    expect(detectImageFormat(JPEG)).toBe('jpeg')
    expect(detectImageFormat(PNG)).toBe('png')
    expect(detectImageFormat(WEBP)).toBe('webp')
    expect(detectImageFormat(HEIC)).toBe('heic')
    expect(detectImageFormat(HEIX)).toBe('heic')
    expect(detectImageFormat(MIF1)).toBe('heic')
  })

  it('허용 목록 밖 포맷은 null', () => {
    expect(detectImageFormat(GIF)).toBeNull()
    expect(detectImageFormat(PDF)).toBeNull()
    expect(detectImageFormat(ZIP)).toBeNull()
    expect(detectImageFormat(SVG)).toBeNull()
  })

  it('ftyp 이어도 HEIF 계열이 아닌 브랜드(mp4)는 거부', () => {
    expect(detectImageFormat(MP4)).toBeNull()
  })

  it('RIFF 컨테이너여도 WEBP 가 아니면 거부(WAV)', () => {
    const wav = bytes(...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WAVE'))
    expect(detectImageFormat(wav)).toBeNull()
  })

  it('시그니처보다 짧은 입력은 null', () => {
    expect(detectImageFormat(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(detectImageFormat(new Uint8Array())).toBeNull()
  })

  it('PNG 는 8바이트 전체 시그니처를 요구한다', () => {
    const fake = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x00, 0x00, 0x00, 0x00])
    expect(detectImageFormat(fake)).toBeNull()
  })
})

describe('isMimeConsistent', () => {
  it('같은 포맷 계열 MIME 은 통과', () => {
    expect(isMimeConsistent('jpeg', 'image/jpeg')).toBe(true)
    expect(isMimeConsistent('jpeg', 'IMAGE/JPG')).toBe(true)
    expect(isMimeConsistent('jpeg', 'image/jpeg; charset=binary')).toBe(true)
    expect(isMimeConsistent('heic', 'image/heif')).toBe(true)
  })

  it('포맷을 특정하지 않는 값은 표명하지 않은 것으로 본다', () => {
    expect(isMimeConsistent('heic', '')).toBe(true)
    expect(isMimeConsistent('heic', undefined)).toBe(true)
    expect(isMimeConsistent('heic', null)).toBe(true)
    expect(isMimeConsistent('jpeg', 'image/*')).toBe(true)
    expect(isMimeConsistent('jpeg', 'application/octet-stream')).toBe(true)
  })

  it('다른 포맷을 표명하면 불일치', () => {
    expect(isMimeConsistent('png', 'image/jpeg')).toBe(false)
    expect(isMimeConsistent('jpeg', 'image/png')).toBe(false)
    expect(isMimeConsistent('webp', 'image/gif')).toBe(false)
  })
})

describe('verifyImageBytes', () => {
  it('허용 포맷은 통과하고 판정 결과를 돌려준다', () => {
    expect(verifyImageBytes(JPEG)).toEqual({ ok: true, format: 'jpeg', detectedMime: 'image/jpeg' })
    expect(verifyImageBytes(WEBP, 'image/webp')).toEqual({ ok: true, format: 'webp', detectedMime: 'image/webp' })
  })

  it('빈 바이트는 EMPTY', () => {
    expect(verifyImageBytes(new Uint8Array())).toEqual({ ok: false, reason: 'EMPTY' })
  })

  it('이미지가 아니면 UNKNOWN_FORMAT', () => {
    expect(verifyImageBytes(ZIP)).toEqual({ ok: false, reason: 'UNKNOWN_FORMAT' })
  })

  it('확장자·MIME 만 바꾼 위조는 MIME_MISMATCH 로 거부한다', () => {
    const verdict = verifyImageBytes(PNG, 'image/jpeg')
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('MIME_MISMATCH')
    expect(verdict.detectedMime).toBe('image/png')
  })

  it('MIME 을 image/jpeg 로 위장한 실행파일(ZIP)도 막힌다', () => {
    expect(verifyImageBytes(ZIP, 'image/jpeg')).toEqual({ ok: false, reason: 'UNKNOWN_FORMAT' })
  })
})

describe('parseBase64Input', () => {
  it('data URL 에서 MIME 과 payload 를 분리한다', () => {
    expect(parseBase64Input('data:image/png;base64,AAAA')).toEqual({ payload: 'AAAA', declaredMime: 'image/png' })
  })

  it('data URL 이 아니면 입력 전체가 payload', () => {
    expect(parseBase64Input('AAAA')).toEqual({ payload: 'AAAA', declaredMime: null })
  })

  it('MIME 이 생략된 data URL 은 declaredMime 없음', () => {
    expect(parseBase64Input('data:;base64,AAAA')).toEqual({ payload: 'AAAA', declaredMime: null })
  })
})

describe('decodeBase64Prefix', () => {
  it('앞 바이트만 디코드한다', () => {
    const decoded = decodeBase64Prefix(toBase64(JPEG), 4)
    expect(Array.from(decoded)).toEqual([0xff, 0xd8, 0xff, 0xe0])
  })

  it('기본 길이는 헤더 크기를 넘지 않는다', () => {
    const large = new Uint8Array(4096).fill(0x41)
    expect(decodeBase64Prefix(toBase64(large)).length).toBe(MAGIC_BYTES_HEADER_SIZE)
  })

  it('data URL 접두어를 벗겨낸다', () => {
    const decoded = decodeBase64Prefix(`data:image/jpeg;base64,${toBase64(JPEG)}`, 3)
    expect(Array.from(decoded)).toEqual([0xff, 0xd8, 0xff])
  })

  it('공백·개행은 건너뛴다', () => {
    const withBreaks = toBase64(PNG).split('').join('\n')
    expect(Array.from(decodeBase64Prefix(withBreaks, 4))).toEqual([0x89, 0x50, 0x4e, 0x47])
  })

  it('base64 가 아닌 문자를 만나면 거기서 멈춘다', () => {
    expect(decodeBase64Prefix('!!!!').length).toBe(0)
    expect(decodeBase64Prefix('').length).toBe(0)
  })
})

describe('verifyBase64Image', () => {
  it('평문 base64 JPEG 를 통과시킨다', () => {
    expect(verifyBase64Image(toBase64(JPEG))).toEqual({ ok: true, format: 'jpeg', detectedMime: 'image/jpeg' })
  })

  it('클라이언트 폴백으로 올라오는 HEIC 원본을 통과시킨다', () => {
    expect(verifyBase64Image(toBase64(HEIC)).ok).toBe(true)
  })

  it('data URL 이 표명한 MIME 과 실바이트가 다르면 거부한다', () => {
    const verdict = verifyBase64Image(`data:image/jpeg;base64,${toBase64(PNG)}`)
    expect(verdict.ok).toBe(false)
    expect(verdict.reason).toBe('MIME_MISMATCH')
  })

  it('이미지가 아닌 페이로드는 거부한다', () => {
    expect(verifyBase64Image(toBase64(PDF)).reason).toBe('UNKNOWN_FORMAT')
    expect(verifyBase64Image(toBase64(SVG)).reason).toBe('UNKNOWN_FORMAT')
  })

  it('빈 문자열·공백은 EMPTY', () => {
    expect(verifyBase64Image('')).toEqual({ ok: false, reason: 'EMPTY' })
    expect(verifyBase64Image('   ')).toEqual({ ok: false, reason: 'EMPTY' })
  })

  it('명시 declaredMime 인자가 data URL 표명보다 우선한다', () => {
    const verdict = verifyBase64Image(`data:image/png;base64,${toBase64(PNG)}`, 'image/jpeg')
    expect(verdict.reason).toBe('MIME_MISMATCH')
  })
})
