/**
 * Image optimization utilities for 해화당
 *
 * - getOptimizedImageUrl: Supabase Storage image transform URL builder
 * - BLUR_DATA_URL: Lightweight inline placeholder for blur-up effect
 */

export interface ImageTransformOptions {
  width?: number
  height?: number
  quality?: number
  /** 'origin' uses the original format; otherwise converts to webp by default */
  format?: 'origin' | 'webp' | 'avif'
  /** 'cover' | 'contain' | 'fill' — maps to Supabase resize mode */
  resize?: 'cover' | 'contain' | 'fill'
}

/**
 * Appends Supabase Storage image transform query params to a public URL.
 *
 * Supabase supports on-the-fly image transforms via the `render/image` path:
 * https://supabase.com/docs/guides/storage/serving/image-transformations
 *
 * For non-Supabase URLs the original URL is returned unchanged so it is safe
 * to call unconditionally.
 *
 * @example
 * const src = getOptimizedImageUrl(rawUrl, { width: 400, quality: 75 })
 */
export function getOptimizedImageUrl(url: string | null | undefined, options: ImageTransformOptions = {}): string {
  if (!url) return ''

  // Only transform Supabase Storage public URLs
  if (!url.includes('.supabase.co/storage/v1/object/public/')) {
    return url
  }

  // Convert /object/public/ → /render/image/public/ for transform support
  const transformBase = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')

  const params = new URLSearchParams()
  if (options.width) params.set('width', String(options.width))
  if (options.height) params.set('height', String(options.height))
  if (options.quality) params.set('quality', String(options.quality))
  if (options.format) params.set('format', options.format)
  if (options.resize) params.set('resize', options.resize)

  const queryString = params.toString()
  return queryString ? `${transformBase}?${queryString}` : transformBase
}

/**
 * A tiny 1×1 transparent SVG encoded as a data URI.
 * Use as `blurDataURL` in Next.js <Image placeholder="blur"> to prevent
 * layout shift while the real image loads.
 *
 * For local/static images prefer `import img from './img.png'` which gives
 * an automatic blur placeholder via Next.js image metadata.
 */
export const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMxYTE1MGQiLz48L3N2Zz4='

/**
 * Warm golden-tinted 1×1 SVG placeholder matching the app's surface/background palette.
 * Use for avatar / portrait placeholders.
 */
export const AVATAR_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMSIgaGVpZ2h0PSIxIiB2aWV3Qm94PSIwIDAgMSAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiMyMTFiMTAiLz48L3N2Zz4='
