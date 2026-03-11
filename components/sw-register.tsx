'use client'

import { useEffect } from 'react'
import { logger } from '@/lib/utils/logger'

/**
 * Registers the service worker (public/sw.js) once the page has loaded.
 * This is a client-only component with no visible UI.
 */
export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        })

        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (!newWorker) return
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // A new version is available; reload to apply (silent update).
              window.location.reload()
            }
          })
        })
      } catch (err) {
        logger.warn('[SW] Registration failed:', err)
      }
    }

    // Defer registration until after page load to avoid blocking LCP
    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}
