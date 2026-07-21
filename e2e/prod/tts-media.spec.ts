import { test, expect } from '@playwright/test'

// 세션27: edge-tts 뉴럴 TTS 라우트 + Veo 앰비언트 영상 서빙 검증.
test.describe('TTS · 미디어 에셋', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('영상 에셋 서빙 + TTS 인증 가드/실발화', async ({ page }) => {
    test.setTimeout(120_000)

    // 1) 앰비언트 영상 4파일 서빙 (webm + mp4 폴백)
    for (const f of ['summon-ritual.webm', 'summon-ritual.mp4', 'analysis-ambient.webm', 'analysis-ambient.mp4']) {
      const res = await page.request.head(`/videos/${f}`)
      expect(res.status(), f).toBe(200)
    }
    console.log('[PASS] 앰비언트 영상 4파일 서빙(200)')

    // 2) 비로그인 TTS → 401 (오픈 프록시 방지 가드)
    const anon = await page.request.post('/api/tts', { data: { text: '테스트' } })
    expect(anon.status()).toBe(401)
    console.log('[PASS] TTS 비로그인 401 가드')

    // 3) 로그인 → 신위 2종 실발화: mp3 반환 + 보이스가 달라 바이트가 달라야 한다
    await page.goto('/auth/login')
    await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
    await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
    await page.getByRole('button', { name: '로그인', exact: true }).click()
    await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

    const sameText = '그대의 앞날에 금빛 서광이 비치는구나.'
    const speak = async (deityCode: string) => {
      const res = await page.request.post('/api/tts', { data: { text: sameText, deityCode } })
      expect(res.status(), `${deityCode} 응답`).toBe(200)
      expect(res.headers()['content-type']).toContain('audio/mpeg')
      const body = await res.body()
      expect(body.length, `${deityCode} 오디오 크기`).toBeGreaterThan(5_000)
      return body.length
    }
    const generalBytes = await speak('choiyoung') // 장군신 — InJoon(남) 저음
    const childBytes = await speak('dongja') // 동자신 — SunHi(여) 고음
    expect(generalBytes, '같은 문장인데 보이스가 같으면 크기가 같아진다').not.toBe(childBytes)
    console.log(
      `[PASS] TTS 실발화 — 장군 ${Math.round(generalBytes / 1024)}KB vs 동자 ${Math.round(childBytes / 1024)}KB (보이스 상이)`
    )
  })
})
