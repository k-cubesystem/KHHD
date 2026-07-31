import { test, expect, type Page } from '@playwright/test'
import path from 'path'

/**
 * 오방기 점괘 흐름 회귀 (프로덕션) — CEO 7차 지시 ① "작동하면 신당으로 튕긴다" 재현/감시.
 *
 * 각 국면에서 URL 이 /protected/shrine/obangki 에 머무는지 + 내비게이션·콘솔·3xx 응답을 기록한다.
 * 실행:
 *   E2E_PROD_SMOKE=1 E2E_BASE_URL=https://k-haehwadang.com \
 *   E2E_USER_EMAIL=... E2E_USER_PASSWORD=... npx playwright test e2e/prod/obangki-flow.spec.ts --workers=1
 */
const SHOT = (n: string) => path.join(process.env.SHOT_DIR || 'test-results', `obangki-${n}.png`)

const OBANGKI_URL = /\/protected\/shrine\/obangki(\/|$|\?)/

interface NavLog {
  navs: string[]
  redirects: string[]
  consoleErrors: string[]
  failed: string[]
}

/** 튕김 관찰 장치 — 프레임 내비게이션·3xx 응답·404·콘솔 에러를 시각과 함께 남긴다. */
function watchBounce(page: Page): NavLog {
  const log: NavLog = { navs: [], redirects: [], consoleErrors: [], failed: [] }
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) log.navs.push(`${new Date().toISOString()} → ${frame.url()}`)
  })
  page.on('response', (res) => {
    const s = res.status()
    if (s >= 300 && s < 400) {
      log.redirects.push(`${s} ${res.url()} → ${res.headers()['location'] ?? '?'}`)
    }
    if (s >= 400) log.failed.push(`${s} ${res.url()}`)
  })
  page.on('console', (msg) => {
    if (msg.type() === 'error') log.consoleErrors.push(msg.text())
  })
  return log
}

function dumpLog(log: NavLog, label: string): void {
  console.log(`[${label}] 내비게이션 ${log.navs.length}건`)
  for (const n of log.navs) console.log(`  nav: ${n}`)
  for (const r of log.redirects) console.log(`  3xx: ${r}`)
  for (const f of log.failed.slice(0, 10)) console.log(`  4xx/5xx: ${f}`)
  for (const c of log.consoleErrors.slice(0, 10)) console.log(`  console.error: ${c}`)
}

async function login(page: Page): Promise<void> {
  await page.goto('/auth/login')
  await page.getByLabel('이메일').fill(process.env.E2E_USER_EMAIL || '')
  await page.getByLabel('비밀번호', { exact: true }).fill(process.env.E2E_USER_PASSWORD || '')
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await expect(page).toHaveURL(/protected/, { timeout: 20_000 })

  // 오픈이벤트 팝업 자동 닫기 (프로젝트 공통 플레이크)
  const dlg = page.getByRole('dialog', { name: '오픈 이벤트' })
  await page.addLocatorHandler(dlg, async () => {
    await dlg.getByRole('button', { name: 'Close' }).click()
  })
}

test.describe('오방기 점괘 — 튕김 감시 회귀', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] } })

  test('작성→기 세우기→셔플→뽑기 내내 URL 이 오방기에 머문다', async ({ page }) => {
    test.setTimeout(120_000)
    const log = watchBounce(page)

    await login(page)

    // 1) 직접 진입
    await page.goto('/protected/shrine/obangki')
    await expect(page).toHaveURL(OBANGKI_URL)
    await expect(page.getByText('무엇을 여쭙시겠습니까')).toBeVisible({ timeout: 15_000 })
    await page.screenshot({ path: SHOT('1-compose') })
    console.log('[PASS] 진입 — compose 렌더, URL 유지')

    // 2) 질문 작성
    await page.getByLabel('선택지 1').fill('짜장면')
    await page.getByLabel('선택지 2').fill('짬뽕')
    await expect(page).toHaveURL(OBANGKI_URL)

    // 3) 기 세우기 (무료 회차 전제 — 유료 문구가 보이면 여기서 멈춘다: 과금 경로 진입 금지)
    const paidCta = page.getByRole('button', { name: /복채 .*만냥/ })
    if (await paidCta.isVisible().catch(() => false)) {
      console.log('[SKIP] 오늘 무료 소진 — 과금 경로 진입 금지 규율로 중단')
      test.skip(true, '무료 소진')
    }
    await page.getByRole('button', { name: '기 세우고 방울 울리기' }).click()
    await expect(page).toHaveURL(OBANGKI_URL)
    await page.screenshot({ path: SHOT('2-shuffle') })

    // 4) 셔플 종료 → 삼기가 저절로 나온다 (8차: 사용자가 고르는 국면이 없다)
    await expect(page.getByText(/기를 펴는 중입니다|기가 돌아갑니다/).first()).toBeVisible({ timeout: 15_000 })
    await expect(page).toHaveURL(OBANGKI_URL)
    console.log('[PASS] 셔플 국면 — URL 유지')

    // 5) 삼기 두루마리 — 공수·세 자리·처방까지 다 서야 점사가 끝난 것이다
    await expect(page.getByText('신당지기')).toBeVisible({ timeout: 25_000 })
    for (const label of ['공 수', '초기(初旗)', '중기(中旗)', '말기(末旗)']) {
      await expect(page.getByText(label).first(), `삼기 두루마리 항목: ${label}`).toBeVisible()
    }
    await expect(page.getByText(/처방 ·/).first()).toBeVisible()
    await expect(page).toHaveURL(OBANGKI_URL)
    await page.screenshot({ path: SHOT('3-verdict') })
    console.log('[PASS] 삼기 풀이 공개 — URL 유지')

    // 7) 지연 튕김 감시 — 5초 대기 후에도 그대로인지
    await page.waitForTimeout(5_000)
    await expect(page).toHaveURL(OBANGKI_URL)
    dumpLog(log, '전체 흐름')

    // 오방기 밖으로 나간 내비게이션이 한 번도 없어야 한다(로그인·최초 진입 제외)
    const afterEntry = log.navs.slice(log.navs.findIndex((n) => /obangki/.test(n)))
    const escaped = afterEntry.filter((n) => !/obangki/.test(n))
    expect(escaped, `오방기 이탈 내비게이션: ${escaped.join(' | ')}`).toHaveLength(0)
  })

  // CEO 재현 변형 — 모바일 기기에서 드래그 뽑기 + 공유 + 「한 번 더」 재뽑기.
  // 튕김의 실사용 조건(터치·제스처·연속 조작)에 최대한 붙인다.
  test('모바일 변형: 잡제스처 중 자동 선출 → 공유 → 한 번 더', async ({ page, isMobile }) => {
    test.skip(!isMobile, '모바일 프로젝트 전용')
    test.setTimeout(150_000)
    const log = watchBounce(page)

    await login(page)
    await page.goto('/protected/shrine/obangki')
    await expect(page.getByText('무엇을 여쭙시겠습니까')).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('선택지 1').fill('짜장면')
    await page.getByLabel('선택지 2').fill('짬뽕')

    // byDrag 는 이제 "뽑는 방법"이 아니라 **튕김 재현용 잡제스처**다(뽑기 제스처 자체가 폐지됨)
    const drawOnce = async (label: string, byDrag: boolean) => {
      const paidCta = page.getByRole('button', { name: /복채 .*만냥/ })
      if (await paidCta.isVisible().catch(() => false)) {
        console.log(`[SKIP] ${label}: 무료 소진 — 과금 경로 진입 금지`)
        return false
      }
      await page.getByRole('button', { name: '기 세우고 방울 울리기' }).click()

      await expect(page.getByText(/기를 펴는 중입니다|기가 돌아갑니다/).first()).toBeVisible({ timeout: 15_000 })
      // 뽑는 제스처가 사라졌으므로(8차) 여기서 사용자가 할 일은 없다 — 무대를 문질러도 이탈이 없어야 한다
      if (byDrag) {
        const stage = page.getByText(/기를 펴는 중입니다|기가 돌아갑니다|신당지기/).first()
        const box = await stage.boundingBox()
        if (box) {
          const cx = box.x + box.width / 2
          const cy = box.y
          await page.mouse.move(cx, cy)
          await page.mouse.down()
          for (let i = 1; i <= 6; i += 1) await page.mouse.move(cx + i, cy - i * 12)
          await page.mouse.up()
        }
      }
      await expect(page.getByText('신당지기')).toBeVisible({ timeout: 25_000 })
      await expect(page, `${label}: 괘 공개 후 URL`).toHaveURL(OBANGKI_URL)
      console.log(`[PASS] ${label} — 괘 공개, URL 유지`)
      return true
    }

    // 1) 드래그로 한 번
    const first = await drawOnce('잡제스처 중 자동 선출', true)
    if (!first) return

    // 2) 공유(깃발 카드) — claimShareReward 경로 관찰. 클립보드 권한 없음 → 실패해도 UX 유지가 정상
    await page.getByRole('button', { name: /깃발 카드/ }).click()
    await page.waitForTimeout(1_500)
    await expect(page, '공유 후 URL').toHaveURL(OBANGKI_URL)
    console.log('[PASS] 공유 후 URL 유지')

    // 3) 한 번 더 → 탭으로 두 번째 뽑기
    await page.getByRole('button', { name: '한 번 더' }).click()
    await expect(page.getByText('무엇을 여쭙시겠습니까')).toBeVisible({ timeout: 10_000 })
    await page.getByLabel('선택지 1').fill('오늘 보낸다')
    await page.getByLabel('선택지 2').fill('내일 보낸다')
    await drawOnce('재뽑기(탭)', false)

    await page.waitForTimeout(5_000)
    await expect(page).toHaveURL(OBANGKI_URL)
    dumpLog(log, '모바일 변형')

    const afterEntry = log.navs.slice(log.navs.findIndex((n) => /obangki/.test(n)))
    const escaped = afterEntry.filter((n) => !/obangki/.test(n))
    expect(escaped, `오방기 이탈 내비게이션: ${escaped.join(' | ')}`).toHaveLength(0)
  })
})

test.describe('오방기 — reduced-motion 변형(뽑기 전 중단, 과금 0)', () => {
  test.skip(!process.env.E2E_PROD_SMOKE, 'E2E_PROD_SMOKE 미설정')
  test.use({ storageState: { cookies: [], origins: [] }, contextOptions: { reducedMotion: 'reduce' } })

  test('모션 최소화에서도 셔플 국면이 멎지 않고 URL 이 유지된다', async ({ page }) => {
    test.setTimeout(90_000)
    const log = watchBounce(page)

    await login(page)
    await page.goto('/protected/shrine/obangki')
    await expect(page.getByText('무엇을 여쭙시겠습니까')).toBeVisible({ timeout: 15_000 })
    await page.getByLabel('선택지 1').fill('짜장면')
    await page.getByLabel('선택지 2').fill('짬뽕')

    // CTA(무료/유료 라벨 공통) — 서버 호출 없는 클라 국면 전환만 일으킨다. 뽑기(과금)는 하지 않는다.
    await page.getByRole('button', { name: /기 세우/ }).click()
    const pickPrompt = page.getByText('마음 가는 기 하나를 위로 쓸어 올리세요')
    const autoPrompt = page.getByText(/무대를 눌러|기가 돌아갑니다/)
    await expect(pickPrompt.or(autoPrompt).first()).toBeVisible({ timeout: 10_000 })
    await expect(page).toHaveURL(OBANGKI_URL)

    await page.waitForTimeout(3_000)
    await expect(page).toHaveURL(OBANGKI_URL)
    dumpLog(log, 'reduced-motion')
    console.log('[PASS] reduced-motion — 국면 전환 생존, URL 유지 (뽑기 전 중단)')
  })
})
